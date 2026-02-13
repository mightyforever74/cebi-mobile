// src/screens/shared/ChangePasswordScreen.js
// TulipFleet - Change Password Screen
// Updated: 11 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles + makeStyles pattern
// ✅ 0 hardcoded hex, 8px grid, no gap, TYPOGRAPHY tokens
// ✅ Card component, i18n, dark mode ready

import { Ionicons } from "@expo/vector-icons";
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
import { SafeAreaView } from "react-native-safe-area-context";

import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { userAPI } from "../../services/api";

// ── Styles factory ──────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      padding: COLORS.SPACING.md, // 16
    },

    // ── Info card ──
    infoCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INFO_LIGHT,
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card, // 12
      marginBottom: COLORS.SPACING.lg, // 24
      borderWidth: 1,
      borderColor: COLORS.INFO,
    },
    infoIcon: {
      marginRight: COLORS.SPACING.md, // 16
    },
    infoText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      lineHeight: 20,
    },

    // ── Input ──
    inputContainer: {
      marginBottom: COLORS.SPACING.lg, // 24
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input, // 8
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    passwordInput: {
      flex: 1,
      padding: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },
    eyeButton: {
      padding: COLORS.SPACING.md, // 16
    },

    // ── Submit button ──
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      marginTop: COLORS.SPACING.xl, // 32
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitIcon: {
      marginRight: COLORS.SPACING.sm, // 8
    },
    submitButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
    },
  });

// ── Component ───────────────────────────────
const ChangePasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
      Alert.alert(
        t("common.error") || "Hata",
        t("changePassword.allFieldsRequired") || "Tüm alanları doldurun"
      );
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(
        t("common.error") || "Hata",
        t("changePassword.minLength") || "Yeni şifre en az 6 karakter olmalı"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("changePassword.mismatch") || "Yeni şifreler eşleşmiyor"
      );
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert(
        t("common.error") || "Hata",
        t("changePassword.samePassword") ||
          "Yeni şifre mevcut şifreden farklı olmalı"
      );
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
          t("changePassword.successTitle") || "Başarılı",
          t("changePassword.successMessage") ||
            "Şifreniz başarıyla değiştirildi.",
          [
            {
              text: t("common.ok") || "Tamam",
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Password change error:", error);
      Alert.alert(
        t("common.error") || "Hata",
        error.response?.data?.error ||
          t("changePassword.failed") ||
          "Şifre değiştirilemedi"
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
          placeholderTextColor={COLORS.PLACEHOLDER}
          secureTextEntry={!show}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShow(!show)}
        >
          <Ionicons
            name={show ? "eye-off" : "eye"}
            size={22}
            color={COLORS.MUTED}
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
              color={COLORS.PRIMARY}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              {t("changePassword.hint") ||
                "Güvenliğiniz için güçlü bir şifre seçin. En az 6 karakter kullanın."}
            </Text>
          </View>

          {/* Form — Card component */}
          <Card variant="flat" noMargin>
            {renderPasswordInput(
              t("changePassword.currentPassword") || "Mevcut Şifre",
              currentPassword,
              setCurrentPassword,
              showCurrent,
              setShowCurrent,
              t("changePassword.currentPlaceholder") || "Mevcut şifrenizi girin"
            )}

            {renderPasswordInput(
              t("changePassword.newPassword") || "Yeni Şifre",
              newPassword,
              setNewPassword,
              showNew,
              setShowNew,
              t("changePassword.newPlaceholder") || "Yeni şifrenizi girin"
            )}

            {renderPasswordInput(
              t("changePassword.confirmPassword") || "Yeni Şifre (Tekrar)",
              confirmPassword,
              setConfirmPassword,
              showConfirm,
              setShowConfirm,
              t("changePassword.confirmPlaceholder") ||
                "Yeni şifrenizi tekrar girin"
            )}
          </Card>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={COLORS.WHITE}
                  style={styles.submitIcon}
                />
                <Text style={styles.submitButtonText}>
                  {t("changePassword.submit") || "Şifreyi Değiştir"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;
