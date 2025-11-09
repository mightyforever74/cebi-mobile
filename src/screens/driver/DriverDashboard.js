// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard (Mock Data)

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
import { MOCK_DRIVER_DATA } from "../../services/mockData";

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [driverData, setDriverData] = useState(MOCK_DRIVER_DATA);

  useEffect(() => {
    console.log("📊 DriverDashboard mounted for:", user?.firstName);
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Mock refresh - gerçek uygulamada API çağrısı yapılacak
    setTimeout(() => {
      setDriverData(MOCK_DRIVER_DATA);
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ Çıkış yapıldı");
    }
  };

  const { activeTasks, vehicle, stats, recentAlerts } = driverData;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header - Hoş Geldin */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.role}>Sürücü</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      {/* Araç Kartı */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚐 Aracım</Text>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
          <Text style={styles.vehicleModel}>
            {vehicle.model} ({vehicle.year})
          </Text>
        </View>
        <View style={styles.row}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{vehicle.fuelLevel}%</Text>
            <Text style={styles.statLabel}>Yakıt</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{vehicle.odometer} km</Text>
            <Text style={styles.statLabel}>Kilometre</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[
                styles.statValue,
                {
                  color: vehicle.esp32Status.connected
                    ? COLORS.success
                    : COLORS.danger,
                },
              ]}
            >
              {vehicle.esp32Status.connected ? "●" : "○"}
            </Text>
            <Text style={styles.statLabel}>ESP32</Text>
          </View>
        </View>
      </View>

      {/* Aktif Görevler */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          📋 Aktif Görevler ({activeTasks.length})
        </Text>
        {activeTasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      task.status === "IN_PROGRESS"
                        ? COLORS.info
                        : COLORS.warning,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {task.status === "IN_PROGRESS" ? "Devam Ediyor" : "Bekliyor"}
                </Text>
              </View>
            </View>
            <Text style={styles.taskDescription}>{task.description}</Text>
            <View style={styles.taskProgress}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${task.completionPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              %{task.completionPercentage} tamamlandı
            </Text>
          </View>
        ))}
      </View>

      {/* İstatistikler */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Performans</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {stats.totalDistance.toLocaleString()}
            </Text>
            <Text style={styles.statText}>Toplam KM</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.completedTasks}</Text>
            <Text style={styles.statText}>Tamamlanan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.averageScore}
            </Text>
            <Text style={styles.statText}>Skor</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.fuelEfficiency}</Text>
            <Text style={styles.statText}>L/100km</Text>
          </View>
        </View>
      </View>

      {/* Son Uyarılar */}
      {recentAlerts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⚠️ Son Uyarılar</Text>
          {recentAlerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                {
                  borderLeftColor:
                    alert.severity === "warning" ? COLORS.warning : COLORS.info,
                },
              ]}
            >
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleString("tr-TR")}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Demo Bilgi */}
      <View style={styles.demoCard}>
        <Text style={styles.demoTitle}>✅ Mock Login Aktif</Text>
        <Text style={styles.demoText}>
          Bu ekran mock data ile çalışmaktadır.{"\n"}
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
    marginBottom: 8,
  },
  taskProgress: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.success,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
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
  alertCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  demoCard: {
    backgroundColor: "#D1ECF1",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BEE5EB",
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0C5460",
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: "#0C5460",
    lineHeight: 20,
  },
});

export default DriverDashboard;
