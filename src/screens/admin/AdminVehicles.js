/**
 * AdminVehicles.js - v2.0
 * TulipFleet - Admin Vehicle Management
 *
 * Features:
 * - Full i18n (7 languages)
 * - DB-aligned: available, in_use, maintenance, retired
 * - Filter tabs (All / Available / In Use / Other)
 * - Expandable cards
 * - Online/offline ESP32
 * - UI System Guide v3
 *
 * Created: 01 Mart 2026
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { vehicleAPI } from "../../services/api";
import FuelGauge from "../../components/FuelGauge";
import { formatDate, formatNumber } from "../../utils/helpers";

const withAlpha = (hex, a) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  return `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()}`;
};

const FILTER_TABS = [
  { key: "all", i18nKey: "adminVehicles.filterAll" },
  {
    key: "available",
    i18nKey: "adminVehicles.filterAvailable",
    statuses: ["available"],
  },
  { key: "in_use", i18nKey: "adminVehicles.filterInUse", statuses: ["in_use"] },
  {
    key: "other",
    i18nKey: "adminVehicles.filterOther",
    statuses: ["maintenance", "retired"],
  },
];

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.lg,
    },
    statsHeader: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xs,
      ...COLORS.SHADOWS.card,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
    },
    statBoxActive: { borderBottomWidth: 3, borderBottomColor: COLORS.PRIMARY },
    statValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    statLabelActive: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    listContainer: { padding: COLORS.SPACING.sm, paddingBottom: 80 },
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
    },
    cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    plateText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginLeft: COLORS.SPACING.sm,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.md,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    compactRow: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
      flexWrap: "wrap",
    },
    compactItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xs,
    },
    compactText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY || COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },
    metricsRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    metric: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    metricValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    metricLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    metricDivider: {
      width: 1,
      backgroundColor: COLORS.DIVIDER,
      marginVertical: COLORS.SPACING.xs,
    },
    expandedSection: {
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      padding: COLORS.SPACING.sm,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.sm,
    },
    detailIcon: { width: 24, alignItems: "center", marginTop: 2 },
    detailLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      width: 90,
      marginLeft: COLORS.SPACING.xs,
    },
    detailValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      flex: 1,
    },
    actionRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      marginTop: COLORS.SPACING.sm,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    actionBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    actionDivider: { width: 1, backgroundColor: COLORS.DIVIDER },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.xxxl,
    },
    emptyTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
    },
    emptySubtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xl,
    },
    loadingText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.md,
    },
    errorTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.md,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
    },
    retryButton: {
      marginTop: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    fab: {
      position: "absolute",
      right: COLORS.SPACING.md,
      bottom: COLORS.SPACING.md,
      width: 56,
      height: 56,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
  });

const AdminVehicles = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const STATUS_COLORS = useMemo(
    () => ({
      available: COLORS.SUCCESS,
      in_use: COLORS.INFO,
      maintenance: COLORS.WARNING,
      retired: COLORS.MUTED,
    }),
    [COLORS]
  );

  const getStatusLabel = (s) => t(`adminVehicles.status.${s}`, s);

  const fetchVehicles = async () => {
    try {
      setError(null);
      const data = await vehicleAPI.getList();
      const list = data.vehicles || data || [];
      setVehicles(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || t("adminVehicles.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [])
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, []);

  const counts = useMemo(() => {
    const c = { all: vehicles.length, available: 0, in_use: 0, other: 0 };
    vehicles.forEach((v) => {
      if (v.status === "available") c.available++;
      else if (v.status === "in_use") c.in_use++;
      else c.other++;
    });
    return c;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    if (activeFilter === "all") return vehicles;
    const tab = FILTER_TABS.find((f) => f.key === activeFilter);
    if (!tab?.statuses) return vehicles;
    return vehicles.filter((v) => tab.statuses.includes(v.status));
  }, [vehicles, activeFilter]);

  const handleDeleteVehicle = (vehicle) => {
    // Bağlı cihaz varsa önce uyarı göster — backend 500 vermeden önce UX koruması
    if (vehicle.esp32_device_id) {
      Alert.alert(
        t("adminVehicles.deleteBlockedTitle"),
        t("adminVehicles.deleteBlockedMsg", { plate: vehicle.plate_no }),
        [{ text: t("common.ok"), style: "default" }]
      );
      return;
    }
    Alert.alert(
      t("adminVehicles.deleteVehicle"),
      t("adminVehicles.deleteConfirm", { plate: vehicle.plate_no }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await vehicleAPI.delete(vehicle.id);
              Alert.alert(
                t("common.success"),
                t("adminVehicles.vehicleDeleted")
              );
              fetchVehicles();
            } catch (e) {
              Alert.alert(
                t("common.error"),
                e?.response?.data?.error || t("adminVehicles.deleteFailed")
              );
            }
          },
        },
      ]
    );
  };

  const renderVehicleCard = ({ item: vehicle }) => {
    const status = vehicle.status || "available";
    const statusColor = STATUS_COLORS[status] || COLORS.MUTED;
    const isExpanded = expandedId === vehicle.id;
    const now = Date.now();
    const lastTime = vehicle.last_location_time
      ? new Date(vehicle.last_location_time).getTime()
      : 0;
    const isOnline = vehicle.is_online === true;

    // Sanal şamandıra: current_fuel_level (litre) / fuel_capacity → yüzde
    const fuelLiters = parseFloat(vehicle.current_fuel_level) || 0;
    const fuelCap = parseFloat(vehicle.fuel_capacity) || 0;
    const fuelPercent =
      fuelCap > 0 ? Math.max(0, Math.min(100, (fuelLiters / fuelCap) * 100)) : 0;
    const fuelColor =
      fuelPercent <= 15
        ? COLORS.ERROR
        : fuelPercent <= 40
          ? COLORS.WARNING
          : COLORS.SUCCESS;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId(isExpanded ? null : vehicle.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Ionicons name="car" size={22} color={COLORS.PRIMARY} />
            <Text style={styles.plateText}>{vehicle.plate_no}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>
        </View>

        <View style={styles.compactRow}>
          <View style={styles.compactItem}>
            <Ionicons name="construct-outline" size={14} color={COLORS.MUTED} />
            <Text style={styles.compactText}>
              {vehicle.brand || "-"} {vehicle.model || ""}
            </Text>
          </View>
          <View style={styles.compactItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.MUTED} />
            <Text style={styles.compactText}>{vehicle.year || "-"}</Text>
          </View>
          {vehicle.esp32_device_id ? (
            <View style={styles.compactItem}>
              <Ionicons
                name="hardware-chip-outline"
                size={14}
                color={isOnline ? COLORS.SUCCESS : COLORS.MUTED}
              />
              <Text style={styles.compactText}>ESP32</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {vehicle.total_km
                ? formatNumber(Number(vehicle.total_km))
                : "0"}
            </Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <FuelGauge
              percent={fuelPercent}
              color={fuelColor}
              COLORS={COLORS}
              size={48}
              showIcon={false}
            />
            <Text style={styles.metricLabel}>{t("adminVehicles.fuel")}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Ionicons
              name={isOnline ? "wifi" : "wifi-outline"}
              size={20}
              color={isOnline ? COLORS.SUCCESS : COLORS.MUTED}
            />
            <Text style={styles.metricLabel}>
              {isOnline
                ? t("adminVehicles.online")
                : t("adminVehicles.offline")}
            </Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {vehicle.fuel_type ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="flame-outline"
                    size={16}
                    color={COLORS.WARNING}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.fuelType")}
                </Text>
                <Text style={styles.detailValue}>
                  {t(
                    `adminVehicles.fuelTypes.${vehicle.fuel_type}`,
                    vehicle.fuel_type
                  )}
                </Text>
              </View>
            ) : null}

            {vehicle.fuel_capacity ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="beaker-outline"
                    size={16}
                    color={COLORS.INFO}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.tankCapacity")}
                </Text>
                <Text style={styles.detailValue}>
                  {vehicle.fuel_capacity} L
                </Text>
              </View>
            ) : null}

            {vehicle.color ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="color-palette-outline"
                    size={16}
                    color={COLORS.PRIMARY}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.color")}
                </Text>
                <Text style={styles.detailValue}>{vehicle.color}</Text>
              </View>
            ) : null}

            {vehicle.esp32_device_id ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={16}
                    color={COLORS.SUCCESS}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.device")}
                </Text>
                <Text style={styles.detailValue}>
                  {vehicle.esp32_device_id}
                </Text>
              </View>
            ) : null}

            {vehicle.vehicle_category ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={COLORS.MUTED}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.category")}
                </Text>
                <Text style={styles.detailValue}>
                  {t(
                    `adminVehicles.categories.${vehicle.vehicle_category}`,
                    vehicle.vehicle_category
                  )}
                </Text>
              </View>
            ) : null}

            {vehicle.last_maintenance_date ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="build-outline"
                    size={16}
                    color={COLORS.WARNING}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminVehicles.lastMaint")}
                </Text>
                <Text style={styles.detailValue}>
                  {formatDate(vehicle.last_maintenance_date)}
                </Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("EditVehicle", { vehicle })}
              >
                <Ionicons name="pencil" size={16} color={COLORS.PRIMARY} />
                <Text style={[styles.actionBtnText, { color: COLORS.PRIMARY }]}>
                  {t("common.edit")}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("VehicleTrack", { vehicle })}
              >
                <Ionicons name="location" size={16} color={COLORS.INFO} />
                <Text style={[styles.actionBtnText, { color: COLORS.INFO }]}>
                  {t("adminVehicles.track")}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteVehicle(vehicle)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
                <Text style={[styles.actionBtnText, { color: COLORS.ERROR }]}>
                  {t("common.delete")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.MUTED} />
      <Text style={styles.emptyTitle}>{t("adminVehicles.noVehicles")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("adminVehicles.noVehiclesDesc")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("adminVehicles.loading")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>{t("common.error")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicles}>
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key] || 0;
          const colorMap = {
            all: COLORS.TEXT,
            available: COLORS.SUCCESS,
            in_use: COLORS.INFO,
            other: COLORS.WARNING,
          };
          const tabColor = colorMap[tab.key] || COLORS.TEXT;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statBox, isActive && styles.statBoxActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.statValue, isActive && { color: tabColor }]}>
                {count}
              </Text>
              <Text
                style={[styles.statLabel, isActive && styles.statLabelActive]}
              >
                {t(tab.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item.id?.toString() || item.plate_no}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateVehicle")}
      >
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminVehicles;
