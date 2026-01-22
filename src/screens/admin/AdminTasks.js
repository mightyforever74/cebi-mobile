// src/screens/admin/AdminTasks.js
// TulipFleet - Admin Görev Listesi Ekranı (Dark Mode uyumlu - Rehbere uygun)
// Updated: 30 Aralık 2025 - pendingCount fix + Teklif Gönder

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
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
import { taskAPI } from "../../services/api";

// --- helper: #RRGGBB => #RRGGBBAA (hardcoded hex yazmadan soft bg) ---
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

// Öncelik Türkçe karşılıkları
const PRIORITY_LABELS = {
  low: "Düşük",
  normal: "Normal",
  medium: "Orta",
  high: "Yüksek",
  urgent: "Acil",
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: 20,
    },

    // Header Stats
    statsHeader: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginBottom: 8,
      shadowColor: COLORS.BLACK,
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
      color: COLORS.DEFAULT,
    },
    headerStatLabel: {
      fontSize: 10,
      color: COLORS.MUTED,
      marginTop: 2,
    },

    // List
    listContainer: {
      padding: 12,
      paddingBottom: 80,
    },

    // Card
    card: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: COLORS.BLACK,
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
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER_COLOR ?? COLORS.BORDER,
    },
    taskTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 140,
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
      color: COLORS.DEFAULT,
      flex: 1,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginLeft: 8,
    },
    actionButton: {
      padding: 6,
      borderRadius: 6,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
      marginLeft: 4,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: 11,
      fontWeight: "600",
    },

    cardBody: {
      padding: 14,
    },
    taskTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.DEFAULT,
      marginBottom: 4,
    },
    taskDescription: {
      fontSize: 13,
      color: COLORS.MUTED,
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
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginLeft: 8,
      flex: 1,
    },

    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    footerItem: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    footerText: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginLeft: 6,
    },
    priorityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 12,
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
      color: COLORS.DEFAULT,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: 8,
      paddingHorizontal: 40,
    },

    // Error State
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.ERROR,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: 8,
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },

    // Loading
    loadingText: {
      marginTop: 12,
      color: COLORS.MUTED,
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
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
  });

const AdminTasks = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ İstatistik hesaplamaları
  const pendingCount = useMemo(
    () =>
      tasks.filter((t) => ["pending", "pending_review"].includes(t.status))
        .length,
    [tasks]
  );
  const inProgressCount = useMemo(
    () =>
      tasks.filter((t) => ["in_progress", "assigned"].includes(t.status))
        .length,
    [tasks]
  );
  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === "completed").length,
    [tasks]
  );

  // Theme tabanlı durum/öncelik renkleri
  const STATUS_COLORS = useMemo(
    () => ({
      pending: COLORS.WARNING,
      assigned: COLORS.INFO,
      in_progress: COLORS.PRIMARY,
      completed: COLORS.SUCCESS,
      cancelled: COLORS.ERROR,
      failed: COLORS.ERROR,
      pending_review: COLORS.INFO,
    }),
    [COLORS]
  );

  const PRIORITY_COLORS = useMemo(
    () => ({
      low: COLORS.SUCCESS,
      normal: COLORS.INFO,
      medium: COLORS.WARNING,
      high: COLORS.ERROR,
      urgent: COLORS.ERROR,
    }),
    [COLORS]
  );

  // API'den görevleri çek
  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching tasks...");

      const data = await taskAPI.getList();
      console.log("✅ Tasks loaded:", data);

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

  // Görev sil
  const handleDeleteTask = (task) => {
    Alert.alert(
      "Görevi Sil",
      `"${task.title || task.task_no}" görevini silmek istediğinize emin misiniz?`,
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
    const statusColor = STATUS_COLORS[status] || COLORS.SECONDARY;
    const statusLabel = STATUS_LABELS[status] || status;

    const priority = item.priority || "normal";
    const priorityColor = PRIORITY_COLORS[priority] || COLORS.INFO;
    const priorityLabel = PRIORITY_LABELS[priority] || priority;

    const canSendOffer = ["pending", "assigned", "pending_review"].includes(
      status
    );

    const taskCodeText =
      item.title ||
      item.task_code ||
      item.task_no ||
      (item.id ? `TSK-${String(item.id).slice(0, 6)}` : "TSK");

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
            <Text style={styles.taskCode} numberOfLines={1}>
              {taskCodeText}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("EditTask", { task: item })}
            >
              <Ionicons name="pencil" size={18} color={COLORS.PRIMARY} />
            </TouchableOpacity>

            {canSendOffer && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: withAlpha(COLORS.SUCCESS, 0.12) },
                ]}
                onPress={() => handleSendOffer(item)}
              >
                <Ionicons name="send" size={18} color={COLORS.SUCCESS} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: withAlpha(COLORS.ERROR, 0.12) },
              ]}
              onPress={() => handleDeleteTask(item)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
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
            <View style={styles.infoItem}>
              <Ionicons name="car" size={14} color={COLORS.MUTED} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.vehicle_plate || "Araç atanmadı"}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="person" size={14} color={COLORS.MUTED} />
              <Text style={styles.infoText} numberOfLines={1}>
                {item.driver_first_name
                  ? `${item.driver_first_name} ${item.driver_last_name || ""}`.trim()
                  : item.driver_email?.split("@")[0] || "Sürücü atanmadı"}
              </Text>
            </View>

            {item.start_location && (
              <View style={styles.infoItem}>
                <Ionicons name="location" size={14} color={COLORS.SUCCESS} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.start_location}
                </Text>
              </View>
            )}

            {item.end_location && (
              <View style={styles.infoItem}>
                <Ionicons name="flag" size={14} color={COLORS.ERROR} />
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
            <Ionicons name="calendar-outline" size={14} color={COLORS.MUTED} />
            <Text style={styles.footerText}>
              {formatDate(item.scheduled_date || item.created_at)}
            </Text>
          </View>

          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: withAlpha(priorityColor, 0.12) },
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
      <Ionicons name="clipboard-outline" size={64} color={COLORS.MUTED} />
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
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
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
          <Text style={[styles.headerStatValue, { color: COLORS.WARNING }]}>
            {pendingCount}
          </Text>
          <Text style={styles.headerStatLabel}>Bekleyen</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.PRIMARY }]}>
            {inProgressCount}
          </Text>
          <Text style={styles.headerStatLabel}>Devam Eden</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.SUCCESS }]}>
            {completedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Tamamlanan</Text>
        </View>
      </View>

      {/* Görev Listesi */}
      <FlatList
        data={tasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) =>
          item.id?.toString() || item.task_code || String(item.title || "")
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Yeni Görev Ekle */}
      <TouchableOpacity style={styles.fab} onPress={handleAddTask}>
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminTasks;
