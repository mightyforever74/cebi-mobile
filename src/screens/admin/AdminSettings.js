// src/screens/admin/AdminSettings.js
// TulipFleet - Admin Ayarlar Ekranı
// Updated: 06 Ocak 2026 - Profil düzenle, şifre değiştir, bildirim toggle düzeltildi

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
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
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../services/api";

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
  border: "#E9ECEF",
};

// Ayar Öğesi Komponenti
const SettingItem = ({
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
        { backgroundColor: `${iconColor || COLORS.primary}15` },
      ]}
    >
      <Ionicons name={icon} size={20} color={iconColor || COLORS.primary} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
    {showArrow && onPress && (
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    )}
  </TouchableOpacity>
);

// Bölüm Başlığı
const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const AdminSettings = ({ navigation }) => {
  const { user, logout } = useAuth();
  
  // Bildirim ayarları
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertNotifications, setAlertNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Modal state
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile edit state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
            if (result.success) {
              console.log("✅ Çıkış yapıldı");
            }
          },
        },
      ]
    );
  };

  // 🆕 Profil düzenleme
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
      Alert.alert("Hata", err.message || "Profil güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Şifre değiştir
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
      Alert.alert("Hata", err.message || "Şifre değiştirilemedi");
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Push bildirimleri toggle - alt seçenekleri kontrol et
  const handleNotificationsToggle = (value) => {
    setNotificationsEnabled(value);
    if (!value) {
      // Push kapalıyken alt seçenekleri de kapat
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
      "TulipFleet v1.0.0\n\n" +
        "Filo Yönetim Sistemi\n" +
        "© 2025 TulipFleet\n\n" +
        "Tüm hakları saklıdır.",
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
            {user?.firstName?.[0] || user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.firstName || user?.first_name || user?.email?.split("@")[0] || "Admin"}
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
          iconColor={COLORS.primary}
          title="Profili Düzenle"
          subtitle="Ad, soyad, telefon"
          onPress={handleEditProfile}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="lock-closed-outline"
          iconColor={COLORS.warning}
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
          iconColor={COLORS.info}
          title="Push Bildirimleri"
          subtitle="Tüm bildirimler"
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        
        {/* Push açıkken alt seçenekleri göster */}
        {notificationsEnabled && (
          <>
            <View style={styles.divider} />
            <SettingItem
              icon="warning-outline"
              iconColor={COLORS.warning}
              title="Uyarı Bildirimleri"
              subtitle="Kritik uyarılar ve alarmlar"
              showArrow={false}
              rightElement={
                <Switch
                  value={alertNotifications}
                  onValueChange={setAlertNotifications}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <View style={styles.divider} />
            <SettingItem
              icon="clipboard-outline"
              iconColor={COLORS.success}
              title="Görev Güncellemeleri"
              subtitle="Görev durumu değişiklikleri"
              showArrow={false}
              rightElement={
                <Switch
                  value={taskNotifications}
                  onValueChange={setTaskNotifications}
                  trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
          </>
        )}

        <View style={styles.divider} />
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.success}
          title="Konum Servisi"
          subtitle="Araç takibi için cihaz konumunu kullan"
          showArrow={false}
          rightElement={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
      </View>

      {/* Uygulama Ayarları */}
      <SectionHeader title="UYGULAMA" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="moon-outline"
          iconColor={COLORS.dark}
          title="Karanlık Mod"
          subtitle={darkMode ? "Açık" : "Kapalı"}
          showArrow={false}
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={(value) => {
                setDarkMode(value);
                // TODO: ThemeContext ile entegre et
                Alert.alert(
                  "Karanlık Mod",
                  value 
                    ? "Karanlık mod etkinleştirildi. Tam destek yakında!" 
                    : "Karanlık mod kapatıldı."
                );
              }}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="language-outline"
          iconColor={COLORS.info}
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
          iconColor={COLORS.info}
          title="Yardım Merkezi"
          subtitle="SSS ve kullanım kılavuzu"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="chatbubble-outline"
          iconColor={COLORS.success}
          title="Bize Ulaşın"
          subtitle="support@tulipfleet.com"
          onPress={handleSupport}
        />
        <View style={styles.divider} />
        <SettingItem
          icon="information-circle-outline"
          iconColor={COLORS.secondary}
          title="Hakkında"
          subtitle="Versiyon 1.0.0"
          onPress={handleAbout}
        />
      </View>

      {/* Çıkış */}
      <View style={styles.settingGroup}>
        <SettingItem
          icon="log-out-outline"
          iconColor={COLORS.danger}
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Profil Düzenle Modal */}
      {/* ═══════════════════════════════════════════════════════════════ */}
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
            />

            <Text style={styles.inputLabel}>Soyad</Text>
            <TextInput
              style={styles.modalInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadınız"
            />

            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.modalInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditProfileModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Kaydet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Şifre Değiştir Modal */}
      {/* ═══════════════════════════════════════════════════════════════ */}
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
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Yeni Şifre</Text>
            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="En az 6 karakter"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Yeni şifrenizi tekrarlayın"
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setChangePasswordModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSavePassword}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>Değiştir</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: COLORS.white,
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
    color: COLORS.secondary,
    letterSpacing: 1,
  },

  // Setting Group
  settingGroup: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: COLORS.dark,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
    color: COLORS.secondary,
    fontWeight: "500",
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
    textAlign: "center",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
  },
  modalButtonCancelText: {
    color: COLORS.dark,
    fontWeight: "600",
    fontSize: 16,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonSaveText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 16,
  },
});

export default AdminSettings;
