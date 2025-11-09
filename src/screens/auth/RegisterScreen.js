// src/screens/auth/RegisterScreen.js
// TulipFleet - Register Screen (Mock)

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
import { COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    licenseNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();

  /**
   * Form field güncelleme
   */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  /**
   * Validation
   */
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Ad gerekli";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Soyad gerekli";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email gerekli";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Geçersiz email formatı";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Telefon gerekli";
    }
    if (!formData.password) {
      newErrors.password = "Şifre gerekli";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalı";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = "Ehliyet numarası gerekli";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Kayıt işlemi
   */
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await register(formData);

      if (result.success) {
        Alert.alert(
          "Başarılı! 🎉",
          result.message ||
            "Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.",
          [
            {
              text: "Tamam",
              onPress: () => {
                // Mock sistemde direkt login olabilir
                console.log("✅ Registration successful");
              },
            },
          ]
        );
      } else {
        Alert.alert("Hata", result.error || "Kayıt başarısız");
      }
    } catch (err) {
      console.error("Register error:", err);
      Alert.alert("Hata", "Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login ekranına dön
   */
  const goToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🌷 TulipFleet</Text>
          <Text style={styles.subtitle}>Sürücü Kaydı</Text>
        </View>

        {/* Register Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Yeni Hesap Oluştur</Text>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ad *</Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              placeholder="Ahmet"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.firstName}
              onChangeText={(text) => updateField("firstName", text)}
              editable={!loading}
            />
            {errors.firstName && (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            )}
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Soyad *</Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              placeholder="Yılmaz"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.lastName}
              onChangeText={(text) => updateField("lastName", text)}
              editable={!loading}
            />
            {errors.lastName && (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ahmet@tulipfleet.com"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.email}
              onChangeText={(text) => updateField("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Telefon *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="05551234567"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.phone}
              onChangeText={(text) => updateField("phone", text)}
              keyboardType="phone-pad"
              editable={!loading}
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          {/* License Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ehliyet No *</Text>
            <TextInput
              style={[styles.input, errors.licenseNumber && styles.inputError]}
              placeholder="B123456789"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.licenseNumber}
              onChangeText={(text) => updateField("licenseNumber", text)}
              autoCapitalize="characters"
              editable={!loading}
            />
            {errors.licenseNumber && (
              <Text style={styles.errorText}>{errors.licenseNumber}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="En az 6 karakter"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.password}
              onChangeText={(text) => updateField("password", text)}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre (Tekrar) *</Text>
            <TextInput
              style={[
                styles.input,
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder="Şifreyi tekrar girin"
              placeholderTextColor={COLORS.textSecondary}
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.confirmPassword && (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerButtonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={goToLogin}
            disabled={loading}
          >
            <Text style={styles.loginText}>
              Zaten hesabınız var mı?{" "}
              <Text style={styles.loginTextBold}>Giriş Yap</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>ℹ️ Bilgi</Text>
          <Text style={styles.infoText}>
            • Kayıt sonrası yönetici onayı gereklidir{"\n"}• Onay sürecinden
            sonra giriş yapabilirsiniz{"\n"}• Sorularınız için:
            destek@tulipfleet.com
          </Text>
        </View>

        {/* Mock Mode Notice */}
        <View style={styles.mockNotice}>
          <Text style={styles.mockText}>
            🧪 Mock Mode: Kayıt hemen onaylanacak ve giriş yapabilirsiniz
          </Text>
        </View>

        {/* Version */}
        <Text style={styles.version}>TulipFleet v1.0.0 (Mock Mode)</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  logo: {
    fontSize: 40,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  loginLink: {
    marginTop: 16,
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginTextBold: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  infoContainer: {
    marginTop: 20,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1E40AF",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#3B82F6",
    lineHeight: 20,
  },
  mockNotice: {
    marginTop: 16,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  mockText: {
    fontSize: 12,
    color: "#92400E",
    textAlign: "center",
  },
  version: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
});

export default RegisterScreen;
