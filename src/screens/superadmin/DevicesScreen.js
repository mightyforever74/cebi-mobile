// src/screens/superadmin/DevicesScreen.js
// TulipFleet - ESP32 Cihaz Yönetimi
// Updated: 26 Aralık 2025 - Token from AuthContext

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const DevicesScreen = ({ navigation }) => {
  const { token } = useAuth(); // Artık çalışıyor!
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchDevices = async () => {
    try {
      console.log("🔑 Token exists:", !!token);

      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      const params = filter !== "all" ? `?status=${filter}` : "";
      console.log("📡 Fetching:", `${API_URL}/api/superadmin/devices${params}`);

      const response = await fetch(
        `${API_URL}/api/superadmin/devices${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📦 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Devices loaded:", data.devices?.length || 0);
        setDevices(data.devices || []);
        setStats(data.stats || {});
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, errorData);
        Alert.alert("Hata", errorData.error || "Cihazlar yüklenemedi");
      }
    } catch (error) {
      console.error("❌ Fetch devices error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices();
  }, [filter]);

  // Filtrelenmiş cihazlar
  const filteredDevices = devices.filter((device) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      device.device_code?.toLowerCase().includes(query) ||
      device.mac_address?.toLowerCase().includes(query) ||
      device.company_name?.toLowerCase().includes(query) ||
      device.vehicle_plate?.toLowerCase().includes(query)
    );
  });

  // Durum rengi
  const getStatusColor = (status, isOnline) => {
    if (isOnline) return "#2DCE89";
    switch (status) {
      case "active":
        return "#11CDEF";
      case "pending":
        return "#FB6340";
      case "faulty":
        return "#F5365C";
      default:
        return "#8898AA";
    }
  };

  // Zaman farkı
  const getTimeDifference = (dateStr) => {
    if (!dateStr) return "Hiç görülmedi";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  // İstatistik kartı
  const StatCard = ({ title, value, color, filterKey }) => (
    <TouchableOpacity
      style={[styles.statCard, filter === filterKey && styles.statCardActive]}
      onPress={() => setFilter(filterKey)}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </TouchableOpacity>
  );

  // Cihaz kartı
  const renderDeviceItem = ({ item }) => {
    const statusColor = getStatusColor(item.status, item.is_online);

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => navigation.navigate("DeviceDetail", { device: item })}
      >
        {/* Sol renk çubuğu */}
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

        <View style={styles.deviceContent}>
          {/* Header */}
          <View style={styles.deviceHeader}>
            <View style={styles.deviceCodeContainer}>
              <Ionicons name="hardware-chip" size={20} color={statusColor} />
              <Text style={styles.deviceCode}>{item.device_code}</Text>
              {item.is_online && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineText}>ONLINE</Text>
                </View>
              )}
            </View>
            <Text style={styles.firmwareVersion}>
              v{item.firmware_version || "?"}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.deviceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MAC:</Text>
              <Text style={styles.infoValue}>{item.mac_address || "-"}</Text>
            </View>

            {item.company_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Şirket:</Text>
                <Text style={[styles.infoValue, { color: "#5E72E4" }]}>
                  {item.company_name}
                </Text>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <Ionicons name="alert-circle" size={14} color="#FB6340" />
                <Text
                  style={[
                    styles.infoValue,
                    { color: "#FB6340", marginLeft: 4 },
                  ]}
                >
                  Atanmamış
                </Text>
              </View>
            )}

            {item.vehicle_plate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Araç:</Text>
                <Text style={[styles.infoValue, { color: "#2DCE89" }]}>
                  {item.vehicle_plate}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Son görülme:</Text>
              <Text style={styles.infoValue}>
                {getTimeDifference(item.last_seen_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={styles.loadingText}>Cihazlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Toplam"
          value={stats.total || 0}
          color="#5E72E4"
          filterKey="all"
        />
        <StatCard
          title="Online"
          value={stats.online_now || 0}
          color="#2DCE89"
          filterKey="active"
        />
        <StatCard
          title="Bekleyen"
          value={stats.pending || 0}
          color="#FB6340"
          filterKey="pending"
        />
        <StatCard
          title="Arızalı"
          value={stats.faulty || 0}
          color="#F5365C"
          filterKey="faulty"
        />
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#8898AA" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cihaz kodu, MAC, şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8898AA"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#8898AA" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre butonları */}
      <View style={styles.filterContainer}>
        {[
          { key: "all", label: "Tümü" },
          { key: "active", label: "Aktif" },
          { key: "pending", label: "Bekleyen" },
          { key: "offline", label: "Offline" },
          { key: "faulty", label: "Arızalı" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Özet */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filteredDevices.length} cihaz {filter !== "all" && `(${filter})`}
        </Text>
      </View>

      {/* Cihaz Listesi */}
      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => item.id}
        renderItem={renderDeviceItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="hardware-chip-outline" size={64} color="#DEE2E6" />
            <Text style={styles.emptyTitle}>Cihaz Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Arama kriterlerine uygun cihaz yok"
                : filter !== "all"
                ? `${filter} durumunda cihaz yok`
                : "ESP32 cihazlar otomatik olarak kaydedilir"}
            </Text>
          </View>
        }
      />
    </View>
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
  },
  loadingText: {
    marginTop: 10,
    color: "#8898AA",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 5,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: "#5E72E4",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#32325D",
  },

  // Filter
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFF",
    marginRight: 8,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: "#5E72E4",
  },
  filterText: {
    fontSize: 12,
    color: "#8898AA",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFF",
  },

  // Summary
  summaryBar: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  summaryText: {
    color: "#8898AA",
    fontSize: 13,
  },

  // Device Card
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  deviceCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusBar: {
    width: 4,
  },
  deviceContent: {
    flex: 1,
    padding: 15,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  deviceCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
    marginLeft: 8,
  },
  onlineBadge: {
    backgroundColor: "#2DCE89",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  onlineText: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "700",
  },
  firmwareVersion: {
    fontSize: 11,
    color: "#8898AA",
    backgroundColor: "#F6F9FC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deviceInfo: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#8898AA",
    width: 80,
  },
  infoValue: {
    fontSize: 12,
    color: "#525F7F",
    flex: 1,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    padding: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    color: "#8898AA",
    textAlign: "center",
  },
});

export default DevicesScreen;
