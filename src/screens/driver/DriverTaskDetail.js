// src/screens/driver/DriverTaskDetail.js
// TulipFleet - Sürücü Görev Detay Ekranı
// Updated: 12 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles, local COLORS kaldırıldı
// ✅ SPACING/RADIUS/TYPOGRAPHY/SHADOWS tokens, 0 hardcoded hex
// ✅ Waypoint Stops + Progress Events kartları (Faz 3.5)
// ✅ i18n key fallback, 0 inline style

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverTaskAPI } from "../../services/api";
import { formatDateTime as formatDate } from "../../utils/helpers";

// ── Event icon map ──────────────────────────
const EVENT_ICON_MAP = {
  TASK_COMPLETED: "checkmark-done",
  TASK_STARTED: "play",
  TASK_ACCEPTED: "checkmark-circle",
  TASK_REJECTED: "close-circle",
  TASK_WITHDRAWN: "arrow-undo",
  STOP_ARRIVED: "location",
  STOP_DEPARTED: "exit",
  WAYPOINT_COMPLETED: "flag",
};

// ── Status config factory (theme-aware) ─────
const getStatusConfig = (COLORS) => ({
  pending_review: {
    color: COLORS.WARNING,
    bg: COLORS.WARNING_LIGHT,
    key: "pending_review",
    icon: "notifications",
  },
  accepted: {
    color: COLORS.INFO,
    bg: COLORS.INFO_LIGHT,
    key: "accepted",
    icon: "checkmark-circle",
  },
  in_progress: {
    color: COLORS.PRIMARY,
    bg: COLORS.SECONDARY,
    key: "in_progress",
    icon: "navigate",
  },
  completed: {
    color: COLORS.SUCCESS,
    bg: COLORS.SUCCESS_LIGHT,
    key: "completed",
    icon: "checkmark-done",
  },
  rejected: {
    color: COLORS.ERROR,
    bg: COLORS.ERROR_LIGHT,
    key: "rejected",
    icon: "close-circle",
  },
  pending: {
    color: COLORS.WARNING,
    bg: COLORS.WARNING_LIGHT,
    key: "pending",
    icon: "time",
  },
  assigned: {
    color: COLORS.INFO,
    bg: COLORS.INFO_LIGHT,
    key: "assigned",
    icon: "person",
  },
  cancelled: {
    color: COLORS.ERROR,
    bg: COLORS.ERROR_LIGHT,
    key: "cancelled",
    icon: "close-circle",
  },
});

// ── Styles factory ──────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.TEXT_SECONDARY,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    errorText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Status Banner ──
    statusBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
    },
    statusBannerIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    statusBannerText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Card ──
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      marginHorizontal: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    cardTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.md,
    },

    // ── Info Rows ──
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.BACKGROUND,
    },
    infoLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },
    infoValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },

    // ── Vehicle Badge ──
    vehicleBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.xs,
    },
    vehicleIcon: {
      marginRight: COLORS.SPACING.xs,
    },
    vehicleText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
    },
    vehicleModel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.sm,
    },

    // ── Route ──
    routeContainer: {
      position: "relative",
    },
    routePoint: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    routeIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    routeInfo: {
      marginLeft: COLORS.SPACING.md,
      flex: 1,
    },
    routeLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
    routeAddress: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: 2,
    },
    routeLineVertical: {
      width: 2,
      height: COLORS.SPACING.lg,
      backgroundColor: COLORS.DIVIDER,
      marginLeft: 19,
      marginBottom: COLORS.SPACING.sm,
    },
    distanceBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      marginTop: COLORS.SPACING.sm,
    },
    distanceIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    distanceText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
    },

    // ── Notes ──
    notesText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 20,
    },

    // ── Reject Input ──
    rejectInput: {
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      borderRadius: COLORS.RADIUS.input,
      padding: COLORS.SPACING.md,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT,
      minHeight: 80,
      textAlignVertical: "top",
    },
    rejectButtons: {
      flexDirection: "row",
      marginTop: COLORS.SPACING.md,
    },
    cancelRejectButton: {
      flex: 1,
      padding: COLORS.SPACING.md,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    cancelRejectText: {
      color: COLORS.TEXT_SECONDARY,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    confirmRejectButton: {
      flex: 1,
      backgroundColor: COLORS.ERROR,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.button,
      alignItems: "center",
    },
    confirmRejectText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Action Container ──
    actionContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.xl,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      ...COLORS.SHADOWS.header,
    },
    buttonRow: {
      flexDirection: "row",
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      marginHorizontal: COLORS.SPACING.xs,
    },
    fullWidth: {
      marginHorizontal: 0,
    },
    actionButtonIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    actionButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    acceptButton: {
      backgroundColor: COLORS.SUCCESS,
    },
    rejectButton: {
      backgroundColor: COLORS.ERROR,
    },
    startButton: {
      backgroundColor: COLORS.PRIMARY,
    },
    completeButton: {
      backgroundColor: COLORS.SUCCESS,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
    },
    infoBoxIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    infoBoxText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Waypoint Stops ──
    wpItem: {
      marginBottom: COLORS.SPACING.md,
    },
    wpRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    wpIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    wpName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },
    wpNameActive: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    wpStatusLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.sm,
    },
    wpActions: {
      flexDirection: "row",
      marginLeft: COLORS.SPACING.xl,
    },
    wpActionBtn: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.sm,
    },
    wpActionText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Progress Events ──
    evItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    evIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    evContent: {
      flex: 1,
    },
    evType: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    evTime: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
  });

// ── Component ───────────────────────────────
const DriverTaskDetail = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const STATUS_CONFIG = getStatusConfig(COLORS);

  const { taskId } = route.params || {};

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [events, setEvents] = useState([]);

  // Vehicle guard helper
  const navigateToMap = (taskData) => {
    if (!taskData?.vehicle_id && !task?.vehicle_id) {
      Alert.alert(
        t("taskDetail.actions.error") || "Araç Atanmamış",
        t("taskDetail.vehicleNotAssigned") ||
          "Bu göreve araç atanmamış. Lütfen admin ile iletişime geçin.",
        [{ text: t("profile.ok") || "Tamam" }]
      );
      return;
    }
    navigation.navigate("Navigation", {
      task: taskData,
      origin: getOrigin(),
      destination: getDestination(),
    });
  };

  // Get status label from translations
  const getStatusLabel = (statusKey) => {
    return t(`taskDetail.statuses.${statusKey}`) || statusKey;
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
      loadEvents();
    } else {
      Alert.alert(
        t("taskDetail.actions.error"),
        t("taskDetail.taskIdNotFound")
      );
      navigation.goBack();
    }
  }, [taskId]);

  const fetchTaskDetail = async () => {
    try {
      console.log("📋 Fetching task detail:", taskId);
      const data = await driverTaskAPI.getTaskDetail(taskId);
      console.log("✅ Task detail loaded:", data);
      setTask(data.task || data);
    } catch (error) {
      console.error("❌ Fetch task detail error:", error);
      Alert.alert(t("taskDetail.actions.error"), t("taskDetail.notFound"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const res = await driverTaskAPI.getTaskEvents(taskId);
      setEvents(res.events || []);
    } catch (e) {
      console.log("Events load error", e);
    }
  };

  const getShortTaskNo = () => {
    const taskNo = task?.task_no || task?.task_code;
    if (!taskNo) return `TSK-${task?.id?.slice(0, 6) || "??????"}`;
    if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
    return taskNo;
  };

  const getOrigin = () => {
    if (task?.route_json?.origin) return task.route_json.origin;
    if (task?.start_location) return task.start_location;
    return t("taskDetail.info.notSpecified");
  };

  const getDestination = () => {
    if (task?.route_json?.destination) return task.route_json.destination;
    if (task?.end_location) return task.end_location;
    return t("taskDetail.info.notSpecified");
  };

  const getDistance = () => {
    if (task?.route_json?.distance) return task.route_json.distance;
    if (task?.total_distance_km) return task.total_distance_km;
    return null;
  };

  // ── Task Actions ──

  const handleAccept = () => {
    Alert.alert(
      t("taskDetail.actions.acceptTask"),
      t("taskDetail.actions.acceptConfirm"),
      [
        { text: t("taskDetail.actions.cancel"), style: "cancel" },
        {
          text: t("taskDetail.actions.accept"),
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.acceptTask(taskId);
              Alert.alert(
                t("taskDetail.actions.success"),
                t("taskDetail.actions.taskAccepted"),
                [{ text: t("profile.ok"), onPress: () => fetchTaskDetail() }]
              );
            } catch (error) {
              Alert.alert(
                t("taskDetail.actions.error"),
                error.response?.data?.message || error.response?.data?.error ||
                  t("taskDetail.actions.operationFailed")
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert(
        t("taskDetail.actions.info"),
        t("taskDetail.actions.rejectReasonRequired")
      );
      return;
    }

    setActionLoading(true);
    try {
      await driverTaskAPI.rejectTask(taskId, rejectReason);
      Alert.alert(
        t("taskDetail.actions.info"),
        t("taskDetail.actions.taskRejected"),
        [{ text: t("profile.ok"), onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        t("taskDetail.actions.error"),
        error.response?.data?.message || error.response?.data?.error || t("taskDetail.actions.operationFailed")
      );
    } finally {
      setActionLoading(false);
      setShowRejectInput(false);
    }
  };

  const handleStart = () => {
    Alert.alert(
      t("taskDetail.actions.startTask"),
      t("taskDetail.actions.startConfirm"),
      [
        { text: t("taskDetail.actions.cancel"), style: "cancel" },
        {
          text: t("taskDetail.actions.start"),
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.startTask(taskId);
              Alert.alert(
                t("taskDetail.actions.taskStarted"),
                t("tasks.wantToTrackOnMap"),
                [
                  {
                    text: t("tasks.yes"),
                    onPress: () => navigateToMap(task),
                  },
                  {
                    text: t("tasks.no"),
                    style: "cancel",
                    onPress: () => fetchTaskDetail(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                t("taskDetail.actions.error"),
                error.response?.data?.message || error.response?.data?.error ||
                  t("taskDetail.actions.operationFailed")
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      t("taskDetail.actions.completeTask"),
      t("taskDetail.actions.completeConfirm"),
      [
        { text: t("taskDetail.actions.cancel"), style: "cancel" },
        {
          text: t("taskDetail.actions.complete"),
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.completeTask(taskId);
              Alert.alert(
                t("taskDetail.actions.congratulations"),
                t("tasks.wantToTrackOnMap"),
                [
                  {
                    text: t("tasks.yes"),
                    onPress: () =>
                      navigateToMap({ ...task, status: "completed" }),
                  },
                  {
                    text: t("tasks.no"),
                    style: "cancel",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                t("taskDetail.actions.error"),
                error.response?.data?.message || error.response?.data?.error ||
                  t("taskDetail.actions.operationFailed")
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Waypoint Actions ──

  const updateWaypoint = async (waypointId, status) => {
    setActionLoading(true);
    try {
      await driverTaskAPI.updateWaypointStatus(taskId, waypointId, status);
      await fetchTaskDetail();
      await loadEvents();
    } catch (e) {
      Alert.alert(
        t("taskDetail.actions.error"),
        e.response?.data?.message || e.response?.data?.error || t("taskDetail.actions.operationFailed")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrived = (wpId) => updateWaypoint(wpId, "arrived");
  const handleDeparted = (wpId) => updateWaypoint(wpId, "departed");
  const handleWaypointCompleted = (wpId) => updateWaypoint(wpId, "completed");

  const nextStop = task?.waypoints?.find((wp) => wp.status !== "completed");

  // ── Render ──

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.SUCCESS} />
        <Text style={styles.loadingText}>{t("taskDetail.loading")}</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={60} color={COLORS.ERROR} />
        <Text style={styles.errorText}>{t("taskDetail.notFound")}</Text>
      </View>
    );
  }

  const status = task.status || "pending";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const showAcceptReject = status === "pending_review";
  const showStart = status === "assigned" || status === "accepted";
  const showComplete = status === "in_progress";
  const showInfo = ["completed", "rejected", "cancelled"].includes(status);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner */}
        <View
          style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}
        >
          <Ionicons
            name={statusConfig.icon}
            size={24}
            color={statusConfig.color}
            style={styles.statusBannerIcon}
          />
          <Text
            style={[styles.statusBannerText, { color: statusConfig.color }]}
          >
            {getStatusLabel(statusConfig.key)}
          </Text>
        </View>

        {/* Task Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("taskDetail.title")}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t("taskDetail.info.taskNo")}</Text>
            <Text style={styles.infoValue}>{getShortTaskNo()}</Text>
          </View>

          {(task.vehicle_plate || task.vehicle?.plate_no) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("taskDetail.info.vehicle")}
              </Text>
              <View style={styles.vehicleBadge}>
                <Ionicons
                  name="car"
                  size={14}
                  color={COLORS.PRIMARY}
                  style={styles.vehicleIcon}
                />
                <Text style={styles.vehicleText}>
                  {task.vehicle_plate || task.vehicle?.plate_no}
                </Text>
                {task.vehicle?.brand && (
                  <Text style={styles.vehicleModel}>
                    {task.vehicle.brand} {task.vehicle.model}
                  </Text>
                )}
              </View>
            </View>
          )}

          {task.scheduled_start && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("taskDetail.info.scheduledStart")}
              </Text>
              <Text style={styles.infoValue}>
                {formatDate(task.scheduled_start)}
              </Text>
            </View>
          )}

          {task.actual_start && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("taskDetail.info.actualStart")}
              </Text>
              <Text style={styles.infoValue}>
                {formatDate(task.actual_start)}
              </Text>
            </View>
          )}

          {task.completed_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("taskDetail.info.completedAt")}
              </Text>
              <Text style={styles.infoValue}>
                {formatDate(task.completed_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Route Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("taskDetail.route.title")}</Text>

          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View
                style={[
                  styles.routeIcon,
                  { backgroundColor: COLORS.SUCCESS_LIGHT },
                ]}
              >
                <Ionicons name="location" size={20} color={COLORS.SUCCESS} />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>
                  {t("taskDetail.route.origin")}
                </Text>
                <Text style={styles.routeAddress}>{getOrigin()}</Text>
              </View>
            </View>

            <View style={styles.routeLineVertical} />

            <View style={styles.routePoint}>
              <View
                style={[
                  styles.routeIcon,
                  { backgroundColor: COLORS.ERROR_LIGHT },
                ]}
              >
                <Ionicons name="flag" size={20} color={COLORS.ERROR} />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>
                  {t("taskDetail.route.destination")}
                </Text>
                <Text style={styles.routeAddress}>{getDestination()}</Text>
              </View>
            </View>

            {getDistance() && (
              <View style={styles.distanceBox}>
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={COLORS.PRIMARY}
                  style={styles.distanceIcon}
                />
                <Text style={styles.distanceText}>
                  {t("taskDetail.route.distance")}: {getDistance()} km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes Card */}
        {task.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t("taskDetail.notes.title")}</Text>
            <Text style={styles.notesText}>{task.notes}</Text>
          </View>
        )}

        {/* Reject Input */}
        {showRejectInput && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("taskDetail.actions.rejectReason")}
            </Text>
            <TextInput
              style={styles.rejectInput}
              placeholder={t("taskDetail.actions.rejectReasonPlaceholder")}
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.rejectButtons}>
              <TouchableOpacity
                style={styles.cancelRejectButton}
                onPress={() => {
                  setShowRejectInput(false);
                  setRejectReason("");
                }}
              >
                <Text style={styles.cancelRejectText}>
                  {t("taskDetail.actions.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRejectButton}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.WHITE} size="small" />
                ) : (
                  <Text style={styles.confirmRejectText}>
                    {t("taskDetail.actions.reject")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Waypoint Stops Card */}
        {task?.waypoints?.length > 0 && status === "in_progress" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("taskDetail.waypoints.title") || "Duraklar"}
            </Text>

            {task.waypoints.map((wp, index) => {
              const wpStatus = wp.status || "pending";
              const isNext = nextStop && String(nextStop.id) === String(wp.id);
              const isCompleted = wpStatus === "completed";

              return (
                <View key={wp.id || index} style={styles.wpItem}>
                  <View style={styles.wpRow}>
                    <Ionicons
                      name={
                        isCompleted
                          ? "checkmark-circle"
                          : isNext
                            ? "navigate"
                            : "ellipse-outline"
                      }
                      size={20}
                      color={
                        isCompleted
                          ? COLORS.SUCCESS
                          : isNext
                            ? COLORS.PRIMARY
                            : COLORS.MUTED
                      }
                      style={styles.wpIcon}
                    />
                    <Text style={isNext ? styles.wpNameActive : styles.wpName}>
                      {wp.name ||
                        wp.label ||
                        `${t("taskDetail.waypoints.stop") || "Durak"} ${index + 1}`}
                    </Text>
                    <Text style={styles.wpStatusLabel}>
                      ({t(`taskDetail.waypoints.${wpStatus}`) || wpStatus})
                    </Text>
                  </View>

                  {isNext && !actionLoading && (
                    <View style={styles.wpActions}>
                      {wpStatus === "pending" && (
                        <TouchableOpacity
                          style={[
                            styles.wpActionBtn,
                            { backgroundColor: COLORS.INFO },
                          ]}
                          onPress={() => handleArrived(wp.id)}
                        >
                          <Text style={styles.wpActionText}>
                            {t("taskDetail.waypoints.arrived") || "Vardım"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {wpStatus === "arrived" && (
                        <TouchableOpacity
                          style={[
                            styles.wpActionBtn,
                            { backgroundColor: COLORS.WARNING },
                          ]}
                          onPress={() => handleDeparted(wp.id)}
                        >
                          <Text style={styles.wpActionText}>
                            {t("taskDetail.waypoints.departed") || "Ayrıldım"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {wpStatus === "departed" && (
                        <TouchableOpacity
                          style={[
                            styles.wpActionBtn,
                            { backgroundColor: COLORS.SUCCESS },
                          ]}
                          onPress={() => handleWaypointCompleted(wp.id)}
                        >
                          <Text style={styles.wpActionText}>
                            {t("taskDetail.waypoints.complete") || "Tamamla"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Progress Events Card */}
        {events.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t("taskDetail.events.title") || "İlerleme"}
            </Text>
            {events.map((ev) => (
              <View key={ev.id} style={styles.evItem}>
                <Ionicons
                  name={EVENT_ICON_MAP[ev.type] || "time"}
                  size={16}
                  color={COLORS.PRIMARY}
                  style={styles.evIcon}
                />
                <View style={styles.evContent}>
                  <Text style={styles.evType}>
                    {t(`taskDetail.events.${ev.type}`) ||
                      ev.type.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.evTime}>{formatDate(ev.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {!showRejectInput && (
        <View style={styles.actionContainer}>
          {/* pending_review: Accept/Reject */}
          {showAcceptReject && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectInput(true)}
                disabled={actionLoading}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.WHITE}
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>
                  {t("taskDetail.actions.reject")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.WHITE} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.WHITE}
                      style={styles.actionButtonIcon}
                    />
                    <Text style={styles.actionButtonText}>
                      {t("taskDetail.actions.accept")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* assigned/accepted: Start */}
          {showStart && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.startButton,
                styles.fullWidth,
              ]}
              onPress={handleStart}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.WHITE} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="play-circle"
                    size={20}
                    color={COLORS.WHITE}
                    style={styles.actionButtonIcon}
                  />
                  <Text style={styles.actionButtonText}>
                    {t("taskDetail.actions.startTask")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* in_progress: Complete */}
          {showComplete && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.completeButton,
                styles.fullWidth,
              ]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.WHITE} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done"
                    size={20}
                    color={COLORS.WHITE}
                    style={styles.actionButtonIcon}
                  />
                  <Text style={styles.actionButtonText}>
                    {t("taskDetail.actions.completeTask")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* completed/rejected/cancelled: Info */}
          {showInfo && (
            <View
              style={[styles.infoBox, { backgroundColor: statusConfig.bg }]}
            >
              <Ionicons
                name={statusConfig.icon}
                size={20}
                color={statusConfig.color}
                style={styles.infoBoxIcon}
              />
              <Text style={[styles.infoBoxText, { color: statusConfig.color }]}>
                {status === "completed"
                  ? t("taskDetail.statusInfo.completed")
                  : status === "rejected"
                    ? t("taskDetail.statusInfo.rejected")
                    : t("taskDetail.statusInfo.cancelled")}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default DriverTaskDetail;
