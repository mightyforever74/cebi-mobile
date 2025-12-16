// src/screens/admin/AdminVehicles.js
// TulipFleet - Admin Araç Listesi Ekranı

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
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
import { vehicleAPI } from "../../services/api";

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

// Araç durumu renkleri
const STATUS_COLORS = {
  active: COLORS.success,
  available: COLORS.success, // ← Eklendi
  inactive: COLORS.secondary,
  maintenance: COLORS.warning,
  offline: COLORS.danger,
};

// Araç durumu Türkçe karşılıkları
const STATUS_LABELS = {
  active: "Aktif",
  available: "Müsait", // ← Eklendi
  inactive: "Pasif",
  maintenance: "Bakımda",
  offline: "Çevrimdışı",
};

const AdminVehicles = ({ navigation }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API'den araçları çek
  const fetchVehicles = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching vehicles...");

      const data = await vehicleAPI.getList();
      console.log("✅ Vehicles loaded:", data);

      // API response format'ına göre ayarla
      const vehicleList = data.vehicles || data || [];
      setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
    } catch (err) {
      console.error("❌ Fetch vehicles error:", err);
      setError(err.message || "Araçlar yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useFocusEffect(
    React.useCallback(() => {
      fetchVehicles();
    }, [])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, []);

  // Araç kartı
  const renderVehicleCard = ({ item: vehicle }) => {
    const status = vehicle.status || "inactive";
    const statusColor = STATUS_COLORS[status] || COLORS.secondary;
    const statusLabel = STATUS_LABELS[status] || status;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "🚗 " + vehicle.plate_no,
            `Marka: ${vehicle.brand || "-"}\nModel: ${
              vehicle.model || "-"
            }\nYıl: ${vehicle.year || "-"}\nDurum: ${statusLabel}`,
            [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
        {/* Üst Kısım - Plaka ve Durum */}
        <View style={styles.cardHeader}>
          <View style={styles.plateContainer}>
            <Ionicons name="car" size={24} color={COLORS.primary} />
            {/* Değiştirilen kısım: plateRow içine deleteButton eklendi */}
            <View style={styles.plateRow}>
              <Text style={styles.plateText}>{vehicle.plate_no}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditVehicle", { vehicle })}
              >
                <Ionicons name="pencil" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVehicle(vehicle)}
              >
                <Ionicons name="trash-outline" size={18} color="#F5365C" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Orta Kısım - Araç Bilgileri */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="construct" size={16} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              {vehicle.brand || "Marka"} {vehicle.model || "Model"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={COLORS.secondary} />
            <Text style={styles.infoText}>{vehicle.year || "-"}</Text>
          </View>

          {vehicle.esp32_device_id && (
            <View style={styles.infoRow}>
              <Ionicons name="hardware-chip" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>
                ESP32: {vehicle.esp32_device_id.substring(0, 12)}...
              </Text>
            </View>
          )}
        </View>

        {/* Alt Kısım - Metrikler */}
        <View style={styles.cardFooter}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {vehicle.total_km?.toLocaleString() ||
                vehicle.current_km?.toLocaleString() ||
                "0"}
            </Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Text style={styles.metricValue}>{vehicle.fuel_level || "0"}%</Text>
            <Text style={styles.metricLabel}>Yakıt</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Ionicons
              name={vehicle.esp32_connected ? "wifi" : "wifi-outline"}
              size={20}
              color={vehicle.esp32_connected ? COLORS.success : COLORS.muted}
            />
            <Text style={styles.metricLabel}>ESP32</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Araç Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz kayıtlı araç yok veya yetkiniz dahilinde araç bulunmuyor.
      </Text>
    </View>
  );

  // Hata durumu
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata Oluştu</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicles}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  const handleAddVehicle = () => {
    navigation.navigate("CreateVehicle");
  };

  // Silme işlemi
  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      "🗑️ Aracı Sil",
      `"${vehicle.plate_no}" plakalı aracı silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await vehicleAPI.delete(vehicle.id);
              Alert.alert("✅ Başarılı", "Araç silindi");
              fetchVehicles();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Araç silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{vehicles.length}</Text>
          <Text style={styles.statLabel}>Toplam Araç</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {
              vehicles.filter(
                (v) => v.status === "active" || v.status === "available"
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>
            {vehicles.filter((v) => v.status === "maintenance").length}
          </Text>
          <Text style={styles.statLabel}>Bakımda</Text>
        </View>
      </View>

      {/* Araç Listesi */}
      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item.id?.toString() || item.plate_no}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Yeni Araç Ekle */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddVehicle} // ← navigate to CreateVehicle
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
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

  // Stats Header
  statsHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },

  // List
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  plateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  plateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 8, // keep spacing from car icon
    gap: 8,
    minWidth: 140,
  },
  plateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight || "#E8F4FD",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEECEC",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },

  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: 8,
  },

  cardFooter: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: COLORS.muted,
    marginHorizontal: 8,
  },

  // Empty State
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
    paddingHorizontal: 40,
  },

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
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

  // Loading
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 14,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});

export default AdminVehicles;
