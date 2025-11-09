// src/screens/admin/AdminDashboard.js
// TulipFleet - Admin Dashboard (Mock Data)

import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { MOCK_ADMIN_DATA } from "../../services/mockData";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [adminData, setAdminData] = useState(MOCK_ADMIN_DATA);

  useEffect(() => {
    console.log("📊 AdminDashboard mounted for:", user?.firstName);
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Mock refresh
    setTimeout(() => {
      setAdminData(MOCK_ADMIN_DATA);
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ Çıkış yapıldı");
    }
  };

  const { fleetStats, vehicles, drivers, recentActivities, alerts } = adminData;

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
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.role}>Yönetici</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Fleet İstatistikleri */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Filo Özeti</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{fleetStats.totalVehicles}</Text>
            <Text style={styles.statLabel}>Toplam Araç</Text>
            <Text style={styles.statSubtext}>
              {fleetStats.activeVehicles} aktif
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{fleetStats.totalDrivers}</Text>
            <Text style={styles.statLabel}>Toplam Sürücü</Text>
            <Text style={styles.statSubtext}>
              {fleetStats.activeDrivers} görevde
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.info }]}>
              {fleetStats.activeTasks}
            </Text>
            <Text style={styles.statLabel}>Aktif Görev</Text>
            <Text style={styles.statSubtext}>
              {fleetStats.pendingTasks} beklemede
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {fleetStats.completedTasksToday}
            </Text>
            <Text style={styles.statLabel}>Bugün Tamamlanan</Text>
            <Text style={styles.statSubtext}>görev</Text>
          </View>
        </View>
      </View>

      {/* Araçlar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚐 Araçlar ({vehicles.length})</Text>
        {vehicles.map((vehicle) => (
          <View key={vehicle.id} style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <View>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                <Text style={styles.vehicleModel}>{vehicle.model}</Text>
              </View>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor:
                      vehicle.status === "ACTIVE"
                        ? COLORS.success
                        : vehicle.status === "MAINTENANCE"
                        ? COLORS.warning
                        : COLORS.textSecondary,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {vehicle.status === "ACTIVE"
                    ? "Aktif"
                    : vehicle.status === "MAINTENANCE"
                    ? "Bakımda"
                    : "Pasif"}
                </Text>
              </View>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.infoText}>
                👤 {vehicle.driver || "Atanmamış"}
              </Text>
              <Text style={styles.infoText}>⛽ %{vehicle.fuelLevel}</Text>
            </View>
            <Text style={styles.lastUpdate}>
              Son güncelleme:{" "}
              {new Date(vehicle.lastUpdate).toLocaleString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ))}
      </View>

      {/* Sürücüler */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👥 Sürücüler ({drivers.length})</Text>
        {drivers.map((driver) => (
          <View key={driver.id} style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverPhone}>{driver.phone}</Text>
              </View>
              <View style={styles.driverStats}>
                <Text style={styles.driverScore}>⭐ {driver.score}</Text>
                <Text style={styles.driverTasks}>
                  {driver.totalTasks} görev
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.driverStatusBadge,
                {
                  backgroundColor:
                    driver.status === "ACTIVE"
                      ? COLORS.success
                      : driver.status === "AVAILABLE"
                      ? COLORS.info
                      : COLORS.textSecondary,
                },
              ]}
            >
              <Text style={styles.driverStatusText}>
                {driver.status === "ACTIVE"
                  ? `📍 ${driver.currentTask}`
                  : driver.status === "AVAILABLE"
                  ? "✅ Müsait"
                  : "💤 Mesai Dışı"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Son Aktiviteler */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🕐 Son Aktiviteler</Text>
        {recentActivities.map((activity) => (
          <View key={activity.id} style={styles.activityCard}>
            <View
              style={[
                styles.activityIcon,
                {
                  backgroundColor:
                    activity.type === "TASK_COMPLETED"
                      ? COLORS.success
                      : activity.type === "ALERT"
                      ? COLORS.warning
                      : COLORS.info,
                },
              ]}
            >
              <Text style={styles.activityIconText}>
                {activity.type === "TASK_COMPLETED"
                  ? "✓"
                  : activity.type === "ALERT"
                  ? "!"
                  : "🔧"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.activityMessage}>{activity.message}</Text>
              <Text style={styles.activityTime}>
                {new Date(activity.timestamp).toLocaleString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Uyarılar */}
      {alerts.filter((a) => !a.acknowledged).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Bekleyen Uyarılar</Text>
          {alerts
            .filter((a) => !a.acknowledged)
            .map((alert) => (
              <View
                key={alert.id}
                style={[
                  styles.alertCard,
                  {
                    borderLeftColor:
                      alert.severity === "high"
                        ? COLORS.danger
                        : COLORS.warning,
                  },
                ]}
              >
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertVehicle}>
                  Araç:{" "}
                  {vehicles.find((v) => v.id === alert.vehicleId)?.plate ||
                    "Bilinmiyor"}
                </Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleString("tr-TR")}
                </Text>
                <TouchableOpacity style={styles.acknowledgeButton}>
                  <Text style={styles.acknowledgeText}>Onayla</Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}

      {/* Demo Bilgi */}
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>✅ Mock Login Aktif (Admin)</Text>
        <Text style={styles.demoText}>
          Bu ekran mock admin data ile çalışmaktadır.{"\n"}
          Backend bağlantısı sonraki fazda eklenecektir.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 4,
    fontWeight: "600",
  },
  statSubtext: {
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
    alignItems: "center",
    marginBottom: 8,
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
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  vehicleInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },
  lastUpdate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  driverCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  driverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  driverPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverStats: {
    alignItems: "flex-end",
  },
  driverScore: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.success,
  },
  driverTasks: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  driverStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  driverStatusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "500",
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityIconText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  activityMessage: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  alertCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  alertVehicle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  acknowledgeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  acknowledgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  demoCard: {
    backgroundColor: "#FFF3CD",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE69C",
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: "#856404",
    lineHeight: 20,
  },
});

export default AdminDashboard;
