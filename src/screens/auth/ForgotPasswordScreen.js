// src/screens/auth/ForgotPasswordScreen.js
// TulipFleet - Şifremi Unuttum (Email OTP)
// Created: 05 Şubat 2026
// Updated: UI System Guide v3 uyumlu
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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { authAPI } from "../../services/api";

const STEPS = {
  EMAIL: 1,
  OTP: 2,
  NEW_PASSWORD: 3,
};

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError(t("auth.invalidEmail") || "Geçerli bir e-posta adresi girin");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authAPI.forgotPassword(trimmedEmail);
      setStep(STEPS.OTP);
      startCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 300);
    } catch (err) {
      console.error("Forgot password error:", err);
      if (err?.response?.status === 429) {
        setError(
          t("auth.tooManyRequests") ||
            "Çok fazla istek gönderdiniz. Lütfen birkaç dakika bekleyin."
        );
      } else {
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
    if (!otpCode || otpCode.length !== 6) {
      setError(t("auth.otpRequired") || "6 haneli doğrulama kodunu girin");
      return;
    }

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

      Alert.alert(
        t("auth.passwordResetSuccess") || "Şifre Değiştirildi",
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
      console.error("Reset password error:", err);
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
      <View style={styles.stepIcon}>
        <Ionicons name="mail-outline" size={48} color={COLORS.PRIMARY} />
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
            color={COLORS.TEXT_SECONDARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="ornek@tulipfleet.com"
            placeholderTextColor={COLORS.PLACEHOLDER}
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
          <ActivityIndicator color={COLORS.WHITE} />
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
      <View style={styles.stepIcon}>
        <Ionicons
          name="shield-checkmark-outline"
          size={48}
          color={COLORS.PRIMARY}
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
        <Ionicons
          name="mail"
          size={16}
          color={COLORS.PRIMARY}
          style={styles.emailBadgeIcon}
        />
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
            color={COLORS.TEXT_SECONDARY}
            style={styles.inputIcon}
          />
          <TextInput
            ref={otpInputRef}
            style={[styles.input, styles.otpInput]}
            placeholder="000000"
            placeholderTextColor={COLORS.PLACEHOLDER}
            value={otpCode}
            onChangeText={(text) => {
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
            color={COLORS.TEXT_SECONDARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.PLACEHOLDER}
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
              color={COLORS.TEXT_SECONDARY}
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
            color={COLORS.TEXT_SECONDARY}
            style={styles.inputIcon}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="••••••••"
            placeholderTextColor={COLORS.PLACEHOLDER}
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
              color={COLORS.TEXT_SECONDARY}
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
          <ActivityIndicator color={COLORS.WHITE} />
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
          color={resendCooldown > 0 ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY}
          style={styles.resendIcon}
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
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
          <Text style={styles.backText}>
            {step === STEPS.OTP
              ? t("auth.changeEmail") || "E-postayı Değiştir"
              : t("auth.backToLogin") || "Giriş Ekranı"}
          </Text>
        </TouchableOpacity>

        {/* Form Card */}
        <Card variant="elevated" noMargin style={styles.formCardOverride}>
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
              <Ionicons
                name="alert-circle"
                size={18}
                color={COLORS.ERROR}
                style={styles.errorIcon}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Step Content */}
          {step === STEPS.EMAIL && renderEmailStep()}
          {step === STEPS.OTP && renderOTPStep()}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      flexGrow: 1,
      padding: COLORS.SPACING.md,
      paddingTop: 56, // SafeArea (8px grid: 7*8)
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    backText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    formCardOverride: {
      padding: COLORS.SPACING.lg,
    },
    stepIndicator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    stepDot: {
      width: COLORS.SPACING.sm + COLORS.SPACING.xs, // 12
      height: COLORS.SPACING.sm + COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.DIVIDER,
    },
    stepDotActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    stepLine: {
      width: 56, // 8px grid: 7*8
      height: 3,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.sm,
    },
    stepLineActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    stepIcon: {
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    stepTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT_PRIMARY,
      textAlign: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    stepDescription: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: COLORS.SPACING.lg,
    },
    emailBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: COLORS.INFO_LIGHT,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      marginBottom: COLORS.SPACING.md,
    },
    emailBadgeIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    emailBadgeText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.PRIMARY,
    },
    inputContainer: {
      marginBottom: COLORS.SPACING.md,
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.input,
    },
    inputIcon: {
      paddingLeft: COLORS.SPACING.sm,
    },
    input: {
      flex: 1,
      padding: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
    },
    otpInput: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      letterSpacing: 8,
      textAlign: "center",
    },
    eyeButton: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
    },
    passwordHint: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
      marginLeft: COLORS.SPACING.xs,
    },
    errorBox: {
      backgroundColor: COLORS.ERROR_LIGHT,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.button,
      marginBottom: COLORS.SPACING.md,
      borderLeftWidth: COLORS.SPACING.xs,
      borderLeftColor: COLORS.ERROR,
      flexDirection: "row",
      alignItems: "center",
    },
    errorIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    errorText: {
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      flex: 1,
    },
    primaryButton: {
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight,
      borderRadius: COLORS.RADIUS.button,
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.button,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },
    resendLink: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.md,
    },
    resendIcon: {
      marginRight: COLORS.SPACING.xs,
    },
    resendText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.PRIMARY,
    },
    resendTextDisabled: {
      color: COLORS.TEXT_SECONDARY,
    },
  });

export default ForgotPasswordScreen;
