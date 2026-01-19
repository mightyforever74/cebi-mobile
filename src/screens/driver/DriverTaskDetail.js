// src/screens/driver/DriverTaskDetail.js
// TulipFleet - Sürücü Görev Detay Ekranı
// Updated: 17 Ocak 2026 - Full i18n Support

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
import { driverTaskAPI } from "../../services/api";

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
};

// Status config with translation keys
const STATUS_CONFIG = {
  pending_review: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    key: "pending_review",
    icon: "notifications",
  },
  accepted: {
    color: COLORS.info,
    bg: "#E8FAFC",
    key: "accepted",
    icon: "checkmark-circle",
  },
  in_progress: {
    color: COLORS.primary,
    bg: "#F0F2FF",
    key: "in_progress",
    icon: "navigate",
  },
  completed: {
    color: COLORS.success,
    bg: "#E8FCF1",
    key: "completed",
    icon: "checkmark-done",
  },
  rejected: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    key: "rejected",
    icon: "close-circle",
  },
  pending: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    key: "pending",
    icon: "time",
  },
  assigned: {
    color: COLORS.info,
    bg: "#E8FAFC",
    key: "assigned",
    icon: "person",
  },
  cancelled: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    key: "cancelled",
    icon: "close-circle",
  },
};

const DriverTaskDetail = ({ route, navigation }) => {
  const { t, i18n } = useTranslation();
  const { taskId } = route.params || {};

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Get status label from translations
  const getStatusLabel = (statusKey) => {
    return t(`taskDetail.statuses.${statusKey}`) || statusKey;
  };

  // Locale-aware date formatting
  const getLocale = () => {
    const localeMap = {
      tr: "tr-TR",
      en: "en-US",
      ku: "ku",
      nl: "nl-NL",
      it: "it-IT",
      bg: "bg-BG",
      es: "es-ES",
    };
    return localeMap[i18n.language] || "en-US";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString(getLocale());
  };

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
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

  // Accept task
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
                error.response?.data?.error ||
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

  // Reject task
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
        error.response?.data?.error || t("taskDetail.actions.operationFailed")
      );
    } finally {
      setActionLoading(false);
      setShowRejectInput(false);
    }
  };

  // Start task
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
                    onPress: () => {
                      navigation.navigate("Navigation", {
                        task: task,
                        origin: getOrigin(),
                        destination: getDestination(),
                      });
                    },
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
                error.response?.data?.error ||
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

  // Complete task
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
                      navigation.navigate("Navigation", {
                        task: { ...task, status: "completed" },
                        origin: getOrigin(),
                        destination: getDestination(),
                      }),
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
                error.response?.data?.error ||
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>{t("taskDetail.loading")}</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={60} color={COLORS.danger} />
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
        contentContainerStyle={{ paddingBottom: 120 }}
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
                <Ionicons name="car" size={14} color={COLORS.primary} />
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
              <View style={[styles.routeIcon, { backgroundColor: "#E8FCF1" }]}>
                <Ionicons name="location" size={20} color={COLORS.success} />
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
              <View style={[styles.routeIcon, { backgroundColor: "#FFF0F3" }]}>
                <Ionicons name="flag" size={20} color={COLORS.danger} />
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
                  color={COLORS.primary}
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
              placeholderTextColor={COLORS.muted}
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
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.confirmRejectText}>
                    {t("taskDetail.actions.reject")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
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
                <Ionicons name="close-circle" size={20} color={COLORS.white} />
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
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.white}
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
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="play-circle" size={20} color={COLORS.white} />
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
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done"
                    size={20}
                    color={COLORS.white}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 10, color: COLORS.secondary, fontSize: 14 },
  errorText: {
    marginTop: 10,
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginBottom: 15,
  },
  statusBannerText: { fontSize: 16, fontWeight: "600", marginLeft: 10 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  infoLabel: { fontSize: 14, color: COLORS.secondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  vehicleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  vehicleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 5,
  },
  vehicleModel: { fontSize: 12, color: COLORS.secondary, marginLeft: 8 },
  routeContainer: { position: "relative" },
  routePoint: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: { marginLeft: 12, flex: 1 },
  routeLabel: { fontSize: 12, color: COLORS.secondary },
  routeAddress: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 2,
  },
  routeLineVertical: {
    width: 2,
    height: 20,
    backgroundColor: "#E9ECEF",
    marginLeft: 19,
    marginBottom: 10,
  },
  distanceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F2FF",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginLeft: 8,
  },
  notesText: { fontSize: 14, color: "#525F7F", lineHeight: 20 },
  rejectInput: {
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.dark,
    minHeight: 80,
    textAlignVertical: "top",
  },
  rejectButtons: { flexDirection: "row", marginTop: 15 },
  cancelRejectButton: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    marginRight: 10,
  },
  cancelRejectText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "600",
  },
  confirmRejectButton: {
    flex: 1,
    backgroundColor: COLORS.danger,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmRejectText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },
  actionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 15,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonRow: { flexDirection: "row" },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  fullWidth: { marginHorizontal: 0 },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  acceptButton: { backgroundColor: COLORS.success },
  rejectButton: { backgroundColor: COLORS.danger },
  startButton: { backgroundColor: COLORS.primary },
  completeButton: { backgroundColor: COLORS.success },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
  },
  infoBoxText: { fontSize: 14, fontWeight: "600", marginLeft: 8 },
});

export default DriverTaskDetail;
