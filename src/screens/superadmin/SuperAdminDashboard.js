// src/screens/superadmin/SuperAdminDashboard.js
// Updated: 26 Aralık 2025 - Cihaz Yönetimi Eklendi

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const SuperAdminDashboard = ({ navigation }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    totalDevices: 0,
    onlineDevices: 0,
  });
  const [companies, setCompanies] = useState([]);

  const fetchData = async () => {
    try {
      // Şirket verileri
      const companiesResponse = await fetch(
        `${API_URL}/api/superadmin/companies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (companiesResponse.ok) {
        const data = await companiesResponse.json();
        setCompanies(data.companies || []);

        const totalVehicles =
          data.companies?.reduce((sum, c) => sum + (c.vehicle_count || 0), 0) ||
          0;
        const totalDrivers =
          data.companies?.reduce((sum, c) => sum + (c.driver_count || 0), 0) ||
          0;
        const totalUsers =
          data.companies?.reduce((sum, c) => sum + (c.user_count || 0), 0) || 0;

        setStats((prev) => ({
          ...prev,
          totalCompanies: data.companies?.length || 0,
          totalUsers,
          totalVehicles,
          totalDrivers,
        }));
      }

      // Cihaz verileri
      try {
        const devicesResponse = await fetch(
          `${API_URL}/api/superadmin/devices`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (devicesResponse.ok) {
          const deviceData = await devicesResponse.json();
          setStats((prev) => ({
            ...prev,
            totalDevices: deviceData.stats?.total || 0,
            onlineDevices: deviceData.stats?.online_now || 0,
          }));
        }
      } catch (deviceError) {
        console.log("Device stats not available yet");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Hata", "Veriler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
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
        <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
        <Text style={styles.userName}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Super Admin</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: "#5E72E4" }]}>
          <Text style={styles.statNumber}>{stats.totalCompanies}</Text>
          <Text style={styles.statLabel}>Şirket</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#2DCE89" }]}>
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Kullanıcı</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#FB6340" }]}>
          <Text style={styles.statNumber}>{stats.totalVehicles}</Text>
          <Text style={styles.statLabel}>Araç</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#11CDEF" }]}>
          <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
          <Text style={styles.statLabel}>Sürücü</Text>
        </View>
      </View>

      {/* Device Stats - YENİ */}
      {stats.totalDevices > 0 && (
        <TouchableOpacity
          style={styles.deviceStatsCard}
          onPress={() => navigation.navigate("Devices")}
        >
          <View style={styles.deviceStatsContent}>
            <Ionicons name="hardware-chip" size={32} color="#5E72E4" />
            <View style={styles.deviceStatsInfo}>
              <Text style={styles.deviceStatsTitle}>ESP32 Cihazlar</Text>
              <Text style={styles.deviceStatsSubtitle}>
                {stats.onlineDevices} / {stats.totalDevices} online
              </Text>
            </View>
          </View>
          <View style={styles.deviceOnlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{stats.onlineDevices} Online</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Companies")}
          >
            <Ionicons name="business" size={28} color="#5E72E4" />
            <Text style={styles.actionText}>Şirketler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("CreateCompany")}
          >
            <Ionicons name="add-circle" size={28} color="#2DCE89" />
            <Text style={styles.actionText}>Yeni Şirket</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("Devices")}
          >
            <Ionicons name="hardware-chip" size={28} color="#FB6340" />
            <Text style={styles.actionText}>Cihazlar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("PlatformUsers")}
          >
            <Ionicons name="people" size={28} color="#11CDEF" />
            <Text style={styles.actionText}>Kullanıcılar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Companies */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Son Şirketler</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Companies")}>
            <Text style={styles.seeAllText}>Tümünü Gör →</Text>
          </TouchableOpacity>
        </View>

        {companies.slice(0, 5).map((company, index) => (
          <TouchableOpacity
            key={company.id || index}
            style={styles.companyCard}
            onPress={() => navigation.navigate("CompanyDetail", { company })}
          >
            <View style={styles.companyIcon}>
              <Ionicons name="business" size={20} color="#FFF" />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyStats}>
                {company.vehicle_count || 0} araç • {company.driver_count || 0}{" "}
                sürücü
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8898AA" />
          </TouchableOpacity>
        ))}

        {companies.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#DEE2E6" />
            <Text style={styles.emptyText}>Henüz şirket yok</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CreateCompany")}
            >
              <Text style={styles.emptyButtonText}>İlk Şirketi Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>TulipFleet Super Admin Panel v1.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F5F7",
  },
  loadingText: {
    marginTop: 10,
    color: "#8898AA",
  },
  header: {
    backgroundColor: "#F5365C",
    padding: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  welcomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  userName: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 5,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    marginTop: -20,
  },
  statCard: {
    width: "46%",
    margin: "2%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    marginTop: 5,
  },

  // Device Stats Card - YENİ
  deviceStatsCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deviceStatsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceStatsInfo: {
    marginLeft: 12,
  },
  deviceStatsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
  },
  deviceStatsSubtitle: {
    fontSize: 13,
    color: "#8898AA",
    marginTop: 2,
  },
  deviceOnlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8FFF3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2DCE89",
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2DCE89",
  },

  section: {
    backgroundColor: "#FFF",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 15,
  },
  seeAllText: {
    color: "#5E72E4",
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    backgroundColor: "#F6F9FC",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  actionText: {
    color: "#32325D",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F6F9FC",
    borderRadius: 10,
    marginBottom: 10,
  },
  companyIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: "#5E72E4",
    justifyContent: "center",
    alignItems: "center",
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#32325D",
  },
  companyStats: {
    fontSize: 12,
    color: "#8898AA",
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    color: "#8898AA",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 15,
  },
  emptyButton: {
    backgroundColor: "#5E72E4",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#8898AA",
    fontSize: 12,
  },
});

export default SuperAdminDashboard;
