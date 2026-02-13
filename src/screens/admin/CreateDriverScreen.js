// src/screens/admin/CreateDriverScreen.js
// TulipFleet - Admin Sürücü Ekleme Ekranı
// Updated: 12 Şubat 2026 - Theme migration + i18n (UI System Guide v3)
// ✅ useTheme + useThemedStyles, 0 hardcoded hex
// ✅ SPACING/RADIUS/TYPOGRAPHY tokens, gap→margin
// ✅ Tüm hardcoded Türkçe → t() fallback

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

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI } from "../../services/api";

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
      padding: COLORS.SPACING.md,
    },

    // ── Section ──
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
    },

    // ── Input ──
    inputContainer: {
      marginBottom: COLORS.SPACING.md,
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    input: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },

    // ── Row (replaces gap: 12) ──
    row: {
      flexDirection: "row",
    },
    halfInputLeft: {
      flex: 1,
      marginRight: COLORS.SPACING.sm,
    },
    halfInputRight: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm,
    },

    // ── Password ──
    passwordContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    passwordInput: {
      flex: 1,
      borderWidth: 0,
    },
    eyeButton: {
      padding: COLORS.SPACING.md,
    },

    // ── Save Button (replaces gap: 8) ──
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginTop: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.xl,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    saveButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

// ── Component ───────────────────────────────
const CreateDriverScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
    if (!formData.email.trim()) {
      Alert.alert(
        t("createDriver.error") || "Hata",
        t("createDriver.emailRequired") || "Email zorunludur"
      );
      return;
    }
    if (!formData.password.trim()) {
      Alert.alert(
        t("createDriver.error") || "Hata",
        t("createDriver.passwordRequired") || "Şifre zorunludur"
      );
      return;
    }
    if (formData.password.length < 6) {
      Alert.alert(
        t("createDriver.error") || "Hata",
        t("createDriver.passwordMinLength") || "Şifre en az 6 karakter olmalı"
      );
      return;
    }
    if (!formData.license_no.trim()) {
      Alert.alert(
        t("createDriver.error") || "Hata",
        t("createDriver.licenseRequired") || "Ehliyet numarası zorunludur"
      );
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
          t("createDriver.success") || "✅ Başarılı",
          t("createDriver.driverAdded") || "Sürücü başarıyla eklendi",
          [
            {
              text: t("profile.ok") || "Tamam",
              onPress: () => navigation.goBack(),
            },
          ],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Create driver error:", error);
      Alert.alert(
        t("createDriver.error") || "Hata",
        error.response?.data?.error ||
          t("createDriver.createFailed") ||
          "Sürücü eklenemedi"
      );
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
          placeholderTextColor={COLORS.PLACEHOLDER}
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
              color={COLORS.PLACEHOLDER}
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
          <Text style={styles.sectionTitle}>
            {t("createDriver.accountInfo") || "Hesap Bilgileri"}
          </Text>

          {renderInput(
            `${t("createDriver.email") || "Email"} *`,
            "email",
            "driver@example.com",
            { keyboardType: "email-address" }
          )}

          {renderInput(
            `${t("createDriver.password") || "Şifre"} *`,
            "password",
            t("createDriver.passwordPlaceholder") || "En az 6 karakter",
            { isPassword: true }
          )}

          {/* Kişisel Bilgiler */}
          <Text style={styles.sectionTitle}>
            {t("createDriver.personalInfo") || "Kişisel Bilgiler"}
          </Text>

          <View style={styles.row}>
            <View style={styles.halfInputLeft}>
              {renderInput(
                t("createDriver.firstName") || "Ad",
                "first_name",
                "Ali",
                { autoCapitalize: "words" }
              )}
            </View>
            <View style={styles.halfInputRight}>
              {renderInput(
                t("createDriver.lastName") || "Soyad",
                "last_name",
                "Yılmaz",
                { autoCapitalize: "words" }
              )}
            </View>
          </View>

          {renderInput(
            t("createDriver.phone") || "Telefon",
            "phone",
            "05XX XXX XX XX",
            { keyboardType: "phone-pad" }
          )}

          {/* Ehliyet Bilgileri */}
          <Text style={styles.sectionTitle}>
            {t("createDriver.licenseInfo") || "Ehliyet Bilgileri"}
          </Text>

          {renderInput(
            `${t("createDriver.licenseNo") || "Ehliyet No"} *`,
            "license_no",
            "TR123456789",
            { autoCapitalize: "characters" }
          )}

          {renderInput(
            t("createDriver.licenseExpiry") || "Ehliyet Bitiş Tarihi",
            "license_expiry",
            "2025-12-31",
            { keyboardType: "default" }
          )}

          {/* Acil Durum */}
          <Text style={styles.sectionTitle}>
            {t("createDriver.emergency") || "Acil Durum"}
          </Text>

          {renderInput(
            t("createDriver.emergencyContact") || "Acil Durum Kişisi",
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
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons
                  name="person-add"
                  size={20}
                  color={COLORS.WHITE}
                  style={styles.saveButtonIcon}
                />
                <Text style={styles.saveButtonText}>
                  {t("createDriver.addDriver") || "Sürücü Ekle"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateDriverScreen;
