// src/screens/driver/DriverTaskDetail.js
// TulipFleet - Sürücü Görev Detay Ekranı
// Updated: 30 Aralık 2025 - assigned için "Göreve Başla" butonu, kısa görev no formatı

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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

// Theme colors
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

// Status config
const STATUS_CONFIG = {
  pending_review: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    text: "İncelemenizi Bekliyor",
    icon: "notifications",
  },
  accepted: {
    color: COLORS.info,
    bg: "#E8FAFC",
    text: "Onaylandı - Başlatmayı Bekliyor",
    icon: "checkmark-circle",
  },
  in_progress: {
    color: COLORS.primary,
    bg: "#F0F2FF",
    text: "Devam Ediyor",
    icon: "navigate",
  },
  completed: {
    color: COLORS.success,
    bg: "#E8FCF1",
    text: "Tamamlandı",
    icon: "checkmark-done",
  },
  rejected: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    text: "Reddedildi",
    icon: "close-circle",
  },
  pending: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    text: "Bekliyor",
    icon: "time",
  },
  assigned: {
    color: COLORS.info,
    bg: "#E8FAFC",
    text: "Atandı",
    icon: "person",
  },
  cancelled: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    text: "İptal Edildi",
    icon: "close-circle",
  },
};

const DriverTaskDetail = ({ route, navigation }) => {
  const { taskId } = route.params || {};

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
    } else {
      Alert.alert("Hata", "Görev ID bulunamadı");
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
      Alert.alert("Hata", "Görev bulunamadı");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Görev numarasını kısa formatta al
  const getShortTaskNo = () => {
    const taskNo = task?.task_no || task?.task_code;
    if (!taskNo) return `TSK-${task?.id?.slice(0, 6) || "??????"}`;

    // Eğer çok uzunsa son 6 karakteri al
    if (taskNo.length > 12) {
      return `TSK-${taskNo.slice(-6)}`;
    }
    return taskNo;
  };

  // Lokasyon bilgisini al
  const getOrigin = () => {
    if (task?.route_json?.origin) return task.route_json.origin;
    if (task?.start_location) return task.start_location;
    return "Belirtilmedi";
  };

  const getDestination = () => {
    if (task?.route_json?.destination) return task.route_json.destination;
    if (task?.end_location) return task.end_location;
    return "Belirtilmedi";
  };

  const getDistance = () => {
    if (task?.route_json?.distance) return task.route_json.distance;
    if (task?.total_distance_km) return task.total_distance_km;
    return null;
  };

  // Görevi Kabul Et (sadece pending_review için)
  const handleAccept = () => {
    Alert.alert(
      "Görevi Kabul Et",
      "Bu görevi kabul etmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kabul Et",
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.acceptTask(taskId);
              Alert.alert("✅ Başarılı", "Görev kabul edildi!", [
                { text: "Tamam", onPress: () => fetchTaskDetail() },
              ]);
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "İşlem başarısız"
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Görevi Reddet (sadece pending_review için)
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert("Uyarı", "Lütfen red nedenini belirtin");
      return;
    }

    setActionLoading(true);
    try {
      await driverTaskAPI.rejectTask(taskId, rejectReason);
      Alert.alert("Bilgi", "Görev reddedildi", [
        { text: "Tamam", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Hata", error.response?.data?.error || "İşlem başarısız");
    } finally {
      setActionLoading(false);
      setShowRejectInput(false);
    }
  };

  // Göreve Başla (assigned veya accepted için)
  const handleStart = () => {
    Alert.alert("Göreve Başla", "Göreve başlamak istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Başla",
        onPress: async () => {
          setActionLoading(true);
          try {
            await driverTaskAPI.startTask(taskId);
            Alert.alert("🚀 Başarılı", "Görev başlatıldı!", [
              {
                text: "Navigasyona Git",
                onPress: () => {
                  navigation.navigate("Navigation", {
                    task: task,
                    origin: getOrigin(),
                    destination: getDestination(),
                  });
                },
              },
              {
                text: "Burada Kal",
                onPress: () => fetchTaskDetail(),
              },
            ]);
          } catch (error) {
            Alert.alert(
              "Hata",
              error.response?.data?.error || "İşlem başarısız"
            );
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // Görevi Tamamla
  const handleComplete = () => {
    Alert.alert(
      "Görevi Tamamla",
      "Bu görevi tamamlamak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tamamla",
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.completeTask(taskId);
              Alert.alert("🎉 Tebrikler!", "Görev başarıyla tamamlandı!", [
                { text: "Tamam", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "İşlem başarısız"
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Tarih formatla
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("tr-TR");
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Görev yükleniyor...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={60} color={COLORS.danger} />
        <Text style={styles.errorText}>Görev bulunamadı</Text>
      </View>
    );
  }

  const status = task.status || "pending";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  // Buton mantığı:
  // pending_review → Kabul/Reddet
  // assigned, accepted → Göreve Başla
  // in_progress → Tamamla
  // completed, rejected, cancelled → Sadece bilgi

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
            {statusConfig.text}
          </Text>
        </View>

        {/* Görev Bilgileri */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Görev Bilgileri</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Görev No</Text>
            <Text style={styles.infoValue}>{getShortTaskNo()}</Text>
          </View>

          {task.vehicle_plate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Araç</Text>
              <View style={styles.vehicleBadge}>
                <Ionicons name="car" size={14} color={COLORS.primary} />
                <Text style={styles.vehicleText}>{task.vehicle_plate}</Text>
                {(task.vehicle_brand || task.vehicle_model) && (
                  <Text style={styles.vehicleModel}>
                    {task.vehicle_brand} {task.vehicle_model}
                  </Text>
                )}
              </View>
            </View>
          )}

          {task.actual_start && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Başlama Zamanı</Text>
              <Text style={styles.infoValue}>
                {formatDate(task.actual_start)}
              </Text>
            </View>
          )}

          {task.actual_end && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bitiş Zamanı</Text>
              <Text style={styles.infoValue}>
                {formatDate(task.actual_end)}
              </Text>
            </View>
          )}
        </View>

        {/* Rota Bilgileri */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rota Bilgileri</Text>

          <View style={styles.routeContainer}>
            {/* Başlangıç */}
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: "#E8FCF1" }]}>
                <Ionicons name="location" size={20} color={COLORS.success} />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Başlangıç Noktası</Text>
                <Text style={styles.routeAddress}>{getOrigin()}</Text>
              </View>
            </View>

            <View style={styles.routeLineVertical} />

            {/* Varış */}
            <View style={styles.routePoint}>
              <View style={[styles.routeIcon, { backgroundColor: "#FFF0F3" }]}>
                <Ionicons name="flag" size={20} color={COLORS.danger} />
              </View>
              <View style={styles.routeInfo}>
                <Text style={styles.routeLabel}>Varış Noktası</Text>
                <Text style={styles.routeAddress}>{getDestination()}</Text>
              </View>
            </View>

            {/* Mesafe */}
            {getDistance() && (
              <View style={styles.distanceBox}>
                <Ionicons name="speedometer" size={20} color={COLORS.primary} />
                <Text style={styles.distanceText}>
                  Tahmini Mesafe: {getDistance()} km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notlar */}
        {task.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notlar</Text>
            <Text style={styles.notesText}>{task.notes}</Text>
          </View>
        )}

        {/* Reject Input (if showing) */}
        {showRejectInput && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Red Nedeni</Text>
            <TextInput
              style={styles.rejectInput}
              placeholder="Red nedeninizi yazın..."
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
                <Text style={styles.cancelRejectText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmRejectButton}
                onPress={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.confirmRejectText}>Reddet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      {!showRejectInput && (
        <View style={styles.actionContainer}>
          {/* pending_review: Kabul/Reddet */}
          {showAcceptReject && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => setShowRejectInput(true)}
                disabled={actionLoading}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Reddet</Text>
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
                    <Text style={styles.actionButtonText}>Kabul Et</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* assigned/accepted: Göreve Başla */}
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
                  <Text style={styles.actionButtonText}>Göreve Başla</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* in_progress: Tamamla */}
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
                  <Text style={styles.actionButtonText}>Görevi Tamamla</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* completed/rejected/cancelled: Bilgi */}
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
                Bu görev{" "}
                {status === "completed"
                  ? "tamamlandı"
                  : status === "rejected"
                  ? "reddedildi"
                  : "iptal edildi"}
              </Text>
            </View>
          )}
        </View>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 14,
  },
  errorText: {
    marginTop: 10,
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: "600",
  },

  // Status Banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    marginBottom: 15,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },

  // Cards
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

  // Info Rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
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
  vehicleModel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 8,
  },

  // Route
  routeContainer: {
    position: "relative",
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  routeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: COLORS.secondary,
  },
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

  // Notes
  notesText: {
    fontSize: 14,
    color: "#525F7F",
    lineHeight: 20,
  },

  // Reject Input
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
  rejectButtons: {
    flexDirection: "row",
    marginTop: 15,
  },
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
  confirmRejectText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Action Container
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
  buttonRow: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  fullWidth: {
    marginHorizontal: 0,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
  },
  infoBoxText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default DriverTaskDetail;
