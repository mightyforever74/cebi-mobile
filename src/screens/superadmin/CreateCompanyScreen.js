// src/screens/superadmin/CreateCompanyScreen.js
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
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const CreateCompanyScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Company Info, 2: Admin Info, 3: Package

  // Company info
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  // Admin info
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  // Package info
  const [maxVehicles, setMaxVehicles] = useState("10");
  const [maxDrivers, setMaxDrivers] = useState("10");

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleCompanyNameChange = (text) => {
    setCompanyName(text);
    setCompanySlug(generateSlug(text));
  };

  const validateStep1 = () => {
    if (!companyName.trim()) {
      Alert.alert("Hata", "Şirket adı gerekli");
      return false;
    }
    if (!companySlug.trim()) {
      Alert.alert("Hata", "Şirket slug gerekli");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!adminEmail.trim()) {
      Alert.alert("Hata", "Admin email gerekli");
      return false;
    }
    if (!adminEmail.includes("@")) {
      Alert.alert("Hata", "Geçerli bir email adresi girin");
      return false;
    }
    if (!adminPassword || adminPassword.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalı");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/superadmin/companies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: companyName,
          slug: companySlug,
          tax_id: taxId,
          address,
          city,
          phone,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_first_name: adminFirstName,
          admin_last_name: adminLastName,
          admin_phone: adminPhone,
          max_vehicles: parseInt(maxVehicles) || 10,
          max_drivers: parseInt(maxDrivers) || 10,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Başarılı! 🎉",
          `"${companyName}" şirketi ve admin hesabı oluşturuldu.\n\nAdmin: ${adminEmail}`,
          [{ text: "Tamam", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Hata", data.error || "Şirket oluşturulamadı");
      }
    } catch (error) {
      console.error("Create error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>🏢 Şirket Bilgileri</Text>
      <Text style={styles.stepDescription}>
        Yeni şirketin temel bilgilerini girin
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Şirket Adı *</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={handleCompanyNameChange}
          placeholder="Örn: ABC Lojistik"
          placeholderTextColor="#8898AA"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Slug (URL) *</Text>
        <TextInput
          style={styles.input}
          value={companySlug}
          onChangeText={setCompanySlug}
          placeholder="abc-lojistik"
          placeholderTextColor="#8898AA"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vergi No</Text>
        <TextInput
          style={styles.input}
          value={taxId}
          onChangeText={setTaxId}
          placeholder="Vergi numarası"
          placeholderTextColor="#8898AA"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Şehir</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="İstanbul"
          placeholderTextColor="#8898AA"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Adres</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={address}
          onChangeText={setAddress}
          placeholder="Tam adres"
          placeholderTextColor="#8898AA"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+90 5XX XXX XX XX"
          placeholderTextColor="#8898AA"
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => validateStep1() && setStep(2)}
      >
        <Text style={styles.nextButtonText}>İleri →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👤 Admin Hesabı</Text>
      <Text style={styles.stepDescription}>
        Şirket yöneticisinin giriş bilgilerini oluşturun
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={adminEmail}
          onChangeText={setAdminEmail}
          placeholder="admin@sirket.com"
          placeholderTextColor="#8898AA"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Şifre *</Text>
        <TextInput
          style={styles.input}
          value={adminPassword}
          onChangeText={setAdminPassword}
          placeholder="En az 6 karakter"
          placeholderTextColor="#8898AA"
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Ad</Text>
        <TextInput
          style={styles.input}
          value={adminFirstName}
          onChangeText={setAdminFirstName}
          placeholder="Admin adı"
          placeholderTextColor="#8898AA"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Soyad</Text>
        <TextInput
          style={styles.input}
          value={adminLastName}
          onChangeText={setAdminLastName}
          placeholder="Admin soyadı"
          placeholderTextColor="#8898AA"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={adminPhone}
          onChangeText={setAdminPhone}
          placeholder="+90 5XX XXX XX XX"
          placeholderTextColor="#8898AA"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={() => validateStep2() && setStep(3)}
        >
          <Text style={styles.nextButtonText}>İleri →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📦 Paket Limitleri</Text>
      <Text style={styles.stepDescription}>
        Şirketin kullanabileceği kaynak limitlerini belirleyin
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maksimum Araç Sayısı</Text>
        <TextInput
          style={styles.input}
          value={maxVehicles}
          onChangeText={setMaxVehicles}
          placeholder="10"
          placeholderTextColor="#8898AA"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maksimum Sürücü Sayısı</Text>
        <TextInput
          style={styles.input}
          value={maxDrivers}
          onChangeText={setMaxDrivers}
          placeholder="10"
          placeholderTextColor="#8898AA"
          keyboardType="numeric"
        />
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Özet</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Şirket:</Text>
          <Text style={styles.summaryValue}>{companyName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Admin:</Text>
          <Text style={styles.summaryValue}>{adminEmail}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Limitler:</Text>
          <Text style={styles.summaryValue}>
            {maxVehicles} araç, {maxDrivers} sürücü
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backButton]}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.createButton]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.createButtonText}>✓ Oluştur</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                step >= 1 && styles.progressDotActive,
              ]}
            >
              <Text style={styles.progressDotText}>1</Text>
            </View>
            <Text style={styles.progressLabel}>Şirket</Text>
          </View>
          <View
            style={[
              styles.progressLine,
              step >= 2 && styles.progressLineActive,
            ]}
          />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                step >= 2 && styles.progressDotActive,
              ]}
            >
              <Text style={styles.progressDotText}>2</Text>
            </View>
            <Text style={styles.progressLabel}>Admin</Text>
          </View>
          <View
            style={[
              styles.progressLine,
              step >= 3 && styles.progressLineActive,
            ]}
          />
          <View style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                step >= 3 && styles.progressDotActive,
              ]}
            >
              <Text style={styles.progressDotText}>3</Text>
            </View>
            <Text style={styles.progressLabel}>Paket</Text>
          </View>
        </View>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  progressStep: {
    alignItems: "center",
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E9ECEF",
    justifyContent: "center",
    alignItems: "center",
  },
  progressDotActive: {
    backgroundColor: "#5E72E4",
  },
  progressDotText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  progressLabel: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 5,
  },
  progressLine: {
    width: 40,
    height: 3,
    backgroundColor: "#E9ECEF",
    marginHorizontal: 5,
  },
  progressLineActive: {
    backgroundColor: "#5E72E4",
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: "#8898AA",
    marginBottom: 25,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#525F7F",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#32325D",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 20,
    gap: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  backButton: {
    backgroundColor: "#F6F9FC",
  },
  backButtonText: {
    color: "#525F7F",
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#5E72E4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  nextButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#2DCE89",
  },
  createButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  summaryLabel: {
    width: 80,
    color: "#8898AA",
    fontSize: 13,
  },
  summaryValue: {
    flex: 1,
    color: "#32325D",
    fontSize: 13,
    fontWeight: "500",
  },
});

export default CreateCompanyScreen;
