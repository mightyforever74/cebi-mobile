// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı
// Updated: 27 Aralık 2025 - Yeni görev akışı (Tab + Detay navigasyonu)

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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

// Görev durumu - YENİ STATUS DEĞERLERİ
const STATUS_CONFIG = {
  pending_review: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    icon: "notifications",
    label: "Yeni Görev!",
  },
  accepted: {
    color: COLORS.info,
    bg: "#E8FAFC",
    icon: "checkmark-circle",
    label: "Onaylandı",
  },
  in_progress: {
    color: COLORS.primary,
    bg: "#F0F2FF",
    icon: "navigate",
    label: "Devam Ediyor",
  },
  completed: {
    color: COLORS.success,
    bg: "#E8FCF1",
    icon: "checkmark-done",
    label: "Tamamlandı",
  },
  rejected: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    icon: "close-circle",
    label: "Reddedildi",
  },
  // Eski değerler için fallback
  pending: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    icon: "time",
    label: "Bekliyor",
  },
  assigned: {
    color: COLORS.info,
    bg: "#E8FAFC",
    icon: "person",
    label: "Atandı",
  },
  cancelled: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    icon: "close-circle",
    label: "İptal",
  },
};

const DriverTasks = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("active"); // active, completed
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Ekrana her dönüşte verileri yenile
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  // API'den görevleri çek
  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching driver tasks...");

      const data = await driverTaskAPI.getMyTasks();
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, []);

  // Görevleri filtrele - YENİ STATUS DEĞERLERİ İLE
  const filteredTasks = tasks.filter((task) => {
    const status = task.status || "pending";
    if (activeTab === "active") {
      return [
        "pending_review",
        "accepted",
        "in_progress",
        "pending",
        "assigned",
      ].includes(status);
    } else {
      return ["completed", "rejected", "cancelled"].includes(status);
    }
  });

  // Lokasyon bilgisini al (hem eski hem yeni format desteği)
  const getOrigin = (task) => {
    if (task.route_json?.origin) return task.route_json.origin;
    if (task.start_location) return task.start_location;
    return null;
  };

  const getDestination = (task) => {
    if (task.route_json?.destination) return task.route_json.destination;
    if (task.end_location) return task.end_location;
    return null;
  };

  const getDistance = (task) => {
    if (task.route_json?.distance) return task.route_json.distance;
    if (task.total_distance_km) return task.total_distance_km;
    return null;
  };

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

  // Görev kartı - TIKLANINCA DETAYA GİT
  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const origin = getOrigin(item);
    const destination = getDestination(item);
    const distance = getDistance(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
        activeOpacity={0.7}
      >
        {/* Header with Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.taskIdContainer}>
            <Ionicons name="document-text" size={18} color={COLORS.primary} />
            <Text style={styles.taskId}>
              {item.task_no || item.task_code || `TSK-${item.id?.slice(0, 8)}`}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={12} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          {item.title && <Text style={styles.taskTitle}>{item.title}</Text>}

          {/* Lokasyonlar */}
          {(origin || destination) && (
            <View style={styles.locationContainer}>
              {origin && (
                <View style={styles.locationRow}>
                  <View
                    style={[
                      styles.locationDot,
                      { backgroundColor: COLORS.success },
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
                      { backgroundColor: COLORS.danger },
                    ]}
                  />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {destination}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Alt Bilgiler */}
          <View style={styles.metaRow}>
            {item.vehicle_plate && (
              <View style={styles.metaItem}>
                <Ionicons name="car" size={14} color={COLORS.secondary} />
                <Text style={styles.metaText}>{item.vehicle_plate}</Text>
              </View>
            )}
            {distance && (
              <View style={styles.metaItem}>
                <Ionicons
                  name="speedometer"
                  size={14}
                  color={COLORS.secondary}
                />
                <Text style={styles.metaText}>{distance} km</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={COLORS.secondary}
              />
              <Text style={styles.metaText}>
                {formatDate(
                  item.planned_start || item.scheduled_date || item.created_at
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Detaya Git İkonu */}
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "active" ? "clipboard-outline" : "archive-outline"}
        size={64}
        color={COLORS.muted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "Aktif Görev Yok" : "Tamamlanan Görev Yok"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? "Yeni görevler burada görünecek"
          : "Tamamlanan görevler burada listenecek"}
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
        <ActivityIndicator size="large" color={COLORS.success} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  // Sayılar
  const activeCount = tasks.filter((t) =>
    [
      "pending_review",
      "accepted",
      "in_progress",
      "pending",
      "assigned",
    ].includes(t.status)
  ).length;
  const completedCount = tasks.filter((t) =>
    ["completed", "rejected", "cancelled"].includes(t.status)
  ).length;

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Aktif
          </Text>
          {activeCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "active" && styles.activeTabBadge,
              ]}
            >
              <Text style={styles.tabBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => setActiveTab("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            Tamamlanan
          </Text>
          {completedCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "completed" && styles.activeTabBadge,
              ]}
            >
              <Text style={styles.tabBadgeText}>{completedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Görev Listesi */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) =>
          item.id?.toString() || item.task_code || item.task_no
        }
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.success]}
            tintColor={COLORS.success}
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

  // Tab Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  activeTab: {
    backgroundColor: COLORS.success,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeTabBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // Card - Tıklanabilir
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    flex: 1,
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
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  cardBody: {
    padding: 14,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  locationLine: {
    width: 2,
    height: 15,
    backgroundColor: COLORS.muted,
    marginLeft: 3,
    marginVertical: 2,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },

  // Meta
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 4,
  },

  // Chevron
  chevronContainer: {
    position: "absolute",
    right: 10,
    top: "50%",
    marginTop: -11,
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
