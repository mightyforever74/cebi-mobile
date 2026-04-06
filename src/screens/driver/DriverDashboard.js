// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// v2.0 - Phase 0 Regeneration: StatCard + DataState + StatusBadge + colorUtils
// withAlpha â†’ colorUtils, ActivityIndicator â†’ DataState, statsRow â†’ StatCard, emoji â†’ Ionicons

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
import * as Speech from "expo-speech";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FUEL TYPE LABELS (i18n fallback)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FUEL_TYPE_LABELS = {
  diesel: {
    tr: "Dizel",
    en: "Diesel",
    bg: "Ğ”Ğ¸Ğ·ĞµĞ»",
    es: "DiÃ©sel",
    it: "Diesel",
    nl: "Diesel",
    ku: "DÃ®zel",
  },
  gasoline: {
    tr: "Benzin",
    en: "Gasoline",
    bg: "Ğ‘ĞµĞ½Ğ·Ğ¸Ğ½",
    es: "Gasolina",
    it: "Benzina",
    nl: "Benzine",
    ku: "BenzÃ®n",
  },
  lpg: {
    tr: "LPG",
    en: "LPG",
    bg: "Ğ“Ğ°Ğ·",
    es: "GLP",
    it: "GPL",
    nl: "LPG",
    ku: "LPG",
  },
  electric: {
    tr: "Elektrik",
    en: "Electric",
    bg: "Ğ•Ğ»ĞµĞºÑ‚Ñ€Ğ¸Ñ‡ĞµÑÑ‚Ğ²Ğ¾",
    es: "ElÃ©ctrico",
    it: "Elettrico",
    nl: "Elektrisch",
    ku: "ElektrÃ®k",
  },
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TASK STATUS â†’ StatusBadge severity map
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TASK_STATUS_SEVERITY = {
  pending_review: "WARNING",
  accepted: "INFO",
  in_progress: "WARNING",
  completed: "SUCCESS",
  cancelled: "OFFLINE",
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// makeStyles - Phase 0 temizlenmiÅŸ
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },

    // â”€â”€ Header â”€â”€
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

    // â”€â”€ Error banner â”€â”€
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: 16,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: { color: COLORS.ERROR, fontSize: COLORS.TYPOGRAPHY.sizes.md },

    // â”€â”€ Task Offers banner â”€â”€
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

    // â”€â”€ Card common â”€â”€
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

    // â”€â”€ Vehicle card â”€â”€
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

    // â”€â”€ Task card â”€â”€
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

    // â”€â”€ Stats row (StatCard grid) â”€â”€
    statsGrid: {
      flexDirection: "row",
      gap: COLORS.SPACING.sm,
      flex: 1,
    },


    // â”€â”€ Drive Assist Card â”€â”€
    daCardRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    daSpeakHint: {
      padding: COLORS.SPACING.xs,
    },
    // StatCard stili â€” alt alta iki satÄ±r
    daRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: COLORS.RADIUS.lg,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    daIconWrap: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    daTextWrap: {
      flex: 1,
    },
    daRowLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: 2,
      opacity: 0.7,
    },
    daRowValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      lineHeight: 20,
    },
    daRowSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      marginTop: 2,
      opacity: 0.75,
    },
    daTapHint: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.xs,
    },

    // â”€â”€ Device Status Lamps â”€â”€

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

    // â”€â”€ Quick Access â”€â”€
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

    // â”€â”€ Language modal â”€â”€
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

    // â”€â”€ FAB â”€â”€
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

    // â”€â”€ Serial modal â”€â”€
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const formatKm = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n).toLocaleString();
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPONENT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Drive Assist state â”€â”€
  const [driveAssist, setDriveAssist] = useState(null);  // null=loading, obj=data
  const [assistLoading, setAssistLoading] = useState(false);

  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const getFuelTypeLabel = (fuelType) => {
    if (!fuelType) return "N/A";
    const labels = FUEL_TYPE_LABELS[fuelType.toLowerCase()];
    return labels ? labels[i18n.language] || labels.en : fuelType;
  };

  // â”€â”€ Fetch â”€â”€
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

      // Drive Assist â€” aktif gÃ¶revi ilet
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

  // â”€â”€ Drive Assist fetch â”€â”€
  const fetchDriveAssist = useCallback(async (activeTask, vehicle) => {
    setAssistLoading(true);
    try {
      const res = await driverAPI.getDriveConditions();
      setDriveAssist({
        activeTask,
        vehicle,
        traffic: res.traffic || null,
        weather: res.weather || null,
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
          t("common.cannotOpenLink", "Link aÃ§Ä±lamadÄ±")
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

  // â”€â”€ Render â”€â”€
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
        {/* â”€â”€ Header â”€â”€ */}
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

        {/* â”€â”€ Error banner â”€â”€ */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              <Ionicons name="warning-outline" size={14} color={COLORS.ERROR} />{" "}
              {error}
            </Text>
          </View>
        )}

        {/* â”€â”€ Task Offers â”€â”€ */}
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

        {/* â”€â”€ Vehicle Card â”€â”€ */}
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
                    {t("dashboard.fuelEntry", "YakÄ±t GiriÅŸi")}
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
                    {t("fuel.fuelType", "YakÄ±t")}
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

              {/* â”€â”€ Device Status Lamps â”€â”€ */}
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
                      <Text style={[styles.deviceStatusLabel, { color: wifiColor }]}>WiFi {wifiOk ? "âœ“" : "â€”"}</Text>
                    </View>
                    <View style={styles.deviceStatusLamp}>
                      <Ionicons name={gpsIcon} size={15} color={gpsColor} />
                      <View style={[styles.deviceStatusDot, { backgroundColor: gpsColor }]} />
                      <Text style={[styles.deviceStatusLabel, { color: gpsColor }]}>GPS {gpsOk ? "âœ“" : wifiOk ? "âœ—" : "â€”"}</Text>
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

        {/* â”€â”€ Active Tasks Card â”€â”€ */}
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
                  {/* statusBadge â†’ StatusBadge */}
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

        {/* â”€â”€ Stats Card â†’ StatCard Ã— 3 â”€â”€ */}
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

        {/* â”€â”€ Drive Assist Card â”€â”€ */}
        <Card noMarginBottom={false}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              // Sesli ikaz â€” expo-speech ile tÃ¼m uyarÄ±larÄ± oku
              const alerts = [];
              if (driveAssist?.traffic?.delay_min > 0) {
                alerts.push(
                  t("driveAssist.speechTraffic", {
                    route: driveAssist.traffic.route_label || "",
                    delay: driveAssist.traffic.delay_min,
                  })
                );
                if (driveAssist.traffic.incidents?.length > 0) {
                  alerts.push(driveAssist.traffic.incidents[0]);
                }
              }
              if (driveAssist?.weather?.alert) {
                alerts.push(driveAssist.weather.alert);
              }
              if (driveAssist?.weather?.wind_kmh > 40) {
                alerts.push(
                  t("driveAssist.speechWind", { kmh: driveAssist.weather.wind_kmh })
                );
              }
              if (alerts.length === 0) {
                alerts.push(t("driveAssist.speechAllClear"));
              }
              const fullText = alerts.join(". ");
              Speech.speak(fullText, {
                language: i18n.language === "tr" ? "tr-TR"
                  : i18n.language === "nl" ? "nl-NL"
                  : i18n.language === "de" ? "de-DE"
                  : "en-US",
                rate: 0.9,
              });
            }}
          >
            <View style={styles.daCardRow}>
              <Text style={styles.cardTitle}>{t("driveAssist.title")}</Text>
              <View style={styles.daSpeakHint}>
                <Ionicons name="volume-medium-outline" size={16} color={COLORS.MUTED} />
              </View>
            </View>

            {/* â”€â”€ Ä°ki modern yatay kutu â”€â”€ */}
            {/* Trafik SatÄ±rÄ± */}
            {(() => {
              const tr = driveAssist?.traffic;
              const isCrit = tr?.delay_min > 10;
              const isWarn = tr?.delay_min > 0 && tr?.delay_min <= 10;
              const isClear = tr?.delay_min === 0;
              const trColor = isCrit ? COLORS.ERROR : isWarn ? COLORS.WARNING : isClear ? COLORS.SUCCESS : COLORS.MUTED;
              const trBg    = withAlpha(trColor, 0.10);
              const trIcon  = isCrit ? "warning-outline" : isWarn ? "alert-circle-outline" : isClear ? "checkmark-circle-outline" : "car-outline";
              const trValue = tr
                ? (tr.delay_min > 0 ? `+${tr.delay_min} dk gecikme` : t("dashboard.trafficClear"))
                : (driveAssist && !driveAssist.activeTask ? t("driveAssist.standbySub") : "â€”");
              const trSub = tr?.route_label || "";
              return (
                <View style={[styles.daRow, { backgroundColor: trBg }]}>
                  <View style={[styles.daIconWrap, { backgroundColor: withAlpha(trColor, 0.15) }]}>
                    <Ionicons name={trIcon} size={22} color={trColor} />
                  </View>
                  <View style={styles.daTextWrap}>
                    <Text style={[styles.daRowLabel, { color: trColor }]}>Trafik</Text>
                    <Text style={[styles.daRowValue, { color: trColor }]} numberOfLines={1}>{trValue}</Text>
                    {!!trSub && <Text style={[styles.daRowSub, { color: trColor }]} numberOfLines={1}>{trSub}</Text>}
                  </View>
                </View>
              );
            })()}

            {/* Hava SatÄ±rÄ± */}
            {(() => {
              const we = driveAssist?.weather;
              const hasAlert = !!we?.alert;
              const weColor  = hasAlert ? COLORS.ERROR : we ? COLORS.INFO : COLORS.MUTED;
              const weBg     = withAlpha(weColor, 0.10);
              const weIcon   = hasAlert ? "thunderstorm-outline" : we ? "partly-sunny-outline" : "cloud-outline";
              const weValue  = we ? `${we.temp_c}Â°C â€” ${we.description || ""}` : "â€”";
              const weSub    = we?.alert || "";
              return (
                <View style={[styles.daRow, { backgroundColor: weBg, marginBottom: COLORS.SPACING.xs }]}>
                  <View style={[styles.daIconWrap, { backgroundColor: withAlpha(weColor, 0.15) }]}>
                    <Ionicons name={weIcon} size={22} color={weColor} />
                  </View>
                  <View style={styles.daTextWrap}>
                    <Text style={[styles.daRowLabel, { color: weColor }]}>Hava</Text>
                    <Text style={[styles.daRowValue, { color: weColor }]} numberOfLines={1}>{weValue}</Text>
                    {!!weSub && <Text style={[styles.daRowSub, { color: weColor }]} numberOfLines={1}>{weSub}</Text>}
                  </View>
                </View>
              );
            })()}

            <Text style={styles.daTapHint}>{t("driveAssist.tapToSpeak")}</Text>
          </TouchableOpacity>
        </Card>

        {/* â”€â”€ Language Modal â”€â”€ */}
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

        {/* â”€â”€ Serial Modal â”€â”€ */}
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

        {/* â”€â”€ FAB â”€â”€ */}
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


