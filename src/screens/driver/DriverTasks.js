// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı
// Updated: 06 Ocak 2026 - Kabul/Ret butonları FIX + Geçmiş görevler

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
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
    label: "Kabul Edildi",
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
  const [completedTasks, setCompletedTasks] = useState([]); // Geçmiş görevler için ayrı state
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Ekrana her dönüşte verileri yenile
  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchPendingOffers();
    }, [activeTab])
  );

  // API'den görevleri çek
  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching driver tasks...", { activeTab });

      if (activeTab === "completed") {
        // Tamamlanan görevleri çek
        const data = await driverTaskAPI.getCompletedTasks();
        console.log("✅ Completed tasks loaded:", data);
        const taskList = data.tasks || data || [];
        setCompletedTasks(Array.isArray(taskList) ? taskList : []);
      } else {
        // Aktif görevleri çek
        const data = await driverTaskAPI.getMyTasks();
        console.log("✅ Active tasks loaded:", data);
        const taskList = data.tasks || data || [];
        setTasks(Array.isArray(taskList) ? taskList : []);
      }
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
  }, [activeTab]);

  // Tab değiştiğinde veri çek
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
  };

  // ═══════════════════════════════════════════════════════════════
  // TASK ACTIONS - Kabul / Ret (DÜZELTİLDİ)
  // ═══════════════════════════════════════════════════════════════

  const handleAcceptTask = async (task) => {
    Alert.alert(
      "Görevi Kabul Et",
      `"${task.title || task.task_no}" görevini kabul etmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kabul Et",
          onPress: async () => {
            setActionLoading(task.id);
            try {
              // DÜZELTİLDİ: acceptTask fonksiyonunu kullan
              await driverTaskAPI.acceptTask(task.id);

              // Lokal state güncelle
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: "accepted" } : t
                )
              );

              Alert.alert(
                "✅ Görev Kabul Edildi",
                "Harita sayfasından görevi başlatabilirsiniz.",
                [
                  {
                    text: "Haritaya Git",
                    onPress: () =>
                      navigation.navigate("Navigation", {
                        task: { ...task, status: "accepted" },
                      }),
                  },
                  { text: "Tamam", style: "cancel" },
                ]
              );
            } catch (err) {
              console.error("Accept task error:", err);
              Alert.alert("Hata", err.message || "Görev kabul edilemedi");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectTask = async (task) => {
    Alert.alert(
      "Görevi Reddet",
      `"${task.title || task.task_no}" görevini reddetmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Reddet",
          style: "destructive",
          onPress: async () => {
            setActionLoading(task.id);
            try {
              // DÜZELTİLDİ: rejectTask fonksiyonunu kullan
              await driverTaskAPI.rejectTask(task.id);

              // Lokal state güncelle - rejected görevleri listeden çıkar
              setTasks((prev) => prev.filter((t) => t.id !== task.id));

              Alert.alert(
                "Bilgi",
                "Görev reddedildi. Yöneticinize bildirildi."
              );
            } catch (err) {
              console.error("Reject task error:", err);
              Alert.alert("Hata", err.message || "Görev reddedilemedi");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  // Görevleri filtrele
  const filteredTasks = activeTab === "completed" ? completedTasks : tasks.filter((task) => {
    const status = task.status || "pending";
    return [
      "pending_review",
      "accepted",
      "in_progress",
      "pending",
      "assigned",
    ].includes(status);
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

  const completedCount = completedTasks.length;

  const pendingReviewCount = tasks.filter(
    (t) => t.status === "pending_review"
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

  // ═══════════════════════════════════════════════════════════════
  // RENDER COMPONENTS
  // ═══════════════════════════════════════════════════════════════

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

  // Pending Review Uyarısı
  const renderPendingReviewAlert = () => {
    if (pendingReviewCount === 0 || activeTab !== "active") return null;

    return (
      <View style={styles.pendingReviewAlert}>
        <Ionicons name="alert-circle" size={24} color="#D97706" />
        <View style={styles.pendingReviewAlertContent}>
          <Text style={styles.pendingReviewAlertTitle}>
            {pendingReviewCount} görev onayınızı bekliyor
          </Text>
          <Text style={styles.pendingReviewAlertSubtitle}>
            Kabul veya reddetmek için aşağıdaki kartları inceleyin
          </Text>
        </View>
      </View>
    );
  };

  // Görev kartı
  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const origin = getOrigin(item);
    const destination = getDestination(item);
    const distance = getDistance(item);
    const isPendingReview = status === "pending_review";
    const isLoading = actionLoading === item.id;

    // Kısa görev numarası
    const getShortTaskNo = () => {
      const taskNo = item.task_no || item.task_code;
      if (!taskNo) return `TSK-${item.id?.slice(0, 6) || "??????"}`;
      if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
      return taskNo;
    };

    return (
      <View style={[styles.card, isPendingReview && styles.cardPendingReview]}>
        {/* Yeni Görev Banner */}
        {isPendingReview && (
          <View style={styles.newTaskBanner}>
            <Ionicons name="notifications" size={16} color="#fff" />
            <Text style={styles.newTaskBannerText}>Yeni Görev Teklifi!</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
          activeOpacity={0.7}
          disabled={isLoading}
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
              {item.scheduled_start && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="calendar"
                    size={14}
                    color={COLORS.secondary}
                  />
                  <Text style={styles.metaText}>
                    {formatDate(item.scheduled_start)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* KABUL / RET BUTONLARI (Sadece pending_review için) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isPendingReview && (
          <View style={styles.actionButtonsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>İşleniyor...</Text>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectTask(item)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reddet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptTask(item)}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Kabul Et</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* accepted durumunda Haritaya Git butonu */}
        {status === "accepted" && (
          <TouchableOpacity
            style={styles.goToNavButton}
            onPress={() => navigation.navigate("Navigation", { task: item })}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.goToNavButtonText}>
              Haritaya Git - Başlat
            </Text>
          </TouchableOpacity>
        )}

        {/* in_progress durumunda Devam Et butonu */}
        {status === "in_progress" && (
          <TouchableOpacity
            style={styles.continueNavButton}
            onPress={() => navigation.navigate("Navigation", { task: item })}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.continueNavButtonText}>
              Haritaya Devam Et
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Boş liste
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={activeTab === "active" ? "clipboard-outline" : "checkmark-done-outline"}
        size={64}
        color={COLORS.muted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "Aktif görev yok" : "Tamamlanan görev yok"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? "Yeni görev atamaları burada görünecek"
          : "Son 7 günde tamamlanan görevler burada görünecek"}
      </Text>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTasks}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => handleTabChange("active")}
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
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab !== "active" && { color: COLORS.primary },
                ]}
              >
                {activeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => handleTabChange("completed")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            Tamamlanan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Görev Listesi */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            {activeTab === "active" && renderOffersCard()}
            {renderPendingReviewAlert()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
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

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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

  // Pending Review Alert
  pendingReviewAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#D97706",
  },
  pendingReviewAlertContent: {
    flex: 1,
    marginLeft: 12,
  },
  pendingReviewAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  pendingReviewAlertSubtitle: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
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
  cardPendingReview: {
    borderWidth: 2,
    borderColor: COLORS.warning,
  },

  // New Task Banner
  newTaskBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warning,
    paddingVertical: 8,
    gap: 6,
  },
  newTaskBannerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
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

  // Action Buttons (Kabul/Ret)
  actionButtonsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    padding: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Go to Navigation Button
  goToNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  goToNavButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // Continue Navigation Button
  continueNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.info,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  continueNavButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
