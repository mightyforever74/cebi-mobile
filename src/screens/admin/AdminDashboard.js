// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA
// v1.1.0 - Aktivite formatı iyileştirildi

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

// Relative time (5 dk önce, 2 saat önce)
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

// Alert tipi için bilgi al
const getAlertInfo = (type) => {
  return ALERT_TYPE_MAP[type] || { icon: "⚠️", label: type, color: "#6B7280" };
};

// Severity için bilgi al
const getSeverityInfo = (severity) => {
  return SEVERITY_MAP[severity] || SEVERITY_MAP["medium"];
};

// Task status için bilgi al
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

      // Fetch all admin data in parallel
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
      // Set default values on error
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

  const handleVehiclePress = (vehicle) => {
    console.log("Vehicle pressed:", vehicle.id);
    // TODO: Navigate to VehicleDetails
  };

  // ============================================
  // RENDER ACTIVITY ITEM
  // ============================================

  const renderActivityItem = (activity, index) => {
    const isAlert = activity.activity_type === "alert";

    if (isAlert) {
      // Alert aktivitesi
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
            {/* Araç/Cihaz bilgisi */}
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  🚗 {activity.vehicle_plate}
                </Text>
              </View>
            )}

            {/* Severity badge */}
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
      // Task aktivitesi
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
            {/* Araç */}
            {activity.vehicle_plate && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  🚗 {activity.vehicle_plate}
                </Text>
              </View>
            )}

            {/* Sürücü */}
            {activity.user_email && (
              <View style={styles.activityTag}>
                <Text style={styles.activityTagText}>
                  👤 {activity.user_email.split("@")[0]}
                </Text>
              </View>
            )}

            {/* Status badge */}
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hoş geldiniz,</Text>
          <Text style={styles.userName}>
            {user?.firstName || user?.email?.split("@")[0] || "Yönetici"}
          </Text>
          <Text style={styles.role}>Yönetici</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

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

      {/* Alert Stats - Yeni */}
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

      {/* Vehicles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚙 Araçlar ({vehicles.length})</Text>
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
                  {vehicle.last_location_time && (
                    <Text style={styles.lastUpdate}>
                      Son güncelleme:{" "}
                      {new Date(vehicle.last_location_time).toLocaleTimeString(
                        "tr-TR"
                      )}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        vehicle.status === "active" ||
                        vehicle.status === "in_use"
                          ? COLORS.success
                          : vehicle.status === "maintenance"
                          ? COLORS.warning
                          : COLORS.textSecondary,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {vehicle.status === "active" || vehicle.status === "in_use"
                      ? "Aktif"
                      : vehicle.status === "maintenance"
                      ? "Bakımda"
                      : vehicle.status === "available"
                      ? "Müsait"
                      : "Atanmamış"}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleStats}>
                {vehicle.fuel_level && (
                  <View style={styles.vehicleStat}>
                    <Text style={styles.vehicleStatIcon}>⛽</Text>
                    <Text style={styles.vehicleStatValue}>
                      %{Math.round(vehicle.fuel_level)}
                    </Text>
                  </View>
                )}
                {vehicle.speed !== null && vehicle.speed !== undefined && (
                  <View style={styles.vehicleStat}>
                    <Text style={styles.vehicleStatIcon}>🚗</Text>
                    <Text style={styles.vehicleStatValue}>
                      {Math.round(vehicle.speed)} km/h
                    </Text>
                  </View>
                )}
                {vehicle.latitude && vehicle.longitude && (
                  <View style={styles.vehicleStat}>
                    <Text style={styles.vehicleStatIcon}>📍</Text>
                    <Text style={styles.vehicleStatValue}>GPS Aktif</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>Araç bulunamadı</Text>
        )}
        {vehicles.length > 3 && (
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>
              Tümünü Gör ({vehicles.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Recent Activities - İyileştirilmiş */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Son Aktiviteler</Text>
        {activities.length > 0 ? (
          activities
            .slice(0, 10)
            .map((activity, index) => renderActivityItem(activity, index))
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 4,
  },
  role: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
  // Activity Card - İyileştirilmiş
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
