// src/screens/auth/ForgotPasswordScreen.js
// TulipFleet - Şifremi Unuttum (Email OTP)
// Created: 05 Şubat 2026
// Flow: 1) Email gir → 2) OTP kodu gir → 3) Yeni şifre oluştur

import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
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
import { COLORS } from "../../constants/config";
import { authAPI } from "../../services/api";

const STEPS = {
  EMAIL: 1,
  OTP: 2,
  NEW_PASSWORD: 3,
};

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();

  // Step state
  const [step, setStep] = useState(STEPS.EMAIL);

  // Form state
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for OTP input
  const otpInputRef = useRef(null);
  const cooldownRef = useRef(null);

  // ============================================
  // Cooldown Timer
  // ============================================
  const startCooldown = () => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ============================================
  // Step 1: Email gönder → OTP iste
  // ============================================
  const handleSendOTP = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setError(t("auth.emailRequired") || "E-posta adresi gerekli");
      return;
    }

    // Basit email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t("auth.invalidEmail") || "Geçerli bir e-posta adresi girin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authAPI.forgotPassword(trimmedEmail);

      // Her zaman başarılı göster (enumeration engeli)
      setStep(STEPS.OTP);
      startCooldown();

      // OTP input'a focus
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      // Rate limit hatası varsa göster
      if (err?.response?.status === 429) {
        setError(
          t("auth.tooManyRequests") ||
            "Çok fazla istek gönderdiniz. Lütfen birkaç dakika bekleyin."
        );
      } else {
        // Güvenlik: Diğer hataları da başarılı gibi göster
        setStep(STEPS.OTP);
        startCooldown();
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Step 2: OTP doğrula + Yeni şifre oluştur
  // ============================================
  const handleResetPassword = async () => {
    // OTP validation
    if (!otpCode || otpCode.length !== 6) {
      setError(t("auth.otpRequired") || "6 haneli doğrulama kodunu girin");
      return;
    }

    // Password validation
    if (!newPassword) {
      setError(t("auth.newPasswordRequired") || "Yeni şifre gerekli");
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.passwordTooShort") || "Şifre en az 6 karakter olmalı");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch") || "Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authAPI.resetPassword(
        email.trim().toLowerCase(),
        otpCode,
        newPassword
      );

      setStep(STEPS.NEW_PASSWORD);

      // Başarılı mesaj ve login'e yönlendir
      Alert.alert(
        t("auth.passwordResetSuccess") || "✅ Şifre Değiştirildi",
        t("auth.passwordResetSuccessMessage") ||
          "Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.",
        [
          {
            text: t("auth.goToLogin") || "Giriş Yap",
            onPress: () => navigation.navigate("Login"),
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      console.error("❌ Reset password error:", err);
      const status = err?.response?.status;
      const serverError = err?.response?.data?.error;

      if (status === 400) {
        if (serverError === "Invalid or expired code") {
          setError(
            t("auth.invalidOTP") ||
              "Geçersiz veya süresi dolmuş kod. Tekrar deneyin."
          );
        } else if (serverError === "Too many attempts") {
          setError(
            t("auth.tooManyAttempts") ||
              "Çok fazla deneme yapıldı. Yeni kod isteyin."
          );
        } else {
          setError(
            serverError || t("auth.resetFailed") || "Şifre sıfırlama başarısız"
          );
        }
      } else if (status === 429) {
        setError(
          t("auth.tooManyRequests") || "Çok fazla istek. Lütfen bekleyin."
        );
      } else {
        setError(
          t("auth.resetFailed") || "Şifre sıfırlama başarısız. Tekrar deneyin."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OTP tekrar gönder
  // ============================================
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError("");

    try {
      await authAPI.forgotPassword(email.trim().toLowerCase());
      startCooldown();
      Alert.alert(
        t("auth.codeSent") || "Kod Gönderildi",
        t("auth.codeSentMessage") ||
          "Yeni doğrulama kodu e-posta adresinize gönderildi."
      );
    } catch (err) {
      if (err?.response?.status === 429) {
        setError(
          t("auth.tooManyRequests") ||
            "Çok fazla istek. Lütfen birkaç dakika bekleyin."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Render: Step 1 - Email
  // ============================================
  const renderEmailStep = () => (
    <>
      {/* Icon */}
      <View style={styles.stepIcon}>
        <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
      </View>

      <Text style={styles.stepTitle}>
        {t("auth.forgotPasswordTitle") || "Şifremi Unuttum"}
      </Text>
      <Text style={styles.stepDescription}>
        {t("auth.forgotPasswordDesc") ||
          "Kayıtlı e-posta adresinizi girin. Şifre sıfırlama kodu göndereceğiz."}
      </Text>

      {/* Email Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{t("auth.email") || "E-posta"}</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="ornek@tulipfleet.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            autoFocus
          />
        </View>
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {t("auth.sendCode") || "Kod Gönder"}
          </Text>
        )}
      </TouchableOpacity>
    </>
  );

  // ============================================
  // Render: Step 2 - OTP + New Password
  // ============================================
  const renderOTPStep = () => (
    <>
      {/* Icon */}
      <View style={styles.stepIcon}>
        <Ionicons
          name="shield-checkmark-outline"
          size={48}
          color={COLORS.primary}
        />
      </View>

      <Text style={styles.stepTitle}>
        {t("auth.enterCode") || "Doğrulama Kodu"}
      </Text>
      <Text style={styles.stepDescription}>
        {t("auth.enterCodeDesc") ||
          `${email} adresine gönderilen 6 haneli kodu girin ve yeni şifrenizi belirleyin.`}
      </Text>

      {/* Masked Email Display */}
      <View style={styles.emailBadge}>
        <Ionicons name="mail" size={16} color={COLORS.primary} />
        <Text style={styles.emailBadgeText}>{email}</Text>
      </View>

      {/* OTP Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {t("auth.verificationCode") || "Doğrulama Kodu"}
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="keypad-outline"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            ref={otpInputRef}
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor={COLORS.textSecondary}
            value={otpCode}
            onChangeText={(text) => {
              // Sadece rakam, max 6 hane
              const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
              setOtpCode(cleaned);
              setError("");
            }}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />
        </View>
      </View>

      {/* New Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {t("auth.newPassword") || "Yeni Şifre"}
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setError("");
            }}
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNewPassword(!showNewPassword)}
          >
            <Ionicons
              name={showNewPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {t("auth.confirmNewPassword") || "Yeni Şifre (Tekrar)"}
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textSecondary}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setError("");
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.passwordHint}>
          {t("auth.passwordHint") || "En az 6 karakter"}
        </Text>
      </View>

      {/* Reset Button */}
      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.primaryButtonText}>
            {t("auth.resetPassword") || "Şifreyi Sıfırla"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Resend OTP */}
      <TouchableOpacity
        style={styles.resendLink}
        onPress={handleResendOTP}
        disabled={resendCooldown > 0 || loading}
      >
        <Ionicons
          name="refresh-outline"
          size={16}
          color={resendCooldown > 0 ? COLORS.textSecondary : COLORS.primary}
        />
        <Text
          style={[
            styles.resendText,
            resendCooldown > 0 && styles.resendTextDisabled,
          ]}
        >
          {resendCooldown > 0
            ? `${t("auth.resendIn") || "Tekrar gönder"} (${resendCooldown}s)`
            : t("auth.resendCode") || "Kodu tekrar gönder"}
        </Text>
      </TouchableOpacity>
    </>
  );

  // ============================================
  // Main Render
  // ============================================
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (step === STEPS.OTP) {
              Alert.alert(
                t("auth.goBackTitle") || "Geri Dön",
                t("auth.goBackMessage") ||
                  "E-posta adresini değiştirmek ister misiniz?",
                [
                  { text: t("common.cancel") || "İptal", style: "cancel" },
                  {
                    text: t("common.yes") || "Evet",
                    onPress: () => {
                      setStep(STEPS.EMAIL);
                      setOtpCode("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                    },
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          <Text style={styles.backText}>
            {step === STEPS.OTP
              ? t("auth.changeEmail") || "E-postayı Değiştir"
              : t("auth.backToLogin") || "Giriş Ekranı"}
          </Text>
        </TouchableOpacity>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View
              style={[
                styles.stepDot,
                step >= STEPS.EMAIL && styles.stepDotActive,
              ]}
            />
            <View
              style={[
                styles.stepLine,
                step >= STEPS.OTP && styles.stepLineActive,
              ]}
            />
            <View
              style={[
                styles.stepDot,
                step >= STEPS.OTP && styles.stepDotActive,
              ]}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Step Content */}
          {step === STEPS.EMAIL && renderEmailStep()}
          {step === STEPS.OTP && renderOTPStep()}
        </View>
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
    paddingTop: 60,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepLine: {
    width: 60,
    height: 3,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  emailBadgeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
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
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 8,
    textAlign: "center",
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  resendLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 6,
  },
  resendText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  resendTextDisabled: {
    color: COLORS.textSecondary,
  },
});

export default ForgotPasswordScreen;
