// src/screens/auth/LoginScreen.js
// TulipFleet - Login Screen
// Updated: 11 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles + makeStyles pattern
// ✅ 0 hardcoded hex, 8px grid, RADIUS/SHADOWS/TYPOGRAPHY tokens
// ✅ Card component, gap removed, dark mode ready

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
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

// ── Helper ──────────────────────────────────
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

// ── Styles factory ──────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: COLORS.SPACING.lg, // 24
    },

    // ── Header / Logo ──
    header: {
      alignItems: "center",
      marginBottom: COLORS.SPACING.xl, // 32
    },
    logoImage: {
      width: 120,
      height: 150,
      marginBottom: COLORS.SPACING.md, // 16
    },
    logo: {
      ...COLORS.TYPOGRAPHY.styles.h1,
      color: COLORS.PRIMARY,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
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

    // ── Error box ──
    errorBox: {
      backgroundColor: COLORS.ERROR_LIGHT,
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.sm, // 8
      marginBottom: COLORS.SPACING.md, // 16
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
      flexDirection: "row",
      alignItems: "center",
    },
    errorIcon: {
      marginRight: COLORS.SPACING.sm, // 8
    },
    errorText: {
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      flex: 1,
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
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.input, // 8
    },
    inputIcon: {
      paddingLeft: COLORS.SPACING.md, // 16
    },
    input: {
      flex: 1,
      padding: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },
    eyeButton: {
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.md, // 16
    },

    // ── Forgot password ──
    forgotPasswordLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      marginBottom: COLORS.SPACING.md, // 16
    },
    forgotPasswordIcon: {
      marginRight: COLORS.SPACING.xs, // 4
    },
    forgotPasswordText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Login button ──
    loginButton: {
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      ...COLORS.SHADOWS.button,
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
    },

    // ── Contact link ──
    contactLink: {
      marginTop: COLORS.SPACING.md, // 16
      alignItems: "center",
    },
    contactText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },
    contactTextBold: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // ── Demo section ──
    demoContainer: {
      marginTop: COLORS.SPACING.lg, // 24
      backgroundColor: COLORS.INFO_LIGHT,
      borderRadius: COLORS.RADIUS.card, // 12
      padding: COLORS.SPACING.md, // 16
      borderWidth: 1,
      borderColor: COLORS.INFO,
    },
    demoTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginBottom: COLORS.SPACING.xs, // 4
      textAlign: "center",
    },
    demoSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.INFO,
      marginBottom: COLORS.SPACING.md, // 16
      textAlign: "center",
    },
    demoButton: {
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.sm, // 8
      marginBottom: COLORS.SPACING.sm, // 8
      borderWidth: 2,
    },
    demoButtonDriver: {
      backgroundColor: COLORS.INFO_LIGHT,
      borderColor: COLORS.INFO,
    },
    demoButtonAdmin: {
      backgroundColor: COLORS.WARNING_LIGHT,
      borderColor: COLORS.WARNING,
    },
    demoButtonTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: 2,
    },
    demoButtonEmail: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
    demoNote: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs, // 10 (closest to 11)
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm, // 8
    },

    // ── Version ──
    version: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.lg, // 24
    },

    // ── Config error ──
    configErrorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: COLORS.SPACING.xl, // 32
      backgroundColor: COLORS.ERROR_LIGHT,
    },
    configErrorTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.md, // 16
      marginBottom: COLORS.SPACING.md, // 16
    },
    configErrorText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.ERROR,
      textAlign: "center",
      lineHeight: 22,
    },
  });

// ── Component ───────────────────────────────
const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const auth = useAuth();

  useEffect(() => {
    console.log("🔑 LoginScreen mounted");
  }, []);

  // Auth context yoksa hata göster
  if (!auth || typeof auth.login !== "function") {
    return (
      <View style={styles.configErrorContainer}>
        <Ionicons name="warning-outline" size={48} color={COLORS.ERROR} />
        <Text style={styles.configErrorTitle}>Configuration Error</Text>
        <Text style={styles.configErrorText}>
          AuthContext is not properly configured.{"\n\n"}
          Please check:{"\n"}
          1. App.js has AuthProvider wrapper{"\n"}
          2. AuthContext.js is in correct location{"\n"}
          3. Metro bundler is running
        </Text>
      </View>
    );
  }

  const { login } = auth;

  /**
   * Login işlemi
   */
  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("auth.emailAndPasswordRequired") || "Email ve şifre gerekli");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔑 Attempting login:", email);
      const result = await login(email, password);

      if (result.success) {
        console.log("✅ Login successful");
        // Navigation otomatik - RootNavigator isAuthenticated değişince geçiş yapar
      } else {
        setError(result.error || t("auth.loginError") || "Giriş başarısız");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(t("auth.unexpectedError") || "Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Demo butonları
   */
  const fillDriverCredentials = () => {
    setEmail("test@tulipfleet.com");
    setPassword("test123");
    setError("");
  };

  const fillAdminCredentials = () => {
    setEmail("admin@fleet.com");
    setPassword("admin123");
    setError("");
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
        {/* Logo / Başlık */}
        <View style={styles.header}>
          <Image
            source={require("../../../assets/splash-tulip.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logo}>TulipFleet</Text>
          <Text style={styles.subtitle}>
            {t("auth.fleetTracking") || "Araç Takip Sistemi"}
          </Text>
        </View>

        {/* Login Form — Card component */}
        <Card variant="elevated">
          <Text style={styles.title}>{t("auth.login") || "Giriş Yap"}</Text>

          {/* Error Message */}
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
                  setEmail(text.trim());
                  setError("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t("auth.password") || "Şifre"}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.TEXT_SECONDARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.PLACEHOLDER}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError("");
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Şifremi Unuttum Link */}
          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={() => navigation.navigate("ForgotPassword")}
            disabled={loading}
          >
            <Ionicons
              name="key-outline"
              size={16}
              color={COLORS.PRIMARY}
              style={styles.forgotPasswordIcon}
            />
            <Text style={styles.forgotPasswordText}>
              {t("auth.forgotPassword") || "Şifremi Unuttum"}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.loginButtonText}>
                {t("auth.login") || "Giriş Yap"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Bize Ulaşın Link */}
          <TouchableOpacity
            style={styles.contactLink}
            onPress={() => navigation.navigate("Contact")}
            disabled={loading}
          >
            <Text style={styles.contactText}>
              {t("auth.noAccount") || "Hesabınız yok mu?"}{" "}
              <Text style={styles.contactTextBold}>
                {t("auth.contactUs") || "Bize Ulaşın"}
              </Text>
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Demo Buttons */}
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>
            {t("auth.quickTest") || "Hızlı Test"}
          </Text>
          <Text style={styles.demoSubtitle}>
            {t("auth.demoSubtitle") || "Demo hesaplar ile otomatik giriş"}
          </Text>

          <TouchableOpacity
            style={[styles.demoButton, styles.demoButtonDriver]}
            onPress={fillDriverCredentials}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.demoButtonTitle}>
              {t("auth.driverAccount") || "Sürücü Hesabı"}
            </Text>
            <Text style={styles.demoButtonEmail}>test@tulipfleet.com</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoButton, styles.demoButtonAdmin]}
            onPress={fillAdminCredentials}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.demoButtonTitle}>
              {t("auth.adminAccount") || "Yönetici Hesabı"}
            </Text>
            <Text style={styles.demoButtonEmail}>admin@fleet.com</Text>
          </TouchableOpacity>

          <Text style={styles.demoNote}>
            {t("auth.demoNote") ||
              "Butonlara tıklayarak bilgileri otomatik doldurabilirsiniz"}
          </Text>
        </View>

        {/* Version Info */}
        <Text style={styles.version}>TulipFleet v2.1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
