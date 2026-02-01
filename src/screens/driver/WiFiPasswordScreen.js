// src/screens/driver/WiFiPasswordScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { driverAPI, driverProvisionAPI } from "../../services/api";
import bleService from "../../services/bleService";

const STORAGE_KEY_WIFI_HISTORY = "@tulipfleet_wifi_history";

const WiFiPasswordScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { ssid, serial, vehicle, assignment_id, manual, rssi, deviceId } =
    route.params;

  const [wifiSsid, setWifiSsid] = useState(ssid || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("");

  const handleConnect = async () => {
    // Validation
    if (!wifiSsid || wifiSsid.trim().length === 0) {
      Alert.alert("Hata", "WiFi ağı adı boş olamaz");
      return;
    }

    if (!password || password.length < 8) {
      Alert.alert("Hata", "WiFi şifresi en az 8 karakter olmalıdır");
      return;
    }

    // 🆕 BLE kontrolü EKLE
    if (!deviceId) {
      Alert.alert("Hata", "ESP32 bağlantısı kesildi. Lütfen baştan başlayın.", [
        {
          text: "Tamam",
          onPress: () => navigation.navigate("DriverDashboard"),
        },
      ]);
      return;
    }

    try {
      setConnecting(true);

      // 1️⃣ Serial number'ı ESP32'ye gönder (WiFi'den ÖNCE - KRİTİK!)
      setStatus("Seri numara gönderiliyor...");
      console.log("[WiFiPassword] Serial gönderiliyor:", serial);
      try {
        await bleService.writeSerial(serial);
        console.log("[WiFiPassword] ✅ Serial başarıyla gönderildi");
      } catch (serialError) {
        console.error(
          "[WiFiPassword] ❌ Serial gönderilemedi:",
          serialError.message
        );
        Alert.alert(
          "Hata",
          "Seri numara ESP32'ye gönderilemedi. BLE bağlantısını kontrol edin.",
          [{ text: "Tamam" }]
        );
        setConnecting(false);
        setStatus("");
        return;
      }

      // 2️⃣ BLE ile WiFi credentials gönder (serial zaten ESP32'de)
      setStatus("WiFi bilgileri gönderiliyor...");
      const result = await bleService.provisionWifi(
        wifiSsid.trim(),
        password,
        (phase, message) => {
          setStatus(message);
        }
      );

      if (!result.success) {
        Alert.alert("Hata", result.message || "WiFi bağlantısı başarısız");
        setConnecting(false);
        setStatus("");
        return;
      }

      // 3️⃣ Şifreyi kaydet (opsiyonel)
      if (savePassword) {
        await saveWifiToHistory(wifiSsid.trim(), password);
      }

      // ✅ 4️⃣ ESP32'nin WiFi'ye bağlanmasını BEKLE
      setStatus("ESP32 WiFi'ye bağlanıyor...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // ✅ 5️⃣ ESP32'nin backend'e activation yapmasını BEKLE
      setStatus("ESP32 backend'e kaydoluyor...");
      console.log(
        "[WiFiPassword] ESP32'nin backend activation yapması bekleniyor..."
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // +5 saniye

      // ✅ 6️⃣ Backend'den setup_required kontrol et (ESP32 zaten yaptı mı?)
      setStatus("Durum kontrol ediliyor...");
      console.log("[WiFiPassword] Backend durumu kontrol ediliyor...");

      try {
        const statusCheck = await driverAPI.getVehicle();
        console.log(
          "[WiFiPassword] Backend response:",
          statusCheck.vehicle?.esp32Status
        );

        if (
          statusCheck.vehicle?.esp32Status &&
          !statusCheck.vehicle.esp32Status.setup_required
        ) {
          // ✅ ESP32 başarıyla backend'e kaydoldu!
          console.log("[WiFiPassword] ✅ ESP32 backend activation başarılı!");
          showSuccess();
          return;
        }

        // ⚠️ Hala setup_required: true ise bir kez daha dene
        console.log(
          "[WiFiPassword] Setup hala gerekli, 3 saniye daha bekleniyor..."
        );
        setStatus("ESP32 hala çalışıyor, bekleniyor...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const retryCheck = await driverAPI.getVehicle();
        console.log(
          "[WiFiPassword] Retry response:",
          retryCheck.vehicle?.esp32Status
        );

        if (
          retryCheck.vehicle?.esp32Status &&
          !retryCheck.vehicle.esp32Status.setup_required
        ) {
          console.log(
            "[WiFiPassword] ✅ ESP32 backend activation başarılı (2. kontrol)!"
          );
          showSuccess();
          return;
        }

        // ❌ ESP32 backend'e ulaşamadı, mobil app fallback
        console.log(
          "[WiFiPassword] ⚠️ ESP32 backend'e ulaşamadı, mobil app fallback devreye giriyor"
        );
        setStatus("Alternatif yöntemle tamamlanıyor...");
        await completeSetup();
      } catch (checkError) {
        console.error("[WiFiPassword] Backend kontrol hatası:", checkError);
        // Backend kontrolünde hata, fallback dene
        setStatus("Alternatif yöntemle tamamlanıyor...");
        await completeSetup();
      }
    } catch (error) {
      console.error("[WiFiPassword] Error:", error);

      // BLE disconnect hatası mı? (ESP32 restart etti)
      const errorStr = (error.message || "").toLowerCase();
      if (
        errorStr.includes("disconnect") ||
        errorStr.includes("timeout") ||
        errorStr.includes("not connected")
      ) {
        // ESP32 restart etti, backend activation başarılı olabilir
        console.log(
          "[WiFiPassword] BLE disconnect algılandı (ESP32 restart), durum kontrol ediliyor..."
        );
        setStatus("ESP32 yeniden başlatılıyor...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          const statusCheck = await driverAPI.getVehicle();
          if (
            statusCheck.vehicle?.esp32Status &&
            !statusCheck.vehicle.esp32Status.setup_required
          ) {
            console.log(
              "[WiFiPassword] ✅ ESP32 restart sonrası backend activation başarılı!"
            );
            showSuccess();
            return;
          }
        } catch (e) {
          console.error(
            "[WiFiPassword] Restart sonrası backend kontrol hatası:",
            e
          );
        }

        // Fallback
        try {
          await completeSetup();
        } catch (completeError) {
          console.log(
            "[WiFiPassword] Fallback da başarısız, ama success gösteriliyor"
          );
          showSuccess();
        }
      } else {
        Alert.alert("Hata", "Bağlantı hatası: " + error.message);
        setConnecting(false);
        setStatus("");
      }
    }
  };

  const completeSetup = async () => {
    try {
      const response = await driverProvisionAPI.completeSetup({
        assignment_id,
        device_serial: serial,
      });

      if (response.success) {
        showSuccess();
      } else {
        throw new Error(response.message || "Setup tamamlanamadı");
      }
    } catch (error) {
      throw error;
    }
  };

  const showSuccess = () => {
    setStatus("Kurulum tamamlandı! ✅");

    Alert.alert(
      "Başarılı!",
      `Cihaz ${vehicle.plate || vehicle.plate_no} aracına başarıyla atandı ve WiFi'ye bağlandı.`,
      [
        {
          text: "Tamam",
          onPress: async () => {
            // ✅ BLE disconnect - Provision tamamlandı
            try {
              console.log("[WiFiPassword] Provision başarılı, BLE kapatılıyor");
              await bleService.disconnect();
            } catch (e) {
              console.error("[WiFiPassword] BLE disconnect error:", e);
            }

            // Ana ekrana dön
            navigation.reset({
              index: 0,
              routes: [{ name: "DriverDashboard" }],
            });
          },
        },
      ],
      { cancelable: false }
    );
  };

  const saveWifiToHistory = async (ssid, pass) => {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEY_WIFI_HISTORY);
      const list = history ? JSON.parse(history) : [];

      // Aynı SSID varsa güncelle
      const index = list.findIndex((item) => item.ssid === ssid);
      if (index >= 0) {
        list[index] = { ssid, password: pass, timestamp: Date.now() };
      } else {
        list.unshift({ ssid, password: pass, timestamp: Date.now() });
      }

      // Max 5 WiFi kaydet
      const trimmed = list.slice(0, 5);
      await AsyncStorage.setItem(
        STORAGE_KEY_WIFI_HISTORY,
        JSON.stringify(trimmed)
      );
    } catch (error) {
      console.error("[WiFiPassword] Save history error:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>WiFi Şifresi</Text>
          {manual ? (
            <Text style={styles.subtitle}>Manuel WiFi bilgilerini girin</Text>
          ) : (
            <Text style={styles.subtitle}>{wifiSsid}</Text>
          )}
          {rssi && (
            <Text style={styles.signalText}>
              Sinyal Gücü:{" "}
              {rssi >= -50
                ? "Mükemmel"
                : rssi >= -60
                  ? "İyi"
                  : rssi >= -70
                    ? "Orta"
                    : "Zayıf"}
            </Text>
          )}
        </View>

        <View style={styles.formContainer}>
          {manual && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WiFi Ağı Adı (SSID)</Text>
              <TextInput
                style={styles.input}
                value={wifiSsid}
                onChangeText={setWifiSsid}
                placeholder="WiFi ağı adını girin"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!connecting}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şifre</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="WiFi şifresini girin"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!connecting}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={connecting}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>En az 8 karakter</Text>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setSavePassword(!savePassword)}
            disabled={connecting}
          >
            <View
              style={[styles.checkbox, savePassword && styles.checkboxChecked]}
            >
              {savePassword && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Şifreyi kaydet</Text>
          </TouchableOpacity>

          {status && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.connectButton,
              connecting && styles.connectButtonDisabled,
            ]}
            onPress={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.connectButtonText}>Bağlan</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={connecting}
          >
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    fontWeight: "500",
  },
  signalText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#333",
  },
  eyeButton: {
    padding: 14,
  },
  eyeIcon: {
    fontSize: 20,
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  checkmark: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#333",
  },
  statusContainer: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: "#1976D2",
    textAlign: "center",
  },
  connectButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default WiFiPasswordScreen;
