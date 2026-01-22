// src/screens/admin/AdminSettings.js
// TulipFleet - Admin Ayarlar Ekranı (Dark Mode uyumlu - Migration Rehberi ile)
// Regen: useThemedStyles + useTheme + hardcoded hex temizliği + Dark Mode ThemeContext entegrasyonu

import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { userAPI } from "../../services/api";

// --- helper: #RRGGBB => #RRGGBBAA (hardcoded hex yazmadan alpha üretmek için) ---
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // Profile Card
    profileCard: {
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    profileName: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.WHITE,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: withAlpha(COLORS.WHITE, 0.8),
      marginBottom: 12,
    },
    roleBadge: {
      backgroundColor: withAlpha(COLORS.WHITE, 0.2),
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    roleText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "600",
    },

    // Section Header
    sectionHeader: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 8,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: COLORS.MUTED,
      letterSpacing: 1,
    },

    // Setting Group
    settingGroup: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginHorizontal: 12,
      borderRadius: 12,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
      overflow: "hidden",
    },

    // Setting Item
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "500",
      color: COLORS.DEFAULT,
    },
    settingSubtitle: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
      marginLeft: 68,
    },

    // Footer
    footer: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 20,
    },
    footerText: {
      fontSize: 14,
      color: COLORS.MUTED,
      fontWeight: "500",
    },
    footerSubtext: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 4,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.5),
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 16,
      padding: 24,
      width: "90%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: COLORS.DEFAULT,
      textAlign: "center",
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "500",
      color: COLORS.DEFAULT,
      marginBottom: 6,
      marginTop: 12,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.BORDER,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    modalButtonCancel: {
      backgroundColor: COLORS.SECONDARY,
    },
    modalButtonCancelText: {
      color: COLORS.DEFAULT,
      fontWeight: "600",
      fontSize: 16,
    },
    modalButtonSave: {
      backgroundColor: COLORS.PRIMARY,
    },
    modalButtonSaveText: {
      color: COLORS.WHITE,
      fontWeight: "600",
      fontSize: 16,
    },
  });

const AdminSettings = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { COLORS, isDark, setDarkMode } = useTheme();
  const { user, logout } = useAuth();

  // Bildirim ayarları (şimdilik local)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertNotifications, setAlertNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Modal state
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [firstName, setFirstName] = useState(
    user?.firstName || user?.first_name || ""
  );
  const [lastName, setLastName] = useState(
    user?.lastName || user?.last_name || ""
  );
  const [phone, setPhone] = useState(user?.phone || "");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const SettingItem = useMemo(
    () =>
      ({
        icon,
        iconColor,
        title,
        subtitle,
        onPress,
        rightElement,
        showArrow = true,
      }) => (
        <TouchableOpacity
          style={styles.settingItem}
          onPress={onPress}
          activeOpacity={onPress ? 0.7 : 1}
          disabled={!onPress}
        >
          <View
            style={[
              styles.settingIcon,
              { backgroundColor: withAlpha(iconColor || COLORS.PRIMARY, 0.12) },
            ]}
          >
            <Ionicons
              name={icon}
              size={20}
              color={iconColor || COLORS.PRIMARY}
            />
          </View>

          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle ? (
              <Text style={styles.settingSubtitle}>{subtitle}</Text>
            ) : null}
          </View>

          {rightElement}

          {showArrow && onPress ? (
            <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
          ) : null}
        </TouchableOpacity>
      ),
    [styles, COLORS]
  );

  const SectionHeader = useMemo(
    () =>
      ({ title }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      ),
    [styles]
  );

  // Çıkış yap
  const handleLogout = () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            const result = await logout();
            if (result?.success) console.log("✅ Çıkış yapıldı");
          },
        },
      ]
    );
  };

  // Profil düzenleme
  const handleEditProfile = () => {
    setFirstName(user?.firstName || user?.first_name || "");
    setLastName(user?.lastName || user?.last_name || "");
    setPhone(user?.phone || "");
    setEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim()) {
      Alert.alert("Hata", "Ad alanı boş olamaz");
      return;
    }

    setSaving(true);
    try {
      await userAPI.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
      });
      Alert.alert("Başarılı", "Profil bilgileriniz güncellendi");
      setEditProfileModal(false);
    } catch (err) {
      console.error("Profile update error:", err);
      Alert.alert("Hata", err?.message || "Profil güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  // Şifre değiştir
  const handleChangePassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordModal(true);
  };

  const handleSavePassword = async () => {
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

    setSaving(true);
    try {
      await userAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      Alert.alert("Başarılı", "Şifreniz değiştirildi");
      setChangePasswordModal(false);
    } catch (err) {
      console.error("Password change error:", err);
      Alert.alert("Hata", err?.message || "Şifre değiştirilemedi");
    } finally {
      setSaving(false);
    }
  };

  // Push bildirimleri toggle - alt seçenekleri kontrol et
  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    if (!value) {
      setAlertNotifications(false);
      setTaskNotifications(false);
    }
  };

  // Destek
  const handleSupport = () => {
    Alert.alert("Destek", "Yardıma mı ihtiyacınız var?", [
      { text: "İptal", style: "cancel" },
      {
        text: "E-posta Gönder",
        onPress: () => Linking.openURL("mailto:support@tulipfleet.com"),
      },
    ]);
  };

  // Hakkında
  const handleAbout = () => {
    Alert.alert(
      "TulipFleet Hakkında",
      "TulipFleet v1.0.0\n\nFilo Yönetim Sistemi\n© 2025 TulipFleet\n\nTüm hakları saklıdır.",
      [{ text: "Tamam" }]
    );
  };

  // Kullanıcı rolünü Türkçe'ye çevir
  const getRoleLabel = (role) => {
    const roles = {
      super_admin: "Süper Admin",
      company_admin: "Şirket Yöneticisi",
      admin: "Yönetici",
      driver: "Sürücü",
    };
    return roles[role] || role;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profil Kartı */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0] ||
              user?.first_name?.[0] ||
              user?.email?.[0]?.toUpperCase() ||
              "A"}
          </Text>
        </View>

        <Text style={styles.profileName}>
          {user?.firstName ||
            user?.first_name ||
            user?.email?.split("@")[0] ||
            "Admin"}
        </Text>

        <Text style={styles.profileEmail}>{user?.email || "-"}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
        </View>
      </View>

      {/* Hesap Ayarları */}
      <SectionHeader title="HESAP" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="person-outline"
          iconColor={COLORS.PRIMARY}
          title="Profili Düzenle"
          subtitle="Ad, soyad, telefon"
          onPress={handleEditProfile}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="lock-closed-outline"
          iconColor={COLORS.WARNING}
          title="Şifre Değiştir"
          subtitle="Hesap güvenliği"
          onPress={handleChangePassword}
        />
      </View>

      {/* Bildirim Ayarları */}
      <SectionHeader title="BİLDİRİMLER" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.INFO}
          title="Push Bildirimleri"
          subtitle="Tüm bildirimler"
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.SWITCH_ON }}
              thumbColor={COLORS.WHITE}
            />
          }
        />

        {/* Push açıkken alt seçenekleri göster */}
        {notificationsEnabled ? (
          <>
            <View style={styles.divider} />
            <SettingItem
              icon="warning-outline"
              iconColor={COLORS.WARNING}
              title="Uyarı Bildirimleri"
              subtitle="Kritik uyarılar ve alarmlar"
              showArrow={false}
              rightElement={
                <Switch
                  value={alertNotifications}
                  onValueChange={setAlertNotifications}
                  trackColor={{
                    false: COLORS.SWITCH_OFF,
                    true: COLORS.SWITCH_ON,
                  }}
                  thumbColor={COLORS.WHITE}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="clipboard-outline"
              iconColor={COLORS.SUCCESS}
              title="Görev Güncellemeleri"
              subtitle="Görev durumu değişiklikleri"
              showArrow={false}
              rightElement={
                <Switch
                  value={taskNotifications}
                  onValueChange={setTaskNotifications}
                  trackColor={{
                    false: COLORS.SWITCH_OFF,
                    true: COLORS.SWITCH_ON,
                  }}
                  thumbColor={COLORS.WHITE}
                />
              }
            />
          </>
        ) : null}

        <View style={styles.divider} />
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.SUCCESS}
          title="Konum Servisi"
          subtitle="Araç takibi için cihaz konumunu kullan"
          showArrow={false}
          rightElement={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.SWITCH_ON }}
              thumbColor={COLORS.WHITE}
            />
          }
        />
      </View>

      {/* Uygulama Ayarları */}
      <SectionHeader title="UYGULAMA" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="moon-outline"
          iconColor={COLORS.DEFAULT}
          title="Karanlık Mod"
          subtitle={isDark ? "Açık" : "Kapalı"}
          showArrow={false}
          rightElement={
            <Switch
              value={!!isDark}
              onValueChange={(value) => setDarkMode?.(value)}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.SWITCH_ON }}
              thumbColor={COLORS.WHITE}
            />
          }
        />

        <View style={styles.divider} />
        <SettingItem
          icon="language-outline"
          iconColor={COLORS.INFO}
          title="Dil"
          subtitle="Türkçe"
          onPress={() =>
            Alert.alert("Dil", "Şu anda sadece Türkçe desteklenmektedir")
          }
        />
      </View>

      {/* Destek */}
      <SectionHeader title="DESTEK" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.INFO}
          title="Yardım Merkezi"
          subtitle="SSS ve kullanım kılavuzu"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.SUCCESS}
          title="Bize Ulaşın"
          subtitle="support@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.SECONDARY}
          title="Hakkında"
          subtitle="Versiyon 1.0.0"
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.ERROR}
          title="Çıkış Yap"
          subtitle="Hesabından çıkış yap"
          onPress={handleLogout}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet v1.0.0</Text>
        <Text style={styles.footerSubtext}>
          © 2025 TulipFleet. Tüm hakları saklıdır.
        </Text>
      </View>

      {/* Profil Düzenle Modal */}
      <Modal
        visible={editProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>

            <Text style={styles.inputLabel}>Ad</Text>
            <TextInput
              style={styles.modalInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adınız"
              placeholderTextColor={COLORS.PLACEHOLDER}
            />

            <Text style={styles.inputLabel}>Soyad</Text>
            <TextInput
              style={styles.modalInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadınız"
              placeholderTextColor={COLORS.PLACEHOLDER}
            />

            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.modalInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XX XXX XX XX"
              placeholderTextColor={COLORS.PLACEHOLDER}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditProfileModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : null}
                {!saving ? (
                  <Text style={styles.modalButtonSaveText}>Kaydet</Text>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Şifre Değiştir Modal */}
      <Modal
        visible={changePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Şifre Değiştir</Text>

            <Text style={styles.inputLabel}>Mevcut Şifre</Text>
            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Mevcut şifreniz"
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Yeni Şifre</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="En az 6 karakter"
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Yeni şifrenizi tekrarlayın"
              placeholderTextColor={COLORS.PLACEHOLDER}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setChangePasswordModal(false)}
                disabled={saving}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : null}
                {!saving ? (
                  <Text style={styles.modalButtonSaveText}>Değiştir</Text>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default AdminSettings;
