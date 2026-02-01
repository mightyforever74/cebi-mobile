// src/screens/driver/WiFiPickerScreen.js
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import bleService from "../../services/bleService";

const WiFiPickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { serial, vehicle, assignment_id, deviceId } = route.params;

  const [scanning, setScanning] = useState(false);
  const [wifiList, setWifiList] = useState([]);
  const [error, setError] = useState(null);

  const startedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Zaten başlatıldıysa skip
      if (startedRef.current) {
        console.log("[WiFiPicker] Already started, skipping");
        return;
      }

      // BLE kontrolü
      if (!deviceId) {
        Alert.alert(
          "Hata",
          "ESP32 bağlantısı kesildi. Lütfen tekrar deneyin.",
          [{ text: "Tamam", onPress: () => navigation.goBack() }]
        );
        return;
      }

      // İlk kez başlat
      startedRef.current = true;
      console.log("[WiFiPicker] First mount - starting scan");

      const checkBLEAndScan = async () => {
        try {
          const isConnected = await bleService.checkConnection();
          console.log("[WiFiPicker] BLE isConnected:", isConnected);

          if (!isConnected) {
            Alert.alert(
              "Bağlantı Hatası",
              "ESP32 ile bağlantı kopmuş. Kurulumu yeniden başlatın.",
              [{ text: "Tamam", onPress: () => navigation.goBack() }]
            );
            return;
          }

          // BLE bağlı, WiFi scan başlat
          await scanWifiNetworks();
        } catch (err) {
          console.error("[WiFiPicker] BLE check error:", err);
          setError("BLE bağlantı hatası: " + err.message);
        }
      };

      checkBLEAndScan();

      // Cleanup
      return () => {
        console.log("[WiFiPicker] Cleanup");
      };
    }, [deviceId])
  );

  const scanWifiNetworks = async () => {
    try {
      setScanning(true);
      setError(null);

      console.log("[WiFiPicker] Starting WiFi scan...");
      console.log("[WiFiPicker] deviceId:", deviceId);

      // ✅ EKLE: BLE durumunu logla
      const bleState = bleService.getState();
      console.log("[WiFiPicker] BLE State:", JSON.stringify(bleState));

      const networks = await bleService.scanWifiNetworks();

      console.log("[WiFiPicker] Raw networks:", JSON.stringify(networks));

      if (networks && networks.length > 0) {
        // Sinyal gücüne göre sırala ve boş SSID'leri filtrele
        const sorted = networks
          .filter((n) => n.ssid && n.ssid.trim().length > 0)
          .sort((a, b) => b.rssi - a.rssi);

        setWifiList(sorted);
        console.log(`[WiFiPicker] Found ${sorted.length} valid networks`);
      } else {
        setWifiList([]);
        setError("WiFi ağı bulunamadı. ESP32'nin açık olduğundan emin olun.");
      }
    } catch (err) {
      console.error("[WiFiPicker] Scan error:", err);

      // ✅ EKLE: Daha detaylı hata mesajları
      let errorMessage = "WiFi taraması başarısız";

      if (
        err.message.includes("bağlı değil") ||
        err.message.includes("kopmuş")
      ) {
        errorMessage = "ESP32 bağlantısı kopmuş. Kurulumu yeniden başlatın.";
      } else if (err.message.includes("characteristic")) {
        errorMessage =
          "ESP32 firmware'i WiFi scan desteklemiyor. Firmware güncelleyin.";
      } else if (err.message.includes("JSON")) {
        errorMessage = "ESP32'den geçersiz veri geldi. Yeniden deneyin.";
      } else {
        errorMessage = "WiFi taraması başarısız: " + err.message;
      }

      setError(errorMessage);
      setWifiList([]);
    } finally {
      setScanning(false);
    }
  };

  const handleWifiSelect = (network) => {
    // 5GHz kontrolü (channel > 14)
    if (network.channel && network.channel > 14) {
      Alert.alert(
        "Uyarı",
        "Bu ağ 5GHz bandında. ESP32 sadece 2.4GHz ağları destekler. Başka bir ağ seçin.",
        [{ text: "Tamam" }]
      );
      return;
    }

    // ✅ DÜZELTİLDİ: Seçilen WiFi'nin SSID'sini geçir
    navigation.navigate("WiFiPasswordMain", {
      ssid: network.ssid, // ✅ Seçilen ağın SSID'si (boş değil!)
      serial,
      vehicle,
      assignment_id,
      manual: false, // ✅ Liste seçimi, manuel değil
      deviceId, // ✅ BLE device ID
    });
  };

  const handleManualEntry = () => {
    navigation.navigate("WiFiPasswordMain", {
      ssid: "",
      serial,
      vehicle,
      assignment_id,
      manual: true,
      deviceId, // ✅ EKLE: deviceId'yi de geçir
    });
  };

  const getSignalBars = (rssi) => {
    if (rssi >= -50) return "████▒";
    if (rssi >= -60) return "███▒▒";
    if (rssi >= -70) return "██▒▒▒";
    if (rssi >= -80) return "█▒▒▒▒";
    return "▒▒▒▒▒";
  };

  const getEncryptionText = (enc) => {
    if (enc === 0 || enc === "OPEN") return "Açık";
    if (enc === 2 || enc === "WPA") return "WPA";
    if (enc === 3 || enc === "WPA2") return "WPA2";
    if (enc === 4 || enc === "WPA3") return "WPA3";
    return "Şifreli";
  };

  if (scanning && wifiList.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>WiFi ağları taranıyor...</Text>
        <Text style={styles.loadingSubtext}>Bu 5-10 saniye sürebilir</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>WiFi Seçin</Text>
        <Text style={styles.subtitle}>Cihazı internete bağlayalım</Text>
        <Text style={styles.vehicleInfo}>
          Araç: {vehicle?.plate || vehicle?.plate_no || "N/A"}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={scanning}
            onRefresh={scanWifiNetworks}
            colors={["#FF6B35"]}
          />
        }
      >
        {wifiList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>WiFi ağı bulunamadı</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={scanWifiNetworks}
            >
              <Text style={styles.retryButtonText}>Yeniden Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          wifiList.map((network, index) => {
            const is5GHz = network.channel && network.channel > 14;

            return (
              <TouchableOpacity
                key={`${network.ssid}-${index}`}
                style={[styles.wifiCard, is5GHz && styles.wifiCardDisabled]}
                onPress={() => handleWifiSelect(network)}
                disabled={is5GHz || scanning}
              >
                <View style={styles.wifiIcon}>
                  <Text style={styles.wifiIconText}>📶</Text>
                </View>

                <View style={styles.wifiInfo}>
                  <Text style={styles.wifiSsid} numberOfLines={1}>
                    {network.ssid}
                  </Text>
                  <View style={styles.wifiDetails}>
                    <Text style={styles.wifiDetailText}>
                      {getSignalBars(network.rssi)} •{" "}
                      {getEncryptionText(network.enc || network.encryption)}
                    </Text>
                    {is5GHz && (
                      <Text style={styles.unsupportedText}>
                        • 5GHz (Desteklenmiyor)
                      </Text>
                    )}
                  </View>
                </View>

                {!is5GHz && (
                  <View style={styles.arrowIcon}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={handleManualEntry}
          disabled={scanning}
        >
          <Text style={styles.manualButtonText}>📝 Manuel Giriş</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rescanButton}
          onPress={scanWifiNetworks}
          disabled={scanning}
        >
          <Text style={styles.rescanButtonText}>
            {scanning ? "Taranıyor..." : "🔄 Yeniden Tara"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
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
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  errorContainer: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE69C",
  },
  errorText: {
    fontSize: 14,
    color: "#856404",
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  wifiCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wifiCardDisabled: {
    opacity: 0.4,
  },
  wifiIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  wifiIconText: {
    fontSize: 28,
  },
  wifiInfo: {
    flex: 1,
  },
  wifiSsid: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  wifiDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  wifiDetailText: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  unsupportedText: {
    fontSize: 12,
    color: "#F44336",
    fontWeight: "600",
  },
  arrowIcon: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    color: "#FF6B35",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  manualButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  rescanButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  },
  rescanButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});

export default WiFiPickerScreen;
