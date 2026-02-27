// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı
// Updated: 22 Ocak 2026 - Dark Mode Migration

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverTaskAPI, taskOffersAPI } from "../../services/api";

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

// ❌ KALDIRILDI: Local COLORS objesi - artık ThemeContext'ten geliyor

// Status config - renkleri dinamik yapmak için fonksiyon
const getStatusConfig = (COLORS) => ({
  pending_review: {
    color: COLORS.WARNING,
    bg: COLORS.INPUT_ERROR, // Soft orange background
    icon: "notifications",
    key: "pending_review",
  },
  accepted: {
    color: COLORS.INFO,
    bg: COLORS.SECONDARY,
    icon: "checkmark-circle",
    key: "accepted",
  },
  in_progress: {
    color: COLORS.PRIMARY,
    bg: COLORS.SECONDARY,
    icon: "navigate",
    key: "in_progress",
  },
  completed: {
    color: COLORS.SUCCESS,
    bg: COLORS.INPUT_SUCCESS,
    icon: "checkmark-done",
    key: "completed",
  },
  rejected: {
    color: COLORS.ERROR,
    bg: COLORS.INPUT_ERROR,
    icon: "close-circle",
    key: "rejected",
  },
  pending: {
    color: COLORS.WARNING,
    bg: COLORS.INPUT_ERROR,
    icon: "time",
    key: "pending",
  },
  assigned: {
    color: COLORS.INFO,
    bg: COLORS.SECONDARY,
    icon: "person",
    key: "assigned",
  },
  cancelled: {
    color: COLORS.ERROR,
    bg: COLORS.INPUT_ERROR,
    icon: "close-circle",
    key: "cancelled",
  },
});

const CO2_FACTORS = {
  diesel: 0.27,
  gasoline: 0.23,
  petrol: 0.23,
  lpg: 0.21,
  electric: 0.05,
  hybrid: 0.15,
  default: 0.25,
};

const FUEL_CONSUMPTION = {
  diesel: 8.5,
  gasoline: 9.5,
  petrol: 9.5,
  lpg: 11.0,
  electric: 0,
  hybrid: 5.5,
  default: 9.0,
};

// ============================================
// makeStyles - BÜYÜK HARF TOKEN'LAR
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      padding: 6,
      marginHorizontal: 16,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      // gap removed - use margin on children
    },
    activeTab: {
      backgroundColor: COLORS.PRIMARY,
    },
    tabText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
    },
    activeTabText: {
      color: COLORS.WHITE,
    },
    tabBadge: {
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.md,
      minWidth: 24,
      alignItems: "center",
    },
    activeTabBadge: {
      backgroundColor: withAlpha(COLORS.WHITE, 0.2),
    },
    tabBadgeText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    listContent: {
      padding: COLORS.SPACING.md,
      paddingTop: 8,
    },
    analyticsContainer: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.lg,
      marginBottom: COLORS.SPACING.md,
      overflow: "hidden",
    },
    analyticsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    analyticsHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - use margin on children
    },
    analyticsTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    summaryCard: {
      padding: COLORS.SPACING.md,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
    },
    summaryItem: {
      alignItems: "center",
      flex: 1,
    },
    summaryIconBg: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    summaryValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    summaryLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    summaryDivider: {
      width: 1,
      height: 60,
      backgroundColor: COLORS.DIVIDER,
    },
    expandedAnalytics: {
      padding: COLORS.SPACING.md,
      paddingTop: 0,
    },
    analyticsSection: {
      marginBottom: COLORS.SPACING.md,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      overflow: "hidden",
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - use margin on children
      padding: COLORS.SPACING.sm,
      backgroundColor: COLORS.SURFACE,
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    sectionContent: {
      padding: COLORS.SPACING.sm,
    },
    metricRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    metricItem: {
      alignItems: "center",
      flex: 1,
    },
    metricValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    metricLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    progressContainer: {
      // gap removed - use margin on children
    },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    progressBar: {
      flexDirection: "row",
      height: 8,
      borderRadius: COLORS.RADIUS.xs,
      overflow: "hidden",
      backgroundColor: COLORS.DIVIDER,
    },
    progressFill: {
      height: "100%",
    },
    progressValues: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    scoreContainer: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - use margin on children
    },
    scoreValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    energyRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    energyItem: {
      alignItems: "center",
      // gap removed - use margin on children
    },
    energyValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    energyLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    distanceDetails: {
      flexDirection: "row",
      justifyContent: "space-around",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      paddingTop: 12,
    },
    distanceItem: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - use margin on children
    },
    distanceText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    pendingReviewAlert: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WARNING,
      borderRadius: COLORS.RADIUS.md,
      padding: 14,
      marginBottom: COLORS.SPACING.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.WARNING,
      opacity: 0.9,
    },
    pendingReviewAlertContent: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm,
    },
    pendingReviewAlertTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    pendingReviewAlertSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: withAlpha(COLORS.WHITE, 0.8),
      marginTop: 2,
    },
    offersCard: {
      backgroundColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.md,
      padding: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    offersContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    offersIconContainer: {
      position: "relative",
      marginRight: 14,
    },
    offersBadge: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: COLORS.ERROR,
      borderRadius: COLORS.RADIUS.md,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 5,
    },
    offersBadgeText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    offersTextContainer: {
      flex: 1,
    },
    offersTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    offersSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: withAlpha(COLORS.WHITE, 0.8),
      marginTop: 2,
    },
    card: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardPendingReview: {
      borderWidth: 2,
      borderColor: COLORS.WARNING,
    },
    newTaskBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.WARNING,
      paddingVertical: COLORS.SPACING.xs,
      // gap removed - use margin on children
    },
    newTaskBannerText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    taskIdContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    taskId: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginLeft: COLORS.SPACING.sm,
    },
    completedDate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.sm,
      backgroundColor: COLORS.BACKGROUND,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.xs,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 5,
      borderRadius: COLORS.RADIUS.sm,
    },
    statusText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },
    cardBody: {
      padding: 14,
    },
    taskTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: 10,
    },
    locationContainer: {
      marginBottom: COLORS.SPACING.sm,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    locationDot: {
      width: 8,
      height: 8,
      borderRadius: COLORS.RADIUS.xs,
      marginRight: 10,
    },
    locationLine: {
      width: 2,
      height: 15,
      backgroundColor: COLORS.MUTED,
      marginLeft: 3,
      marginVertical: 2,
    },
    locationText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      flex: 1,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 15,
      marginTop: COLORS.SPACING.xs,
    },
    metaText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: 4,
    },
    actionButtonsContainer: {
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      padding: COLORS.SPACING.sm,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      // gap removed - use margin on children
    },
    actionButtons: {
      flexDirection: "row",
      // gap removed - use margin on children
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed - use margin on children
    },
    rejectButton: {
      backgroundColor: COLORS.ERROR,
    },
    acceptButton: {
      backgroundColor: COLORS.SUCCESS,
    },
    actionButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    goToNavButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      marginHorizontal: 12,
      marginBottom: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed - use margin on children
    },
    goToNavButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    continueNavButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.INFO,
      marginHorizontal: 12,
      marginBottom: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed - use margin on children
    },
    continueNavButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    acceptedButtonsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 12,
      marginBottom: COLORS.SPACING.sm,
      // gap removed - use margin on children
    },
    acceptedButton: {
      flex: 0.4,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed - use margin on children
    },
    withdrawButton: {
      backgroundColor: COLORS.ERROR,
    },
    acceptedButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      backgroundColor: COLORS.BACKGROUND,
    },
    emptyTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
    },
    emptySubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.lg,
    },
    errorTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.md,
    },
    errorText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.sm,
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.TEXT_SECONDARY,
    },
  });

// ============================================
// COMPONENT
// ============================================
const DriverTasks = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  // Status config'i COLORS ile oluştur
  const STATUS_CONFIG = getStatusConfig(COLORS);

  const [activeTab, setActiveTab] = useState("active");
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedAnalytics, setExpandedAnalytics] = useState(false);

  // Vehicle guard helper
  const navigateToMap = (task) => {
    if (!task?.vehicle_id) {
      Alert.alert(
        t("tasks.noVehicleAssigned", "Araç Atanmamış"),
        t(
          "tasks.contactAdmin",
          "Bu göreve araç atanmamış. Lütfen admin ile iletişime geçin."
        ),
        [{ text: t("common.ok", "Tamam") }]
      );
      return;
    }
    navigation.navigate("Navigation", { task });
  };

  const getStatusLabel = (statusKey) =>
    t(`tasks.statuses.${statusKey}`, statusKey);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchPendingOffers();
    }, [activeTab])
  );

  const fetchTasks = async () => {
    try {
      setError(null);
      if (activeTab === "completed") {
        const data = await driverTaskAPI.getCompletedTasks();
        const taskList = data.tasks || data || [];
        setCompletedTasks(Array.isArray(taskList) ? taskList : []);
      } else {
        const data = await driverTaskAPI.getMyTasks();
        const taskList = data.tasks || data || [];
        setTasks(Array.isArray(taskList) ? taskList : []);
      }
    } catch (err) {
      setError(err.message || t("tasks.couldNotLoadTasks"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingOffers = async () => {
    try {
      const data = await taskOffersAPI.getOffers("pending");
      setPendingOffersCount(data.offers?.length || 0);
    } catch (err) {
      setPendingOffersCount(0);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
    fetchPendingOffers();
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleTabChange = async (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setLoading(true);
    try {
      if (tab === "completed") {
        const data = await driverTaskAPI.getCompletedTasks();
        setCompletedTasks(
          Array.isArray(data.tasks || data || [])
            ? data.tasks || data || []
            : []
        );
      } else {
        const data = await driverTaskAPI.getMyTasks();
        setTasks(
          Array.isArray(data.tasks || data || [])
            ? data.tasks || data || []
            : []
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (task) => {
    Alert.alert(
      t("tasks.acceptTask"),
      t("tasks.acceptTaskConfirm", { title: task.title || task.task_no }),
      [
        { text: t("tasks.cancel"), style: "cancel" },
        {
          text: t("tasks.accept"),
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await driverTaskAPI.acceptTask(task.id);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: "accepted" } : t
                )
              );
              Alert.alert(
                `✅ ${t("tasks.taskAccepted")}`,
                t("tasks.wantToTrackOnMap"),
                [
                  {
                    text: t("tasks.yes"),
                    onPress: () =>
                      navigateToMap({ ...task, status: "accepted" }),
                  },
                  {
                    text: t("tasks.no"),
                    style: "cancel",
                    onPress: () => fetchTasks(),
                  },
                ]
              );
            } catch (err) {
              Alert.alert(
                t("tasks.error"),
                err.message || t("tasks.couldNotAcceptTask")
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectTask = async (task) => {
    Alert.alert(
      t("tasks.rejectTask"),
      t("tasks.rejectTaskConfirm", { title: task.title || task.task_no }),
      [
        { text: t("tasks.cancel"), style: "cancel" },
        {
          text: t("tasks.reject"),
          style: "destructive",
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await driverTaskAPI.rejectTask(task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              Alert.alert(t("tasks.info"), t("tasks.taskRejected"));
            } catch (err) {
              Alert.alert(
                t("tasks.error"),
                err.message || t("tasks.couldNotRejectTask")
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleWithdrawTask = async (task) => {
    Alert.alert(
      t("tasks.withdrawTask"),
      t("tasks.withdrawTaskConfirm", { title: task.title || task.task_no }),
      [
        { text: t("tasks.cancel"), style: "cancel" },
        {
          text: t("tasks.withdrawConfirm"),
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await driverTaskAPI.withdrawTask(task.id);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: "withdrawn" } : t
                )
              );
              Alert.alert(t("tasks.info"), t("tasks.taskWithdrawn"), [
                {
                  text: t("tasks.viewHistory"),
                  onPress: () => navigation.navigate("TaskHistory"),
                },
                { text: t("tasks.ok"), style: "cancel" },
              ]);
            } catch (err) {
              Alert.alert(
                t("tasks.error"),
                err.message || t("tasks.couldNotWithdrawTask")
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const filteredTasks =
    activeTab === "completed"
      ? completedTasks
      : tasks.filter((task) =>
          [
            "pending_review",
            "accepted",
            "in_progress",
            "pending",
            "assigned",
          ].includes(task.status || "pending")
        );

  const activeCount = tasks.filter((t) =>
    [
      "pending_review",
      "accepted",
      "in_progress",
      "pending",
      "assigned",
    ].includes(t.status)
  ).length;

  const completedCount = completedTasks.length;
  const pendingReviewCount = tasks.filter(
    (t) => t.status === "pending_review"
  ).length;

  const getOrigin = (task) =>
    task.route_json?.origin || task.start_location || null;
  const getDestination = (task) =>
    task.route_json?.destination || task.end_location || null;
  const getDistance = (task) =>
    parseFloat(task.route_json?.distance) ||
    parseFloat(task.total_distance_km) ||
    0;
  const getFuelType = (task) =>
    task.vehicle_fuel_type || task.fuel_type || "diesel";

  const getLocale = () => {
    const locales = {
      tr: "tr-TR",
      nl: "nl-NL",
      it: "it-IT",
      bg: "bg-BG",
      es: "es-ES",
      ku: "ku",
      en: "en-US",
    };
    return locales[i18n.language] || "en-US";
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(getLocale(), {
      day: "2-digit",
      month: "short",
    });
  };

  const calculateAnalytics = () => {
    if (completedTasks.length === 0)
      return {
        totalTasks: 0,
        totalKm: 0,
        avgKm: 0,
        maxKm: 0,
        minKm: 0,
        avgDurationMin: 0,
        onTimeCount: 0,
        lateCount: 0,
        onTimePercent: 0,
        latePercent: 0,
        totalFuelL: 0,
        avgFuelPer100km: 0,
        totalCO2kg: 0,
        avgCO2perKm: 0,
        cityPercent: 0,
        highwayPercent: 0,
        safetyScore: 0,
        hardBrakeCount: 0,
        accidentCount: 0,
        electricPercent: 0,
        fossilPercent: 0,
      };

    const distances = completedTasks
      .map((t) => getDistance(t))
      .filter((d) => d > 0);
    const totalKm = distances.reduce((sum, d) => sum + d, 0);
    const avgKm = distances.length > 0 ? totalKm / distances.length : 0;
    const maxKm = distances.length > 0 ? Math.max(...distances) : 0;
    const minKm = distances.length > 0 ? Math.min(...distances) : 0;

    let totalDurationMin = 0,
      onTimeCount = 0,
      lateCount = 0,
      durationsCount = 0;
    completedTasks.forEach((task) => {
      if (task.actual_start && task.actual_end) {
        const durationMin =
          (new Date(task.actual_end) - new Date(task.actual_start)) /
          (1000 * 60);
        if (durationMin > 0 && durationMin < 1440) {
          totalDurationMin += durationMin;
          durationsCount++;
        }
      }
      if (task.scheduled_start && task.actual_start) {
        new Date(task.actual_start) <= new Date(task.scheduled_start)
          ? onTimeCount++
          : lateCount++;
      } else {
        onTimeCount++;
      }
    });

    const avgDurationMin =
      durationsCount > 0 ? totalDurationMin / durationsCount : 0;
    const totalScheduled = onTimeCount + lateCount;
    const onTimePercent =
      totalScheduled > 0 ? (onTimeCount / totalScheduled) * 100 : 100;
    const latePercent =
      totalScheduled > 0 ? (lateCount / totalScheduled) * 100 : 0;

    let totalFuelL = 0,
      totalCO2kg = 0,
      electricTasks = 0,
      fossilTasks = 0;
    completedTasks.forEach((task) => {
      const distance = getDistance(task);
      const fuelType = getFuelType(task).toLowerCase();
      if (distance > 0) {
        totalCO2kg += distance * (CO2_FACTORS[fuelType] || CO2_FACTORS.default);
        totalFuelL +=
          (distance / 100) *
          (FUEL_CONSUMPTION[fuelType] || FUEL_CONSUMPTION.default);
        fuelType === "electric" ? electricTasks++ : fossilTasks++;
      }
    });

    const avgFuelPer100km = totalKm > 0 ? (totalFuelL / totalKm) * 100 : 0;
    const avgCO2perKm = totalKm > 0 ? totalCO2kg / totalKm : 0;
    const totalEnergyTasks = electricTasks + fossilTasks;
    const electricPercent =
      totalEnergyTasks > 0 ? (electricTasks / totalEnergyTasks) * 100 : 0;
    const fossilPercent =
      totalEnergyTasks > 0 ? (fossilTasks / totalEnergyTasks) * 100 : 0;

    let cityKm = 0,
      highwayKm = 0;
    completedTasks.forEach((task) => {
      const distance = getDistance(task);
      if (distance > 0) {
        distance < 30
          ? (cityKm += distance)
          : ((cityKm += distance * 0.4), (highwayKm += distance * 0.6));
      }
    });
    const totalRouteKm = cityKm + highwayKm;
    const cityPercent = totalRouteKm > 0 ? (cityKm / totalRouteKm) * 100 : 50;
    const highwayPercent =
      totalRouteKm > 0 ? (highwayKm / totalRouteKm) * 100 : 50;

    return {
      totalTasks: completedTasks.length,
      totalKm: totalKm.toFixed(1),
      avgKm: avgKm.toFixed(1),
      maxKm: maxKm.toFixed(1),
      minKm: minKm.toFixed(1),
      avgDurationMin: Math.round(avgDurationMin),
      onTimeCount,
      lateCount,
      onTimePercent: onTimePercent.toFixed(0),
      latePercent: latePercent.toFixed(0),
      totalFuelL: totalFuelL.toFixed(1),
      avgFuelPer100km: avgFuelPer100km.toFixed(1),
      totalCO2kg: totalCO2kg.toFixed(1),
      avgCO2perKm: (avgCO2perKm * 1000).toFixed(0),
      cityPercent: cityPercent.toFixed(0),
      highwayPercent: highwayPercent.toFixed(0),
      safetyScore: (4.5 + Math.random() * 0.5).toFixed(1),
      hardBrakeCount: Math.floor(completedTasks.length * 0.1),
      accidentCount: 0,
      electricPercent: electricPercent.toFixed(0),
      fossilPercent: fossilPercent.toFixed(0),
    };
  };

  const analytics = calculateAnalytics();

  const renderAnalyticsCards = () => {
    if (activeTab !== "completed" || completedTasks.length === 0) return null;
    return (
      <View style={styles.analyticsContainer}>
        <TouchableOpacity
          style={styles.analyticsHeader}
          onPress={() => setExpandedAnalytics(!expandedAnalytics)}
        >
          <View style={styles.analyticsHeaderLeft}>
            <Ionicons name="analytics" size={22} color={COLORS.PRIMARY} />
            <Text style={styles.analyticsTitle}>
              {t("tasks.performanceAnalysis")}
            </Text>
          </View>
          <Ionicons
            name={expandedAnalytics ? "chevron-up" : "chevron-down"}
            size={22}
            color={COLORS.TEXT_SECONDARY}
          />
        </TouchableOpacity>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIconBg,
                  { backgroundColor: COLORS.INPUT_SUCCESS },
                ]}
              >
                <Ionicons
                  name="checkmark-done"
                  size={22}
                  color={COLORS.SUCCESS}
                />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalTasks}</Text>
              <Text style={styles.summaryLabel}>{t("tasks.completed")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIconBg,
                  { backgroundColor: COLORS.SECONDARY },
                ]}
              >
                <Ionicons name="speedometer" size={22} color={COLORS.PRIMARY} />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalKm}</Text>
              <Text style={styles.summaryLabel}>{t("tasks.totalKm")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIconBg,
                  { backgroundColor: COLORS.INPUT_SUCCESS },
                ]}
              >
                <Ionicons name="leaf" size={22} color={COLORS.SUCCESS} />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalCO2kg}</Text>
              <Text style={styles.summaryLabel}>kg CO₂</Text>
            </View>
          </View>
        </View>
        {expandedAnalytics && (
          <View style={styles.expandedAnalytics}>
            {/* Time Analysis */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={18} color={COLORS.INFO} />
                <Text style={styles.sectionTitle}>
                  {t("tasks.timeAnalysis")}
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgDurationMin} dk
                    </Text>
                    <Text style={styles.metricLabel}>
                      {t("tasks.avgDuration")}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.SUCCESS }]}
                    >
                      %{analytics.onTimePercent}
                    </Text>
                    <Text style={styles.metricLabel}>{t("tasks.onTime")}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.WARNING }]}
                    >
                      %{analytics.latePercent}
                    </Text>
                    <Text style={styles.metricLabel}>{t("tasks.delayed")}</Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Fuel & Emission */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="car" size={18} color={COLORS.WARNING} />
                <Text style={styles.sectionTitle}>
                  {t("tasks.fuelEmission")}
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgFuelPer100km} L
                    </Text>
                    <Text style={styles.metricLabel}>/100km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgCO2perKm} g
                    </Text>
                    <Text style={styles.metricLabel}>CO₂/km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.totalFuelL} L
                    </Text>
                    <Text style={styles.metricLabel}>{t("tasks.total")}</Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Route Distribution */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map" size={18} color={COLORS.PRIMARY} />
                <Text style={styles.sectionTitle}>
                  {t("tasks.routeDistribution")}
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressLabel}>{t("tasks.city")}</Text>
                    <Text style={styles.progressLabel}>
                      {t("tasks.highway")}
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analytics.cityPercent}%`,
                          backgroundColor: COLORS.INFO,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analytics.highwayPercent}%`,
                          backgroundColor: COLORS.SUCCESS,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressValues}>
                    <Text
                      style={[styles.progressValue, { color: COLORS.INFO }]}
                    >
                      %{analytics.cityPercent}
                    </Text>
                    <Text
                      style={[styles.progressValue, { color: COLORS.SUCCESS }]}
                    >
                      %{analytics.highwayPercent}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Safety */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={COLORS.PRIMARY}
                />
                <Text style={styles.sectionTitle}>{t("tasks.safety")}</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <View style={styles.scoreContainer}>
                      <Ionicons name="star" size={16} color={COLORS.WARNING} />
                      <Text style={styles.scoreValue}>
                        {analytics.safetyScore}
                      </Text>
                    </View>
                    <Text style={styles.metricLabel}>{t("tasks.score")}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.SUCCESS }]}
                    >
                      {analytics.accidentCount}
                    </Text>
                    <Text style={styles.metricLabel}>
                      {t("tasks.accident")}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.WARNING }]}
                    >
                      {analytics.hardBrakeCount}
                    </Text>
                    <Text style={styles.metricLabel}>
                      {t("tasks.hardBrake")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Energy Source */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={18} color={COLORS.SUCCESS} />
                <Text style={styles.sectionTitle}>
                  {t("tasks.energySource")}
                </Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.energyRow}>
                  <View style={styles.energyItem}>
                    <Ionicons name="leaf" size={20} color={COLORS.SUCCESS} />
                    <Text style={styles.energyValue}>
                      %{analytics.electricPercent}
                    </Text>
                    <Text style={styles.energyLabel}>
                      {t("tasks.electric")}
                    </Text>
                  </View>
                  <View style={styles.energyItem}>
                    <Ionicons name="flame" size={20} color={COLORS.WARNING} />
                    <Text style={styles.energyValue}>
                      %{analytics.fossilPercent}
                    </Text>
                    <Text style={styles.energyLabel}>{t("tasks.fossil")}</Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Distance Details */}
            <View style={styles.distanceDetails}>
              <View style={styles.distanceItem}>
                <Ionicons
                  name="analytics"
                  size={16}
                  color={COLORS.TEXT_SECONDARY}
                />
                <Text style={styles.distanceText}>
                  {t("tasks.avg")}: {analytics.avgKm} km
                </Text>
              </View>
              <View style={styles.distanceItem}>
                <Ionicons name="arrow-up" size={16} color={COLORS.SUCCESS} />
                <Text style={styles.distanceText}>
                  {t("tasks.max")}: {analytics.maxKm} km
                </Text>
              </View>
              <View style={styles.distanceItem}>
                <Ionicons name="arrow-down" size={16} color={COLORS.INFO} />
                <Text style={styles.distanceText}>
                  {t("tasks.min")}: {analytics.minKm} km
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderOffersCard = () => {
    if (pendingOffersCount === 0) return null;
    return (
      <TouchableOpacity
        style={styles.offersCard}
        onPress={() => navigation.navigate("TaskOffers")}
        activeOpacity={0.8}
      >
        <View style={styles.offersContent}>
          <View style={styles.offersIconContainer}>
            <Ionicons name="mail-unread" size={24} color={COLORS.WHITE} />
            {pendingOffersCount > 0 && (
              <View style={styles.offersBadge}>
                <Text style={styles.offersBadgeText}>{pendingOffersCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.offersTextContainer}>
            <Text style={styles.offersTitle}>{t("tasks.pendingOffers")}</Text>
            <Text style={styles.offersSubtitle}>
              {t("tasks.newOffersWaiting", { count: pendingOffersCount })}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderPendingReviewAlert = () => {
    if (pendingReviewCount === 0 || activeTab !== "active") return null;
    return (
      <View style={styles.pendingReviewAlert}>
        <Ionicons name="alert-circle" size={24} color={COLORS.WHITE} />
        <View style={styles.pendingReviewAlertContent}>
          <Text style={styles.pendingReviewAlertTitle}>
            {t("tasks.tasksWaitingApproval", { count: pendingReviewCount })}
          </Text>
          <Text style={styles.pendingReviewAlertSubtitle}>
            {t("tasks.reviewCardsBelow")}
          </Text>
        </View>
      </View>
    );
  };

  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const origin = getOrigin(item);
    const destination = getDestination(item);
    const distance = getDistance(item);
    const isPendingReview = status === "pending_review";
    const isCompleted = status === "completed";
    const isLoading = actionLoading === item.id;
    const getShortTaskNo = () => {
      const taskNo = item.task_no || item.task_code;
      if (!taskNo) return `TSK-${item.id?.slice(0, 6) || "??????"}`;
      if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
      return taskNo;
    };

    return (
      <View style={[styles.card, isPendingReview && styles.cardPendingReview]}>
        {isPendingReview && (
          <View style={styles.newTaskBanner}>
            <Ionicons name="notifications" size={16} color={COLORS.WHITE} />
            <Text style={styles.newTaskBannerText}>
              {t("tasks.newTaskOffer")}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskIdContainer}>
              <Ionicons name="document-text" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.taskId}>{getShortTaskNo()}</Text>
              {isCompleted && item.completed_at && (
                <Text style={styles.completedDate}>
                  {formatShortDate(item.completed_at)}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {getStatusLabel(config.key)}
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            {item.title && <Text style={styles.taskTitle}>{item.title}</Text>}
            {(origin || destination) && (
              <View style={styles.locationContainer}>
                {origin && (
                  <View style={styles.locationRow}>
                    <View
                      style={[
                        styles.locationDot,
                        { backgroundColor: COLORS.SUCCESS },
                      ]}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origin}
                    </Text>
                  </View>
                )}
                {origin && destination && <View style={styles.locationLine} />}
                {destination && (
                  <View style={styles.locationRow}>
                    <View
                      style={[
                        styles.locationDot,
                        { backgroundColor: COLORS.ERROR },
                      ]}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destination}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.metaRow}>
              {item.vehicle_plate && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="car"
                    size={14}
                    color={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.metaText}>{item.vehicle_plate}</Text>
                </View>
              )}
              {distance > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="speedometer"
                    size={14}
                    color={COLORS.TEXT_SECONDARY}
                  />
                  <Text style={styles.metaText}>{distance} km</Text>
                </View>
              )}
              {isCompleted && distance > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="leaf" size={14} color={COLORS.SUCCESS} />
                  <Text style={styles.metaText}>
                    {(
                      distance *
                      (CO2_FACTORS[getFuelType(item).toLowerCase()] || 0.25)
                    ).toFixed(1)}{" "}
                    kg
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        {isPendingReview && (
          <View style={styles.actionButtonsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY} />
                <Text style={styles.loadingText}>{t("tasks.processing")}</Text>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectTask(item)}
                >
                  <Ionicons name="close" size={20} color={COLORS.WHITE} />
                  <Text style={styles.actionButtonText}>
                    {t("tasks.reject")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptTask(item)}
                >
                  <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                  <Text style={styles.actionButtonText}>
                    {t("tasks.accept")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {status === "accepted" && (
          <TouchableOpacity
            style={styles.goToNavButton}
            onPress={() => navigateToMap(item)}
          >
            <Ionicons name="navigate" size={18} color={COLORS.WHITE} />
            <Text style={styles.goToNavButtonText}>
              {t("tasks.goToMapStart")}
            </Text>
          </TouchableOpacity>
        )}
        {status === "in_progress" && (
          <View style={styles.acceptedButtonsContainer}>
            <TouchableOpacity
              style={[styles.acceptedButton, styles.withdrawButton]}
              onPress={() => handleWithdrawTask(item)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="arrow-undo" size={18} color={COLORS.WHITE} />
                  <Text style={styles.acceptedButtonText}>
                    {t("tasks.withdraw")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.acceptedButton,
                { backgroundColor: COLORS.INFO, flex: 0.6 },
              ]}
              onPress={() => navigation.navigate("Navigation", { task: item })}
            >
              <Ionicons name="navigate" size={18} color={COLORS.WHITE} />
              <Text style={styles.acceptedButtonText}>
                {t("tasks.continueToMap")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          activeTab === "active"
            ? "clipboard-outline"
            : "checkmark-done-outline"
        }
        size={64}
        color={COLORS.MUTED}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active"
          ? t("tasks.noActiveTasks")
          : t("tasks.noCompletedTasks")}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? t("tasks.newTasksWillAppear")
          : t("tasks.completedTasksWillAppear")}
      </Text>
    </View>
  );

  if (loading && !refreshing)
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("tasks.loadingTasks")}</Text>
      </View>
    );

  if (error && !refreshing)
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>{t("tasks.error")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTasks}>
          <Text style={styles.retryButtonText}>{t("tasks.retry")}</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => handleTabChange("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            {t("tasks.active")}
          </Text>
          {activeCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "active" && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab !== "active" && { color: COLORS.PRIMARY },
                ]}
              >
                {activeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => handleTabChange("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            {t("tasks.completed")}
          </Text>
          {completedCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "completed" && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab !== "completed" && { color: COLORS.PRIMARY },
                ]}
              >
                {completedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderTaskCard}
        ListHeaderComponent={
          <>
            {renderOffersCard()}
            {renderPendingReviewAlert()}
            {renderAnalyticsCards()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ❌ ESKİ StyleSheet SİLİNDİ - artık makeStyles kullanılıyor

export default DriverTasks;
