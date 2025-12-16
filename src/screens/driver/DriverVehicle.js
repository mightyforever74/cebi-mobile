// src/screens/driver/DriverVehicle.js
// TulipFleet - Sürücü Aracım Ekranı

import { Ionicons } from "@expo/vector-icons";
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
import { driverAPI } from "../../services/api";

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

const DriverVehicle = ({ navigation }) => {
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API'den araç bilgisini çek
  const fetchVehicle = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching driver vehicle...");

      const data = await driverAPI.getVehicle();
      console.log("✅ Driver vehicle loaded:", data);

      setVehicle(data.vehicle || data);
    } catch (err) {
      console.error("❌ Fetch vehicle error:", err);
      setError(err.message || "Araç bilgisi yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicle();
  }, []);

  // Yakıt seviyesi rengi
  const getFuelColor = (level) => {
    if (level >= 50) return COLORS.success;
    if (level >= 25) return COLORS.warning;
    return COLORS.danger;
  };

  // Info Card Component
  const InfoCard = ({ icon, iconColor, title, value, subtitle }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
      {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Hata durumu
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata Oluştu</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicle}>
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
        <Text style={styles.loadingText}>Araç bilgisi yükleniyor...</Text>
      </View>
    );
  }

  // Araç atanmamış
  if (!vehicle) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="car-outline" size={64} color={COLORS.muted} />
        <Text style={styles.emptyTitle}>Araç Atanmamış</Text>
        <Text style={styles.emptySubtitle}>
          Size henüz bir araç atanmamış. Yöneticinizle iletişime geçin.
        </Text>
      </View>
    );
  }

  const fuelLevel = vehicle.fuel_level || 0;
  const fuelColor = getFuelColor(fuelLevel);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Araç Kartı */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car-sport" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.plateNumber}>{vehicle.plate_no}</Text>
        <Text style={styles.vehicleModel}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.vehicleYear}>{vehicle.year}</Text>

        {/* ESP32 Durumu */}
        <View style={styles.connectionStatus}>
          <Ionicons
            name={vehicle.esp32_connected ? "wifi" : "wifi-outline"}
            size={16}
            color={vehicle.esp32_connected ? COLORS.success : COLORS.muted}
          />
          <Text
            style={[
              styles.connectionText,
              {
                color: vehicle.esp32_connected ? COLORS.success : COLORS.muted,
              },
            ]}
          >
            {vehicle.esp32_connected ? "Bağlı" : "Bağlantı Yok"}
          </Text>
        </View>
      </View>

      {/* Yakıt Göstergesi */}
      <View style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <Ionicons name="water" size={24} color={fuelColor} />
          <Text style={styles.fuelTitle}>Yakıt Seviyesi</Text>
        </View>
        <View style={styles.fuelBarContainer}>
          <View
            style={[
              styles.fuelBar,
              { width: `${fuelLevel}%`, backgroundColor: fuelColor },
            ]}
          />
        </View>
        <Text style={[styles.fuelPercentage, { color: fuelColor }]}>
          {fuelLevel}%
        </Text>
      </View>

      {/* Bilgi Kartları */}
      <View style={styles.infoGrid}>
        <InfoCard
          icon="speedometer"
          iconColor={COLORS.info}
          title="Kilometre"
          value={`${(
            vehicle.current_km ||
            vehicle.total_km ||
            0
          ).toLocaleString()}`}
          subtitle="km"
        />
        <InfoCard
          icon="calendar"
          iconColor={COLORS.primary}
          title="Model Yılı"
          value={vehicle.year || "-"}
        />
      </View>

      <View style={styles.infoGrid}>
        <InfoCard
          icon="color-palette"
          iconColor={COLORS.warning}
          title="Renk"
          value={vehicle.color || "-"}
        />
        <InfoCard
          icon="hardware-chip"
          iconColor={COLORS.success}
          title="ESP32"
          value={vehicle.esp32_device_id ? "Bağlı" : "Yok"}
          subtitle={vehicle.esp32_device_id?.substring(0, 8) || ""}
        />
      </View>

      {/* Detaylar */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Araç Detayları</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Plaka</Text>
          <Text style={styles.detailValue}>{vehicle.plate_no}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Marka</Text>
          <Text style={styles.detailValue}>{vehicle.brand || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Model</Text>
          <Text style={styles.detailValue}>{vehicle.model || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Yıl</Text>
          <Text style={styles.detailValue}>{vehicle.year || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Durum</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.success }]}
          >
            <Text style={styles.statusText}>{vehicle.status || "Aktif"}</Text>
          </View>
        </View>

        {vehicle.esp32_device_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ESP32 ID</Text>
            <Text style={styles.detailValue}>{vehicle.esp32_device_id}</Text>
          </View>
        )}
      </View>

      {/* Spacer */}
      <View style={{ height: 30 }} />
    </ScrollView>
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

  // Vehicle Card
  vehicleCard: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  vehicleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  plateNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 2,
  },
  vehicleModel: {
    fontSize: 18,
    color: "rgba(255,255,255,0.9)",
    marginTop: 8,
  },
  vehicleYear: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },

  // Fuel Card
  fuelCard: {
    backgroundColor: COLORS.white,
    margin: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fuelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  fuelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginLeft: 8,
  },
  fuelBarContainer: {
    height: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: "hidden",
  },
  fuelBar: {
    height: "100%",
    borderRadius: 6,
  },
  fuelPercentage: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },

  // Info Grid
  infoGrid: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  infoSubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Details Card
  detailsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.secondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },

  // Empty & Error States
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

export default DriverVehicle;
