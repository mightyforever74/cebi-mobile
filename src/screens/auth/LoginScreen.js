// src/screens/auth/LoginScreen.js
// TulipFleet - Login Screen
// Updated: 01 Mart 2026 - Demo butonları kaldırıldı (production cleanup)

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
import { COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const LoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
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
        <Ionicons name="warning-outline" size={48} color="#991B1B" />
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

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>{t("auth.login") || "Giriş Yap"}</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color="#991B1B" />
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
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="ornek@tulipfleet.com"
                placeholderTextColor={COLORS.textSecondary}
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
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textSecondary}
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
                  color={COLORS.textSecondary}
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
              color={COLORS.primary}
              style={{ marginRight: 4 }}
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
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
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
        </View>

        {/* Version Info */}
        <Text style={styles.version}>TulipFleet v2.0.1</Text>
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
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoImage: {
    width: 120,
    height: 150,
    marginBottom: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 24,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
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
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  forgotPasswordLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  contactLink: {
    marginTop: 16,
    alignItems: "center",
  },
  contactText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  contactTextBold: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  version: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
  configErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FEF2F2",
  },
  configErrorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#991B1B",
    marginTop: 16,
    marginBottom: 16,
  },
  configErrorText: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default LoginScreen;
