// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// Updated: 05 Ocak 2026 - Gate Logic Added

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
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
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { driverAPI } from "../../services/api";

const DriverDashboard = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { expoPushToken, error: pushError } = usePushNotifications();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState(null);

  // 🆕 Gate Logic State
  const [deviceCheckDone, setDeviceCheckDone] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  // 🆕 Gate Logic - Her ekran açılışında cihaz durumu kontrol
  useFocusEffect(
    useCallback(() => {
      checkDeviceStatus();
    }, [])
  );

  const checkDeviceStatus = async () => {
    try {
      setCheckingDevice(true);
      console.log("[Gate] Checking device status...");

      // Yeni MVP endpoint'i kullan
      const response = await driverAPI.getAssignedDevice();
      console.log("[Gate] Response:", JSON.stringify(response));

      // Gate Logic
      if (!response.has_vehicle) {
        // Araç atanmamış - dashboard'da kal
        console.log("[Gate] No vehicle assigned");
        setCheckingDevice(false);
        setDeviceCheckDone(true);
        return;
      }

      if (response.setup_required) {
        // Kurulum gerekli - DeviceSetup ekranına yönlendir
        console.log("[Gate] Setup required, redirecting to DeviceSetup...");
        setCheckingDevice(false);
        navigation.replace("DeviceSetup", {
          device: response.device,
          vehicle: response.vehicle,
        });
        return;
      }

      // Normal akış - dashboard göster
      console.log("[Gate] All good, showing dashboard");
      setCheckingDevice(false);
      setDeviceCheckDone(true);
    } catch (error) {
      console.log("[Gate] Error:", error.message);
      // Hata durumunda dashboard'ı göster (graceful degradation)
      setCheckingDevice(false);
      setDeviceCheckDone(true);
    }
  };

  // Fetch data on mount - deviceCheckDone olunca çalışsın
  useEffect(() => {
    if (deviceCheckDone) {
      fetchAllData();
    }
  }, [deviceCheckDone]);

  // Debug: show push token when ready
  useEffect(() => {
    if (expoPushToken) {
      console.log("🔔 Driver push token ready:", expoPushToken);
    }
  }, [expoPushToken]);

  const fetchAllData = async () => {
    try {
      setError(null);

      // Fetch all driver data in parallel
      const [statsData, tasksData, vehicleData] = await Promise.all([
        driverAPI.getStats().catch((err) => ({ stats: getDefaultStats() })),
        driverAPI.getTasks().catch((err) => ({ tasks: [] })),
        driverAPI.getVehicle().catch((err) => ({ vehicle: null })),
      ]);

      setStats(statsData.stats);
      setTasks(tasksData.tasks || []);
      setVehicle(vehicleData.vehicle);

      console.log("✅ Driver data loaded:", {
        stats: statsData.stats,
        taskCount: tasksData.tasks?.length,
      });
    } catch (error) {
      console.error("❌ Error fetching driver data:", error);
      setError("Veri yüklenirken hata oluştu");
      // Set default values on error
      setStats(getDefaultStats());
      setTasks([]);
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultStats = () => ({
    completed_tasks: 0,
    total_distance: 0,
    average_score: 0,
    fuel_efficiency: 0,
    active_tasks: 0,
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

  const handleTaskPress = (task) => {
    console.log("Task pressed:", task.id);
    // TODO: Navigate to TaskDetails
  };

  // 🆕 Device Check Loading
  if (checkingDevice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cihaz durumu kontrol ediliyor...</Text>
      </View>
    );
  }

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
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.userName}>
            {user?.first_name || user?.email?.split("@")[0] || "Sürücü"}
          </Text>
          <Text style={styles.role}>Sürücü</Text>
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

      {/* Task Offers Card - YENİ */}
      <TouchableOpacity
        style={styles.offersCard}
        onPress={() => navigation.navigate("MyTasks", { screen: "TaskOffers" })}
      >
        <View style={styles.offersContent}>
          <Text style={styles.offersIcon}>📬</Text>
          <View style={styles.offersText}>
            <Text style={styles.offersTitle}>Görev Teklifleri</Text>
            <Text style={styles.offersSubtitle}>
              Bekleyen teklifleri görüntüle
            </Text>
          </View>
          <Text style={styles.offersArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Vehicle Card */}
      {vehicle ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚙 Aracım</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {vehicle.fuelLevel !== undefined && vehicle.fuelCapacity
                  ? `${Math.round(
                      (vehicle.fuelLevel / vehicle.fuelCapacity) * 100
                    )}%`
                  : "0%"}
              </Text>
              <Text style={styles.statLabel}>Yakıt</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {vehicle.odometer
                  ? `${Math.round(vehicle.odometer)} km`
                  : "0 km"}
              </Text>
              <Text style={styles.statLabel}>Kilometre</Text>
            </View>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: vehicle.esp32Status?.connected
                      ? COLORS.success
                      : COLORS.danger,
                  },
                ]}
              >
                {vehicle.esp32Status?.connected ? "●" : "○"}
              </Text>
              <Text style={styles.statLabel}>ESP32</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚙 Aracım</Text>
          <Text style={styles.noDataText}>Atanmış araç bulunamadı</Text>
        </View>
      )}

      {/* Active Tasks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 Aktif Görevler ({tasks.length})</Text>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => handleTaskPress(task)}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>
                  {task.task_no || `Görev #${task.id}`}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        task.status === "in_progress"
                          ? COLORS.info
                          : COLORS.warning,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {task.status === "in_progress"
                      ? "Devam Ediyor"
                      : "Bekliyor"}
                  </Text>
                </View>
              </View>
              {task.vehicle_plate && (
                <Text style={styles.taskDescription}>
                  Araç: {task.vehicle_plate}
                </Text>
              )}
              {task.planned_start && (
                <Text style={styles.taskTime}>
                  Planlanan:{" "}
                  {new Date(task.planned_start).toLocaleString("tr-TR")}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>Aktif görev bulunmuyor</Text>
        )}
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Performans</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats.total_distance
                  ? Math.round(stats.total_distance).toLocaleString()
                  : "0"}
              </Text>
              <Text style={styles.statText}>Toplam KM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats.completed_tasks || 0}
              </Text>
              <Text style={styles.statText}>Tamamlanan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>
                {stats.average_score || 0}
              </Text>
              <Text style={styles.statText}>Skor</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {stats.fuel_efficiency || 0}
              </Text>
              <Text style={styles.statText}>L/100km</Text>
            </View>
          </View>
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
  // Task Offers Card Styles - YENİ
  offersCard: {
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
  offersContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  offersIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  offersText: {
    flex: 1,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  offersSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  offersArrow: {
    fontSize: 24,
    color: COLORS.white,
  },
  // Other styles
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
  vehicleInfo: {
    marginBottom: 16,
  },
  vehiclePlate: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  vehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default DriverDashboard;
