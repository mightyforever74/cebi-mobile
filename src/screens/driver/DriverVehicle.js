// src/screens/driver/DriverVehicle.js
// TulipFleet - Sürücü Aracım Ekranı
// Updated: 21 Ocak 2026 - Renk edit, yakıt kapasitesi, canlı KM, tam i18n

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { driverAPI, fuelAPI } from "../../services/api";

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
  border: "#E9ECEF",
};

// Renk seçenekleri
const VEHICLE_COLORS = [
  { id: "white", hex: "#FFFFFF", border: "#DDD" },
  { id: "black", hex: "#1A1A1A", border: "#1A1A1A" },
  { id: "silver", hex: "#C0C0C0", border: "#AAA" },
  { id: "gray", hex: "#808080", border: "#808080" },
  { id: "red", hex: "#E74C3C", border: "#E74C3C" },
  { id: "blue", hex: "#3498DB", border: "#3498DB" },
  { id: "navy", hex: "#2C3E50", border: "#2C3E50" },
  { id: "green", hex: "#27AE60", border: "#27AE60" },
  { id: "yellow", hex: "#F1C40F", border: "#F1C40F" },
  { id: "orange", hex: "#E67E22", border: "#E67E22" },
  { id: "brown", hex: "#8B4513", border: "#8B4513" },
  { id: "beige", hex: "#F5F5DC", border: "#DDD" },
];

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

const DriverVehicle = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "tr";

  const [vehicle, setVehicle] = useState(null);
  const [lastFuelRecord, setLastFuelRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Color Edit Modal
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [savingColor, setSavingColor] = useState(false);

  const fetchVehicle = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching driver vehicle...");
      const data = await driverAPI.getVehicle();
      console.log("✅ Driver vehicle loaded:", data);
      const veh = data.vehicle || data;
      setVehicle(veh);
      setSelectedColor(veh?.color || null);

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

  // Renk kaydet
  const handleSaveColor = async () => {
    if (!vehicle || !selectedColor) return;

    setSavingColor(true);
    try {
      await driverAPI.updateVehicleSettings(vehicle.id, {
        color: selectedColor,
      });
      setVehicle({ ...vehicle, color: selectedColor });
      setColorModalVisible(false);
      Alert.alert(t("common.success"), t("vehicle.colorUpdated"));
    } catch (err) {
      console.error("Color update error:", err);
      Alert.alert(t("common.error"), t("vehicle.colorUpdateFailed"));
    } finally {
      setSavingColor(false);
    }
  };

  // Yakıt tipi label
  const getFuelTypeLabel = (fuelType) => {
    const labels = FUEL_TYPE_LABELS[fuelType];
    if (labels) {
      return labels[currentLang] || labels.en || fuelType;
    }
    return fuelType || "-";
  };

  // Renk label (çeviri)
  const getColorLabel = (colorId) => {
    return t(`vehicle.colors.${colorId}`, colorId);
  };

  const getFuelColor = (percent) => {
    if (percent >= 50) return COLORS.success;
    if (percent >= 25) return COLORS.warning;
    return COLORS.danger;
  };

  // Info Card Component
  const InfoCard = ({
    icon,
    iconColor,
    title,
    value,
    subtitle,
    onPress,
    editable,
  }) => (
    <TouchableOpacity
      style={styles.infoCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.infoIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {editable && (
          <Ionicons
            name="pencil"
            size={14}
            color={COLORS.muted}
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
      {subtitle && <Text style={styles.infoSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
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

  // Renk hex
  const vehicleColorObj = VEHICLE_COLORS.find((c) => c.id === vehicle.color);
  const vehicleColorHex = vehicleColorObj?.hex || "#808080";

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
      <View style={[styles.vehicleCard, { backgroundColor: COLORS.primary }]}>
        <View style={styles.vehicleIconContainer}>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: vehicleColorHex },
            ]}
          />
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
                color: vehicle.esp32_connected ? COLORS.success : COLORS.white,
              },
            ]}
          >
            {vehicle.esp32_connected
              ? t("vehicle.connected")
              : t("vehicle.noConnection")}
          </Text>
        </View>
      </View>

      {/* Fuel Card - Kapasite ile */}
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

      {/* Info Cards Row 1 */}
      <View style={styles.infoGrid}>
        <InfoCard
          icon="speedometer"
          iconColor={COLORS.info}
          title={t("vehicle.mileage")}
          value={Number(currentKm).toLocaleString("tr-TR")}
          subtitle="km"
        />
        <InfoCard
          icon="calendar"
          iconColor={COLORS.primary}
          title={t("vehicle.modelYear")}
          value={vehicle.year || "-"}
        />
      </View>

      {/* Info Cards Row 2 */}
      <View style={styles.infoGrid}>
        <InfoCard
          icon="color-palette"
          iconColor={COLORS.warning}
          title={t("vehicle.color")}
          value={vehicle.color ? getColorLabel(vehicle.color) : "-"}
          onPress={() => setColorModalVisible(true)}
          editable
        />
        <InfoCard
          icon="cube-outline"
          iconColor={COLORS.success}
          title={t("vehicle.tankCapacity")}
          value={`${Math.round(fuelCapacity)}L`}
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
            style={[styles.statusBadge, { backgroundColor: COLORS.success }]}
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

      {/* Color Selection Modal */}
      <Modal
        visible={colorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setColorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("vehicle.selectColor")}</Text>

            <View style={styles.colorGrid}>
              {VEHICLE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.id}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color.hex, borderColor: color.border },
                    selectedColor === color.id && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color.id)}
                >
                  {selectedColor === color.id && (
                    <Ionicons
                      name="checkmark"
                      size={24}
                      color={
                        color.id === "white" ||
                        color.id === "beige" ||
                        color.id === "yellow"
                          ? "#333"
                          : "#FFF"
                      }
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectedColorText}>
              {selectedColor
                ? getColorLabel(selectedColor)
                : t("vehicle.noColorSelected")}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setSelectedColor(vehicle.color);
                  setColorModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonCancelText}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveColor}
                disabled={savingColor}
              >
                {savingColor ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {t("common.save")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    position: "relative",
  },
  colorIndicator: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: COLORS.white,
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
    flex: 1,
  },
  fuelType: {
    fontSize: 12,
    color: COLORS.secondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fuelBarContainer: {
    height: 12,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    overflow: "hidden",
  },
  fuelBar: { height: "100%", borderRadius: 6 },
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
    color: COLORS.secondary,
    fontWeight: "600",
  },
  // Info Grid
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
  infoValueRow: { flexDirection: "row", alignItems: "center" },
  infoValue: { fontSize: 18, fontWeight: "bold", color: COLORS.dark },
  infoSubtitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
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
  detailLabel: { fontSize: 14, color: COLORS.secondary },
  detailValue: { fontSize: 14, fontWeight: "500", color: COLORS.dark },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: COLORS.white, fontSize: 12, fontWeight: "600" },
  // Empty/Error States
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    textAlign: "center",
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  colorOptionSelected: {
    borderWidth: 4,
    borderColor: COLORS.primary,
  },
  selectedColorText: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
  },
  modalButtonCancelText: {
    color: COLORS.dark,
    fontWeight: "600",
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonSaveText: {
    color: COLORS.white,
    fontWeight: "600",
  },
});

export default DriverVehicle;
