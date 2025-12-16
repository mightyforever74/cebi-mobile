import { Ionicons } from "@expo/vector-icons";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/config";
import { driverAPI } from "../../services/api";

const CreateDriverScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    license_no: "",
    license_expiry: "",
    emergency_contact: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.email.trim()) {
      Alert.alert("Hata", "Email zorunludur");
      return;
    }
    if (!formData.password.trim()) {
      Alert.alert("Hata", "Şifre zorunludur");
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalı");
      return;
    }
    if (!formData.license_no.trim()) {
      Alert.alert("Hata", "Ehliyet numarası zorunludur");
      return;
    }

    setLoading(true);
    try {
      const data = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim(),
        license_no: formData.license_no.trim().toUpperCase(),
        license_expiry: formData.license_expiry || null,
        emergency_contact: formData.emergency_contact.trim(),
      };

      await driverAPI.createWithUser(data);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Sürücü başarıyla eklendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Create driver error:", error);
      Alert.alert("Hata", error.response?.data?.error || "Sürücü eklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={options.isPassword ? styles.passwordContainer : null}>
        <TextInput
          style={[styles.input, options.isPassword && styles.passwordInput]}
          value={formData[field]}
          onChangeText={(value) => handleChange(field, value)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "none"}
          secureTextEntry={options.isPassword && !showPassword}
        />
        {options.isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color={COLORS.gray}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hesap Bilgileri */}
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>

          {renderInput("Email *", "email", "driver@example.com", {
            keyboardType: "email-address",
          })}

          {renderInput("Şifre *", "password", "En az 6 karakter", {
            isPassword: true,
          })}

          {/* Kişisel Bilgiler */}
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput("Ad", "first_name", "Ali", {
                autoCapitalize: "words",
              })}
            </View>
            <View style={styles.halfInput}>
              {renderInput("Soyad", "last_name", "Yılmaz", {
                autoCapitalize: "words",
              })}
            </View>
          </View>

          {renderInput("Telefon", "phone", "05XX XXX XX XX", {
            keyboardType: "phone-pad",
          })}

          {/* Ehliyet Bilgileri */}
          <Text style={styles.sectionTitle}>Ehliyet Bilgileri</Text>

          {renderInput("Ehliyet No *", "license_no", "TR123456789", {
            autoCapitalize: "characters",
          })}

          {renderInput("Ehliyet Bitiş Tarihi", "license_expiry", "2025-12-31", {
            keyboardType: "default",
          })}

          {/* Acil Durum */}
          <Text style={styles.sectionTitle}>Acil Durum</Text>

          {renderInput(
            "Acil Durum Kişisi",
            "emergency_contact",
            "Ayşe Yılmaz - 05XX XXX XX XX"
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Sürücü Ekle</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
  },
  eyeButton: {
    padding: 16,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CreateDriverScreen;
