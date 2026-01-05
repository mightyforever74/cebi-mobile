// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA
// Updated: 06 Ocak 2026 - Canlı harita bölümü, tıklanabilir araçlar, infogram

import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { adminAPI } from "../../services/api";

// ============================================
// ALERT TİP VE SEVİYE MAPPING
// ============================================

const ALERT_TYPE_MAP = {
  HARD_BRAKE: { icon: "🛑", label: "Ani Fren", color: "#EF4444" },
  HARD_ACCEL: { icon: "🚀", label: "Sert Hızlanma", color: "#F59E0B" },
  HARD_TURN: { icon: "↩️", label: "Sert Viraj", color: "#F59E0B" },
  SHARP_TURN: { icon: "↩️", label: "Keskin Viraj", color: "#F59E0B" },
  IMPACT: { icon: "💥", label: "Çarpma/Kaza", color: "#DC2626" },
  OVERSPEED: { icon: "⚡", label: "Hız Aşımı", color: "#EF4444" },
  GEOFENCE_EXIT: { icon: "📍", label: "Bölge Çıkışı", color: "#8B5CF6" },
  GEOFENCE_ENTER: { icon: "📍", label: "Bölge Girişi", color: "#10B981" },
  LOW_FUEL: { icon: "⛽", label: "Düşük Yakıt", color: "#F59E0B" },
  IDLE_TIME: { icon: "⏱️", label: "Uzun Rölanti", color: "#6B7280" },
};

const SEVERITY_MAP = {
  critical: { label: "Kritik", color: "#DC2626", bg: "#FEE2E2" },
  high: { label: "Yüksek", color: "#EF4444", bg: "#FEE2E2" },
  medium: { label: "Orta", color: "#F59E0B", bg: "#FEF3C7" },
  low: { label: "Düşük", color: "#10B981", bg: "#D1FAE5" },
};

const TASK_STATUS_MAP = {
  pending: { label: "Bekliyor", color: "#F59E0B", bg: "#FEF3C7" },
  assigned: { label: "Atandı", color: "#3B82F6", bg: "#DBEAFE" },
  in_progress: { label: "Devam Ediyor", color: "#8B5CF6", bg: "#EDE9FE" },
  completed: { label: "Tamamlandı", color: "#10B981", bg: "#D1FAE5" },
  cancelled: { label: "İptal", color: "#6B7280", bg: "#F3F4F6" },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const getRelativeTime = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;
  return time.toLocaleDateString("tr-TR");
};

const getAlertInfo = (type) => {
  return ALERT_TYPE_MAP[type] || { icon: "⚠️", label: type, color: "#6B7280" };
};

const getSeverityInfo = (severity) => {
  return SEVERITY_MAP[severity] || SEVERITY_MAP["medium"];
};

const getTaskStatusInfo = (status) => {
  return (
    TASK_STATUS_MAP[status] || {
      label: status,
      color: "#6B7280",
      bg: "#F3F4F6",
    }
  );
};

// ============================================
// ADMIN DASHBOARD COMPONENT
// ============================================

const AdminDashboard = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fleetStats, setFleetStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setError(null);

      const [statsData, vehiclesData, activitiesData] = await Promise.all([
        adminAPI.getFleetStats().catch((err) => ({ stats: getDefaultStats() })),
        adminAPI.getVehicles().catch((err) => ({ vehicles: [] })),
        adminAPI.getActivities().catch((err) => ({ activities: [] })),
      ]);

      setFleetStats(statsData.stats);
      setVehicles(vehiclesData.vehicles || []);
      setActivities(activitiesData.activities || []);

      console.log("✅ Admin data loaded:", {
        stats: statsData.stats,
        vehicleCount: vehiclesData.vehicles?.length,
        activityCount: activitiesData.activities?.length,
      });
    } catch (error) {
      console.error("❌ Error fetching admin data:", error);
      setError("Veri yüklenirken hata oluştu");
      setFleetStats(getDefaultStats());
      setVehicles([]);
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultStats = () => ({
    vehicles: {
      total_vehicles: 0,
      active_vehicles: 0,
      maintenance_vehicles: 0,
      available_vehicles: 0,
    },
    drivers: {
      total_drivers: 0,
      on_duty_drivers: 0,
      idle_drivers: 0,
      off_duty_drivers: 0,
    },
    tasks: {
      total_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      completed_today: 0,
    },
    alerts: {
      unresolved_alerts: 0,
      critical_alerts: 0,
    },
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ Çıkış yapıldı");
    }
  };

  // 🆕 Araç kartına tıklanınca Araç Yönetimi'ne git
  const handleVehiclePress = (vehicle) => {
    console.log("Vehicle pressed:", vehicle.id);
    navigation.navigate("AdminVehicles");
  };

  // ============================================
  // RENDER ACTIVITY ITEM
  // ============================================

  const renderActivityItem = (activity, index) => {
    const isAlert = activity.activity_type === "alert";

    if (isAlert) {
      const alertInfo = getAlertInfo(activity.identifier);
      const severityInfo = getSeverityInfo(activity.status);

      return (
        <View
          key={`alert-${activity.id}-${index}`}
          style={[
            styles.activityCard,
            { borderLeftColor: alertInfo.color, borderLeftWidth: 3 },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Text style={styles.activityIcon}>{alertInfo.icon}</Text>
              <Text style={styles.activityTitle}>{alertInfo.label}</Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  🚗 {activity.vehicle_plate}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: severityInfo.bg },
              ]}
            >
              <Text
                style={[styles.severityText, { color: severityInfo.color }]}
              >
                {severityInfo.label}
              </Text>
            </View>
          </View>
        </View>
      );
    } else {
      const statusInfo = getTaskStatusInfo(activity.status);

      return (
        <View
          key={`task-${activity.id}-${index}`}
          style={[
            styles.activityCard,
            { borderLeftColor: "#3B82F6", borderLeftWidth: 3 },
          ]}
        >
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleRow}>
              <Text style={styles.activityIcon}>📋</Text>
              <Text style={styles.activityTitle} numberOfLines={1}>
                {activity.identifier || "Görev"}
              </Text>
            </View>
            <Text style={styles.activityTime}>
              {getRelativeTime(activity.timestamp)}
            </Text>
          </View>

          <View style={styles.activityDetails}>
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  🚗 {activity.vehicle_plate}
                </Text>
              </View>
            )}
            {activity.user_email && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  👤 {activity.user_email.split("@")[0]}
                </Text>
              </View>
            )}
            <View
              style={[styles.severityBadge, { backgroundColor: statusInfo.bg }]}
            >
              <Text style={[styles.severityText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Modern Greeting */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingEmoji}>👋</Text>
          <View>
            <Text style={styles.greeting}>Hoş geldiniz,</Text>
            <Text style={styles.userName}>
              {user?.firstName || user?.email?.split("@")[0] || "Yönetici"}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* 🆕 Fleet Command Center Infogram */}
      {fleetStats && (
        <View style={styles.commandCenterCard}>
          <Text style={styles.commandCenterTitle}>🎯 Komuta Merkezi</Text>
          <View style={styles.commandCenterGrid}>
            <View style={styles.commandItem}>
              <View style={[styles.commandIcon, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="car" size={24} color="#5E72E4" />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.vehicles?.total_vehicles || 0}
              </Text>
              <Text style={styles.commandLabel}>Araç</Text>
            </View>
            <View style={styles.commandItem}>
              <View style={[styles.commandIcon, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="people" size={24} color="#10B981" />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.drivers?.total_drivers || 0}
              </Text>
              <Text style={styles.commandLabel}>Sürücü</Text>
            </View>
            <View style={styles.commandItem}>
              <View style={[styles.commandIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="hardware-chip" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.commandNumber}>
                {fleetStats.vehicles?.active_vehicles || 0}
              </Text>
              <Text style={styles.commandLabel}>Aktif Cihaz</Text>
            </View>
          </View>
        </View>
      )}

      {/* 🆕 Canlı Harita Bölümü */}
      <TouchableOpacity
        style={styles.liveMapCard}
        onPress={() => navigation.navigate("AdminMap")}
        activeOpacity={0.8}
      >
        <View style={styles.liveMapContent}>
          <View style={styles.liveMapIconContainer}>
            <Ionicons name="map" size={32} color={COLORS.white} />
            <View style={styles.livePulse} />
          </View>
          <View style={styles.liveMapText}>
            <Text style={styles.liveMapTitle}>🗺️ Canlı Harita</Text>
            <Text style={styles.liveMapSubtitle}>
              Araçları gerçek zamanlı takip edin
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </View>
      </TouchableOpacity>

      {/* Fleet Stats */}
      {fleetStats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Filo Özeti</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {fleetStats.vehicles?.total_vehicles || 0}
              </Text>
              <Text style={styles.statText}>Toplam Araç</Text>
              <Text style={styles.statDetail}>
                {fleetStats.vehicles?.active_vehicles || 0} aktif
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {fleetStats.drivers?.total_drivers || 0}
              </Text>
              <Text style={styles.statText}>Toplam Sürücü</Text>
              <Text style={styles.statDetail}>
                {fleetStats.drivers?.on_duty_drivers || 0} görevde
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.info }]}>
                {fleetStats.tasks?.in_progress_tasks || 0}
              </Text>
              <Text style={styles.statText}>Aktif Görev</Text>
              <Text style={styles.statDetail}>
                {fleetStats.tasks?.pending_tasks || 0} beklemede
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {fleetStats.tasks?.completed_today || 0}
              </Text>
              <Text style={styles.statText}>Bugün Tamamlanan</Text>
              <Text style={styles.statDetail}>görev</Text>
            </View>
          </View>
        </View>
      )}

      {/* Alert Stats */}
      {fleetStats?.alerts && (
        <View style={styles.alertStatsCard}>
          <View style={styles.alertStatItem}>
            <Text style={styles.alertStatIcon}>⚠️</Text>
            <Text style={styles.alertStatNumber}>
              {fleetStats.alerts?.unresolved_alerts || 0}
            </Text>
            <Text style={styles.alertStatLabel}>Çözülmemiş Uyarı</Text>
          </View>
          <View style={styles.alertStatDivider} />
          <View style={styles.alertStatItem}>
            <Text style={styles.alertStatIcon}>🚨</Text>
            <Text style={[styles.alertStatNumber, { color: "#DC2626" }]}>
              {fleetStats.alerts?.critical_alerts || 0}
            </Text>
            <Text style={styles.alertStatLabel}>Kritik Uyarı</Text>
          </View>
        </View>
      )}

      {/* Vehicles - Tıklanabilir */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardTitleRow}
          onPress={() => navigation.navigate("AdminVehicles")}
        >
          <Text style={styles.cardTitle}>🚙 Araçlar ({vehicles.length})</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
        
        {vehicles.length > 0 ? (
          vehicles.slice(0, 3).map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleCard}
              onPress={() => handleVehiclePress(vehicle)}
            >
              <View style={styles.vehicleHeader}>
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehiclePlate}>{vehicle.plate_no}</Text>
                  <Text style={styles.vehicleModel}>
                    {vehicle.brand} {vehicle.model}
                  </Text>
                  {vehicle.driver_email && (
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverIcon}>👤</Text>
                      <Text style={styles.driverName}>
                        {vehicle.driver_email.split("@")[0]}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        vehicle.status === "in_use"
                          ? COLORS.success
                          : vehicle.status === "available"
                          ? COLORS.info
                          : COLORS.warning,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {vehicle.status === "in_use"
                      ? "Kullanımda"
                      : vehicle.status === "available"
                      ? "Müsait"
                      : "Bakımda"}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleStats}>
                {vehicle.odometer && (
                  <View style={styles.vehicleStat}>
                    <Text style={styles.vehicleStatIcon}>🛣️</Text>
                    <Text style={styles.vehicleStatValue}>
                      {Math.round(vehicle.odometer).toLocaleString()} km
                    </Text>
                  </View>
                )}
                {vehicle.fuel_level && (
                  <View style={styles.vehicleStat}>
                    <Text style={styles.vehicleStatIcon}>⛽</Text>
                    <Text style={styles.vehicleStatValue}>
                      {vehicle.fuel_level}%
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>Araç bulunamadı</Text>
        )}

        {vehicles.length > 3 && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate("AdminVehicles")}
          >
            <Text style={styles.seeAllText}>
              Tümünü Gör ({vehicles.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Activities */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Son Aktiviteler</Text>
        {activities.length > 0 ? (
          activities.slice(0, 5).map((activity, index) => 
            renderActivityItem(activity, index)
          )
        ) : (
          <Text style={styles.noDataText}>Henüz aktivite yok</Text>
        )}
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 12,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "#FEE",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  // Command Center
  commandCenterCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commandCenterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
    textAlign: "center",
  },
  commandCenterGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  commandItem: {
    alignItems: "center",
  },
  commandIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  commandNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  commandLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Live Map Card
  liveMapCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  liveMapContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveMapIconContainer: {
    position: "relative",
    marginRight: 12,
  },
  livePulse: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  liveMapText: {
    flex: 1,
  },
  liveMapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  liveMapSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
    fontWeight: "600",
  },
  statDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Alert Stats Card
  alertStatsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertStatItem: {
    flex: 1,
    alignItems: "center",
  },
  alertStatDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  alertStatIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  alertStatNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  alertStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  vehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  driverIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  driverName: {
    fontSize: 12,
    color: COLORS.text,
  },
  lastUpdate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    height: 28,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  vehicleStats: {
    flexDirection: "row",
    gap: 16,
  },
  vehicleStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleStatIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  vehicleStatValue: {
    fontSize: 13,
    color: COLORS.text,
  },
  seeAllButton: {
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  // Activity Card
  activityCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activityTag: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activityTagText: {
    fontSize: 11,
    color: "#374151",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

export default AdminDashboard;
