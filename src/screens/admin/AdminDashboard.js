// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard with REAL DATA

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

      {/* Vehicles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚙 Araçlar ({vehicles.length})</Text>
        {vehicles.length > 0 ? (
          vehicles.map((vehicle) => (
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
                        vehicle.status === "active"
                          ? COLORS.success
                          : vehicle.status === "maintenance"
                          ? COLORS.warning
                          : COLORS.textSecondary,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {vehicle.status === "active"
                      ? "Aktif"
                      : vehicle.status === "maintenance"
                      ? "Bakımda"
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
      </View>

      {/* Recent Activities */}
      {activities.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Son Aktiviteler</Text>
          {activities.map((activity, index) => (
            <View
              key={`${activity.activity_type}-${activity.id}-${index}`}
              style={styles.activityCard}
            >
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>
                  {activity.activity_type === "task" ? "📋" : "⚠️"}{" "}
                  {activity.identifier}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(activity.timestamp).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={styles.activityDescription}>
                Durum: {activity.status}
              </Text>
              {activity.user_email && (
                <Text style={styles.activityUser}>
                  {activity.user_email.split("@")[0]} • {activity.vehicle_plate}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

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
  activityCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
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
  activityDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  activityUser: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default AdminDashboard;
