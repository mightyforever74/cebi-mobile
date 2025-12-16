// src/screens/admin/AdminSettings.js
// TulipFleet - Admin Ayarlar Ekranı

import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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

  // Profil düzenleme - Alert yerine navigate
  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  // Şifre değiştir
  const handleChangePassword = () => {
    Alert.alert("Şifre Değiştir", "Şifre değiştirme ekranı yakında eklenecek");
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
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.firstName || user?.email?.split("@")[0] || "Admin"}
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
          subtitle="Uyarı ve güncellemeler"
          showArrow={false}
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          }
        />
        <View style={styles.divider} />
        <SettingItem
          icon="location-outline"
          iconColor={COLORS.success}
          title="Konum Servisi"
          subtitle="Araç takibi için gerekli"
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
          subtitle="Yakında"
          showArrow={false}
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={(value) => {
                setDarkMode(value);
                Alert.alert("Yakında", "Karanlık mod yakında eklenecek");
                setDarkMode(false);
              }}
              trackColor={{ false: COLORS.muted, true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled
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
});

export default AdminSettings;
