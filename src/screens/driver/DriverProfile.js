// src/screens/driver/DriverProfile.js
// TulipFleet - Sürücü Profil Ekranı

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

// Ayar Öğesi
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

// Stat Kartı
const StatCard = ({ icon, iconColor, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: `${iconColor}15` }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DriverProfile = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

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
            await logout();
          },
        },
      ]
    );
  };

  // Profil düzenle
  const handleEditProfile = () => {
    navigation.navigate("EditProfile");
  };

  // Şifre değiştir
  const handleChangePassword = () => {
    navigation.navigate("ChangePassword");
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profil Kartı */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "S"}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.first_name || user?.email?.split("@")[0] || "Sürücü"}
        </Text>
        <Text style={styles.profileEmail}>{user?.email || "-"}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="car" size={14} color={COLORS.white} />
          <Text style={styles.roleText}>Sürücü</Text>
        </View>
      </View>

      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <StatCard
          icon="checkmark-circle"
          iconColor={COLORS.success}
          value="0"
          label="Tamamlanan"
        />
        <StatCard
          icon="navigate"
          iconColor={COLORS.info}
          value="0"
          label="Toplam KM"
        />
        <StatCard
          icon="star"
          iconColor={COLORS.warning}
          value="-"
          label="Puan"
        />
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

      {/* Bildirimler */}
      <SectionHeader title="BİLDİRİMLER" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="notifications-outline"
          iconColor={COLORS.info}
          title="Bildirimler"
          subtitle="Görev bildirimleri"
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
          title="Konum Paylaşımı"
          subtitle="Takip için gerekli"
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

      {/* Destek */}
      <SectionHeader title="DESTEK" />
      <View style={styles.settingGroup}>
        <SettingItem
          icon="help-circle-outline"
          iconColor={COLORS.info}
          title="Yardım"
          subtitle="SSS ve kılavuz"
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
        <Text style={styles.footerSubtext}>© 2025 TulipFleet</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: -20,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
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

export default DriverProfile;
