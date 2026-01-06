// src/screens/auth/LoginScreen.js
// TulipFleet - Login Screen with CORRECT credentials

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const auth = useAuth();

  useEffect(() => {
    console.log("🔍 LoginScreen mounted");
    console.log("🔍 Auth context:", auth);
    console.log("🔍 Auth.login exists?", typeof auth?.login === "function");
  }, []);

  // Eğer auth undefined ise erken uyarı ver
  if (!auth || typeof auth.login !== "function") {
    return (
      <View style={styles.configErrorContainer}>
        <Text style={styles.configErrorTitle}>⚠️ Configuration Error</Text>
        <Text style={styles.configErrorText}>
          AuthContext is not properly configured.{"\n\n"}
          Please check:{"\n"}
          1. App.js has AuthProvider wrapper{"\n"}
          2. AuthContext.js is in correct location{"\n"}
          3. Metro bundler is running
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            console.log("Retrying...");
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { login } = auth;

  /**
   * Login işlemi
   */
  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      setError("Email ve şifre gerekli");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("🔐 Attempting login:", email);
      const result = await login(email, password);

      console.log("Login result:", result);

      if (result.success) {
        console.log("✅ Login successful");
        // Navigation otomatik olarak RootNavigator tarafından yapılacak
        // isAuthenticated state değişince AppNavigator'a geçecek
      } else {
        setError(result.error || "Giriş başarısız");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      setError("Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Demo butonları - DOĞRU CREDENTIALS
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

  /**
   * Kayıt ekranına git
   */
  const goToRegister = () => {
    navigation.navigate("Onboarding");
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
          <Text style={styles.logo}>🌷 TulipFleet</Text>
          <Text style={styles.subtitle}>Araç Takip Sistemi</Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Giriş Yap</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
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
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textSecondary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setError("");
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={goToRegister}
            disabled={loading}
          >
            <Text style={styles.registerText}>
              Hesabınız yok mu?{" "}
              <Text style={styles.registerTextBold}>Kayıt Ol</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Demo Buttons - DOĞRU HESAPLAR */}
        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>⚡ Hızlı Test</Text>
          <Text style={styles.demoSubtitle}>
            Demo hesaplar ile otomatik giriş
          </Text>

          {/* Driver Demo Button */}
          <TouchableOpacity
            style={[styles.demoButton, styles.demoButtonDriver]}
            onPress={fillDriverCredentials}
            disabled={loading}
          >
            <Text style={styles.demoButtonTitle}>👤 Sürücü Hesabı</Text>
            <Text style={styles.demoButtonEmail}>test@tulipfleet.com</Text>
          </TouchableOpacity>

          {/* Admin Demo Button */}
          <TouchableOpacity
            style={[styles.demoButton, styles.demoButtonAdmin]}
            onPress={fillAdminCredentials}
            disabled={loading}
          >
            <Text style={styles.demoButtonTitle}>👔 Yönetici Hesabı</Text>
            <Text style={styles.demoButtonEmail}>admin@fleet.com</Text>
          </TouchableOpacity>

          <Text style={styles.demoNote}>
            ⓘ Butonlara tıklayarak bilgileri otomatik doldurabilirsiniz
          </Text>
        </View>

        {/* Version Info */}
        <Text style={styles.version}>TulipFleet v1.0.0</Text>
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
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
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
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
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
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  registerLink: {
    marginTop: 16,
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerTextBold: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  demoContainer: {
    marginTop: 32,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E40AF",
    marginBottom: 4,
    textAlign: "center",
  },
  demoSubtitle: {
    fontSize: 12,
    color: "#3B82F6",
    marginBottom: 16,
    textAlign: "center",
  },
  demoButton: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  demoButtonDriver: {
    backgroundColor: "#DBEAFE",
    borderColor: "#3B82F6",
  },
  demoButtonAdmin: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  demoButtonTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 2,
  },
  demoButtonEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  demoNote: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  version: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 24,
  },
  // Config Error Screen Styles
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
    marginBottom: 16,
  },
  configErrorText: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#DC2626",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LoginScreen;
