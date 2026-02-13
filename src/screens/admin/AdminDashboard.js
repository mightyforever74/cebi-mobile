// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA
// Updated: 11 Şubat 2026 - Card migration + Theme tokens

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { adminAPI } from "../../services/api";

//  KALDIRILDI: import { COLORS } from "../../constants/config";

// ============================================
// ALERT TİP VE SEVİYE MAPPING (Dinamik renkler için fonksiyon)
// ============================================

const getAlertTypeMap = (COLORS, t) => ({
  HARD_BRAKE: {
    icon: "alert-circle",
    label: t("admin.alerts.hardBrake", "Ani Fren"),
    color: COLORS.ERROR,
  },
  HARD_ACCEL: {
    icon: "speedometer",
    label: t("admin.alerts.hardAccel", "Sert Hızlanma"),
    color: COLORS.WARNING,
  },
  HARD_TURN: {
    icon: "return-down-back",
    label: t("admin.alerts.hardTurn", "Sert Viraj"),
    color: COLORS.WARNING,
  },
  SHARP_TURN: {
    icon: "return-down-back",
    label: t("admin.alerts.sharpTurn", "Keskin Viraj"),
    color: COLORS.WARNING,
  },
  IMPACT: {
    icon: "warning",
    label: t("admin.alerts.impact", "Çarpma/Kaza"),
    color: COLORS.ERROR, // kritik
  },
  OVERSPEED: {
    icon: "flash",
    label: t("admin.alerts.overspeed", "Hız Aşımı"),
    color: COLORS.ERROR,
  },
  GEOFENCE_EXIT: {
    icon: "location",
    label: t("admin.alerts.geofenceExit", "Bölge Çıkışı"),
    color: COLORS.LABEL,
  },
  GEOFENCE_ENTER: {
    icon: "location",
    label: t("admin.alerts.geofenceEnter", "Bölge Girişi"),
    color: COLORS.SUCCESS,
  },
  LOW_FUEL: {
    icon: "water-outline",
    label: t("admin.alerts.lowFuel", "Düşük Yakıt"),
    color: COLORS.WARNING,
  },
  IDLE_TIME: {
    icon: "time-outline",
    label: t("admin.alerts.idleTime", "Uzun Rölanti"),
    color: COLORS.MUTED,
  },
});

const getSeverityMap = (COLORS, t) => ({
  critical: {
    label: t("admin.severity.critical", "Kritik"),
    color: COLORS.ERROR,
    bg: COLORS.INPUT_ERROR,
  },
  high: {
    label: t("admin.severity.high", "Yüksek"),
    color: COLORS.ERROR,
    bg: COLORS.INPUT_ERROR,
  },
  medium: {
    label: t("admin.severity.medium", "Orta"),
    color: COLORS.WARNING,
    bg: COLORS.WARNING_LIGHT,
  },
  low: {
    label: t("admin.severity.low", "Düşük"),
    color: COLORS.SUCCESS,
    bg: COLORS.SUCCESS_LIGHT,
  },
});

const getTaskStatusMap = (COLORS, t) => ({
  pending: {
    label: t("admin.taskStatus.pending", "Bekliyor"),
    color: COLORS.WARNING,
    bg: COLORS.WARNING_LIGHT,
  },
  assigned: {
    label: t("admin.taskStatus.assigned", "Atandı"),
    color: COLORS.PRIMARY,
    bg: COLORS.SECONDARY,
  },
  in_progress: {
    label: t("admin.taskStatus.inProgress", "Devam Ediyor"),
    color: COLORS.LABEL,
    bg: COLORS.INFO_LIGHT,
  },
  completed: {
    label: t("admin.taskStatus.completed", "Tamamlandı"),
    color: COLORS.SUCCESS,
    bg: COLORS.SUCCESS_LIGHT,
  },
  cancelled: {
    label: t("admin.taskStatus.cancelled", "İptal"),
    color: COLORS.MUTED,
    bg: COLORS.DIVIDER,
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const getRelativeTime = (timestamp, t) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("admin.time.justNow", "Az önce");
  if (diffMins < 60) return `${diffMins} ${t("admin.time.minAgo", "dk önce")}`;
  if (diffHours < 24)
    return `${diffHours} ${t("admin.time.hourAgo", "saat önce")}`;
  if (diffDays < 7) return `${diffDays} ${t("admin.time.dayAgo", "gün önce")}`;
  return time.toLocaleDateString();
};

// ============================================
// makeStyles - BÜYÜK HARF TOKENLAR
// ============================================
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
      marginTop: 16,
      fontSize: 16,
      color: COLORS.TEXT_SECONDARY,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      backgroundColor: COLORS.PRIMARY,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    greetingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    greetingEmoji: {
      fontSize: 32,
      marginRight: 12,
    },
    greeting: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
    },
    userName: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.WHITE,
      marginTop: 2,
    },
    logoutButton: {
      backgroundColor: "rgba(255,255,255,0.2)",
      padding: 10,
      borderRadius: 12,
    },
    logoutText: {
      color: COLORS.WHITE,
      fontSize: 14,
      fontWeight: "600",
    },
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: 16,
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: {
      color: COLORS.ERROR,
      fontSize: 14,
    },
    // Command Center
    commandCenterCard: {
      backgroundColor: COLORS.CARD,
      margin: 16,
      marginBottom: 0,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    commandCenterTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.TEXT,
      marginBottom: 16,
      textAlign: "center",
    },
    commandCenterGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    commandItem: {
      alignItems: "center",
    },
    commandIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    commandNumber: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    commandLabel: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    // Live Map Card
    liveMapCard: {
      backgroundColor: COLORS.PRIMARY,
      margin: 16,
      marginBottom: 0,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    liveMapContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    liveMapIconContainer: {
      position: "relative",
      marginRight: 12,
    },
    livePulse: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: COLORS.SUCCESS,
      borderWidth: 2,
      borderColor: COLORS.WHITE,
    },
    liveMapText: {
      flex: 1,
    },
    liveMapTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.WHITE,
    },
    liveMapSubtitle: {
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
    },
    // card: KALDIRILDI - Card component kullanılıyor
    // AdminDashboard'da marginBottom: 0 için <Card noMarginBottom> kullan
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
      marginBottom: 16,
    },
    noDataText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingVertical: 20,
    },
    // Stats Grid
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statItem: {
      width: "48%",
      alignItems: "center",
      padding: 16,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: 8,
      marginBottom: 12,
    },
    statNumber: {
      fontSize: 32,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    statText: {
      fontSize: 14,
      color: COLORS.TEXT,
      marginTop: 4,
      fontWeight: "600",
    },
    statDetail: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    // Alert Stats Card
    alertStatsCard: {
      flexDirection: "row",
      backgroundColor: COLORS.CARD,
      marginHorizontal: 16,
      marginTop: 16,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    alertStatItem: {
      flex: 1,
      alignItems: "center",
    },
    alertStatDivider: {
      width: 1,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: 16,
    },
    alertStatIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    alertStatNumber: {
      fontSize: 28,
      fontWeight: "bold",
      color: COLORS.WARNING,
    },
    alertStatLabel: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    // Vehicle Card
    vehicleCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    vehicleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehiclePlate: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    vehicleModel: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    driverIcon: {
      fontSize: 12,
      marginRight: 4,
    },
    driverName: {
      fontSize: 12,
      color: COLORS.TEXT,
    },
    lastUpdate: {
      fontSize: 11,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      height: 28,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "600",
    },
    vehicleStats: {
      flexDirection: "row",
    },
    vehicleStat: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    vehicleStatIcon: {
      fontSize: 14,
      marginRight: 4,
    },
    vehicleStatValue: {
      fontSize: 13,
      color: COLORS.TEXT,
    },
    seeAllButton: {
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      marginTop: 4,
    },
    seeAllText: {
      fontSize: 14,
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    // Activity Card
    activityCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
    },
    activityHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    activityTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    activityIcon: {
      fontSize: 16,
      marginRight: 8,
    },
    activityTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.TEXT,
      flex: 1,
    },
    activityTime: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
    },
    activityDetails: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    activityTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.sm, // 8
      paddingVertical: COLORS.SPACING.xs, // 4
      borderRadius: COLORS.RADIUS.sm, // 8 (badge için daha modern)
      marginRight: COLORS.SPACING.sm, // 8
      marginBottom: COLORS.SPACING.sm, // 8
    },
    activityTagText: {
      fontSize: 11,
      color: COLORS.TEXT,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    severityText: {
      fontSize: 11,
      fontWeight: "600",
    },
  });

// ============================================
// ADMIN DASHBOARD COMPONENT
// ============================================

const AdminDashboard = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  // Dinamik mapping'ler (COLORS'a bağlı)
  const ALERT_TYPE_MAP = getAlertTypeMap(COLORS, t);
  const SEVERITY_MAP = getSeverityMap(COLORS, t);
  const TASK_STATUS_MAP = getTaskStatusMap(COLORS, t);

  const getAlertInfo = (type) => {
    return (
      ALERT_TYPE_MAP[type] || {
        icon: "alert-circle-outline",
        label: type,
        color: COLORS.MUTED,
      }
    );
  };

  const getSeverityInfo = (severity) => {
    return SEVERITY_MAP[severity] || SEVERITY_MAP["medium"];
  };

  const getTaskStatusInfo = (status) => {
    return (
      TASK_STATUS_MAP[status] || {
        label: status,
        color: COLORS.MUTED,
        bg: COLORS.DIVIDER,
      }
    );
  };

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fleetStats, setFleetStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setError(null);

      const [statsData, vehiclesData, activitiesData] = await Promise.all([
        adminAPI.getFleetStats(),
        adminAPI.getVehicles().catch((err) => ({ vehicles: [] })),
        adminAPI.getActivities().catch((err) => ({ activities: [] })),
      ]);

      // Şema guard (yeni backend: totals/breakdown/health)
      if (!statsData?.totals || !statsData?.breakdown) {
        throw new Error("Bad fleet-stats schema");
      }

      setFleetStats(statsData);
      setVehicles(vehiclesData.vehicles || []);
      setActivities(activitiesData.activities || []);

      console.log("Admin data loaded:", {
        stats: statsData,
        vehicleCount: vehiclesData.vehicles?.length,
        activityCount: activitiesData.activities?.length,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setError(t("admin.dataLoadError", "Veri yüklenirken hata oluştu"));
      setFleetStats(getDefaultStats());
      setVehicles([]);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultStats = () => ({
    totals: {
      vehicles: 0,
      drivers: 0,
      active_tasks: 0,
      pending_tasks: 0,
      alerts: 0,
    },
    breakdown: {
      vehicles: { available: 0, in_use: 0, maintenance: 0 },
      drivers: { on_duty: 0, available: 0, on_leave: 0, offline: 0 },
      tasks: { total: 0, completed_today: 0 },
      alerts: { unresolved: 0, critical: 0 },
    },
    health: {
      online_vehicles: 0,
      offline_vehicles: 0,
    },
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("Çıkış yapıldı");
    }
  };

  // Araç kartına tıklanınca Araç Yönetimi'ne git
  const handleVehiclePress = (vehicle) => {
    console.log("Vehicle pressed:", vehicle.id);
    navigation.navigate("Vehicles");
  };

  // ============================================
  // RENDER ACTIVITY ITEM
  // ============================================

  const renderActivityItem = (activity, index) => {
    const isAlert = activity.activity_type === "alert";

    if (isAlert) {
      const alertInfo = getAlertInfo(activity.identifier);
      const severityInfo = getSeverityInfo(activity.status);

      return (
        <View
          key={`alert-${activity.id}-${index}`}
          style={[
            styles.activityCard,
            { borderLeftColor: alertInfo.color, borderLeftWidth: 3 },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Ionicons
                name={alertInfo.icon}
                size={16}
                color={alertInfo.color}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.activityTitle}>{alertInfo.label}</Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp, t)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Ionicons
                  name="car"
                  size={12}
                  color={COLORS.TEXT}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activityTagText}>
                  {activity.vehicle_plate}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityInfo.bg },
              ]}
            >
              <Text
                style={[styles.severityText, { color: severityInfo.color }]}
              >
                {severityInfo.label}
              </Text>
            </View>
          </View>
        </View>
      );
    } else {
      const statusInfo = getTaskStatusInfo(activity.status);

      return (
        <View
          key={`task-${activity.id}-${index}`}
          style={[
            styles.activityCard,
            { borderLeftColor: COLORS.PRIMARY, borderLeftWidth: 3 },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Ionicons
                name="clipboard-outline"
                size={16}
                color={COLORS.PRIMARY}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.activityTitle} numberOfLines={1}>
                {activity.identifier || t("admin.task", "Görev")}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp, t)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Ionicons
                  name="car"
                  size={12}
                  color={COLORS.TEXT}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activityTagText}>
                  {activity.vehicle_plate}
                </Text>
              </View>
            )}
            {activity.user_email && (
              <View style={styles.activityTag}>
                <Ionicons
                  name="person"
                  size={12}
                  color={COLORS.TEXT}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.activityTagText}>
                  {activity.user_email.split("@")[0]}
                </Text>
              </View>
            )}
            <View
              style={[styles.severityBadge, { backgroundColor: statusInfo.bg }]}
            >
              <Text style={[styles.severityText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("common.loading", "Yükleniyor...")}
        </Text>
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
          colors={[COLORS.PRIMARY]}
          tintColor={COLORS.PRIMARY}
        />
      }
    >
      {/* Header with Modern Greeting */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Ionicons
            name="hand-left-outline"
            size={28}
            color={COLORS.WHITE}
            style={{ marginRight: 12 }}
          />
          <View>
            <Text style={styles.greeting}>
              {t("admin.welcome", "Hoş geldiniz,")}
            </Text>
            <Text style={styles.userName}>
              {user?.firstName ||
                user?.email?.split("@")[0] ||
                t("roles.admin", "Yönetici")}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fleet Command Center Infogram */}
      {fleetStats && (
        <View style={styles.commandCenterCard}>
          <Text style={styles.commandCenterTitle}>
            {t("admin.commandCenter", "Komuta Merkezi")}
          </Text>
          <View style={styles.commandCenterGrid}>
            <View style={styles.commandItem}>
              <View
                style={[
                  styles.commandIcon,
                  { backgroundColor: COLORS.SECONDARY },
                ]}
              >
                <Ionicons name="car" size={24} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.totals?.vehicles ?? 0}
              </Text>
              <Text style={styles.commandLabel}>
                {t("admin.vehicle", "Araç")}
              </Text>
            </View>
            <View style={styles.commandItem}>
              <View
                style={[
                  styles.commandIcon,
                  { backgroundColor: COLORS.SUCCESS_LIGHT },
                ]}
              >
                <Ionicons name="people" size={24} color={COLORS.SUCCESS} />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.totals?.drivers ?? 0}
              </Text>
              <Text style={styles.commandLabel}>
                {t("admin.driver", "Sürücü")}
              </Text>
            </View>
            <View style={styles.commandItem}>
              <View
                style={[
                  styles.commandIcon,
                  { backgroundColor: COLORS.WARNING_LIGHT },
                ]}
              >
                <Ionicons
                  name="hardware-chip"
                  size={24}
                  color={COLORS.WARNING}
                />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.health?.online_vehicles ?? 0}
              </Text>
              <Text style={styles.commandLabel}>
                {t("admin.onlineVehicle", "Online Araç")}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Canlı Harita Bölümü */}
      <TouchableOpacity
        style={styles.liveMapCard}
        onPress={() => navigation.navigate("FleetMap")}
        activeOpacity={0.8}
      >
        <View style={styles.liveMapContent}>
          <View style={styles.liveMapIconContainer}>
            <Ionicons name="map" size={32} color={COLORS.WHITE} />
            <View style={styles.livePulse} />
          </View>
          <View style={styles.liveMapText}>
            <Text style={styles.liveMapTitle}>
              {t("admin.liveMap", "Canlı Harita")}
            </Text>
            <Text style={styles.liveMapSubtitle}>
              {t("admin.trackVehicles", "Araçları gerçek zamanlı takip edin")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
        </View>
      </TouchableOpacity>

      {/* Fleet Stats */}
      {fleetStats && (
        <Card noMarginBottom>
          <Text style={styles.cardTitle}>
            {t("admin.fleetSummary", "Filo Özeti")}
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {fleetStats.totals?.vehicles ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.totalVehicles", "Toplam Araç")}
              </Text>
              <Text style={styles.statDetail}>
                {fleetStats.breakdown?.vehicles?.in_use ?? 0} kullanımda
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {fleetStats.totals?.drivers ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.totalDrivers", "Toplam Sürücü")}
              </Text>
              <Text style={styles.statDetail}>
                {fleetStats.breakdown?.drivers?.on_duty ?? 0} görevde
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.INFO }]}>
                {fleetStats.totals?.active_tasks ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.activeTasks", "Aktif Görev")}
              </Text>
              <Text style={styles.statDetail}>
                {fleetStats.totals?.pending_tasks ?? 0} beklemede
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>
                {fleetStats.breakdown?.tasks?.completed_today ?? 0}
              </Text>
              <Text style={styles.statText}>
                {t("admin.completedToday", "Bugün Tamamlanan")}
              </Text>
              <Text style={styles.statDetail}>
                {fleetStats.breakdown?.vehicles?.in_use ?? 0}{" "}
                {t("admin.inUse", "kullanımda")}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Alert Stats */}
      {fleetStats?.breakdown?.alerts && (
        <View style={styles.alertStatsCard}>
          <View style={styles.alertStatItem}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={COLORS.WARNING}
            />
            <Text style={styles.alertStatNumber}>
              {fleetStats.breakdown?.alerts?.unresolved ??
                fleetStats.totals?.alerts ??
                0}
            </Text>
            <Text style={styles.alertStatLabel}>
              {t("admin.unresolvedAlerts", "Çözülmemiş Uyarı")}
            </Text>
          </View>
          <View style={styles.alertStatDivider} />
          <View style={styles.alertStatItem}>
            <Ionicons name="warning" size={24} color={COLORS.ERROR} />
            <Text style={[styles.alertStatNumber, { color: COLORS.ERROR }]}>
              {fleetStats.breakdown?.alerts?.critical ?? 0}
            </Text>
            <Text style={styles.alertStatLabel}>
              {t("admin.criticalAlerts", "Kritik Uyarı")}
            </Text>
          </View>
        </View>
      )}

      {/* Vehicles - Tıklanabilir */}
      <Card noMarginBottom>
        <TouchableOpacity
          style={styles.cardTitleRow}
          onPress={() => navigation.navigate("Vehicles")}
        >
          <Text style={styles.cardTitle}>
            {t("admin.vehicles", "Araçlar")} ({vehicles.length})
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={COLORS.TEXT_SECONDARY}
          />
        </TouchableOpacity>

        {vehicles.length > 0 ? (
          vehicles.slice(0, 3).map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => handleVehiclePress(vehicle)}
            >
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehiclePlate}>{vehicle.plate_no}</Text>
                  <Text style={styles.vehicleModel}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  {vehicle.driver_email && (
                    <View style={styles.driverInfo}>
                      <Ionicons
                        name="person"
                        size={12}
                        color={COLORS.TEXT_SECONDARY}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.driverName}>
                        {vehicle.driver_email.split("@")[0]}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        vehicle.status === "in_use"
                          ? COLORS.SUCCESS
                          : vehicle.status === "available"
                            ? COLORS.INFO
                            : COLORS.WARNING,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {vehicle.status === "in_use"
                      ? t("admin.vehicleStatus.inUse", "Kullanımda")
                      : vehicle.status === "available"
                        ? t("admin.vehicleStatus.available", "Müsait")
                        : t("admin.vehicleStatus.maintenance", "Bakımda")}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleStats}>
                {vehicle.odometer && (
                  <View style={styles.vehicleStat}>
                    <Ionicons
                      name="speedometer-outline"
                      size={14}
                      color={COLORS.TEXT_SECONDARY}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.vehicleStatValue}>
                      {Math.round(vehicle.odometer).toLocaleString()} km
                    </Text>
                  </View>
                )}
                {vehicle.fuel_level && (
                  <View style={styles.vehicleStat}>
                    <Ionicons
                      name="water-outline"
                      size={14}
                      color={COLORS.TEXT_SECONDARY}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.vehicleStatValue}>
                      {vehicle.fuel_level}%
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>
            {t("admin.noVehicles", "Araç bulunamadı")}
          </Text>
        )}

        {vehicles.length > 3 && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate("Vehicles")}
          >
            <Text style={styles.seeAllText}>
              {t("admin.seeAll", "Tamamını Gör")} ({vehicles.length})
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Activities */}
      <Card noMarginBottom>
        <Text style={styles.cardTitle}>
          {t("admin.recentActivities", "Son Aktiviteler")}
        </Text>
        {activities.length > 0 ? (
          activities
            .slice(0, 5)
            .map((activity, index) => renderActivityItem(activity, index))
        ) : (
          <Text style={styles.noDataText}>
            {t("admin.noActivities", "Henüz aktivite yok")}
          </Text>
        )}
      </Card>

      {/* Bottom spacing */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

//  ESK StyleSheet S - art makeStyles kullan

export default AdminDashboard;
