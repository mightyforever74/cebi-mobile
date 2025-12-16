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
import { COLORS } from "../../constants/config"; // ← Fix import
import { userAPI } from "../../services/api";

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Hata", "Tüm alanları doldurun");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalı");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Hata", "Yeni şifre mevcut şifreden farklı olmalı");
      return;
    }

    setLoading(true);
    try {
      await userAPI.changePassword({ currentPassword, newPassword });

      // Input'ları temizle
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Alert'i setTimeout ile göster (Android fix)
      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Şifreniz başarıyla değiştirildi.",
          [
            {
              text: "Tamam",
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Password change error:", error);
      Alert.alert(
        "Hata",
        error.response?.data?.error || "Şifre değiştirilemedi"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPasswordInput = (
    label,
    value,
    setValue,
    show,
    setShow,
    placeholder
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShow(!show)}
        >
          <Ionicons
            name={show ? "eye-off" : "eye"}
            size={22}
            color={COLORS.gray}
          />
        </TouchableOpacity>
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
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              Güvenliğiniz için güçlü bir şifre seçin. En az 6 karakter
              kullanın.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {renderPasswordInput(
              "Mevcut Şifre",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              setShowCurrent,
              "Mevcut şifrenizi girin"
            )}

            {renderPasswordInput(
              "Yeni Şifre",
              newPassword,
              setNewPassword,
              showNew,
              setShowNew,
              "Yeni şifrenizi girin"
            )}

            {renderPasswordInput(
              "Yeni Şifre (Tekrar)",
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              setShowConfirm,
              "Yeni şifrenizi tekrar girin"
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Şifreyi Değiştir</Text>
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight || "#E8F4FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.primary,
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
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
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeButton: {
    padding: 16,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ChangePasswordScreen;
