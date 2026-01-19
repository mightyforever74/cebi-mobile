// src/screens/driver/DriverVehicle.js
// TulipFleet - Sürücü Aracım Ekranı
// Updated: 17 Ocak 2026 - Full i18n Support

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicle = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching driver vehicle...");
      const data = await driverAPI.getVehicle();
      console.log("✅ Driver vehicle loaded:", data);
      setVehicle(data.vehicle || data);
    } catch (err) {
      console.error("❌ Fetch vehicle error:", err);
      setError(err.message || t("vehicle.couldNotLoad"));
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

  const getFuelColor = (level) => {
    if (level >= 50) return COLORS.success;
    if (level >= 25) return COLORS.warning;
    return COLORS.danger;
  };

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

  // Error state
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>{t("vehicle.errorOccurred")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicle}>
          <Text style={styles.retryButtonText}>{t("vehicle.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("vehicle.loading")}</Text>
      </View>
    );
  }

  // No vehicle assigned
  if (!vehicle) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="car-outline" size={64} color={COLORS.muted} />
        <Text style={styles.emptyTitle}>{t("vehicle.notAssigned")}</Text>
        <Text style={styles.emptySubtitle}>
          {t("vehicle.notAssignedMessage")}
        </Text>
      </View>
    );
  }

  const fuelLevel = vehicle.fuel_level ?? vehicle.fuelLevel ?? 0;
  const fuelCapacity = vehicle.fuel_capacity ?? vehicle.fuelCapacity ?? 100;
  const safeCapacity = fuelCapacity > 0 ? fuelCapacity : 100;
  const fuelPercent = Math.min(
    100,
    Math.max(0, (fuelLevel / safeCapacity) * 100)
  );
  const fuelColor = getFuelColor(fuelPercent);

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
      {/* Vehicle Card */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car-sport" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.plateNumber}>{vehicle.plate_no}</Text>
        <Text style={styles.vehicleModel}>
          {vehicle.brand} {vehicle.model}
        </Text>
        <Text style={styles.vehicleYear}>{vehicle.year}</Text>
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
            {vehicle.esp32_connected
              ? t("vehicle.connected")
              : t("vehicle.noConnection")}
          </Text>
        </View>
      </View>

      {/* Fuel Card */}
      <View style={styles.fuelCard}>
        <View style={styles.fuelHeader}>
          <Ionicons name="water" size={24} color={fuelColor} />
          <Text style={styles.fuelTitle}>{t("vehicle.fuelLevel")}</Text>
        </View>
        <View style={styles.fuelBarContainer}>
          <View
            style={[
              styles.fuelBar,
              {
                width: `${Math.round(fuelPercent)}%`,
                backgroundColor: fuelColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.fuelPercentage, { color: fuelColor }]}>
          {Math.round(fuelLevel)} L
        </Text>
      </View>

      {/* Info Cards */}
      <View style={styles.infoGrid}>
        <InfoCard
          icon="speedometer"
          iconColor={COLORS.info}
          title={t("vehicle.mileage")}
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
          title={t("vehicle.modelYear")}
          value={vehicle.year || "-"}
        />
      </View>

      <View style={styles.infoGrid}>
        <InfoCard
          icon="color-palette"
          iconColor={COLORS.warning}
          title={t("vehicle.color")}
          value={vehicle.color || "-"}
        />
        <InfoCard
          icon="hardware-chip"
          iconColor={COLORS.success}
          title={t("vehicle.esp32")}
          value={
            vehicle.esp32_device_id ? t("vehicle.connected") : t("vehicle.none")
          }
          subtitle={vehicle.esp32_device_id?.substring(0, 8) || ""}
        />
      </View>

      {/* Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>{t("vehicle.vehicleDetails")}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.plate")}</Text>
          <Text style={styles.detailValue}>{vehicle.plate_no}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.brand")}</Text>
          <Text style={styles.detailValue}>{vehicle.brand || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.model")}</Text>
          <Text style={styles.detailValue}>{vehicle.model || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.year")}</Text>
          <Text style={styles.detailValue}>{vehicle.year || "-"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.status")}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.success }]}
          >
            <Text style={styles.statusText}>
              {vehicle.status || t("vehicle.active")}
            </Text>
          </View>
        </View>

        {vehicle.esp32_device_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ESP32 ID</Text>
            <Text style={styles.detailValue}>{vehicle.esp32_device_id}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
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
  vehicleModel: { fontSize: 18, color: "rgba(255,255,255,0.9)", marginTop: 8 },
  vehicleYear: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectionText: { fontSize: 12, fontWeight: "600", marginLeft: 6 },
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
  fuelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
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
  fuelBar: { height: "100%", borderRadius: 6 },
  fuelPercentage: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },
  infoGrid: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 12 },
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
  infoTitle: { fontSize: 12, color: COLORS.secondary, marginBottom: 4 },
  infoValue: { fontSize: 18, fontWeight: "bold", color: COLORS.dark },
  infoSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
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
  detailLabel: { fontSize: 14, color: COLORS.secondary },
  detailValue: { fontSize: 14, fontWeight: "500", color: COLORS.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: "600" },
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
  errorText: { fontSize: 14, color: COLORS.secondary, marginTop: 8 },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: { color: COLORS.white, fontWeight: "600" },
  loadingText: { marginTop: 12, color: COLORS.secondary },
});

export default DriverVehicle;
