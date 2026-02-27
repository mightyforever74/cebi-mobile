// src/screens/shared/EditProfileScreen.js
// TulipFleet - Profil Düzenleme Ekranı
// Updated: UI System Guide v3 uyumlu

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
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { userAPI } from "../../services/api";

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert(
        t("common.error") || "Hata",
        t("editProfile.firstNameRequired") || "Ad alanı zorunludur"
      );
      return;
    }

    setLoading(true);
    try {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      };

      await userAPI.updateProfile(data);

      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });

      Alert.alert(
        t("common.success") || "Başarılı",
        t("editProfile.updated") || "Profil güncellendi",
        [
          {
            text: t("common.ok") || "Tamam",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert(
        t("common.error") || "Hata",
        error.message ||
          t("editProfile.updateFailed") ||
          "Profil güncellenemedi"
      );
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
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {firstName?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </Text>
          </View>
          <TouchableOpacity style={styles.changePhotoButton}>
            <Ionicons name="camera" size={16} color={COLORS.PRIMARY} />
            <Text style={styles.changePhotoText}>
              {t("editProfile.changePhoto") || "Fotoğraf Değiştir"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email (readonly) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("editProfile.email") || "E-posta"}
            </Text>
            <View style={[styles.inputRow, styles.inputDisabled]}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={COLORS.MUTED}
                style={styles.inputIcon}
              />
              <Text style={styles.inputTextDisabled}>{user?.email || "-"}</Text>
            </View>
            <Text style={styles.helperText}>
              {t("editProfile.emailReadonly") || "E-posta değiştirilemez"}
            </Text>
          </View>

          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("editProfile.firstName") || "Ad"} *
            </Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.TEXT_SECONDARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={
                  t("editProfile.firstNamePlaceholder") || "Adınızı girin"
                }
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("editProfile.lastName") || "Soyad"}
            </Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.TEXT_SECONDARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                value={lastName}
                onChangeText={setLastName}
                placeholder={
                  t("editProfile.lastNamePlaceholder") || "Soyadınızı girin"
                }
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("editProfile.phone") || "Telefon"}
            </Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="call-outline"
                size={20}
                color={COLORS.TEXT_SECONDARY}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.inputText}
                value={phone}
                onChangeText={setPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={COLORS.PLACEHOLDER}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

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
                name="checkmark"
                size={20}
                color={COLORS.WHITE}
                style={styles.saveButtonIcon}
              />
              <Text style={styles.saveButtonText}>
                {t("common.save") || "Kaydet"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>
            {t("common.cancel") || "İptal"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: COLORS.SPACING.xxl }} />
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
    scrollView: {
      flex: 1,
    },

    // Avatar
    avatarSection: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
      backgroundColor: COLORS.SURFACE,
    },
    avatar: {
      width: 96, // 8px grid: 12*8
      height: 96,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    avatarText: {
      ...COLORS.TYPOGRAPHY.styles.h1,
      color: COLORS.WHITE,
    },
    changePhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
    },
    changePhotoText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.PRIMARY,
      marginLeft: COLORS.SPACING.xs,
    },

    // Form
    form: {
      padding: COLORS.SPACING.md,
    },
    inputGroup: {
      marginBottom: COLORS.SPACING.md,
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    inputDisabled: {
      backgroundColor: COLORS.DISABLED_BG,
    },
    inputIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    inputText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
    },
    inputTextDisabled: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
    },
    helperText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
      marginLeft: COLORS.SPACING.xs,
    },

    // Buttons
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      marginHorizontal: COLORS.SPACING.md,
      height: COLORS.SPACING.buttonHeight,
      borderRadius: COLORS.RADIUS.button,
      marginTop: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.button,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    saveButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },
    cancelButton: {
      alignItems: "center",
      marginHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.sm,
    },
    cancelButtonText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
    },
  });

export default EditProfileScreen;
