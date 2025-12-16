// src/screens/shared/EditProfileScreen.js
// TulipFleet - Profil Düzenleme Ekranı

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
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../services/api";

const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  danger: "#F5365C",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
  border: "#E9ECEF",
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth(); // ← updateProfile eklendi

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!firstName.trim()) {
      Alert.alert("Hata", "Ad alanı zorunludur");
      return;
    }

    setLoading(true);
    try {
      const data = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      };

      // Backend'e kaydet
      await userAPI.updateProfile(data);

      // ✅ AuthContext'i güncelle (snake_case!)
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });

      Alert.alert("Başarılı", "Profil güncellendi", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Profile update error:", error);
      Alert.alert("Hata", error.message || "Profil güncellenemedi");
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
            <Ionicons name="camera" size={16} color={COLORS.primary} />
            <Text style={styles.changePhotoText}>Fotoğraf Değiştir</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email (readonly) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-posta</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color={COLORS.muted} />
              <Text style={styles.inputTextDisabled}>{user?.email || "-"}</Text>
            </View>
            <Text style={styles.helperText}>E-posta değiştirilemez</Text>
          </View>

          {/* First Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ad *</Text>
            <View style={styles.input}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.secondary}
              />
              <TextInput
                style={styles.inputText}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Adınızı girin"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          {/* Last Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soyad</Text>
            <View style={styles.input}>
              <Ionicons
                name="person-outline"
                size={20}
                color={COLORS.secondary}
              />
              <TextInput
                style={styles.inputText}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Soyadınızı girin"
                placeholderTextColor={COLORS.muted}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <View style={styles.input}>
              <Ionicons
                name="call-outline"
                size={20}
                color={COLORS.secondary}
              />
              <TextInput
                style={styles.inputText}
                value={phone}
                onChangeText={setPhone}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={COLORS.muted}
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
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },

  // Avatar
  avatarSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
    color: COLORS.white,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },

  // Form
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 8,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.dark,
    marginLeft: 10,
  },
  inputTextDisabled: {
    flex: 1,
    fontSize: 15,
    color: COLORS.muted,
    marginLeft: 10,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    marginLeft: 4,
  },

  // Buttons
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: "center",
    marginHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  cancelButtonText: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default EditProfileScreen;
