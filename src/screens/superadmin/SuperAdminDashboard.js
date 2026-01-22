// src/screens/superadmin/SuperAdminDashboard.js
// Updated: 26 Aralık 2025 - Cihaz Yönetimi Eklendi
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex/rgba temizliği

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// --- helper: #RRGGBB => #RRGGBBAA ---
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: 10,
      color: COLORS.MUTED,
      fontSize: 14,
      fontWeight: "500",
    },

    header: {
      backgroundColor: COLORS.ERROR, // Super Admin banner (orijinalde #F5365C)
      padding: 20,
      paddingTop: 20,
      paddingBottom: 30,
    },
    welcomeText: {
      color: withAlpha(COLORS.WHITE, 0.8),
      fontSize: 14,
    },
    userName: {
      color: COLORS.WHITE,
      fontSize: 20,
      fontWeight: "bold",
      marginTop: 5,
    },
    badge: {
      backgroundColor: withAlpha(COLORS.WHITE, 0.2),
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: "flex-start",
      marginTop: 10,
    },
    badgeText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "600",
    },

    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: 10,
      marginTop: -20,
    },
    statCard: {
      width: "46%",
      margin: "2%",
      padding: 20,
      borderRadius: 12,
      alignItems: "center",
      elevation: 3,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    statNumber: {
      color: COLORS.WHITE,
      fontSize: 32,
      fontWeight: "bold",
    },
    statLabel: {
      color: withAlpha(COLORS.WHITE, 0.9),
      fontSize: 14,
      marginTop: 5,
    },

    // Device Stats Card
    deviceStatsCard: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginHorizontal: 15,
      marginTop: 15,
      borderRadius: 12,
      padding: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.25) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    deviceStatsContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: 10,
    },
    deviceStatsInfo: {
      marginLeft: 12,
      flex: 1,
    },
    deviceStatsTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    deviceStatsSubtitle: {
      fontSize: 13,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    deviceOnlineIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.1),
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.SUCCESS, 0.18),
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.SUCCESS,
      marginRight: 6,
    },
    onlineText: {
      fontSize: 12,
      fontWeight: "600",
      color: COLORS.SUCCESS,
    },

    section: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginHorizontal: 15,
      marginTop: 15,
      borderRadius: 12,
      padding: 15,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.25) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    seeAllText: {
      color: COLORS.PRIMARY,
      fontSize: 14,
      fontWeight: "600",
    },

    actionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: 10,
    },
    actionButton: {
      width: "48%",
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.2) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    actionText: {
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontSize: 13,
      fontWeight: "500",
      marginTop: 8,
    },

    companyCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.2) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    companyIcon: {
      width: 45,
      height: 45,
      borderRadius: 10,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
    },
    companyInfo: {
      flex: 1,
      marginLeft: 12,
    },
    companyName: {
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    companyStats: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
    },

    emptyState: {
      alignItems: "center",
      padding: 30,
    },
    emptyText: {
      color: COLORS.MUTED,
      fontSize: 14,
      marginTop: 10,
      marginBottom: 15,
    },
    emptyButton: {
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    emptyButtonText: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },

    footer: {
      padding: 20,
      alignItems: "center",
    },
    footerText: {
      color: COLORS.MUTED,
      fontSize: 12,
    },
  });

const SuperAdminDashboard = ({ navigation }) => {
  const { user, token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    totalDevices: 0,
    onlineDevices: 0,
  });

  const [companies, setCompanies] = useState([]);

  const fetchData = async () => {
    try {
      // Şirket verileri
      const companiesResponse = await fetch(
        `${API_URL}/api/superadmin/companies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (companiesResponse.ok) {
        const data = await companiesResponse.json();
        setCompanies(data.companies || []);

        const totalVehicles =
          data.companies?.reduce((sum, c) => sum + (c.vehicle_count || 0), 0) ||
          0;
        const totalDrivers =
          data.companies?.reduce((sum, c) => sum + (c.driver_count || 0), 0) ||
          0;
        const totalUsers =
          data.companies?.reduce((sum, c) => sum + (c.user_count || 0), 0) || 0;

        setStats((prev) => ({
          ...prev,
          totalCompanies: data.companies?.length || 0,
          totalUsers,
          totalVehicles,
          totalDrivers,
        }));
      }

      // Cihaz verileri
      try {
        const devicesResponse = await fetch(
          `${API_URL}/api/superadmin/devices`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (devicesResponse.ok) {
          const deviceData = await devicesResponse.json();
          setStats((prev) => ({
            ...prev,
            totalDevices: deviceData.stats?.total || 0,
            onlineDevices: deviceData.stats?.online_now || 0,
          }));
        }
      } catch (deviceError) {
        console.log("Device stats not available yet");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Hata", "Veriler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const statCards = useMemo(
    () => [
      {
        key: "companies",
        value: stats.totalCompanies,
        label: "Şirket",
        bg: COLORS.PRIMARY,
      },
      {
        key: "users",
        value: stats.totalUsers,
        label: "Kullanıcı",
        bg: COLORS.SUCCESS,
      },
      {
        key: "vehicles",
        value: stats.totalVehicles,
        label: "Araç",
        bg: COLORS.WARNING,
      },
      {
        key: "drivers",
        value: stats.totalDrivers,
        label: "Sürücü",
        bg: COLORS.INFO,
      },
    ],
    [stats, COLORS]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.PRIMARY}
          colors={[COLORS.PRIMARY]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
        <Text style={styles.userName}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Super Admin</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        {statCards.map((c) => (
          <View
            key={c.key}
            style={[styles.statCard, { backgroundColor: c.bg }]}
          >
            <Text style={styles.statNumber}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Device Stats */}
      {stats.totalDevices > 0 && (
        <TouchableOpacity
          style={styles.deviceStatsCard}
          onPress={() => navigation.navigate("Devices")}
          activeOpacity={0.8}
        >
          <View style={styles.deviceStatsContent}>
            <Ionicons name="hardware-chip" size={32} color={COLORS.PRIMARY} />
            <View style={styles.deviceStatsInfo}>
              <Text style={styles.deviceStatsTitle}>ESP32 Cihazlar</Text>
              <Text style={styles.deviceStatsSubtitle}>
                {stats.onlineDevices} / {stats.totalDevices} online
              </Text>
            </View>
          </View>

          <View style={styles.deviceOnlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{stats.onlineDevices} Online</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Companies")}
            activeOpacity={0.85}
          >
            <Ionicons name="business" size={28} color={COLORS.PRIMARY} />
            <Text style={styles.actionText}>Şirketler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("CreateCompany")}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={28} color={COLORS.SUCCESS} />
            <Text style={styles.actionText}>Yeni Şirket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Devices")}
            activeOpacity={0.85}
          >
            <Ionicons name="hardware-chip" size={28} color={COLORS.WARNING} />
            <Text style={styles.actionText}>Cihazlar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("PlatformUsers")}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={28} color={COLORS.INFO} />
            <Text style={styles.actionText}>Kullanıcılar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Companies */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Şirketler</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Companies")}
            activeOpacity={0.85}
          >
            <Text style={styles.seeAllText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {companies.slice(0, 5).map((company, index) => (
          <TouchableOpacity
            key={company.id || index}
            style={styles.companyCard}
            // Orijinalde CompanyDetail var ama navigator comment'inde "modal elsewhere" denmiş.
            // Bu yüzden mevcut davranışı bozmayalım; CompanyDetail route yoksa burada hata alırsınız.
            onPress={() => navigation.navigate("CompanyDetail", { company })}
            activeOpacity={0.85}
          >
            <View style={styles.companyIcon}>
              <Ionicons name="business" size={20} color={COLORS.WHITE} />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyStats}>
                {company.vehicle_count || 0} araç • {company.driver_count || 0}{" "}
                sürücü
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
          </TouchableOpacity>
        ))}

        {companies.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="business-outline"
              size={48}
              color={withAlpha(COLORS.MUTED, 0.45)}
            />
            <Text style={styles.emptyText}>Henüz şirket yok</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CreateCompany")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>İlk Şirketi Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet Super Admin Panel v1.0</Text>
      </View>
    </ScrollView>
  );
};

export default SuperAdminDashboard;
