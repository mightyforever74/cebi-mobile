// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı
// Updated: 30 Aralık 2025 - Tab mantığı düzeltildi

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
import { driverTaskAPI, taskOffersAPI } from "../../services/api";

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
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Ekrana her dönüşte verileri yenile
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchPendingOffers();
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

  // Bekleyen teklifleri say
  const fetchPendingOffers = async () => {
    try {
      const data = await taskOffersAPI.getOffers("pending");
      setPendingOffersCount(data.offers?.length || 0);
    } catch (err) {
      console.log("Pending offers fetch error:", err);
      setPendingOffersCount(0);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
    fetchPendingOffers();
  }, []);

  // Görevleri filtrele
  const filteredTasks = tasks.filter((task) => {
    const status = task.status || "pending";
    if (activeTab === "active") {
      // Aktif görevler: assigned, accepted, in_progress, pending_review
      return [
        "pending_review",
        "accepted",
        "in_progress",
        "pending",
        "assigned",
      ].includes(status);
    } else {
      // Tamamlanan görevler: completed, rejected, cancelled
      return ["completed", "rejected", "cancelled"].includes(status);
    }
  });

  // İstatistikler
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

  // Lokasyon bilgisini al
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

  // Görev Teklifleri Kartı
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
            <Ionicons name="mail-unread" size={24} color={COLORS.white} />
            {pendingOffersCount > 0 && (
              <View style={styles.offersBadge}>
                <Text style={styles.offersBadgeText}>{pendingOffersCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.offersTextContainer}>
            <Text style={styles.offersTitle}>Bekleyen Görev Teklifleri</Text>
            <Text style={styles.offersSubtitle}>
              {pendingOffersCount} yeni teklif bekliyor - Kabul/Red için
              tıklayın
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    );
  };

  // Görev kartı
  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const origin = getOrigin(item);
    const destination = getDestination(item);
    const distance = getDistance(item);

    // Kısa görev numarası
    const getShortTaskNo = () => {
      const taskNo = item.task_no || item.task_code;
      if (!taskNo) return `TSK-${item.id?.slice(0, 6) || "??????"}`;
      if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
      return taskNo;
    };

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
            <Text style={styles.taskId}>{getShortTaskNo()}</Text>
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

          {/* Aksiyon ipucu */}
          <View style={styles.actionHint}>
            {status === "assigned" || status === "accepted" ? (
              <Text style={[styles.actionHintText, { color: COLORS.primary }]}>
                📍 Detay için tıklayın → Göreve Başla
              </Text>
            ) : status === "in_progress" ? (
              <Text style={[styles.actionHintText, { color: COLORS.success }]}>
                🚀 Devam ediyor → Tamamla
              </Text>
            ) : null}
          </View>
        </View>

        {/* Chevron */}
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
        name={
          activeTab === "active"
            ? "car-outline"
            : "checkmark-done-circle-outline"
        }
        size={64}
        color={COLORS.muted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "Aktif Görev Yok" : "Tamamlanan Görev Yok"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? "Yeni görev teklifleri için yukarıdaki kartı kontrol edin"
          : "Henüz tamamladığınız görev bulunmuyor"}
      </Text>
    </View>
  );

  // Liste başlığı (teklifler kartı)
  const renderListHeader = () => {
    if (activeTab !== "active") return null;
    return renderOffersCard();
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.success} />
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
            Aktif Görevler
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
        ListHeaderComponent={renderListHeader}
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

  // Offers Card
  offersCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
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
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  offersBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  offersTextContainer: {
    flex: 1,
  },
  offersTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  offersSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // Card
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

  // Action Hint
  actionHint: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: "500",
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
    paddingHorizontal: 20,
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
