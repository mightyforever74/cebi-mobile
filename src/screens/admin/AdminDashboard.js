// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA
// Updated: 22 Şubat 2026 - UI Guide v3 full compliance

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

// ============================================
// ALERT TYPE VE SEVERITY MAPPING
// ============================================

const getAlertTypeMap = (COLORS, t) => ({
  HARD_BRAKE: {
    icon: "⚠️",
    label: t("admin.alerts.hardBrake", "Ani Fren"),
    color: COLORS.ERROR,
  },
  HARD_ACCEL: {
    icon: "⬆️",
    label: t("admin.alerts.hardAccel", "Sert Hızlanma"),
    color: COLORS.WARNING,
  },
  HARD_TURN: {
    icon: "↩️",
    label: t("admin.alerts.hardTurn", "Sert Viraj"),
    color: COLORS.WARNING,
  },
  SHARP_TURN: {
    icon: "↩️",
    label: t("admin.alerts.sharpTurn", "Keskin Viraj"),
    color: COLORS.WARNING,
  },
  IMPACT: {
    icon: "💥",
    label: t("admin.alerts.impact", "Çarpma/Kaza"),
    color: COLORS.ERROR,
  },
  OVERSPEED: {
    icon: "🏎️",
    label: t("admin.alerts.overspeed", "Hız Aşımı"),
    color: COLORS.ERROR,
  },
  GEOFENCE_EXIT: {
    icon: "📍",
    label: t("admin.alerts.geofenceExit", "Bölge Çıkış"),
    color: COLORS.INFO,
  },
  GEOFENCE_ENTER: {
    icon: "📍",
    label: t("admin.alerts.geofenceEnter", "Bölge Girişi"),
    color: COLORS.SUCCESS,
  },
  LOW_FUEL: {
    icon: "⛽",
    label: t("admin.alerts.lowFuel", "Düşük Yakıt"),
    color: COLORS.WARNING,
  },
  IDLE_TIME: {
    icon: "⏱️",
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
    bg: withAlpha(COLORS.WARNING, 0.15),
  },
  low: {
    label: t("admin.severity.low", "Düşük"),
    color: COLORS.SUCCESS,
    bg: withAlpha(COLORS.SUCCESS, 0.15),
  },
});

const getTaskStatusMap = (COLORS, t) => ({
  pending: {
    label: t("admin.taskStatus.pending", "Bekliyor"),
    color: COLORS.WARNING,
    bg: withAlpha(COLORS.WARNING, 0.15),
  },
  assigned: {
    label: t("admin.taskStatus.assigned", "Atandı"),
    color: COLORS.PRIMARY,
    bg: COLORS.SECONDARY,
  },
  in_progress: {
    label: t("admin.taskStatus.inProgress", "Devam Ediyor"),
    color: COLORS.INFO,
    bg: withAlpha(COLORS.INFO, 0.15),
  },
  completed: {
    label: t("admin.taskStatus.completed", "Tamamlandı"),
    color: COLORS.SUCCESS,
    bg: withAlpha(COLORS.SUCCESS, 0.15),
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
// makeStyles - FLAT, UI Guide v3 compliant
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
      marginTop: COLORS.SPACING.md,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: COLORS.SPACING.lg,
      backgroundColor: COLORS.PRIMARY,
      borderBottomLeftRadius: COLORS.RADIUS.xxl,
      borderBottomRightRadius: COLORS.RADIUS.xxl,
    },
    greetingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    greetingEmoji: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      marginRight: COLORS.SPACING.md,
    },
    greeting: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80,
    },
    userName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
      marginTop: 2,
    },
    logoutButton: {
      backgroundColor: COLORS.WHITE_20,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
    },
    logoutText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: COLORS.SPACING.md,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      borderLeftWidth: COLORS.SPACING.xs,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: {
      color: COLORS.ERROR,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    // Command Center
    commandCenterCard: {
      backgroundColor: COLORS.CARD,
      margin: COLORS.SPACING.md,
      marginBottom: 0,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    commandCenterTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.md,
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
      width: COLORS.SPACING.xxxl,
      height: COLORS.SPACING.xxxl,
      borderRadius: COLORS.RADIUS.xxl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    commandNumber: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    commandLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    // Live Map Card
    liveMapCard: {
      backgroundColor: COLORS.PRIMARY,
      margin: COLORS.SPACING.md,
      marginBottom: 0,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    liveMapContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    liveMapIconContainer: {
      position: "relative",
      marginRight: COLORS.SPACING.md,
    },
    livePulse: {
      position: "absolute",
      top: -COLORS.SPACING.xs,
      right: -COLORS.SPACING.xs,
      width: COLORS.SPACING.sm,
      height: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.SUCCESS,
      borderWidth: 2,
      borderColor: COLORS.WHITE,
    },
    liveMapText: {
      flex: 1,
    },
    liveMapTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    liveMapSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80,
      marginTop: 2,
    },
    // Card
    card: {
      backgroundColor: COLORS.CARD,
      margin: COLORS.SPACING.md,
      marginBottom: 0,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    cardTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.md,
    },
    noDataText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingVertical: COLORS.SPACING.lg,
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
      padding: COLORS.SPACING.md,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    statNumber: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    statText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    statDetail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    // Alert Stats Card
    alertStatsCard: {
      flexDirection: "row",
      backgroundColor: COLORS.CARD,
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    alertStatItem: {
      flex: 1,
      alignItems: "center",
    },
    alertStatDivider: {
      width: 1,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.md,
    },
    alertStatIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      marginBottom: COLORS.SPACING.xs,
    },
    alertStatNumber: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WARNING,
    },
    alertStatLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    // Vehicle Card
    vehicleCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    vehicleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    vehicleModel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    driverIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginRight: COLORS.SPACING.xs,
    },
    driverName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
    },
    lastUpdate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.md,
      height: COLORS.SPACING.lg,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    vehicleStats: {
      flexDirection: "row",
      marginRight: COLORS.SPACING.md,
    },
    vehicleStat: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
    },
    vehicleStatIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      marginRight: COLORS.SPACING.xs,
    },
    vehicleStatValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
    },
    seeAllButton: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      marginTop: COLORS.SPACING.xs,
    },
    seeAllText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    // Activity Card
    activityCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
      borderLeftWidth: 3,
    },
    activityHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    activityTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    activityIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      marginRight: COLORS.SPACING.sm,
    },
    activityTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      flex: 1,
    },
    activityTime: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    activityDetails: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    activityTag: {
      backgroundColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    activityTagText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
    },
    severityBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    severityText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    // Filter tabs
    filterRow: {
      flexDirection: "row",
      marginBottom: COLORS.SPACING.sm,
    },
    filterTab: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.lg,
      marginRight: COLORS.SPACING.xs,
    },
    filterTabActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    filterTabInactive: {
      backgroundColor: COLORS.BACKGROUND,
    },
    filterTabTextActive: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    filterTabTextInactive: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
    },
    // Trend row
    trendRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    bottomSpacer: {
      height: COLORS.SPACING.lg,
    },
    // Detail Modal
    detailModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    detailModalContainer: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      maxHeight: "80%",
      minHeight: "40%",
      paddingBottom: COLORS.SPACING.lg,
    },
    detailModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.lg,
      paddingTop: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    detailModalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    detailModalCloseBtn: {
      width: COLORS.SPACING.xl,
      height: COLORS.SPACING.xl,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.CARD,
      alignItems: "center",
      justifyContent: "center",
    },
    detailModalCenter: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.xxl,
    },
    detailEmptyText: {
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    detailSearchWrap: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.xs,
    },
    detailSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.sm,
      height: 40,
    },
    detailSearchInput: {
      flex: 1,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      padding: 0,
      marginLeft: COLORS.SPACING.sm,
    },
    detailCountText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.xs,
    },
    detailListContent: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.md,
    },
    detailCard: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      borderLeftWidth: 3,
    },
    detailCardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    detailCardTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    detailCardTitleSmall: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
    },
    detailBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.sm,
    },
    detailBadgeText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    detailBadgeTextSmall: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    detailSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    detailSubSmall: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    detailMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    detailMetaText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      flex: 1,
      marginLeft: COLORS.SPACING.xs,
    },
    detailMetaTextMuted: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },
    detailDelayTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.ERROR,
    },
    detailDelayRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    detailDelayItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    detailDelayText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },
    detailDelayTime: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
    },
    detailEmptyResult: {
      alignItems: "center",
      padding: COLORS.SPACING.lg,
    },
    detailEmptyResultText: {
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    // Footer buttons
    detailFooter: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.sm,
    },
    detailExportBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      marginRight: COLORS.SPACING.sm,
    },
    detailExportText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    detailCopyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.CARD,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    detailCopyText: {
      color: COLORS.TEXT,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
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
  // Güvenli fallback - INFO token yoksa PRIMARY kullan
  if (!COLORS.INFO) COLORS.INFO = COLORS.PRIMARY;

  // Dinamik mapping'ler (COLORS'a bağlı)
  const ALERT_TYPE_MAP = getAlertTypeMap(COLORS, t);
  const SEVERITY_MAP = getSeverityMap(COLORS, t);
  const TASK_STATUS_MAP = getTaskStatusMap(COLORS, t);

  const getAlertInfo = (type) => {
    return (
      ALERT_TYPE_MAP[type] || {
        icon: "🔔",
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
    type: null,
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
      await Share.share({ message: csv, title: filename });
    } catch (e) {
      try {
        await Clipboard.setStringAsync(csv);
        Alert.alert("CSV", t("admin.csvCopied", "CSV panoya kopyalandı"));
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
          title = t("admin.onlineVehicles", "Online Araçlar");
          const onlineCount = fleetStats?.health?.online_vehicles ?? 0;
          if (onlineCount > 0) {
            const onlineList = vehicles.filter(
              (v) => v.is_online || v.status === "in_use"
            );
            data = onlineList.length > 0 ? onlineList : vehicles;
          } else {
            data = [];
          }
          break;
        }
        case "active_tasks": {
          title = t("admin.activeTasks", "Aktif Görevler");
          const res = await taskAPI.getList();
          const tasks = res.tasks || res || [];
          data = tasks.filter((t) =>
            ["pending_review", "accepted", "in_progress"].includes(t.status)
          );
          break;
        }
        case "completed_today": {
          title = t("admin.completedToday", "Bugün Tamamlanan");
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
      fetchAllData(true);
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
        adminAPI.getVehicles().catch(() => ({ vehicles: [] })),
        adminAPI.getActivities().catch(() => ({ activities: [] })),
      ]);

      if (!statsData?.totals || !statsData?.breakdown) {
        throw new Error("Bad fleet-stats schema");
      }

      setFleetStats(statsData);
      setVehicles(vehiclesData.vehicles || []);
      setActivities(activitiesData.activities || activitiesData.alerts || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      setError(t("admin.dataLoadError", "Veri yüklenirken hata oluştu"));
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
    health: { online_vehicles: 0, offline_vehicles: 0 },
    delays: { last_24h: 0, prev_24h: 0, active_now: 0, delta: 0 },
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

  const handleVehiclePress = (vehicle) => {
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
          style={[styles.activityCard, { borderLeftColor: COLORS.ERROR }]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Ionicons name="warning" size={16} color={COLORS.ERROR} />
              <Text
                style={[
                  styles.activityTitle,
                  { marginLeft: COLORS.SPACING.xs },
                ]}
              >
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
                { backgroundColor: COLORS.INPUT_ERROR },
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
          style={[styles.activityCard, { borderLeftColor: alertInfo.color }]}
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
          style={[styles.activityCard, { borderLeftColor: COLORS.PRIMARY }]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Text style={styles.activityIcon}>📋</Text>
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

  // Detail modal color helper
  const getDetailBorderColor = () => {
    if (detailModal.type === "delays") return COLORS.ERROR;
    if (detailModal.type === "online_vehicles") return COLORS.SUCCESS;
    if (detailModal.type === "completed_today") return COLORS.SUCCESS;
    return COLORS.INFO;
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Ionicons
              name="hand-left-outline"
              size={28}
              color={COLORS.WHITE}
              style={{ marginRight: COLORS.SPACING.sm }}
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

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Command Center */}
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
                    { backgroundColor: withAlpha(COLORS.SUCCESS, 0.08) },
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
                    { backgroundColor: withAlpha(COLORS.WARNING, 0.15) },
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

        {/* Live Map */}
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

        {/* Operations Overview */}
        {fleetStats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("admin.operationsOverview", "Operasyon Özeti")}
            </Text>
            <View style={styles.statsGrid}>
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
                  {t("admin.onlineVehicles", "Online Araç")}
                </Text>
                <Text style={styles.statDetail}>
                  / {fleetStats.totals?.vehicles ?? 0}{" "}
                  {t("admin.total", "toplam")}
                </Text>
              </TouchableOpacity>

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
                  {t("admin.activeTasks", "Aktif Görev")}
                </Text>
                <Text style={styles.statDetail}>
                  {fleetStats.totals?.pending_tasks ?? 0}{" "}
                  {t("admin.pending", "beklemede")}
                </Text>
              </TouchableOpacity>

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
                  {t("admin.completedToday", "Bugün Biten")}
                </Text>
                <Text style={styles.statDetail}>
                  {fleetStats.breakdown?.tasks?.total ?? 0}{" "}
                  {t("admin.totalTasks", "toplam görev")}
                </Text>
              </TouchableOpacity>

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
                <View style={styles.trendRow}>
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

        {/* Alert Stats */}
        {fleetStats?.breakdown?.alerts && (
          <View style={styles.alertStatsCard}>
            <View style={styles.alertStatItem}>
              <Text style={styles.alertStatIcon}>🔔</Text>
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
              <Text style={styles.alertStatIcon}>🚨</Text>
              <Text style={[styles.alertStatNumber, { color: COLORS.ERROR }]}>
                {fleetStats.breakdown?.alerts?.critical ?? 0}
              </Text>
              <Text style={styles.alertStatLabel}>
                {t("admin.criticalAlerts", "Kritik Uyarı")}
              </Text>
            </View>
          </View>
        )}

        {/* Vehicles */}
        <View style={styles.card}>
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
                        <Text style={styles.driverIcon}>👤</Text>
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
                      <Text style={styles.vehicleStatIcon}>🛣️</Text>
                      <Text style={styles.vehicleStatValue}>
                        {Math.round(vehicle.odometer).toLocaleString()} km
                      </Text>
                    </View>
                  )}
                  {vehicle.fuel_level && (
                    <View style={styles.vehicleStat}>
                      <Text style={styles.vehicleStatIcon}>⛽</Text>
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
                {t("admin.seeAll", "Tümünü Gör")} ({vehicles.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Activities */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("admin.recentActivities", "Son Aktiviteler")}
          </Text>

          {/* Filter tabs */}
          <View style={styles.filterRow}>
            {[
              { key: "all", label: t("admin.filterAll", "Tümünü") },
              { key: "delays", label: t("admin.filterDelays", "Gecikmeler") },
              { key: "completed", label: t("admin.filterCompleted", "Biten") },
              { key: "alerts", label: t("admin.filterAlerts", "Uyarılar") },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActivityFilter(tab.key)}
                style={[
                  styles.filterTab,
                  activityFilter === tab.key
                    ? styles.filterTabActive
                    : styles.filterTabInactive,
                ]}
              >
                <Text
                  style={
                    activityFilter === tab.key
                      ? styles.filterTabTextActive
                      : styles.filterTabTextInactive
                  }
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={detailModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModal((p) => ({ ...p, visible: false }))}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            {/* Modal Header */}
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>{detailModal.title}</Text>
              <TouchableOpacity
                onPress={() =>
                  setDetailModal((p) => ({ ...p, visible: false }))
                }
                style={styles.detailModalCloseBtn}
              >
                <Ionicons name="close" size={20} color={COLORS.MUTED} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            {detailModal.loading ? (
              <View style={styles.detailModalCenter}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              </View>
            ) : detailModal.data.length === 0 ? (
              <View style={styles.detailModalCenter}>
                <Ionicons
                  name="file-tray-outline"
                  size={48}
                  color={COLORS.MUTED}
                />
                <Text style={styles.detailEmptyText}>
                  {t("admin.noData", "Veri bulunamadı")}
                </Text>
              </View>
            ) : (
              <>
                {/* Search */}
                <View style={styles.detailSearchWrap}>
                  <View style={styles.detailSearchRow}>
                    <Ionicons name="search" size={18} color={COLORS.MUTED} />
                    <TextInput
                      style={styles.detailSearchInput}
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

                {/* Count */}
                <Text style={styles.detailCountText}>
                  {getFilteredModalData().length} / {detailModal.data.length}{" "}
                  {t("admin.records", "kayıt")}
                </Text>

                {/* List */}
                <FlatList
                  data={getFilteredModalData()}
                  keyExtractor={(item, idx) =>
                    item.id?.toString() || idx.toString()
                  }
                  contentContainerStyle={styles.detailListContent}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.detailCard,
                        { borderLeftColor: getDetailBorderColor() },
                      ]}
                    >
                      {detailModal.type === "online_vehicles" && (
                        <>
                          <View style={styles.detailCardRow}>
                            <Text style={styles.detailCardTitle}>
                              {item.plate_no || item.plate || "—"}
                            </Text>
                            <View
                              style={[
                                styles.detailBadge,
                                {
                                  backgroundColor: withAlpha(
                                    COLORS.SUCCESS,
                                    0.12
                                  ),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.detailBadgeText,
                                  { color: COLORS.SUCCESS },
                                ]}
                              >
                                Online
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.detailSub}>
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
                          <View style={styles.detailCardRow}>
                            <Text style={styles.detailCardTitleSmall}>
                              {item.title || item.task_no || "—"}
                            </Text>
                            <View
                              style={[
                                styles.detailBadge,
                                {
                                  backgroundColor:
                                    item.status === "in_progress"
                                      ? withAlpha(COLORS.INFO, 0.12)
                                      : item.status === "completed"
                                        ? withAlpha(COLORS.SUCCESS, 0.12)
                                        : withAlpha(COLORS.WARNING, 0.12),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.detailBadgeTextSmall,
                                  {
                                    color:
                                      item.status === "in_progress"
                                        ? COLORS.INFO
                                        : item.status === "completed"
                                          ? COLORS.SUCCESS
                                          : COLORS.WARNING,
                                  },
                                ]}
                              >
                                {item.status
                                  ?.replace(/_/g, " ")
                                  .toUpperCase() || "—"}
                              </Text>
                            </View>
                          </View>
                          {item.task_no && (
                            <Text style={styles.detailSubSmall}>
                              {item.task_no}
                            </Text>
                          )}
                          <View style={styles.detailMetaRow}>
                            <Ionicons
                              name="location"
                              size={14}
                              color={COLORS.MUTED}
                            />
                            <Text
                              style={styles.detailMetaText}
                              numberOfLines={1}
                            >
                              {item.start_location || "?"} →{" "}
                              {item.end_location || "?"}
                            </Text>
                          </View>
                          {(item.driver_name || item.driver_email) && (
                            <View style={styles.detailMetaRow}>
                              <Ionicons
                                name="person"
                                size={14}
                                color={COLORS.MUTED}
                              />
                              <Text style={styles.detailMetaTextMuted}>
                                {item.driver_name || item.driver_email}
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      {detailModal.type === "delays" && (
                        <>
                          <Text style={styles.detailDelayTitle}>
                            {item.message || item.identifier || "Gecikme"}
                          </Text>
                          <View style={styles.detailDelayRow}>
                            {item.vehicle_plate && (
                              <View style={styles.detailDelayItem}>
                                <Ionicons
                                  name="car"
                                  size={14}
                                  color={COLORS.MUTED}
                                />
                                <Text style={styles.detailDelayText}>
                                  {item.vehicle_plate}
                                </Text>
                              </View>
                            )}
                            {item.timestamp && (
                              <Text style={styles.detailDelayTime}>
                                {new Date(item.timestamp).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </Text>
                            )}
                          </View>
                        </>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.detailEmptyResult}>
                      <Text style={styles.detailEmptyResultText}>
                        {t("admin.noResults", "Sonuç bulunamadı")}
                      </Text>
                    </View>
                  }
                />

                {/* Footer */}
                <View style={styles.detailFooter}>
                  <TouchableOpacity
                    onPress={() =>
                      handleCSVExport(
                        detailModal.type,
                        getFilteredModalData(),
                        getCSVColumns(detailModal.type)
                      )
                    }
                    style={styles.detailExportBtn}
                  >
                    <Ionicons
                      name="share-outline"
                      size={18}
                      color={COLORS.WHITE}
                    />
                    <Text style={styles.detailExportText}>
                      {t("admin.exportCSV", "CSV Paylaş")}
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
                          t("admin.csvCopied", "CSV panoya kopyalandı")
                        );
                      } catch (e) {
                        Alert.alert("Error", e.message);
                      }
                    }}
                    style={styles.detailCopyBtn}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={18}
                      color={COLORS.TEXT}
                    />
                    <Text style={styles.detailCopyText}>
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

export default AdminDashboard;
