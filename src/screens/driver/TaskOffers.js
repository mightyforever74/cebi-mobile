// src/screens/driver/TaskOffers.js
// TulipFleet - Task Offer Detail with Accept/Reject
// Updated: 12 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles, 0 hardcoded hex
// ✅ SPACING/RADIUS/TYPOGRAPHY/SHADOWS tokens

import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { taskOffersAPI } from "../../services/api";
import { formatDateTime as formatDate } from "../../utils/helpers";

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
      padding: COLORS.SPACING.md,
      paddingBottom: 100,
    },

    // ── Loading / Error ──
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: COLORS.SPACING.md,
      color: COLORS.TEXT_SECONDARY,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    errorText: {
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.body,
    },

    // ── Status Banner ──
    statusBanner: {
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.md,
      alignItems: "center",
    },
    statusBannerText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // ── Time Card ──
    timeCard: {
      backgroundColor: COLORS.WARNING_LIGHT,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginBottom: COLORS.SPACING.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderLeftWidth: 4,
      borderLeftColor: COLORS.WARNING,
    },
    timeLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.WARNING,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    timeValue: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.WARNING,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // ── Card ──
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    cardTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
    },
    priorityBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.badge,
      marginLeft: COLORS.SPACING.sm,
    },
    priorityText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE,
    },
    description: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 22,
      marginBottom: COLORS.SPACING.md,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.DIVIDER,
      marginVertical: COLORS.SPACING.md,
    },

    // ── Sections ──
    section: {
      marginBottom: COLORS.SPACING.xs,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.md,
    },

    // ── Location ──
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    locationIcon: {
      width: 28,
      alignItems: "center",
    },
    locationIconText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    locationInfo: {
      flex: 1,
    },
    locationLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 2,
    },
    locationText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT,
    },

    // ── Vehicle ──
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    vehicleModel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },

    // ── Schedule ──
    scheduleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    scheduleLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
    scheduleValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },

    // ── Waypoints ──
    waypointRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    waypointNumber: {
      width: COLORS.SPACING.lg,
      height: COLORS.SPACING.lg,
      borderRadius: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
    },
    waypointNumberText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    waypointText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT,
      flex: 1,
    },

    // ── Action Buttons ──
    actionContainer: {
      flexDirection: "row",
      padding: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    },
    actionButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectButton: {
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.ERROR,
      marginRight: COLORS.SPACING.sm,
    },
    rejectButtonText: {
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    acceptButton: {
      backgroundColor: COLORS.SUCCESS,
      marginLeft: COLORS.SPACING.sm,
    },
    acceptButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    navButton: {
      flex: 1,
      backgroundColor: COLORS.PRIMARY,
    },
    navButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      padding: COLORS.SPACING.lg,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    modalSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.md,
    },
    reasonInput: {
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.md,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: COLORS.SPACING.md,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.md,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    modalCancelText: {
      color: COLORS.TEXT_SECONDARY,
      ...COLORS.TYPOGRAPHY.styles.body,
    },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: COLORS.ERROR,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginLeft: COLORS.SPACING.sm,
    },
    modalConfirmText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

// ── Component ───────────────────────────────
const TaskOfferDetail = () => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation();
  const route = useRoute();
  const { offerId } = route.params;

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchOfferDetail();
  }, [offerId]);

  const fetchOfferDetail = async () => {
    try {
      const response = await taskOffersAPI.getOfferDetail(offerId);
      setOffer(response.offer);
    } catch (error) {
      console.error("Failed to fetch offer:", error);
      Alert.alert(t("offerDetail.error"), t("offerDetail.loadFailed"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    Alert.alert(t("offerDetail.acceptTask"), t("offerDetail.acceptConfirm"), [
      { text: t("offerDetail.cancel"), style: "cancel" },
      { text: t("offerDetail.accept"), onPress: confirmAccept },
    ]);
  };

  const confirmAccept = async () => {
    setSubmitting(true);
    try {
      await taskOffersAPI.accept(offerId);
      Alert.alert(t("offerDetail.success"), t("offerDetail.acceptSuccess"), [
        {
          text: t("offerDetail.ok"),
          onPress: () => navigation.navigate("DriverDashboard"),
        },
      ]);
    } catch (error) {
      console.error("Accept error:", error);
      const message =
        error.response?.data?.error || t("offerDetail.acceptFailed");
      Alert.alert(t("offerDetail.error"), message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = () => {
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    setSubmitting(true);
    setRejectModalVisible(false);
    try {
      await taskOffersAPI.reject(offerId, rejectReason || null);
      Alert.alert(t("offerDetail.rejected"), t("offerDetail.rejectSuccess"), [
        { text: t("offerDetail.ok"), onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Reject error:", error);
      const message =
        error.response?.data?.error || t("offerDetail.operationFailed");
      Alert.alert(t("offerDetail.error"), message);
    } finally {
      setSubmitting(false);
      setRejectReason("");
    }
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return t("offerDetail.expired");

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60)
      return t("offerDetail.minutesRemaining", { count: minutes });

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return t("offerDetail.hoursMinutesRemaining", {
      hours,
      minutes: remainingMins,
    });
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return { text: t("offerDetail.priorities.high"), color: COLORS.ERROR };
      case "urgent":
        return {
          text: t("offerDetail.priorities.urgent"),
          color: COLORS.ERROR,
        };
      case "low":
        return {
          text: t("offerDetail.priorities.low"),
          color: COLORS.TEXT_SECONDARY,
        };
      default:
        return {
          text: t("offerDetail.priorities.normal"),
          color: COLORS.SUCCESS,
        };
    }
  };

  const openNavigation = () => {
    if (!offer?.end_location) {
      Alert.alert(t("offerDetail.error"), t("offerDetail.noDestination"));
      return;
    }

    if (offer.route_json?.end_coords) {
      const { lat, lng } = offer.route_json.end_coords;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Alert.alert(
        t("offerDetail.navigation"),
        `${t("offerDetail.destination")}: ${offer.end_location}`
      );
    } else {
      Alert.alert(
        t("offerDetail.navigation"),
        `${t("offerDetail.destination")}: ${offer.end_location}`
      );
    }
  };

  // ── Render ──

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("offerDetail.loading")}</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t("offerDetail.notFound")}</Text>
      </View>
    );
  }

  const priority = getPriorityLabel(offer.priority);
  const timeRemaining =
    offer.status === "pending" ? getTimeRemaining(offer.expires_at) : null;
  const isExpired =
    offer.status === "expired" || timeRemaining === t("offerDetail.expired");
  const canRespond = offer.status === "pending" && !isExpired;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Banner */}
        {offer.status !== "pending" && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor:
                  offer.status === "accepted"
                    ? COLORS.SUCCESS
                    : offer.status === "rejected"
                      ? COLORS.ERROR
                      : COLORS.TEXT_SECONDARY,
              },
            ]}
          >
            <Text style={styles.statusBannerText}>
              {offer.status === "accepted"
                ? `✅ ${t("offerDetail.statuses.accepted")}`
                : offer.status === "rejected"
                  ? `❌ ${t("offerDetail.statuses.rejected")}`
                  : `⏱️ ${t("offerDetail.statuses.expired")}`}
            </Text>
          </View>
        )}

        {/* Time Remaining (if pending) */}
        {canRespond && timeRemaining && (
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>
              ⏱️ {t("offerDetail.timeRemaining")}
            </Text>
            <Text style={styles.timeValue}>{timeRemaining}</Text>
          </View>
        )}

        {/* Task Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {offer.title || offer.task_no || t("offerDetail.taskDetail")}
            </Text>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: priority.color },
              ]}
            >
              <Text style={styles.priorityText}>{priority.text}</Text>
            </View>
          </View>

          {offer.description && (
            <Text style={styles.description}>{offer.description}</Text>
          )}

          <View style={styles.divider} />

          {/* Locations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 {t("offerDetail.route")}</Text>

            {offer.start_location && (
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <Text style={styles.locationIconText}>🟢</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>
                    {t("offerDetail.origin")}
                  </Text>
                  <Text style={styles.locationText}>
                    {offer.start_location}
                  </Text>
                </View>
              </View>
            )}

            {offer.end_location && (
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <Text style={styles.locationIconText}>🔴</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>
                    {t("offerDetail.destination")}
                  </Text>
                  <Text style={styles.locationText}>{offer.end_location}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Vehicle Info */}
          {offer.vehicle_plate && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  🚚 {t("offerDetail.vehicle")}
                </Text>
                <Text style={styles.vehiclePlate}>{offer.vehicle_plate}</Text>
                {(offer.vehicle_brand || offer.vehicle_model) && (
                  <Text style={styles.vehicleModel}>
                    {offer.vehicle_brand} {offer.vehicle_model}
                  </Text>
                )}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              📅 {t("offerDetail.schedule")}
            </Text>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>
                {t("offerDetail.scheduledStart")}:
              </Text>
              <Text style={styles.scheduleValue}>
                {formatDate(offer.scheduled_start)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>
                {t("offerDetail.scheduledEnd")}:
              </Text>
              <Text style={styles.scheduleValue}>
                {formatDate(offer.scheduled_end)}
              </Text>
            </View>
          </View>
        </View>

        {/* Waypoints (if exists) */}
        {offer.waypoints && offer.waypoints.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              📌 {t("offerDetail.waypoints")}
            </Text>
            {offer.waypoints.map((wp, index) => (
              <View key={index} style={styles.waypointRow}>
                <View style={styles.waypointNumber}>
                  <Text style={styles.waypointNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.waypointText}>
                  {wp.name ||
                    wp.address ||
                    `${t("offerDetail.point")} ${index + 1}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons (only for pending offers) */}
      {canRespond && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
            disabled={submitting}
          >
            <Text style={styles.rejectButtonText}>
              ❌ {t("offerDetail.reject")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <Text style={styles.acceptButtonText}>
                ✅ {t("offerDetail.accept")}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Navigation Button (for accepted offers) */}
      {offer.status === "accepted" && offer.end_location && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.navButton]}
            onPress={openNavigation}
          >
            <Text style={styles.navButtonText}>
              🗺️ {t("offerDetail.startNavigation")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("offerDetail.rejectReason")}
            </Text>
            <Text style={styles.modalSubtitle}>
              {t("offerDetail.rejectReasonHint")}
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder={t("offerDetail.rejectReasonPlaceholder")}
              placeholderTextColor={COLORS.PLACEHOLDER}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectReason("");
                }}
              >
                <Text style={styles.modalCancelText}>
                  {t("offerDetail.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmReject}
              >
                <Text style={styles.modalConfirmText}>
                  {t("offerDetail.reject")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TaskOfferDetail;
