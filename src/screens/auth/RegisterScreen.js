// src/screens/auth/RegisterScreen.js
// TulipFleet - Register Screen
// Updated: 11 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles + makeStyles pattern
// ✅ 0 hardcoded hex, 8px grid, RADIUS/SHADOWS/TYPOGRAPHY tokens
// ✅ Card component, i18n, dark mode ready

import { useState } from "react";
import { useTranslation } from "react-i18next";
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

import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// ── Styles factory ──────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      flexGrow: 1,
      padding: COLORS.SPACING.lg, // 24
    },

    // ── Header / Logo ──
    header: {
      alignItems: "center",
      marginTop: COLORS.SPACING.lg, // 24
      marginBottom: COLORS.SPACING.lg, // 24
    },
    logo: {
      ...COLORS.TYPOGRAPHY.styles.h1,
      color: COLORS.PRIMARY,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },

    // ── Form title ──
    title: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.lg, // 24
      textAlign: "center",
    },

    // ── Input ──
    inputContainer: {
      marginBottom: COLORS.SPACING.md, // 16
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    input: {
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.input, // 8
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },
    inputError: {
      borderColor: COLORS.ERROR,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.xs, // 4
    },

    // ── Register button ──
    registerButton: {
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.sm, // 8
      ...COLORS.SHADOWS.button,
    },
    registerButtonDisabled: {
      opacity: 0.6,
    },
    registerButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
    },

    // ── Login link ──
    loginLink: {
      marginTop: COLORS.SPACING.md, // 16
      alignItems: "center",
    },
    loginText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },
    loginTextBold: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // ── Info container ──
    infoContainer: {
      marginTop: COLORS.SPACING.lg, // 24
      backgroundColor: COLORS.INFO_LIGHT,
      borderRadius: COLORS.RADIUS.card, // 12
      padding: COLORS.SPACING.md, // 16
      borderWidth: 1,
      borderColor: COLORS.INFO,
    },
    infoTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    infoText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md, // 14 (closest to 13)
      color: COLORS.INFO,
      lineHeight: 20,
    },

    // ── Mock notice ──
    mockNotice: {
      marginTop: COLORS.SPACING.md, // 16
      backgroundColor: COLORS.WARNING_LIGHT,
      borderRadius: COLORS.RADIUS.sm, // 8
      padding: COLORS.SPACING.md, // 16
      borderWidth: 1,
      borderColor: COLORS.WARNING,
    },
    mockText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WARNING,
      textAlign: "center",
    },

    // ── Version ──
    version: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.md, // 16
      marginBottom: COLORS.SPACING.lg, // 24
    },
  });

// ── Component ───────────────────────────────
const RegisterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
      newErrors.firstName =
        t("register.errors.firstNameRequired") || "Ad gerekli";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName =
        t("register.errors.lastNameRequired") || "Soyad gerekli";
    }
    if (!formData.email.trim()) {
      newErrors.email = t("register.errors.emailRequired") || "Email gerekli";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email =
        t("register.errors.emailInvalid") || "Geçersiz email formatı";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = t("register.errors.phoneRequired") || "Telefon gerekli";
    }
    if (!formData.password) {
      newErrors.password =
        t("register.errors.passwordRequired") || "Şifre gerekli";
    } else if (formData.password.length < 6) {
      newErrors.password =
        t("register.errors.passwordShort") || "Şifre en az 6 karakter olmalı";
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        t("register.errors.confirmPasswordRequired") || "Şifre tekrar gerekli";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword =
        t("register.errors.passwordMismatch") || "Şifreler eşleşmiyor";
    }
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber =
        t("register.errors.licenseRequired") || "Ehliyet numarası gerekli";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Kayıt işlemi
   */
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register(formData);

      if (result.success) {
        Alert.alert(
          t("register.successTitle") || "Başarılı!",
          result.message ||
            t("register.successMessage") ||
            "Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.",
          [
            {
              text: t("common.ok") || "Tamam",
              onPress: () => {
                console.log("✅ Registration successful");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t("common.error") || "Hata",
          result.error || t("register.failed") || "Kayıt başarısız"
        );
      }
    } catch (err) {
      console.error("Register error:", err);
      Alert.alert(
        t("common.error") || "Hata",
        t("auth.unexpectedError") || "Beklenmeyen bir hata oluştu"
      );
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
          <Text style={styles.logo}>TulipFleet</Text>
          <Text style={styles.subtitle}>
            {t("register.driverRegistration") || "Sürücü Kaydı"}
          </Text>
        </View>

        {/* Register Form — Card component */}
        <Card variant="elevated">
          <Text style={styles.title}>
            {t("register.createAccount") || "Yeni Hesap Oluştur"}
          </Text>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t("register.firstName") || "Ad"} *
            </Text>
            <TextInput
              style={[styles.input, errors.firstName && styles.inputError]}
              placeholder="Ahmet"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.firstName}
              onChangeText={(text) => updateField("firstName", text)}
              editable={!loading}
            />
            {errors.firstName ? (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            ) : null}
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t("register.lastName") || "Soyad"} *
            </Text>
            <TextInput
              style={[styles.input, errors.lastName && styles.inputError]}
              placeholder="Yılmaz"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.lastName}
              onChangeText={(text) => updateField("lastName", text)}
              editable={!loading}
            />
            {errors.lastName ? (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            ) : null}
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t("auth.email") || "Email"} *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="ahmet@tulipfleet.com"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.email}
              onChangeText={(text) => updateField("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Phone */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t("register.phone") || "Telefon"} *
            </Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="05551234567"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.phone}
              onChangeText={(text) => updateField("phone", text)}
              keyboardType="phone-pad"
              editable={!loading}
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          {/* License Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t("register.licenseNumber") || "Ehliyet No"} *
            </Text>
            <TextInput
              style={[styles.input, errors.licenseNumber && styles.inputError]}
              placeholder="B123456789"
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.licenseNumber}
              onChangeText={(text) => updateField("licenseNumber", text)}
              autoCapitalize="characters"
              editable={!loading}
            />
            {errors.licenseNumber ? (
              <Text style={styles.errorText}>{errors.licenseNumber}</Text>
            ) : null}
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t("auth.password") || "Şifre"} *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder={t("register.passwordHint") || "En az 6 karakter"}
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.password}
              onChangeText={(text) => updateField("password", text)}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              {t("register.confirmPassword") || "Şifre (Tekrar)"} *
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.confirmPassword && styles.inputError,
              ]}
              placeholder={
                t("register.confirmPasswordHint") || "Şifreyi tekrar girin"
              }
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={formData.confirmPassword}
              onChangeText={(text) => updateField("confirmPassword", text)}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              loading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.registerButtonText}>
                {t("register.submit") || "Kayıt Ol"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={goToLogin}
            disabled={loading}
          >
            <Text style={styles.loginText}>
              {t("register.hasAccount") || "Zaten hesabınız var mı?"}{" "}
              <Text style={styles.loginTextBold}>
                {t("auth.login") || "Giriş Yap"}
              </Text>
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>
            {t("register.infoTitle") || "Bilgi"}
          </Text>
          <Text style={styles.infoText}>
            {t("register.infoText") ||
              "Kayıt sonrası yönetici onayı gereklidir. Onay sürecinden sonra giriş yapabilirsiniz. Sorularınız için: destek@tulipfleet.com"}
          </Text>
        </View>

        {/* Mock Mode Notice */}
        <View style={styles.mockNotice}>
          <Text style={styles.mockText}>
            {t("register.mockNotice") ||
              "Mock Mode: Kayıt hemen onaylanacak ve giriş yapabilirsiniz"}
          </Text>
        </View>

        {/* Version */}
        <Text style={styles.version}>TulipFleet v2.1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
