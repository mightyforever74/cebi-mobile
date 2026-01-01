// src/screens/admin/AdminTasks.js
// TulipFleet - Admin Görev Listesi Ekranı
// Updated: 30 Aralık 2025 - pendingCount fix + Teklif Gönder

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
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
import { taskAPI } from "../../services/api";

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

// Görev durumu renkleri
const STATUS_COLORS = {
  pending: COLORS.warning,
  assigned: COLORS.info,
  in_progress: COLORS.primary,
  completed: COLORS.success,
  cancelled: COLORS.danger,
  failed: COLORS.danger,
  pending_review: COLORS.info,
};

// Görev durumu Türkçe karşılıkları
const STATUS_LABELS = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
  failed: "Başarısız",
  pending_review: "İnceleme Bekliyor",
};

// Görev önceliği renkleri
const PRIORITY_COLORS = {
  low: COLORS.success,
  normal: COLORS.info,
  medium: COLORS.warning,
  high: COLORS.danger,
  urgent: COLORS.danger,
};

const PRIORITY_LABELS = {
  low: "Düşük",
  normal: "Normal",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
};

const AdminTasks = ({ navigation }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ İstatistik hesaplamaları
  const pendingCount = tasks.filter((t) =>
    ["pending", "pending_review"].includes(t.status)
  ).length;
  const inProgressCount = tasks.filter((t) =>
    ["in_progress", "assigned"].includes(t.status)
  ).length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  // Görev için teklif gönder
  const handleSendOffer = async (task) => {
    if (!task.driver_id) {
      Alert.alert("Uyarı", "Bu göreve henüz sürücü atanmamış!");
      return;
    }

    Alert.alert(
      "Teklif Gönder",
      `${
        task.driver_first_name || task.driver_email?.split("@")[0] || "Sürücüye"
      } görev teklifi göndermek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Gönder",
          onPress: async () => {
            try {
              await taskAPI.sendOffer(task.id, task.driver_id);
              Alert.alert("✅ Başarılı", "Görev teklifi gönderildi!");
              // Listeyi yenile
              fetchTasks();
            } catch (error) {
              console.error("Send offer error:", error);
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Teklif gönderilemedi"
              );
            }
          },
        },
      ]
    );
  };

  // API'den görevleri çek
  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching tasks...");

      const data = await taskAPI.getList();
      console.log("✅ Tasks loaded:", data);

      // API response format'ına göre ayarla
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

  // Ekrana her dönüşte yenile
  useFocusEffect(
    React.useCallback(() => {
      fetchTasks();
    }, [])
  );

  // Pull-to-refresh
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Görev sil
  const handleDeleteTask = (task) => {
    Alert.alert(
      "Görevi Sil",
      `"${
        task.title || task.task_no
      }" görevini silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await taskAPI.delete(task.id);
              Alert.alert("✅ Başarılı", "Görev silindi");
              fetchTasks();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Görev silinemedi"
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
    const statusColor = STATUS_COLORS[status] || COLORS.secondary;
    const statusLabel = STATUS_LABELS[status] || status;
    const priority = item.priority || "normal";
    const priorityColor = PRIORITY_COLORS[priority] || COLORS.info;
    const priorityLabel = PRIORITY_LABELS[priority] || priority;

    // Teklif gönder butonu sadece pending/assigned görevlerde göster
    const canSendOffer = ["pending", "assigned", "pending_review"].includes(
      status
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "📋 Görev Detayı",
            `Görev: ${item.title || item.task_code || "-"}\n` +
              `Durum: ${statusLabel}\n` +
              `Öncelik: ${priorityLabel}\n` +
              `Açıklama: ${item.description || "-"}\n` +
              `Başlangıç: ${item.start_location || "-"}\n` +
              `Varış: ${item.end_location || "-"}`,
            [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
        {/* Üst Kısım - Başlık ve Durum */}
        <View style={styles.cardHeader}>
          <View style={styles.taskTitleContainer}>
            <View
              style={[styles.priorityDot, { backgroundColor: priorityColor }]}
            />
            <Text style={styles.taskCode}>
              {item.title ||
                item.task_code ||
                item.task_no ||
                `TSK-${item.id?.slice(0, 6)}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate("EditTask", { task: item })}
            >
              <Ionicons name="pencil" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            {canSendOffer && (
              <TouchableOpacity
                style={styles.offerButton}
                onPress={() => handleSendOffer(item)}
              >
                <Ionicons name="send" size={18} color={COLORS.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTask(item)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </TouchableOpacity>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Orta Kısım - Görev Bilgileri */}
        <View style={styles.cardBody}>
          {item.title && <Text style={styles.taskTitle}>{item.title}</Text>}

          {item.description && (
            <Text style={styles.taskDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.infoGrid}>
            {/* Araç */}
            <View style={styles.infoItem}>
              <Ionicons name="car" size={14} color={COLORS.secondary} />
              <Text style={styles.infoText}>
                {item.vehicle_plate || "Araç atanmadı"}
              </Text>
            </View>

            {/* Sürücü */}
            <View style={styles.infoItem}>
              <Ionicons name="person" size={14} color={COLORS.secondary} />
              <Text style={styles.infoText}>
                {item.driver_first_name
                  ? `${item.driver_first_name} ${
                      item.driver_last_name || ""
                    }`.trim()
                  : item.driver_email?.split("@")[0] || "Sürücü atanmadı"}
              </Text>
            </View>

            {/* Başlangıç Noktası */}
            {item.start_location && (
              <View style={styles.infoItem}>
                <Ionicons name="location" size={14} color={COLORS.success} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.start_location}
                </Text>
              </View>
            )}

            {/* Varış Noktası */}
            {item.end_location && (
              <View style={styles.infoItem}>
                <Ionicons name="flag" size={14} color={COLORS.danger} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.end_location}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Alt Kısım - Tarih ve Öncelik */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={COLORS.secondary}
            />
            <Text style={styles.footerText}>
              {formatDate(item.scheduled_date || item.created_at)}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${priorityColor}20` },
            ]}
          >
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {priorityLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="clipboard-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Görev Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz kayıtlı görev yok veya yetkiniz dahilinde görev bulunmuyor.
      </Text>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
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

  const handleAddTask = () => {
    navigation.navigate("CreateTask");
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.headerStatBox}>
          <Text style={styles.headerStatValue}>{tasks.length}</Text>
          <Text style={styles.headerStatLabel}>Toplam</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.warning }]}>
            {pendingCount}
          </Text>
          <Text style={styles.headerStatLabel}>Bekleyen</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.primary }]}>
            {inProgressCount}
          </Text>
          <Text style={styles.headerStatLabel}>Devam Eden</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.success }]}>
            {completedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Tamamlanan</Text>
        </View>
      </View>

      {/* Görev Listesi */}
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

      {/* FAB - Yeni Görev Ekle */}
      <TouchableOpacity style={styles.fab} onPress={handleAddTask}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
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

  // Header Stats
  statsHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerStatBox: {
    flex: 1,
    alignItems: "center",
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  headerStatLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 2,
  },

  // List
  listContainer: {
    padding: 12,
    paddingBottom: 80,
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
  taskTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  taskCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  offerButton: {
    padding: 6,
    backgroundColor: "#E8FCF1",
    borderRadius: 6,
  },
  editButton: {
    padding: 6,
  },
  deleteButton: {
    padding: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },

  cardBody: {
    padding: 14,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 10,
  },
  infoGrid: {
    marginTop: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.dark,
    marginLeft: 8,
    flex: 1,
  },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 6,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Empty State
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
    paddingHorizontal: 40,
  },

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
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

  // Loading
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 14,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default AdminTasks;
