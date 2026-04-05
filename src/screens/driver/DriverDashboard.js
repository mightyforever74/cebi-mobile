// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// v2.0 - Phase 0 Regeneration: StatCard + DataState + StatusBadge + colorUtils
// withAlpha → colorUtils, ActivityIndicator → DataState, statsRow → StatCard, emoji → Ionicons

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import DataState from "../../components/ui/DataState";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { LANGUAGES } from "../../locales/i18n";
import { driverAPI, driverProvisionAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

// ─────────────────────────────────────────────
// FUEL TYPE LABELS (i18n fallback)
// ─────────────────────────────────────────────
const FUEL_TYPE_LABELS = {
  diesel: {
    tr: "Dizel",
    en: "Diesel",
    bg: "Дизел",
    es: "Diésel",
    it: "Diesel",
    nl: "Diesel",
    ku: "Dîzel",
  },
  gasoline: {
    tr: "Benzin",
    en: "Gasoline",
    bg: "Бензин",
    es: "Gasolina",
    it: "Benzina",
    nl: "Benzine",
    ku: "Benzîn",
  },
  lpg: {
    tr: "LPG",
    en: "LPG",
    bg: "Газ",
    es: "GLP",
    it: "GPL",
    nl: "LPG",
    ku: "LPG",
  },
  electric: {
    tr: "Elektrik",
    en: "Electric",
    bg: "Електричество",
    es: "Eléctrico",
    it: "Elettrico",
    nl: "Elektrisch",
    ku: "Elektrîk",
  },
};

// ─────────────────────────────────────────────
// TASK STATUS → StatusBadge severity map
// ─────────────────────────────────────────────
const TASK_STATUS_SEVERITY = {
  pending_review: "WARNING",
  accepted: "INFO",
  in_progress: "WARNING",
  completed: "SUCCESS",
  cancelled: "OFFLINE",
};

// ─────────────────────────────────────────────
// makeStyles - Phase 0 temizlenmiş
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },

    // ── Header ──
    header: {
      backgroundColor: COLORS.PRIMARY,
      paddingTop: 60,
      paddingBottom: COLORS.SPACING.lg,
      paddingHorizontal: COLORS.SPACING.headerPadding,
      borderBottomLeftRadius: COLORS.RADIUS.xxl,
      borderBottomRightRadius: COLORS.RADIUS.xxl,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    greetingContainer: { flexDirection: "row", alignItems: "center" },
    greeting: { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.WHITE_80 },
    userName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    headerButtons: { flexDirection: "row" },
    headerButton: {
      backgroundColor: COLORS.WHITE_20,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      marginLeft: COLORS.SPACING.sm,
    },
    langFlag: { fontSize: COLORS.TYPOGRAPHY.sizes.xxl },

    // ── Error banner ──
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: 16,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: { color: COLORS.ERROR, fontSize: COLORS.TYPOGRAPHY.sizes.md },

    // ── Task Offers banner ──
    offersCard: {
      backgroundColor: COLORS.SUCCESS,
      margin: 16,
      marginBottom: 0,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      elevation: 0,
    },
    offersContent: { flexDirection: "row", alignItems: "center" },
    offersText: { flex: 1 },
    offersTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    offersSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80,
      marginTop: COLORS.SPACING.xs / 2,
    },

    // ── Card common ──
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
    },
    noDataText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingVertical: 20,
    },
    seeAllText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Vehicle card ──
    vehicleInfo: { marginBottom: COLORS.SPACING.md },
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    vehicleModel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    fuelEntryHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
    },
    fuelEntryHintText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    vehicleDetailsRow: {
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
    },
    vehicleDetailItem: { flex: 1, alignItems: "center" },
    vehicleDetailLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    vehicleDetailValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.xs / 2,
    },
    vehicleDetailDivider: {
      width: 1,
      backgroundColor: COLORS.BORDER,
      marginHorizontal: COLORS.SPACING.sm,
    },

    // ── Task card ──
    taskCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    taskHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    taskTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      flex: 1,
      marginRight: COLORS.SPACING.xs,
    },
    taskDescription: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs,
    },
    taskTime: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    taskMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },

    // ── Stats row (StatCard grid) ──
    statsGrid: {
      flexDirection: "row",
      gap: COLORS.SPACING.sm,
      flex: 1,
    },


    // ── Drive Assist ──
    daSection: {
      marginBottom: COLORS.SPACING.xs,
    },
    daSectionLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xs / 2,
    },

    // Büyük özet kart
    daSummaryCard: {
      borderRadius: COLORS.RADIUS.xl,
      overflow: "hidden",
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    daSummaryHeader: {
      backgroundColor: withAlpha(COLORS.TEXT, 0.92),
      padding: COLORS.SPACING.md,
    },
    daSummaryHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    daBadge: {
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.2),
      borderWidth: 0.5,
      borderColor: withAlpha(COLORS.SUCCESS, 0.5),
      borderRadius: COLORS.RADIUS.full,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs - 1,
    },
    daBadgeText: {
      color: COLORS.SUCCESS,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    daBadgeStandby: {
      backgroundColor: withAlpha(COLORS.WHITE, 0.08),
      borderColor: COLORS.WHITE_20,
    },
    daBadgeStandbyText: {
      color: withAlpha(COLORS.WHITE, 0.6),
    },
    daEtaLabel: {
      color: withAlpha(COLORS.WHITE, 0.5),
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: COLORS.SPACING.xs / 2,
    },
    daEtaValue: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      lineHeight: 36,
    },
    daEtaSub: {
      color: withAlpha(COLORS.WHITE, 0.5),
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      marginTop: COLORS.SPACING.xs / 2,
    },

    // 4'lü grid
    daGrid: {
      flexDirection: "row",
      backgroundColor: COLORS.CARD,
      borderTopWidth: 0.5,
      borderTopColor: COLORS.BORDER,
    },
    daGridCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderRightWidth: 0.5,
      borderRightColor: COLORS.BORDER,
    },
    daGridCellLast: {
      borderRightWidth: 0,
    },
    daGridEmoji: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      marginBottom: COLORS.SPACING.xs / 2,
    },
    daGridVal: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    daGridKey: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 1,
    },

    // Uyarı satırı
    daAlertRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WARNING_LIGHT,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      gap: COLORS.SPACING.sm,
    },
    daAlertDot: {
      width: 6,
      height: 6,
      borderRadius: COLORS.RADIUS.xs,
      backgroundColor: COLORS.WARNING,
    },
    daAlertText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
      flex: 1,
    },

    // 2 küçük kart row
    daSmallRow: {
      flexDirection: "row",
      gap: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    daSmallCard: {
      flex: 1,
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.lg,
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
      padding: COLORS.SPACING.sm,
      minHeight: 100,
    },
    daSmallCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
    },
    daSmallDot: {
      width: 6,
      height: 6,
      borderRadius: COLORS.RADIUS.xs,
    },
    daSmallLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      color: COLORS.TEXT_SECONDARY,
    },
    daSmallVal: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      lineHeight: 22,
    },
    daSmallSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs / 2,
    },
    daSmallWarn: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.WARNING,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginTop: COLORS.SPACING.xs,
    },
    daSmallCritical: {
      color: COLORS.ERROR,
    },

    // Güvenlik & Destek kartı
    daSecCard: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.lg,
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    daSecTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: COLORS.SPACING.sm,
    },
    daMainBtnRow: {
      flexDirection: "row",
      gap: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    daBtnSOS: {
      flex: 1,
      backgroundColor: COLORS.ERROR,
      borderRadius: COLORS.RADIUS.md,
      paddingVertical: COLORS.SPACING.sm + COLORS.SPACING.xs,
      alignItems: "center",
    },
    daBtnSOSLabel: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    daBtnSOSSub: {
      color: COLORS.WHITE_80,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      marginTop: 1,
    },
    daBtnSOSGhost: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      paddingVertical: COLORS.SPACING.sm + COLORS.SPACING.xs,
      alignItems: "center",
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
    },
    daBtnSOSGhostLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    daBtnSOSGhostSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 1,
    },
    daActionRow: {
      flexDirection: "row",
      gap: COLORS.SPACING.xs,
    },
    daActionBtn: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      paddingVertical: COLORS.SPACING.sm,
      alignItems: "center",
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
    },
    daActionLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.xs - 1,
      textAlign: "center",
    },
    daLocRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 0.5,
      borderTopColor: COLORS.BORDER,
    },
    daLocDot: {
      width: 5,
      height: 5,
      borderRadius: COLORS.RADIUS.xs,
      backgroundColor: COLORS.SUCCESS,
    },
    daLocText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
    },

    // Standby state
    daStandbyInfo: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.lg,
      borderWidth: 0.5,
      borderColor: COLORS.BORDER,
      padding: COLORS.SPACING.md,
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    daStandbyText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
    },

    // ── Device Status Lamps ──
    deviceStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.BORDER,
      gap: COLORS.SPACING.sm,
    },
    deviceStatusLamp: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      paddingVertical: COLORS.SPACING.xs + 3,
      paddingHorizontal: COLORS.SPACING.sm,
      gap: COLORS.SPACING.xs,
    },
    deviceStatusDot: { width: 7, height: 7, borderRadius: COLORS.RADIUS.xs },
    deviceStatusLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Quick Access ──
    quickAccessGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: COLORS.SPACING.sm,
    },
    quickAccessItem: {
      width: "48%",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginBottom: COLORS.SPACING.sm,
    },
    quickAccessIcon: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.xxl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    quickAccessText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      textAlign: "center",
    },

    // ── Language modal ──
    langModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    langModalContent: {
      backgroundColor: COLORS.CARD,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      paddingBottom: COLORS.SPACING.xl,
      maxHeight: "70%",
    },
    langModalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      paddingHorizontal: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.md,
    },
    langItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: COLORS.SPACING.lg,
    },
    langItemActive: { backgroundColor: COLORS.PRIMARY },
    langItemFlag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      marginRight: COLORS.SPACING.sm,
    },
    langItemName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      flex: 1,
    },
    langItemNameActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    langCloseBtn: {
      marginHorizontal: 20,
      marginTop: COLORS.SPACING.md,
      paddingVertical: 14,
      backgroundColor: COLORS.BORDER,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
    },
    langCloseBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },

    // ── FAB ──
    fab: {
      position: "absolute",
      bottom: COLORS.SPACING.lg,
      right: COLORS.SPACING.lg,
      width: 60,
      height: 60,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.WARNING,
      justifyContent: "center",
      alignItems: "center",
      elevation: 0,
      elevation: 0,
    },

    // ── Serial modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.modal,
      padding: COLORS.SPACING.lg,
      width: "85%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    modalSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 20,
    },
    modalInput: {
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      marginBottom: 20,
    },
    modalButtons: { flexDirection: "row", justifyContent: "space-between" },
    modalButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
    },
    modalButtonCancel: {
      backgroundColor: COLORS.BORDER,
      marginRight: COLORS.SPACING.sm,
    },
    modalButtonSubmit: {
      backgroundColor: COLORS.WARNING,
      marginLeft: COLORS.SPACING.sm,
    },
    modalButtonTextCancel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    modalButtonTextSubmit: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE,
    },
  });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatKm = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n).toLocaleString();
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  usePushNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [validating, setValidating] = useState(false);

  // ── Drive Assist state ──
  const [driveAssist, setDriveAssist] = useState(null);  // null=loading, obj=data
  const [assistLoading, setAssistLoading] = useState(false);

  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const getFuelTypeLabel = (fuelType) => {
    if (!fuelType) return "N/A";
    const labels = FUEL_TYPE_LABELS[fuelType.toLowerCase()];
    return labels ? labels[i18n.language] || labels.en : fuelType;
  };

  // ── Fetch ──
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [vehicleRes, tasksRes, statsRes] = await Promise.all([
        driverAPI.getMyVehicle(),
        driverAPI.getMyTasks(),
        driverAPI.getMyStats(),
      ]);
      setVehicle(vehicleRes.vehicle || null);
      const allTasks = tasksRes.tasks || [];
      setTasks(
        allTasks.filter((task) =>
          ["pending_review", "accepted", "in_progress"].includes(task.status)
        )
      );
      setStats(statsRes.stats || {});

      // Drive Assist — aktif görevi ilet
      const active = (tasksRes.tasks || []).find(t =>
        ['in_progress', 'accepted', 'pending_review'].includes(t.status)
      ) || null;
      fetchDriveAssist(active, vehicleRes.vehicle || null);
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(`${t("common.error")}: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  // ── Drive Assist fetch ──
  const fetchDriveAssist = useCallback(async (activeTask, vehicle) => {
    setAssistLoading(true);
    try {
      const [trafficRes, weatherRes] = await Promise.allSettled([
        driverAPI.getRouteTraffic(activeTask),
        driverAPI.getRouteWeather(activeTask),
      ]);
      setDriveAssist({
        activeTask,
        vehicle,
        traffic: trafficRes.status === 'fulfilled' ? trafficRes.value : null,
        weather: weatherRes.status === 'fulfilled' ? weatherRes.value : null,
      });
    } catch (err) {
      console.error('[DriveAssist] error:', err);
      setDriveAssist({ activeTask, vehicle, traffic: null, weather: null });
    } finally {
      setAssistLoading(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logoutConfirmTitle"), t("auth.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.confirm"), onPress: logout },
    ]);
  };

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setLangModalVisible(false);
  };

  const handleVehiclePress = () => {
    navigation.navigate("FuelEntry");
  };

  const handleTaskPress = (task) => {
    navigation.navigate("MyTasks", {
      screen: "DriverTaskDetailScreen",
      params: { taskId: task.id },
    });
  };

  const safeOpenURL = async (url) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(
          t("common.error"),
          t("common.cannotOpenLink", "Link açılamadı")
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || "Link error");
    }
  };

  const handleAddDevice = () => {
    setSerialInput("");
    setShowSerialModal(true);
  };

  const handleSerialSubmit = async () => {
    if (!serialInput || serialInput.trim().length === 0) {
      Alert.alert(t("common.error"), t("dashboard.serialEmpty"));
      return;
    }
    try {
      setValidating(true);
      const response = await driverProvisionAPI.validateSerial(
        serialInput.trim()
      );
      if (response.valid) {
        setShowSerialModal(false);
        navigation.navigate("DeviceSetup", {
          screen: "DeviceSetupMain",
          params: { serial: serialInput.trim(), deviceInfo: response.device },
        });
      } else {
        Alert.alert(
          t("common.error"),
          response.message || t("dashboard.deviceNotFound")
        );
      }
    } catch (error) {
      console.error("[Dashboard] Serial validation error:", error);
      Alert.alert(
        t("common.error"),
        t("dashboard.deviceCheckFailed") + ": " + error.message
      );
    } finally {
      setValidating(false);
    }
  };

  // ── Render ──
  return (
    <DataState
      loading={loading}
      error={error}
      onRetry={() => {
        setLoading(true);
        fetchDashboardData();
      }}
      retryLabel={t("common.retry", "Tekrar Dene")}
    >
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
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Ionicons
              name="hand-left-outline"
              size={28}
              color={COLORS.WHITE}
              style={{ marginRight: 12 }}
            />
            <View>
              <Text style={styles.greeting}>{t("dashboard.hello")}</Text>
              <Text style={styles.userName}>
                {user?.first_name ||
                  user?.email?.split("@")[0] ||
                  t("roles.driver")}
              </Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setLangModalVisible(true)}
            >
              <Text style={styles.langFlag}>{currentLang.flag}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              <Ionicons name="warning-outline" size={14} color={COLORS.ERROR} />{" "}
              {error}
            </Text>
          </View>
        )}

        {/* ── Task Offers ── */}
        <TouchableOpacity
          style={styles.offersCard}
          onPress={() =>
            navigation.navigate("MyTasks", { screen: "DriverTasksScreen" })
          }
        >
          <View style={styles.offersContent}>
            <Ionicons
              name="mail-unread-outline"
              size={28}
              color={COLORS.WHITE}
              style={{ marginRight: 12 }}
            />
            <View style={styles.offersText}>
              <Text style={styles.offersTitle}>
                {t("dashboard.taskOffers")}
              </Text>
              <Text style={styles.offersSubtitle}>
                {t("dashboard.viewPendingOffers")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
          </View>
        </TouchableOpacity>

        {/* ── Vehicle Card ── */}
        {vehicle ? (
          <TouchableOpacity onPress={handleVehiclePress} activeOpacity={0.8}>
            <Card>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>
                <View style={styles.fuelEntryHint}>
                  <Ionicons
                    name="flame-outline"
                    size={16}
                    color={COLORS.PRIMARY}
                  />
                  <Text style={styles.fuelEntryHintText}>
                    {t("dashboard.fuelEntry", "Yakıt Girişi")}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.PRIMARY}
                  />
                </View>
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                <Text style={styles.vehicleModel}>
                  {vehicle.brand} {vehicle.model}
                </Text>
              </View>
              <View style={styles.vehicleDetailsRow}>
                <View style={styles.vehicleDetailItem}>
                  <Ionicons
                    name="water-outline"
                    size={20}
                    color={COLORS.INFO}
                  />
                  <Text style={styles.vehicleDetailLabel}>
                    {t("fuel.fuelType", "Yakıt")}
                  </Text>
                  <Text style={styles.vehicleDetailValue}>
                    {getFuelTypeLabel(vehicle.fuel_type)}
                  </Text>
                </View>
                <View style={styles.vehicleDetailDivider} />
                <View style={styles.vehicleDetailItem}>
                  <Ionicons
                    name="cube-outline"
                    size={20}
                    color={COLORS.SUCCESS}
                  />
                  <Text style={styles.vehicleDetailLabel}>
                    {t("fuel.tankCapacity", "Depo")}
                  </Text>
                  <Text style={styles.vehicleDetailValue}>
                    {vehicle.fuel_capacity || 60}L
                  </Text>
                </View>
              </View>

              {/* ── Device Status Lamps ── */}
              {(() => {
                const wifiOk = !!vehicle.esp32_connected;
                const gpsOk = vehicle.last_gps_lat != null && vehicle.last_gps_lat !== 0;
                const wifiColor = wifiOk ? COLORS.INFO : COLORS.MUTED;
                const wifiIcon = wifiOk ? "wifi" : "wifi-outline";
                const gpsColor = gpsOk ? COLORS.SUCCESS : wifiOk ? COLORS.ERROR : COLORS.MUTED;
                const gpsIcon = gpsOk ? "location" : "location-outline";
                return (
                  <View style={styles.deviceStatusRow}>
                    <View style={styles.deviceStatusLamp}>
                      <Ionicons name={wifiIcon} size={15} color={wifiColor} />
                      <View style={[styles.deviceStatusDot, { backgroundColor: wifiColor }]} />
                      <Text style={[styles.deviceStatusLabel, { color: wifiColor }]}>WiFi {wifiOk ? "✓" : "—"}</Text>
                    </View>
                    <View style={styles.deviceStatusLamp}>
                      <Ionicons name={gpsIcon} size={15} color={gpsColor} />
                      <View style={[styles.deviceStatusDot, { backgroundColor: gpsColor }]} />
                      <Text style={[styles.deviceStatusLabel, { color: gpsColor }]}>GPS {gpsOk ? "✓" : wifiOk ? "✗" : "—"}</Text>
                    </View>
                  </View>
                );
              })()}
            </Card>
          </TouchableOpacity>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>
            <Text style={styles.noDataText}>
              {t("dashboard.noVehicleAssigned")}
            </Text>
          </Card>
        )}

        {/* ── Active Tasks Card ── */}
        <Card>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t("dashboard.activeTasks")}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("MyTasks")}>
              <Text style={styles.seeAllText}>{t("dashboard.seeAll")}</Text>
            </TouchableOpacity>
          </View>

          {tasks.length > 0 ? (
            tasks.slice(0, 3).map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => handleTaskPress(task)}
              >
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title || `${t("task.title")} #${task.id?.slice(-4)}`}
                  </Text>
                  {/* statusBadge → StatusBadge */}
                  <StatusBadge
                    status={TASK_STATUS_SEVERITY[task.status] || "INFO"}
                    label={t(`task.statuses.${task.status}`) || task.status}
                    size="sm"
                  />
                </View>

                {task.pickup_address && (
                  <View style={styles.taskMetaRow}>
                    <Ionicons
                      name="location-outline"
                      size={14}
                      color={COLORS.MUTED}
                      style={{ marginRight: COLORS.SPACING.xs }}
                    />
                    <Text style={styles.taskDescription} numberOfLines={1}>
                      {task.pickup_address}
                    </Text>
                  </View>
                )}
                {task.scheduled_date && (
                  <View style={styles.taskMetaRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.MUTED}
                      style={{ marginRight: COLORS.SPACING.xs }}
                    />
                    <Text style={styles.taskTime}>
                      {new Date(task.scheduled_date).toLocaleDateString(
                        i18n.language
                      )}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noDataText}>
              {t("dashboard.noActiveTasks")}
            </Text>
          )}
        </Card>

        {/* ── Stats Card → StatCard × 3 ── */}
        <Card>
          <Text style={styles.cardTitle}>{t("dashboard.myStats")}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              compact
              icon="checkmark-circle-outline"
              label={t("dashboard.completedTasks")}
              value={stats?.completed_tasks || 0}
              colorToken="SUCCESS"
            />
            <StatCard
              compact
              icon="today-outline"
              label={t("dashboard.todayKm")}
              value={formatKm(stats?.today_km)}
              colorToken="INFO"
            />
            <StatCard
              compact
              icon="calendar-outline"
              label={t("dashboard.monthKm")}
              value={formatKm(stats?.month_km)}
              colorToken="PRIMARY"
            />
          </View>
        </Card>

        {/* ══════════════════════════════════════════
            DRIVE ASSIST — Sürüş Asistanı
        ══════════════════════════════════════════ */}
        {(() => {
          const hasTask = !!driveAssist?.activeTask;
          const task = driveAssist?.activeTask;
          const traffic = driveAssist?.traffic;
          const weather = driveAssist?.weather;

          // ── Trafik yardımcıları ──
          const trafficIcon = !traffic ? "⏳"
            : traffic.delay_min === 0 ? "✅"
            : traffic.delay_min < 10 ? "🟡"
            : "🔴";
          const trafficVal = !traffic ? t("dashboard.loading")
            : traffic.delay_min === 0 ? t("dashboard.trafficClear")
            : `+${traffic.delay_min} dk`;
          const trafficCritical = traffic?.delay_min > 10;

          // ── Hava yardımcıları ──
          const weatherIcon = weather?.icon || "🌡️";
          const weatherVal = weather ? `${weather.temp_c}°C` : t("dashboard.loading");
          const weatherSub = weather?.description || "";
          const weatherAlert = weather?.alert || null;
          const windRisk = weather
            ? weather.wind_kmh > 60 ? t("dashboard.windHigh")
              : weather.wind_kmh > 40 ? t("dashboard.windModerate")
              : null
            : null;

          return (
            <>
              {/* ── BÜYÜK ÖZET KART ── */}
              <View style={styles.daSummaryCard}>
                {/* Header: koyu arka plan */}
                <View style={styles.daSummaryHeader}>
                  <View style={styles.daSummaryHeaderRow}>
                    <View>
                      <Text style={styles.daEtaLabel}>
                        {t("driveAssist.title")}
                      </Text>
                      {hasTask ? (
                        <>
                          <Text style={styles.daEtaValue}>
                            {traffic?.duration_min
                              ? `${traffic.duration_min} dk`
                              : "— dk"}
                            {" "}
                            <Text style={{ fontSize: COLORS.TYPOGRAPHY.sizes.lg, color: withAlpha(COLORS.WHITE, 0.45) }}>
                              ETA
                            </Text>
                          </Text>
                          <Text style={styles.daEtaSub}>
                            {task?.end_location?.slice(0, 28) || t("driveAssist.activeRoute")}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.daEtaValue, { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, marginTop: COLORS.SPACING.xs }]}>
                            {t("driveAssist.standbyMode")}
                          </Text>
                          <Text style={styles.daEtaSub}>
                            {t("driveAssist.standbySub")}
                          </Text>
                        </>
                      )}
                    </View>
                    <View style={[
                      styles.daBadge,
                      !hasTask && styles.daBadgeStandby
                    ]}>
                      <Text style={[
                        styles.daBadgeText,
                        !hasTask && styles.daBadgeStandbyText
                      ]}>
                        {hasTask ? t("driveAssist.activeTask") : t("driveAssist.standby")}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4'lü grid */}
                <View style={styles.daGrid}>
                  <View style={styles.daGridCell}>
                    <Text style={styles.daGridEmoji}>🚦</Text>
                    <Text style={[
                      styles.daGridVal,
                      trafficCritical && { color: COLORS.ERROR }
                    ]}>
                      {trafficVal}
                    </Text>
                    <Text style={styles.daGridKey}>{t("driveAssist.traffic")}</Text>
                  </View>
                  <View style={styles.daGridCell}>
                    <Text style={styles.daGridEmoji}>
                      {weather?.icon || "🌡️"}
                    </Text>
                    <Text style={styles.daGridVal}>{weatherVal}</Text>
                    <Text style={styles.daGridKey}>{t("driveAssist.weather")}</Text>
                  </View>
                  <View style={styles.daGridCell}>
                    <Text style={styles.daGridEmoji}>❄️</Text>
                    <Text style={[
                      styles.daGridVal,
                      weather?.alert?.toLowerCase().includes("don") || weather?.alert?.toLowerCase().includes("ice")
                        ? { color: COLORS.ERROR }
                        : { color: COLORS.SUCCESS }
                    ]}>
                      {weather?.alert?.toLowerCase().includes("don") || weather?.alert?.toLowerCase().includes("ice")
                        ? t("driveAssist.iceRisk")
                        : t("driveAssist.noIce")}
                    </Text>
                    <Text style={styles.daGridKey}>{t("driveAssist.ice")}</Text>
                  </View>
                  <View style={[styles.daGridCell, styles.daGridCellLast]}>
                    <Text style={styles.daGridEmoji}>💨</Text>
                    <Text style={[
                      styles.daGridVal,
                      weather?.wind_kmh > 60 && { color: COLORS.ERROR }
                    ]}>
                      {weather?.wind_kmh ?? "—"}
                    </Text>
                    <Text style={styles.daGridKey}>km/h</Text>
                  </View>
                </View>

                {/* Uyarı satırı — sadece kritik durumda */}
                {(traffic?.incidents?.length > 0 || weatherAlert || windRisk) && (
                  <View style={styles.daAlertRow}>
                    <View style={styles.daAlertDot} />
                    <Text style={styles.daAlertText} numberOfLines={1}>
                      {traffic?.incidents?.[0] || weatherAlert || windRisk}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── 2 KÜÇÜK KART ── */}
              <View style={styles.daSmallRow}>
                {/* Yol Trafiği */}
                <View style={styles.daSmallCard}>
                  <View style={styles.daSmallCardHeader}>
                    <View style={[styles.daSmallDot, {
                      backgroundColor: trafficCritical ? COLORS.ERROR
                        : traffic?.delay_min > 0 ? COLORS.WARNING
                        : COLORS.SUCCESS
                    }]} />
                    <Text style={styles.daSmallLabel}>
                      {t("driveAssist.routeTraffic")}
                    </Text>
                  </View>
                  <Text style={styles.daSmallVal}>
                    {assistLoading ? t("dashboard.loading")
                      : !traffic ? t("dashboard.dataUnavailable")
                      : traffic.delay_min === 0 ? t("dashboard.trafficClear")
                      : traffic.delay_min < 10 ? t("driveAssist.trafficModerate")
                      : t("driveAssist.trafficHeavy")}
                  </Text>
                  {traffic?.route_label && (
                    <Text style={styles.daSmallSub} numberOfLines={1}>
                      {traffic.route_label}
                    </Text>
                  )}
                  {traffic?.incidents?.length > 0 && (
                    <Text style={[styles.daSmallWarn, trafficCritical && styles.daSmallCritical]}
                      numberOfLines={1}>
                      {traffic.incidents[0]}
                    </Text>
                  )}
                </View>

                {/* Yol Hava Riski */}
                <View style={styles.daSmallCard}>
                  <View style={styles.daSmallCardHeader}>
                    <View style={[styles.daSmallDot, {
                      backgroundColor: weatherAlert ? COLORS.ERROR
                        : windRisk ? COLORS.WARNING
                        : COLORS.INFO
                    }]} />
                    <Text style={styles.daSmallLabel}>
                      {t("driveAssist.roadWeather")}
                    </Text>
                  </View>
                  <Text style={styles.daSmallVal}>
                    {assistLoading ? t("dashboard.loading")
                      : !weather ? t("dashboard.dataUnavailable")
                      : `${weather.temp_c}°C — ${weather.description}`}
                  </Text>
                  {weather?.wind_kmh > 0 && (
                    <Text style={styles.daSmallSub}>
                      {windRisk || `${weather.wind_kmh} km/h`}
                    </Text>
                  )}
                  {weatherAlert && (
                    <Text style={[styles.daSmallWarn, styles.daSmallCritical]}
                      numberOfLines={1}>
                      {weatherAlert}
                    </Text>
                  )}
                </View>
              </View>

              {/* ── GÜVENLİK & DESTEK KARTI ── */}
              <View style={styles.daSecCard}>
                <Text style={styles.daSecTitle}>
                  {t("driveAssist.safetySupport")}
                </Text>
                <View style={styles.daMainBtnRow}>
                  <TouchableOpacity
                    style={styles.daBtnSOS}
                    onPress={() => {
                      // OS native emergency dial akışını aç
                      // 112 Avrupa fallback — label'da görünmez
                      const EMERGENCY_NUMBER = "112";
                      Linking.openURL(`tel:${EMERGENCY_NUMBER}`).catch(() => {
                        Alert.alert(
                          t("driveAssist.emergencyCallTitle"),
                          t("driveAssist.emergencyCallFallback", { number: EMERGENCY_NUMBER })
                        );
                      });
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.daBtnSOSLabel}>
                      {t("driveAssist.emergencyCall")}
                    </Text>
                    <Text style={styles.daBtnSOSSub}>
                      {t("driveAssist.emergencyCallSub")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.daBtnSOSGhost}
                    onPress={() => {
                      Alert.alert(
                        t("driveAssist.sosTitle"),
                        t("driveAssist.sosConfirm"),
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          { text: t("driveAssist.send"), style: "destructive",
                            onPress: () => {
                              /* Faz 2: backend SOS endpoint */
                              Alert.alert("SOS", t("driveAssist.sosSent"));
                            }
                          },
                        ]
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.daBtnSOSGhostLabel}>
                      {t("driveAssist.sosSend")}
                    </Text>
                    <Text style={styles.daBtnSOSGhostSub}>
                      {t("driveAssist.sosDesc")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.daActionRow}>
                  <TouchableOpacity
                    style={styles.daActionBtn}
                    onPress={() => navigation.navigate("HelpCenter")}
                  >
                    <Ionicons name="call-outline" size={16} color={COLORS.PRIMARY} />
                    <Text style={styles.daActionLabel}>
                      {t("driveAssist.dispatcher")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.daActionBtn}
                    onPress={() => Alert.alert(t("driveAssist.delayReport"), t("driveAssist.comingSoon"))}
                  >
                    <Ionicons name="time-outline" size={16} color={COLORS.WARNING} />
                    <Text style={styles.daActionLabel}>
                      {t("driveAssist.reportDelay")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.daActionBtn}
                    onPress={() => Alert.alert(t("driveAssist.issueReport"), t("driveAssist.comingSoon"))}
                  >
                    <Ionicons name="construct-outline" size={16} color={COLORS.MUTED} />
                    <Text style={styles.daActionLabel}>
                      {t("driveAssist.reportIssue")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {vehicle && (
                  <View style={styles.daLocRow}>
                    <View style={styles.daLocDot} />
                    <Text style={styles.daLocText}>
                      {t("driveAssist.lastLocation")}
                    </Text>
                  </View>
                )}
              </View>
            </>
          );
        })()}

                {/* ── Language Modal ── */}
        <Modal
          visible={langModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setLangModalVisible(false)}
        >
          <View style={styles.langModalOverlay}>
            <View style={styles.langModalContent}>
              <Text style={styles.langModalTitle}>
                {t("settings.selectLanguage")}
              </Text>
              <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.langItem,
                      item.code === i18n.language && styles.langItemActive,
                    ]}
                    onPress={() => changeLanguage(item.code)}
                  >
                    <Text style={styles.langItemFlag}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.langItemName,
                        item.code === i18n.language &&
                          styles.langItemNameActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.code === i18n.language && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={COLORS.WHITE}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity
                style={styles.langCloseBtn}
                onPress={() => setLangModalVisible(false)}
              >
                <Text style={styles.langCloseBtnText}>{t("common.close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Serial Modal ── */}
        <Modal
          visible={showSerialModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSerialModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {t("dashboard.enterSerial")}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t("dashboard.enterSerialMessage")}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={serialInput}
                onChangeText={setSerialInput}
                placeholder="TF-2025-00001-1"
                placeholderTextColor={COLORS.PLACEHOLDER}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!validating}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowSerialModal(false)}
                  disabled={validating}
                >
                  <Text style={styles.modalButtonTextCancel}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSubmit]}
                  onPress={handleSerialSubmit}
                  disabled={validating}
                >
                  {validating ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Text style={styles.modalButtonTextSubmit}>
                      {t("common.continue")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── FAB ── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddDevice}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={28} color={COLORS.WHITE} />
        </TouchableOpacity>
      </ScrollView>
    </DataState>
  );
};

export default DriverDashboard;
