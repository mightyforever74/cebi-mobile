// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA
// Updated: 22 Ocak 2026 - Dark Mode Migration v3

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { adminAPI, taskAPI } from "../../services/api";

//  KALDIRILDI: import { COLORS } from "../../constants/config";

// ============================================
// ALERT TP VE SEVYE MAPPING (Dinamik renkler iin fonksiyon)
// ============================================

const getAlertTypeMap = (COLORS, t) => ({
  HARD_BRAKE: {
    icon: "",
    label: t("admin.alerts.hardBrake", "Ani Fren"),
    color: COLORS.ERROR,
  },
  HARD_ACCEL: {
    icon: "",
    label: t("admin.alerts.hardAccel", "Sert Hzlanma"),
    color: COLORS.WARNING,
  },
  HARD_TURN: {
    icon: "",
    label: t("admin.alerts.hardTurn", "Sert Viraj"),
    color: COLORS.WARNING,
  },
  SHARP_TURN: {
    icon: "",
    label: t("admin.alerts.sharpTurn", "Keskin Viraj"),
    color: COLORS.WARNING,
  },
  IMPACT: {
    icon: "",
    label: t("admin.alerts.impact", "arpma/Kaza"),
    color: "#DC2626",
  },
  OVERSPEED: {
    icon: "",
    label: t("admin.alerts.overspeed", "Hz Am"),
    color: COLORS.ERROR,
  },
  GEOFENCE_EXIT: {
    icon: "",
    label: t("admin.alerts.geofenceExit", "Blge k"),
    color: "#8B5CF6",
  },
  GEOFENCE_ENTER: {
    icon: "",
    label: t("admin.alerts.geofenceEnter", "Blge Girii"),
    color: COLORS.SUCCESS,
  },
  LOW_FUEL: {
    icon: "",
    label: t("admin.alerts.lowFuel", "Dk Yakt"),
    color: COLORS.WARNING,
  },
  IDLE_TIME: {
    icon: "",
    label: t("admin.alerts.idleTime", "Uzun Rlanti"),
    color: COLORS.MUTED,
  },
});

const getSeverityMap = (COLORS, t) => ({
  critical: {
    label: t("admin.severity.critical", "Kritik"),
    color: "#DC2626",
    bg: COLORS.INPUT_ERROR,
  },
  high: {
    label: t("admin.severity.high", "Yksek"),
    color: COLORS.ERROR,
    bg: COLORS.INPUT_ERROR,
  },
  medium: {
    label: t("admin.severity.medium", "Orta"),
    color: COLORS.WARNING,
    bg: "#FEF3C7",
  },
  low: {
    label: t("admin.severity.low", "Dk"),
    color: COLORS.SUCCESS,
    bg: "#D1FAE5",
  },
});

const getTaskStatusMap = (COLORS, t) => ({
  pending: {
    label: t("admin.taskStatus.pending", "Bekliyor"),
    color: COLORS.WARNING,
    bg: "#FEF3C7",
  },
  assigned: {
    label: t("admin.taskStatus.assigned", "Atand"),
    color: COLORS.PRIMARY,
    bg: COLORS.SECONDARY,
  },
  in_progress: {
    label: t("admin.taskStatus.inProgress", "Devam Ediyor"),
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
  completed: {
    label: t("admin.taskStatus.completed", "Tamamland"),
    color: COLORS.SUCCESS,
    bg: "#D1FAE5",
  },
  cancelled: {
    label: t("admin.taskStatus.cancelled", "ptal"),
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

  if (diffMins < 1) return t("admin.time.justNow", "Az nce");
  if (diffMins < 60) return `${diffMins} ${t("admin.time.minAgo", "dk nce")}`;
  if (diffHours < 24)
    return `${diffHours} ${t("admin.time.hourAgo", "saat nce")}`;
  if (diffDays < 7) return `${diffDays} ${t("admin.time.dayAgo", "gn nce")}`;
  return time.toLocaleDateString();
};

// ============================================
// makeStyles - BYK HARF TOKEN'LAR
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
    // Card
    card: {
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
      gap: 16,
    },
    vehicleStat: {
      flexDirection: "row",
      alignItems: "center",
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
      gap: 8,
    },
    activityTag: {
      backgroundColor: COLORS.DIVIDER,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
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
  // Guvenli fallback - INFO token yoksa PRIMARY kullan
  if (!COLORS.INFO) COLORS.INFO = COLORS.PRIMARY;

  // Dinamik mapping'ler (COLORS'a bal)
  const ALERT_TYPE_MAP = getAlertTypeMap(COLORS, t);
  const SEVERITY_MAP = getSeverityMap(COLORS, t);
  const TASK_STATUS_MAP = getTaskStatusMap(COLORS, t);

  const getAlertInfo = (type) => {
    return (
      ALERT_TYPE_MAP[type] || {
        icon: "",
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
  const [activityFilter, setActivityFilter] = useState("all");
  const refreshTimer = useRef(null);

  // Detail modal state
  const [detailModal, setDetailModal] = useState({
    visible: false,
    title: "",
    type: null, // "online_vehicles" | "active_tasks" | "completed_today" | "delays"
    data: [],
    loading: false,
  });
  const [detailSearch, setDetailSearch] = useState("");

  // CSV helper
  const generateCSV = (rows, columns) => {
    const header = columns.map((c) => c.label).join(",");
    const body = rows
      .map((row) =>
        columns
          .map(
            (c) => `"${(c.value(row) ?? "").toString().replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");
    return header + "\n" + body;
  };

  const handleCSVExport = async (title, rows, columns) => {
    const csv = generateCSV(rows, columns);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `TulipFleet_${title}_${dateStr}`;
    try {
      await Share.share({
        message: csv,
        title: filename,
      });
    } catch (e) {
      // Fallback: clipboard
      try {
        await Clipboard.setStringAsync(csv);
        Alert.alert("CSV", t("admin.csvCopied", "CSV panoya kopyalandi"));
      } catch (err) {
        Alert.alert("Error", err.message);
      }
    }
  };

  // Detail modal openers
  const openDetailModal = async (type) => {
    setDetailSearch("");
    setDetailModal({ visible: true, title: "", type, data: [], loading: true });

    try {
      let data = [];
      let title = "";

      switch (type) {
        case "online_vehicles": {
          title = t("admin.onlineVehicles", "Online Araclar");
          // Backend online_vehicles = son 5dk'da locations'a veri gonderen araclar
          // Eger fleetStats 0 gosteriyorsa ve gercekten online arac yoksa bos donsun
          // Ama in_use araclar da gosterilsin (gorevde olan = ilgili)
          const onlineCount = fleetStats?.health?.online_vehicles ?? 0;
          if (onlineCount > 0) {
            // Backend online diyor, tum araclari goster (backend listesini bilmiyoruz)
            const onlineList = vehicles.filter(
              (v) => v.is_online || v.status === "in_use"
            );
            data = onlineList.length > 0 ? onlineList : vehicles;
          } else {
            // Backend 0 diyor, bos liste goster
            data = [];
          }
          break;
        }
        case "active_tasks": {
          title = t("admin.activeTasks", "Aktif Gorevler");
          const res = await taskAPI.getList();
          const tasks = res.tasks || res || [];
          data = tasks.filter((t) =>
            ["pending_review", "accepted", "in_progress"].includes(t.status)
          );
          break;
        }
        case "completed_today": {
          title = t("admin.completedToday", "Bugun Tamamlanan");
          const res2 = await taskAPI.getList();
          const allTasks = res2.tasks || res2 || [];
          const today = new Date().toISOString().slice(0, 10);
          data = allTasks.filter(
            (t) =>
              t.status === "completed" && t.updated_at?.slice(0, 10) === today
          );
          break;
        }
        case "delays": {
          title = t("admin.activeDelays", "Aktif Gecikmeler");
          data = activities.filter((a) => a.activity_type === "delay");
          break;
        }
      }

      setDetailModal({ visible: true, title, type, data, loading: false });
    } catch (err) {
      console.error("Detail modal error:", err);
      setDetailModal((prev) => ({ ...prev, loading: false, data: [] }));
    }
  };

  // CSV column definitions per type
  const getCSVColumns = (type) => {
    switch (type) {
      case "online_vehicles":
        return [
          { label: "Plate", value: (v) => v.plate_no || v.plate },
          { label: "Brand", value: (v) => v.brand || "" },
          { label: "Model", value: (v) => v.model || "" },
          { label: "Status", value: (v) => v.status || "" },
          {
            label: "Driver",
            value: (v) => v.driver_name || v.assigned_driver || "",
          },
        ];
      case "active_tasks":
      case "completed_today":
        return [
          { label: "Task No", value: (t) => t.task_no || t.task_code || "" },
          { label: "Title", value: (t) => t.title || "" },
          { label: "Status", value: (t) => t.status || "" },
          {
            label: "Driver",
            value: (t) => t.driver_name || t.driver_email || "",
          },
          { label: "From", value: (t) => t.start_location || "" },
          { label: "To", value: (t) => t.end_location || "" },
          { label: "Priority", value: (t) => t.priority || "" },
        ];
      case "delays":
        return [
          {
            label: "Type",
            value: (a) => a.identifier || a.activity_type || "",
          },
          { label: "Message", value: (a) => a.message || a.identifier || "" },
          { label: "Vehicle", value: (a) => a.vehicle_plate || "" },
          { label: "Driver", value: (a) => a.user_email || "" },
          { label: "Time", value: (a) => a.timestamp || "" },
          { label: "Severity", value: (a) => a.severity || "" },
        ];
      default:
        return [];
    }
  };

  // Search filter for modal data
  const getFilteredModalData = () => {
    if (!detailSearch.trim()) return detailModal.data;
    const q = detailSearch.toLowerCase().trim();
    return detailModal.data.filter((item) => {
      const cols = getCSVColumns(detailModal.type);
      return cols.some((c) =>
        (c.value(item) ?? "").toString().toLowerCase().includes(q)
      );
    });
  };

  // Auto-refresh: 30s polling
  useEffect(() => {
    fetchAllData();
    refreshTimer.current = setInterval(() => {
      fetchAllData(true); // silent refresh
    }, 30000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, []);

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) setError(null);

      const [statsData, vehiclesData, activitiesData] = await Promise.all([
        adminAPI.getFleetStats(),
        adminAPI.getVehicles().catch((err) => ({ vehicles: [] })),
        adminAPI.getActivities().catch((err) => ({ activities: [] })),
      ]);

      // ema guard (yeni backend: totals/breakdown/health)
      if (!statsData?.totals || !statsData?.breakdown) {
        throw new Error("Bad fleet-stats schema");
      }

      setFleetStats(statsData);
      setVehicles(vehiclesData.vehicles || []);
      setActivities(activitiesData.activities || activitiesData.alerts || []);

      console.log(" Admin data loaded:", {
        stats: statsData,
        vehicleCount: vehiclesData.vehicles?.length,
        activityCount: activitiesData.activities?.length,
      });
    } catch (error) {
      console.error(" Error fetching admin data:", error);
      setError(t("admin.dataLoadError", "Veri yklenirken hata olutu"));
      setFleetStats(getDefaultStats());
      setVehicles([]);
      setActivities([]);
    } finally {
      if (!silent) setLoading(false);
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
    delays: {
      last_24h: 0,
      prev_24h: 0,
      active_now: 0,
      delta: 0,
    },
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log(" k yapld");
    }
  };

  // Ara kartna tklannca Ara Ynetimi'ne git
  const handleVehiclePress = (vehicle) => {
    console.log("Vehicle pressed:", vehicle.id);
    navigation.navigate("Vehicles");
  };

  // ============================================
  // RENDER ACTIVITY ITEM
  // ============================================

  const renderActivityItem = (activity, index) => {
    const isAlert = activity.activity_type === "alert";
    const isDelay = activity.activity_type === "delay";

    if (isDelay) {
      return (
        <View
          key={`delay-${activity.id}-${index}`}
          style={[
            styles.activityCard,
            { borderLeftColor: COLORS.ERROR, borderLeftWidth: 3 },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Ionicons name="warning" size={16} color={COLORS.ERROR} />
              <Text style={[styles.activityTitle, { marginLeft: 6 }]}>
                {t("admin.stopDelayed", "Durak Gecikmesi")}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp, t)}
            </Text>
          </View>
          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  {activity.vehicle_plate}
                </Text>
              </View>
            )}
            {activity.user_email && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  {activity.user_email.split("@")[0]}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: COLORS.INPUT_ERROR || "#FEE2E2" },
              ]}
            >
              <Text style={[styles.severityText, { color: COLORS.ERROR }]}>
                {t("admin.delayed", "Gecikme")}
              </Text>
            </View>
          </View>
        </View>
      );
    }

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
              <Text style={styles.activityIcon}>{alertInfo.icon}</Text>
              <Text style={styles.activityTitle}>{alertInfo.label}</Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp, t)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
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
              <Text style={styles.activityIcon}></Text>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {activity.identifier || t("admin.task", "Grev")}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp, t)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  {activity.vehicle_plate}
                </Text>
              </View>
            )}
            {activity.user_email && (
              <View style={styles.activityTag}>
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
          {t("common.loading", "Ykleniyor...")}
        </Text>
      </View>
    );
  }

  return (
    <>
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
                {t("admin.welcome", "Ho geldiniz,")}
              </Text>
              <Text style={styles.userName}>
                {user?.firstName ||
                  user?.email?.split("@")[0] ||
                  t("roles.admin", "Ynetici")}
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
            <Text style={styles.errorText}> {error}</Text>
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
                  {t("admin.vehicle", "Ara")}
                </Text>
              </View>
              <View style={styles.commandItem}>
                <View
                  style={[styles.commandIcon, { backgroundColor: "#F0FDF4" }]}
                >
                  <Ionicons name="people" size={24} color={COLORS.SUCCESS} />
                </View>
                <Text style={styles.commandNumber}>
                  {fleetStats.totals?.drivers ?? 0}
                </Text>
                <Text style={styles.commandLabel}>
                  {t("admin.driver", "Src")}
                </Text>
              </View>
              <View style={styles.commandItem}>
                <View
                  style={[styles.commandIcon, { backgroundColor: "#FEF3C7" }]}
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
                  {t("admin.onlineVehicle", "Online Ara")}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Canl Harita Blm */}
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
                {t("admin.liveMap", "Canl Harita")}
              </Text>
              <Text style={styles.liveMapSubtitle}>
                {t("admin.trackVehicles", "Aralar gerek zamanl takip edin")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
          </View>
        </TouchableOpacity>

        {/* Operations Overview - Tiklanabilir Kartlar */}
        {fleetStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("admin.operationsOverview", "Operasyon Ozeti")}
            </Text>
            <View style={styles.statsGrid}>
              {/* Online Araclar */}
              <TouchableOpacity
                style={[
                  styles.statItem,
                  { borderLeftWidth: 3, borderLeftColor: COLORS.SUCCESS },
                ]}
                onPress={() => openDetailModal("online_vehicles")}
                activeOpacity={0.7}
              >
                <Ionicons name="wifi" size={20} color={COLORS.SUCCESS} />
                <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>
                  {fleetStats.health?.online_vehicles ?? 0}
                </Text>
                <Text style={styles.statText}>
                  {t("admin.onlineVehicles", "Online Arac")}
                </Text>
                <Text style={styles.statDetail}>
                  / {fleetStats.totals?.vehicles ?? 0}{" "}
                  {t("admin.total", "toplam")}
                </Text>
              </TouchableOpacity>

              {/* Aktif Gorevler */}
              <TouchableOpacity
                style={[
                  styles.statItem,
                  { borderLeftWidth: 3, borderLeftColor: COLORS.INFO },
                ]}
                onPress={() => openDetailModal("active_tasks")}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate" size={20} color={COLORS.INFO} />
                <Text style={[styles.statNumber, { color: COLORS.INFO }]}>
                  {fleetStats.totals?.active_tasks ?? 0}
                </Text>
                <Text style={styles.statText}>
                  {t("admin.activeTasks", "Aktif Gorev")}
                </Text>
                <Text style={styles.statDetail}>
                  {fleetStats.totals?.pending_tasks ?? 0}{" "}
                  {t("admin.pending", "beklemede")}
                </Text>
              </TouchableOpacity>

              {/* Bugun Tamamlanan */}
              <TouchableOpacity
                style={[
                  styles.statItem,
                  { borderLeftWidth: 3, borderLeftColor: COLORS.SUCCESS },
                ]}
                onPress={() => openDetailModal("completed_today")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.SUCCESS}
                />
                <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>
                  {fleetStats.breakdown?.tasks?.completed_today ?? 0}
                </Text>
                <Text style={styles.statText}>
                  {t("admin.completedToday", "Bugun Biten")}
                </Text>
                <Text style={styles.statDetail}>
                  {fleetStats.breakdown?.tasks?.total ?? 0}{" "}
                  {t("admin.totalTasks", "toplam gorev")}
                </Text>
              </TouchableOpacity>

              {/* Gecikme Uyarisi */}
              <TouchableOpacity
                style={[
                  styles.statItem,
                  {
                    borderLeftWidth: 3,
                    borderLeftColor:
                      (fleetStats.delays?.active_now ?? 0) > 0
                        ? COLORS.ERROR
                        : COLORS.MUTED,
                  },
                ]}
                onPress={() => openDetailModal("delays")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="warning"
                  size={20}
                  color={
                    (fleetStats.delays?.active_now ?? 0) > 0
                      ? COLORS.ERROR
                      : COLORS.MUTED
                  }
                />
                <Text
                  style={[
                    styles.statNumber,
                    {
                      color:
                        (fleetStats.delays?.active_now ?? 0) > 0
                          ? COLORS.ERROR
                          : COLORS.TEXT,
                    },
                  ]}
                >
                  {fleetStats.delays?.active_now ?? 0}
                </Text>
                <Text style={styles.statText}>
                  {t("admin.activeDelays", "Aktif Gecikme")}
                </Text>
                {/* Trend oku */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 2,
                  }}
                >
                  {(fleetStats.delays?.delta ?? 0) !== 0 && (
                    <Ionicons
                      name={
                        (fleetStats.delays?.delta ?? 0) > 0
                          ? "trending-up"
                          : "trending-down"
                      }
                      size={14}
                      color={
                        (fleetStats.delays?.delta ?? 0) > 0
                          ? COLORS.ERROR
                          : COLORS.SUCCESS
                      }
                    />
                  )}
                  <Text
                    style={[
                      styles.statDetail,
                      {
                        color:
                          (fleetStats.delays?.delta ?? 0) > 0
                            ? COLORS.ERROR
                            : (fleetStats.delays?.delta ?? 0) < 0
                              ? COLORS.SUCCESS
                              : COLORS.TEXT_SECONDARY,
                      },
                    ]}
                  >
                    {" "}
                    {fleetStats.delays?.last_24h ?? 0} / 24s
                    {(fleetStats.delays?.delta ?? 0) !== 0 &&
                      ` (${(fleetStats.delays?.delta ?? 0) > 0 ? "+" : ""}${fleetStats.delays?.delta})`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Alert Stats - unresolved/critical */}
        {fleetStats?.breakdown?.alerts && (
          <View style={styles.alertStatsCard}>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatIcon}></Text>
              <Text style={styles.alertStatNumber}>
                {fleetStats.breakdown?.alerts?.unresolved ??
                  fleetStats.totals?.alerts ??
                  0}
              </Text>
              <Text style={styles.alertStatLabel}>
                {t("admin.unresolvedAlerts", "zlmemi Uyar")}
              </Text>
            </View>
            <View style={styles.alertStatDivider} />
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatIcon}></Text>
              <Text style={[styles.alertStatNumber, { color: COLORS.ERROR }]}>
                {fleetStats.breakdown?.alerts?.critical ?? 0}
              </Text>
              <Text style={styles.alertStatLabel}>
                {t("admin.criticalAlerts", "Kritik Uyar")}
              </Text>
            </View>
          </View>
        )}

        {/* Vehicles - Tklanabilir */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardTitleRow}
            onPress={() => navigation.navigate("Vehicles")}
          >
            <Text style={styles.cardTitle}>
              {t("admin.vehicles", "Aralar")} ({vehicles.length})
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
                        <Text style={styles.driverIcon}></Text>
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
                        ? t("admin.vehicleStatus.inUse", "Kullanmda")
                        : vehicle.status === "available"
                          ? t("admin.vehicleStatus.available", "Msait")
                          : t("admin.vehicleStatus.maintenance", "Bakmda")}
                    </Text>
                  </View>
                </View>
                <View style={styles.vehicleStats}>
                  {vehicle.odometer && (
                    <View style={styles.vehicleStat}>
                      <Text style={styles.vehicleStatIcon}></Text>
                      <Text style={styles.vehicleStatValue}>
                        {Math.round(vehicle.odometer).toLocaleString()} km
                      </Text>
                    </View>
                  )}
                  {vehicle.fuel_level && (
                    <View style={styles.vehicleStat}>
                      <Text style={styles.vehicleStatIcon}></Text>
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
              {t("admin.noVehicles", "Ara bulunamad")}
            </Text>
          )}

          {vehicles.length > 3 && (
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate("Vehicles")}
            >
              <Text style={styles.seeAllText}>
                {t("admin.seeAll", "Tmn Gr")} ({vehicles.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Activities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("admin.recentActivities", "Son Aktiviteler")}
          </Text>

          {/* Kategori filtre tablari */}
          <View style={{ flexDirection: "row", marginBottom: 12, gap: 6 }}>
            {[
              { key: "all", label: t("admin.filterAll", "Tumunu") },
              { key: "delays", label: t("admin.filterDelays", "Gecikmeler") },
              { key: "completed", label: t("admin.filterCompleted", "Biten") },
              { key: "alerts", label: t("admin.filterAlerts", "Uyarilar") },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActivityFilter(tab.key)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor:
                    activityFilter === tab.key
                      ? COLORS.PRIMARY
                      : COLORS.BACKGROUND,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: activityFilter === tab.key ? "700" : "500",
                    color:
                      activityFilter === tab.key
                        ? COLORS.WHITE
                        : COLORS.TEXT_SECONDARY,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(() => {
            const filtered = activities.filter((a) => {
              if (activityFilter === "all") return true;
              if (activityFilter === "delays")
                return a.activity_type === "delay";
              if (activityFilter === "completed")
                return a.activity_type === "task" && a.status === "completed";
              if (activityFilter === "alerts")
                return a.activity_type === "alert";
              return true;
            });
            return filtered.length > 0 ? (
              filtered
                .slice(0, 10)
                .map((activity, index) => renderActivityItem(activity, index))
            ) : (
              <Text style={styles.noDataText}>
                {t("admin.noFilteredActivities", "Bu kategoride aktivite yok")}
              </Text>
            );
          })()}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* DETAIL MODAL + CSV EXPORT */}
      {/* ============================================ */}
      <Modal
        visible={detailModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModal((p) => ({ ...p, visible: false }))}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.SURFACE,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "80%",
              minHeight: "40%",
              paddingBottom: 24,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.BORDER,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLORS.TEXT,
                }}
              >
                {detailModal.title}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {/* Close */}
                <TouchableOpacity
                  onPress={() =>
                    setDetailModal((p) => ({ ...p, visible: false }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: COLORS.CARD,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={20} color={COLORS.MUTED} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Content */}
            {detailModal.loading ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 40,
                }}
              >
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              </View>
            ) : detailModal.data.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 40,
                }}
              >
                <Ionicons
                  name="file-tray-outline"
                  size={48}
                  color={COLORS.MUTED}
                />
                <Text
                  style={{ color: COLORS.MUTED, marginTop: 8, fontSize: 15 }}
                >
                  {t("admin.noData", "Veri bulunamadi")}
                </Text>
              </View>
            ) : (
              <>
                {/* Search Input */}
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 4,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: COLORS.CARD,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      height: 40,
                      gap: 8,
                    }}
                  >
                    <Ionicons name="search" size={18} color={COLORS.MUTED} />
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 14,
                        color: COLORS.TEXT,
                        padding: 0,
                      }}
                      placeholder={t("admin.searchPlaceholder", "Ara...")}
                      placeholderTextColor={COLORS.MUTED}
                      value={detailSearch}
                      onChangeText={setDetailSearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {detailSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setDetailSearch("")}>
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={COLORS.MUTED}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Count badge */}
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.MUTED,
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 4,
                  }}
                >
                  {getFilteredModalData().length} / {detailModal.data.length}{" "}
                  {t("admin.records", "kayit")}
                </Text>

                {/* FlatList */}
                <FlatList
                  data={getFilteredModalData()}
                  keyExtractor={(item, idx) =>
                    item.id?.toString() || idx.toString()
                  }
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 16,
                  }}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        backgroundColor: COLORS.CARD,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor:
                          detailModal.type === "delays"
                            ? COLORS.ERROR
                            : detailModal.type === "online_vehicles"
                              ? COLORS.SUCCESS
                              : detailModal.type === "completed_today"
                                ? COLORS.SUCCESS
                                : COLORS.INFO,
                      }}
                    >
                      {detailModal.type === "online_vehicles" && (
                        <>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "700",
                                color: COLORS.TEXT,
                              }}
                            >
                              {item.plate_no || item.plate || "—"}
                            </Text>
                            <View
                              style={{
                                backgroundColor: COLORS.SUCCESS + "20",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  color: COLORS.SUCCESS,
                                  fontSize: 12,
                                  fontWeight: "600",
                                }}
                              >
                                Online
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={{
                              fontSize: 13,
                              color: COLORS.MUTED,
                              marginTop: 4,
                            }}
                          >
                            {[item.brand, item.model]
                              .filter(Boolean)
                              .join(" ") || "—"}
                            {item.driver_name ? `  •  ${item.driver_name}` : ""}
                          </Text>
                        </>
                      )}

                      {(detailModal.type === "active_tasks" ||
                        detailModal.type === "completed_today") && (
                        <>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "700",
                                color: COLORS.TEXT,
                                flex: 1,
                              }}
                            >
                              {item.title || item.task_no || "—"}
                            </Text>
                            <View
                              style={{
                                backgroundColor:
                                  item.status === "in_progress"
                                    ? COLORS.INFO + "20"
                                    : item.status === "completed"
                                      ? COLORS.SUCCESS + "20"
                                      : COLORS.WARNING + "20",
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color:
                                    item.status === "in_progress"
                                      ? COLORS.INFO
                                      : item.status === "completed"
                                        ? COLORS.SUCCESS
                                        : COLORS.WARNING,
                                }}
                              >
                                {item.status
                                  ?.replace(/_/g, " ")
                                  .toUpperCase() || "—"}
                              </Text>
                            </View>
                          </View>
                          {item.task_no && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: COLORS.MUTED,
                                marginTop: 2,
                              }}
                            >
                              {item.task_no}
                            </Text>
                          )}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 6,
                              gap: 4,
                            }}
                          >
                            <Ionicons
                              name="location"
                              size={14}
                              color={COLORS.MUTED}
                            />
                            <Text
                              style={{
                                fontSize: 13,
                                color: COLORS.TEXT,
                                flex: 1,
                              }}
                              numberOfLines={1}
                            >
                              {item.start_location || "?"} →{" "}
                              {item.end_location || "?"}
                            </Text>
                          </View>
                          {(item.driver_name || item.driver_email) && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginTop: 4,
                                gap: 4,
                              }}
                            >
                              <Ionicons
                                name="person"
                                size={14}
                                color={COLORS.MUTED}
                              />
                              <Text
                                style={{ fontSize: 13, color: COLORS.MUTED }}
                              >
                                {item.driver_name || item.driver_email}
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      {detailModal.type === "delays" && (
                        <>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: COLORS.ERROR,
                            }}
                          >
                            {item.message || item.identifier || "Gecikme"}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 4,
                              gap: 8,
                            }}
                          >
                            {item.vehicle_plate && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Ionicons
                                  name="car"
                                  size={14}
                                  color={COLORS.MUTED}
                                />
                                <Text
                                  style={{ fontSize: 13, color: COLORS.MUTED }}
                                >
                                  {item.vehicle_plate}
                                </Text>
                              </View>
                            )}
                            {item.timestamp && (
                              <Text
                                style={{ fontSize: 12, color: COLORS.MUTED }}
                              >
                                {new Date(item.timestamp).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </Text>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ alignItems: "center", padding: 24 }}>
                      <Text style={{ color: COLORS.MUTED, fontSize: 14 }}>
                        {t("admin.noResults", "Sonuc bulunamadi")}
                      </Text>
                    </View>
                  }
                />

                {/* Footer: CSV Export + Copy */}
                <View
                  style={{
                    flexDirection: "row",
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    gap: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      handleCSVExport(
                        detailModal.type,
                        getFilteredModalData(),
                        getCSVColumns(detailModal.type)
                      )
                    }
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: COLORS.PRIMARY,
                      paddingVertical: 12,
                      borderRadius: 10,
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="share-outline"
                      size={18}
                      color={COLORS.WHITE}
                    />
                    <Text
                      style={{
                        color: COLORS.WHITE,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {t("admin.exportCSV", "CSV Paylas")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const csv = generateCSV(
                        getFilteredModalData(),
                        getCSVColumns(detailModal.type)
                      );
                      try {
                        await Clipboard.setStringAsync(csv);
                        Alert.alert(
                          "CSV",
                          t("admin.csvCopied", "CSV panoya kopyalandi")
                        );
                      } catch (e) {
                        Alert.alert("Error", e.message);
                      }
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: COLORS.CARD,
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: COLORS.BORDER,
                      gap: 6,
                    }}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={COLORS.TEXT}
                    />
                    <Text
                      style={{
                        color: COLORS.TEXT,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {t("admin.copy", "Kopyala")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

//  ESK StyleSheet S - art makeStyles kullan

export default AdminDashboard;
