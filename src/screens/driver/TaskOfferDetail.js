// src/screens/driver/TaskOfferDetail.js
// TulipFleet - Task Offer Detail with Accept/Reject

import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
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
import { COLORS } from "../../constants/config";
import { taskOffersAPI } from "../../services/api";

const TaskOfferDetail = () => {
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
      Alert.alert("Hata", "Teklif detayları yüklenemedi");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    Alert.alert(
      "Görevi Kabul Et",
      "Bu görev teklifini kabul etmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kabul Et",
          onPress: async () => {
            setSubmitting(true);
            try {
              await taskOffersAPI.acceptOffer(offerId);

              // State'i hemen güncelle - buton anında görünsün
              setOffer((prev) => ({ ...prev, status: "accepted" }));

              // Refetch ile vehicle bilgisini al
              try {
                const response = await taskOffersAPI.getOfferDetail(offerId);
                setOffer(response.offer);
              } catch (e) {
                console.log("Refetch skipped:", e.message);
              }

              // Vehicle guard ile seçenek sun
              const hasVehicle = offer?.vehicle_id || offer?.vehicle_plate;

              Alert.alert(
                "✅ Görev Kabul Edildi",
                hasVehicle
                  ? "Görevi haritada takip etmek ister misiniz?"
                  : "Görev kabul edildi. Araç atanmamış, admin bilgilendirilecek.",
                hasVehicle
                  ? [
                      {
                        text: "Haritaya Git",
                        onPress: () => openNavigation(),
                      },
                      {
                        text: "Görevlerime Dön",
                        style: "cancel",
                        onPress: () => navigation.navigate("MyTasks"),
                      },
                    ]
                  : [
                      {
                        text: "Tamam",
                        onPress: () => navigation.navigate("MyTasks"),
                      },
                    ]
              );
            } catch (error) {
              console.error("Accept error:", error);
              const message = error.response?.data?.error || "İşlem başarısız";
              Alert.alert("Hata", message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const confirmAccept = async () => {
    setSubmitting(true);
    try {
      await taskOffersAPI.accept(offerId);
      Alert.alert(
        "✅ Başarılı",
        "Görev kabul edildi! Görevlerim sayfasından görevi başlatabilirsiniz.",
        [
          {
            text: "Tamam",
            onPress: () => navigation.navigate("DriverDashboard"),
          },
        ]
      );
    } catch (error) {
      console.error("Accept error:", error);
      const message = error.response?.data?.error || "Görev kabul edilemedi";
      Alert.alert("Hata", message);
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
      Alert.alert("Reddedildi", "Görev teklifi reddedildi.", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Reject error:", error);
      const message = error.response?.data?.error || "İşlem başarısız";
      Alert.alert("Hata", message);
    } finally {
      setSubmitting(false);
      setRejectReason("");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("tr-TR");
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return "Süresi doldu";

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} dakika`;

    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours} saat ${remainingMins} dakika`;
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "high":
        return { text: "Yüksek Öncelik", color: COLORS.danger };
      case "urgent":
        return { text: "Acil", color: "#FF0000" };
      case "low":
        return { text: "Düşük Öncelik", color: COLORS.textSecondary };
      default:
        return { text: "Normal", color: COLORS.success };
    }
  };

  const openNavigation = () => {
    // Vehicle guard
    if (!offer?.vehicle_id && !offer?.vehicle_plate) {
      Alert.alert(
        "Araç Atanmamış",
        "Bu göreve araç atanmamış. Lütfen admin ile iletişime geçin.",
        [{ text: "Tamam" }]
      );
      return;
    }

    if (!offer?.end_location) {
      Alert.alert("Hata", "Varış noktası bilgisi yok");
      return;
    }

    // Navigation'a git
    navigation.navigate("Navigation", {
      task: {
        id: offer.task_id || offer.id,
        title: offer.task_title || offer.title,
        status: offer.status,
        vehicle_id: offer.vehicle_id,
        vehicle_plate: offer.vehicle_plate,
        start_location: offer.start_location,
        end_location: offer.end_location,
        route_json: offer.route_json,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Teklif bulunamadı</Text>
      </View>
    );
  }

  const priority = getPriorityLabel(offer.priority);
  const timeRemaining =
    offer.status === "pending" ? getTimeRemaining(offer.expires_at) : null;
  const isExpired =
    offer.status === "expired" || timeRemaining === "Süresi doldu";
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
                    ? COLORS.success
                    : offer.status === "rejected"
                    ? COLORS.danger
                    : COLORS.textSecondary,
              },
            ]}
          >
            <Text style={styles.statusBannerText}>
              {offer.status === "accepted"
                ? "✅ Kabul Edildi"
                : offer.status === "rejected"
                ? "❌ Reddedildi"
                : "⏱️ Süresi Doldu"}
            </Text>
          </View>
        )}

        {/* Time Remaining (if pending) */}
        {canRespond && timeRemaining && (
          <View style={styles.timeCard}>
            <Text style={styles.timeLabel}>⏱️ Kalan Süre</Text>
            <Text style={styles.timeValue}>{timeRemaining}</Text>
          </View>
        )}

        {/* Task Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {offer.title || offer.task_no || "Görev Detayı"}
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
            <Text style={styles.sectionTitle}>📍 Güzergah</Text>

            {offer.start_location && (
              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <Text style={styles.locationIconText}>🟢</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>Başlangıç</Text>
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
                  <Text style={styles.locationLabel}>Varış</Text>
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
                <Text style={styles.sectionTitle}>🚚 Araç</Text>
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
            <Text style={styles.sectionTitle}>📅 Zamanlama</Text>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Planlanan Başlangıç:</Text>
              <Text style={styles.scheduleValue}>
                {formatDate(offer.scheduled_start)}
              </Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={styles.scheduleLabel}>Planlanan Bitiş:</Text>
              <Text style={styles.scheduleValue}>
                {formatDate(offer.scheduled_end)}
              </Text>
            </View>
          </View>
        </View>

        {/* Waypoints (if exists) */}
        {offer.waypoints && offer.waypoints.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📌 Ara Noktalar</Text>
            {offer.waypoints.map((wp, index) => (
              <View key={index} style={styles.waypointRow}>
                <View style={styles.waypointNumber}>
                  <Text style={styles.waypointNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.waypointText}>
                  {wp.name || wp.address || `Nokta ${index + 1}`}
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
            <Text style={styles.rejectButtonText}>❌ Reddet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.acceptButtonText}>✅ Kabul Et</Text>
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
            <Text style={styles.navButtonText}>🗺️ Navigasyonu Başlat</Text>
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
            <Text style={styles.modalTitle}>Reddetme Nedeni</Text>
            <Text style={styles.modalSubtitle}>
              İsteğe bağlı olarak bir neden belirtebilirsiniz
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Örn: Müsait değilim, Araç uygun değil..."
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
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmReject}
              >
                <Text style={styles.modalConfirmText}>Reddet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
  },
  statusBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  statusBannerText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  timeCard: {
    backgroundColor: "#FFF3CD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  timeLabel: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  timeValue: {
    fontSize: 16,
    color: "#856404",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  section: {
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  locationIcon: {
    width: 28,
    alignItems: "center",
  },
  locationIconText: {
    fontSize: 14,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.text,
  },
  vehiclePlate: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  vehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  scheduleValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  waypointRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  waypointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  waypointNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.white,
  },
  waypointText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  actionContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginRight: 8,
  },
  rejectButtonText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    marginLeft: 8,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  navButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  navButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  modalConfirmText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default TaskOfferDetail;
