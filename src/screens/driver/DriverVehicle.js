// src/screens/driver/DriverVehicle.js
// TulipFleet - Sürücü Aracım Ekranı
// Updated: 05 Mart 2026 - Dark Mode Migration

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
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI, fuelAPI } from "../../services/api";

// ❌ KALDIRILDI: Local COLORS objesi

// Yakıt tipi çevirileri
const FUEL_TYPE_LABELS = {
  diesel: {
    tr: "Dizel",
    en: "Diesel",
    bg: "Дизел",
    es: "Diésel",
    it: "Diesel",
    nl: "Diesel",
    ku: "Dîzel",
  },
  gasoline: {
    tr: "Benzin",
    en: "Gasoline",
    bg: "Бензин",
    es: "Gasolina",
    it: "Benzina",
    nl: "Benzine",
    ku: "Benzîn",
  },
  lpg: {
    tr: "LPG",
    en: "LPG",
    bg: "Газ",
    es: "GLP",
    it: "GPL",
    nl: "LPG",
    ku: "LPG",
  },
  electric: {
    tr: "Elektrik",
    en: "Electric",
    bg: "Електричество",
    es: "Eléctrico",
    it: "Elettrico",
    nl: "Elektrisch",
    ku: "Elektrîk",
  },
};

// ============================================
// makeStyles - BÜYÜK HARF TOKEN'LAR
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: 20,
    },
    vehicleCard: {
      alignItems: "center",
      paddingVertical: 30,
      paddingHorizontal: 20,
      backgroundColor: COLORS.PRIMARY,
    },
    vehicleIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: COLORS.WHITE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    plateNumber: {
      fontSize: 28,
      fontWeight: "bold",
      color: COLORS.WHITE,
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
      backgroundColor: COLORS.CARD,
      margin: 12,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
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
      color: COLORS.TEXT,
      marginLeft: 8,
      flex: 1,
    },
    fuelType: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      backgroundColor: COLORS.BACKGROUND,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    fuelBarContainer: {
      height: 12,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: 6,
      overflow: "hidden",
    },
    fuelBar: {
      height: "100%",
      borderRadius: 6,
    },
    fuelValues: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
    },
    fuelPercentage: {
      fontSize: 20,
      fontWeight: "bold",
    },
    fuelPercentText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: "600",
    },
    // Info Grid
    infoGrid: {
      flexDirection: "row",
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    infoCard: {
      flex: 1,
      backgroundColor: COLORS.CARD,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 4,
      alignItems: "center",
      shadowColor: COLORS.SHADOW,
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
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 4,
    },
    infoValueRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    infoValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    infoSubtitle: {
      fontSize: 11,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    // Details Card
    detailsCard: {
      backgroundColor: COLORS.CARD,
      marginHorizontal: 12,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    detailsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    detailLabel: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "500",
      color: COLORS.TEXT,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: 12,
      fontWeight: "600",
    },
    // Empty/Error States
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: 8,
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.ERROR,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 8,
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },
    loadingText: {
      marginTop: 12,
      color: COLORS.TEXT_SECONDARY,
    },
  });

// ============================================
// COMPONENT
// ============================================
const DriverVehicle = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  const currentLang = i18n.language || "tr";

  const [vehicle, setVehicle] = useState(null);
  const [lastFuelRecord, setLastFuelRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchVehicle = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching driver vehicle...");
      const data = await driverAPI.getVehicle();
      console.log("✅ Driver vehicle loaded:", data);
      const veh = data.vehicle || data;
      setVehicle(veh);

      // Son yakıt kaydını al (KM için)
      if (veh?.id) {
        try {
          const fuelData = await fuelAPI.getLastRecord(veh.id);
          if (fuelData?.record) {
            setLastFuelRecord(fuelData.record);
          }
        } catch (fuelErr) {
          console.log("No fuel record found");
        }
      }
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

  // Yakıt tipi label
  const getFuelTypeLabel = (fuelType) => {
    const labels = FUEL_TYPE_LABELS[fuelType];
    if (labels) {
      return labels[currentLang] || labels.en || fuelType;
    }
    return fuelType || "-";
  };

  const getFuelColor = (percent) => {
    if (percent >= 50) return COLORS.SUCCESS;
    if (percent >= 25) return COLORS.WARNING;
    return COLORS.ERROR;
  };

  // Info Card Component
  const InfoCard = ({ icon, iconColor, title, value, subtitle }) => (
    <View style={styles.infoCard}>
      <View style={[styles.infoIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Error state
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
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
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("vehicle.loading")}</Text>
      </View>
    );
  }

  // No vehicle assigned
  if (!vehicle) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="car-outline" size={64} color={COLORS.MUTED} />
        <Text style={styles.emptyTitle}>{t("vehicle.notAssigned")}</Text>
        <Text style={styles.emptySubtitle}>
          {t("vehicle.notAssignedMessage")}
        </Text>
      </View>
    );
  }

  // Hesaplamalar
  const fuelLevel = parseFloat(vehicle.current_fuel_level) || 0;
  const fuelCapacity = parseFloat(vehicle.fuel_capacity) || 60;
  const fuelPercent = Math.min(
    100,
    Math.max(0, (fuelLevel / fuelCapacity) * 100)
  );
  const fuelColor = getFuelColor(fuelPercent);

  // KM: Önce fuel_records'dan son kayıt, yoksa vehicles.total_km
  const currentKm = lastFuelRecord?.odometer_km || vehicle.total_km || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.PRIMARY}
          colors={[COLORS.PRIMARY]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Vehicle Card */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleIconContainer}>
          <Ionicons name="car-sport" size={48} color={COLORS.PRIMARY} />
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
            color={vehicle.esp32_connected ? COLORS.SUCCESS : COLORS.MUTED}
          />
          <Text
            style={[
              styles.connectionText,
              {
                color: vehicle.esp32_connected ? COLORS.SUCCESS : COLORS.WHITE,
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
          <Text style={styles.fuelType}>
            {getFuelTypeLabel(vehicle.fuel_type)}
          </Text>
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
        <View style={styles.fuelValues}>
          <Text style={[styles.fuelPercentage, { color: fuelColor }]}>
            {Math.round(fuelLevel)} / {Math.round(fuelCapacity)} L
          </Text>
          <Text style={styles.fuelPercentText}>%{Math.round(fuelPercent)}</Text>
        </View>
      </View>

      {/* Info Cards Row */}
      <View style={styles.infoGrid}>
        <InfoCard
          icon="speedometer"
          iconColor={COLORS.INFO}
          title={t("vehicle.mileage")}
          value={Number(currentKm).toLocaleString("tr-TR")}
          subtitle="km"
        />
        <InfoCard
          icon="calendar"
          iconColor={COLORS.PRIMARY}
          title={t("vehicle.modelYear")}
          value={vehicle.year || "-"}
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
          <Text style={styles.detailLabel}>{t("vehicle.fuelType")}</Text>
          <Text style={styles.detailValue}>
            {getFuelTypeLabel(vehicle.fuel_type)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("vehicle.status")}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.SUCCESS }]}
          >
            <Text style={styles.statusText}>
              {t(`vehicle.statuses.${vehicle.status}`) ||
                vehicle.status ||
                t("vehicle.active")}
            </Text>
          </View>
        </View>

        {vehicle.esp32_device_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t("vehicle.esp32")}</Text>
            <Text style={styles.detailValue}>{vehicle.esp32_device_id}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

// ❌ ESKİ StyleSheet SİLİNDİ - artık makeStyles kullanılıyor

export default DriverVehicle;
