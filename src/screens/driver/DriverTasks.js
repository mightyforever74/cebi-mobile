// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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

// Görev durumu
const STATUS_CONFIG = {
  pending: { color: COLORS.warning, icon: "time", label: "Bekliyor" },
  assigned: { color: COLORS.info, icon: "person", label: "Atandı" },
  in_progress: { color: COLORS.primary, icon: "navigate", label: "Yolda" },
  completed: {
    color: COLORS.success,
    icon: "checkmark-circle",
    label: "Tamamlandı",
  },
  cancelled: { color: COLORS.danger, icon: "close-circle", label: "İptal" },
};

const DriverTasks = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API'den görevleri çek
  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching driver tasks...");

      const data = await driverTaskAPI.getMyTasks(); // driverAPI yerine driverTaskAPI kullanıldı
      console.log("✅ Driver tasks loaded:", data);

      const taskList = data.tasks || data || [];
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch (err) {
      console.error("❌ Fetch tasks error:", err);
      setError(err.message || "Görevler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  // Tarih formatla
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Görev durumunu güncelle
  const handleStartTask = (task) => {
    Alert.alert(
      "🚀 Görevi Başlat",
      `"${
        task.task_code || task.title
      }" görevini başlatmak istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Başlat",
          onPress: async () => {
            try {
              await driverTaskAPI.updateStatus(task.id, "in_progress");
              Alert.alert("✅ Başarılı", "Görev başlatıldı. İyi yolculuklar!");
              fetchTasks();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Görev başlatılamadı"
              );
            }
          },
        },
      ]
    );
  };

  const handleCompleteTask = (task) => {
    Alert.alert(
      "✅ Görevi Tamamla",
      `"${
        task.task_code || task.title
      }" görevini tamamlamak istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tamamla",
          onPress: async () => {
            try {
              await driverTaskAPI.updateStatus(task.id, "completed");
              Alert.alert("🎉 Tebrikler!", "Görev başarıyla tamamlandı!");
              fetchTasks();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Görev tamamlanamadı"
              );
            }
          },
        },
      ]
    );
  };

  const handleCancelTask = (task) => {
    Alert.alert(
      "❌ Görevi İptal Et",
      `"${
        task.task_code || task.title
      }" görevini iptal etmek istediğinize emin misiniz?`,
      [
        { text: "Hayır", style: "cancel" },
        {
          text: "İptal Et",
          style: "destructive",
          onPress: async () => {
            try {
              await driverTaskAPI.updateStatus(task.id, "cancelled");
              Alert.alert("Görev iptal edildi");
              fetchTasks();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Görev iptal edilemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Görev kartı
  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const isActionable = ["pending", "assigned", "in_progress"].includes(
      status
    );

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.taskIdContainer}>
            <Ionicons name="document-text" size={18} color={COLORS.primary} />
            <Text style={styles.taskId}>
              {item.task_code || `TSK-${item.id}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
            <Ionicons name={config.icon} size={12} color={COLORS.white} />
            <Text style={styles.statusText}>{config.label}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {item.title && <Text style={styles.taskTitle}>{item.title}</Text>}

          {item.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {/* Lokasyonlar */}
          <View style={styles.locationContainer}>
            {item.start_location && (
              <View style={styles.locationRow}>
                <View
                  style={[
                    styles.locationDot,
                    { backgroundColor: COLORS.success },
                  ]}
                />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.start_location}
                </Text>
              </View>
            )}
            {item.start_location && item.end_location && (
              <View style={styles.locationLine} />
            )}
            {item.end_location && (
              <View style={styles.locationRow}>
                <View
                  style={[
                    styles.locationDot,
                    { backgroundColor: COLORS.danger },
                  ]}
                />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.end_location}
                </Text>
              </View>
            )}
          </View>

          {/* Tarih */}
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text style={styles.dateText}>
              {formatDate(item.scheduled_date || item.created_at)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {(item.status === "pending" || item.status === "assigned") && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => handleStartTask(item)}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Başlat</Text>
            </TouchableOpacity>
          )}

          {item.status === "in_progress" && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleCompleteTask(item)}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Tamamla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelTask(item)}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>İptal</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Görev Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Şu anda size atanmış görev bulunmuyor.
      </Text>
    </View>
  );

  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata Oluştu</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTasks}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  const activeCount = tasks.filter((t) =>
    ["pending", "assigned", "in_progress"].includes(t.status)
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {activeCount}
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {completedCount}
          </Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id?.toString() || item.task_code}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },

  // Stats
  statsHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },

  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  taskIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskId: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  cardBody: {
    padding: 14,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 6,
  },
  taskDescription: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 12,
  },

  // Location
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  locationLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.muted,
    marginLeft: 4,
    marginVertical: 2,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 6,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  startButton: {
    backgroundColor: "#5E72E4",
  },
  completeButton: {
    backgroundColor: "#2DCE89",
  },
  cancelButton: {
    backgroundColor: "#F5365C",
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 8,
  },

  // Error & Loading
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
  },
});

export default DriverTasks;
