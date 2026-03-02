/**
 * TulipFleet - Vehicle List Modal
 * Fleet Map araç listesi modal
 *
 * Features:
 * - i18n (7 languages)
 * - Online detection via last_location_time (5 min threshold)
 * - DB-aligned statuses: available, in_use, maintenance, retired
 * - Theme tokens (no hardcoded hex)
 * - UI Guide v3 compliant (no gap property)
 *
 * @version 2.0.0
 * @date 01 Mart 2026
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;
const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

const VehicleListModal = ({
  visible,
  vehicles = [],
  onClose,
  onSelectVehicle,
  selectedVehicleId,
}) => {
  const { COLORS } = useTheme();
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Online check helper
  const isVehicleOnline = (v) => {
    if (!v.last_location_time) return false;
    return (
      Date.now() - new Date(v.last_location_time).getTime() < ONLINE_THRESHOLD
    );
  };

  // STATUS CONFIG with theme colors
  const STATUS_CONFIG = useMemo(
    () => ({
      in_use: {
        i18nKey: "vehicleList.statusInUse",
        color: COLORS.SUCCESS,
        icon: "car",
      },
      available: {
        i18nKey: "vehicleList.statusAvailable",
        color: COLORS.INFO,
        icon: "car-outline",
      },
      maintenance: {
        i18nKey: "vehicleList.statusMaintenance",
        color: COLORS.WARNING,
        icon: "construct",
      },
      retired: {
        i18nKey: "vehicleList.statusRetired",
        color: COLORS.MUTED,
        icon: "archive-outline",
      },
      offline: {
        i18nKey: "vehicleList.statusOffline",
        color: COLORS.MUTED,
        icon: "cloud-offline",
      },
    }),
    [COLORS]
  );

  // Determine effective status (online check overrides DB status)
  const getEffectiveStatus = (vehicle) => {
    const online = isVehicleOnline(vehicle);
    if (!online) return "offline";
    // If online, use DB status
    return vehicle.status || "available";
  };

  // FILTER OPTIONS
  const FILTER_OPTIONS = useMemo(
    () => [
      { key: "all", i18nKey: "vehicleList.filterAll" },
      { key: "online", i18nKey: "vehicleList.filterOnline" },
      { key: "available", i18nKey: "vehicleList.filterAvailable" },
      { key: "offline", i18nKey: "vehicleList.filterOffline" },
    ],
    []
  );

  // Stats
  const stats = useMemo(() => {
    const online = vehicles.filter((v) => isVehicleOnline(v)).length;
    return {
      total: vehicles.length,
      online,
      available: vehicles.filter((v) => v.status === "available").length,
      offline: vehicles.length - online,
    };
  }, [vehicles]);

  // Filter
  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    if (activeFilter === "online") {
      result = result.filter((v) => isVehicleOnline(v));
    } else if (activeFilter === "available") {
      result = result.filter((v) => v.status === "available");
    } else if (activeFilter === "offline") {
      result = result.filter((v) => !isVehicleOnline(v));
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      result = result.filter((v) => {
        const plate = (v.plate_no || "").toLowerCase();
        const brand = (v.brand || "").toLowerCase();
        const model = (v.model || "").toLowerCase();
        return (
          plate.includes(search) ||
          brand.includes(search) ||
          model.includes(search)
        );
      });
    }

    return result;
  }, [vehicles, activeFilter, searchText]);

  // Handlers
  const handleSelectVehicle = useCallback(
    (vehicle) => {
      onSelectVehicle && onSelectVehicle(vehicle);
      onClose && onClose();
    },
    [onSelectVehicle, onClose]
  );

  // Render vehicle item
  const renderVehicleItem = useCallback(
    ({ item: vehicle }) => {
      const effectiveStatus = getEffectiveStatus(vehicle);
      const statusConfig =
        STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.offline;
      const isSelected = vehicle.id === selectedVehicleId;
      const hasLocation = vehicle.latitude && vehicle.longitude;
      const online = isVehicleOnline(vehicle);

      return (
        <TouchableOpacity
          style={[
            styles.vehicleItem,
            { backgroundColor: COLORS.SURFACE, borderColor: COLORS.DIVIDER },
            isSelected && {
              backgroundColor: COLORS.PRIMARY + "15",
              borderColor: COLORS.PRIMARY,
            },
            !hasLocation && { opacity: 0.5 },
          ]}
          onPress={() => handleSelectVehicle(vehicle)}
          disabled={!hasLocation}
        >
          {/* Status Icon */}
          <View
            style={[styles.statusIcon, { backgroundColor: statusConfig.color }]}
          >
            <Ionicons name={statusConfig.icon} size={18} color={COLORS.WHITE} />
          </View>

          {/* Vehicle Info */}
          <View style={styles.vehicleInfo}>
            <Text style={[styles.plateText, { color: COLORS.TEXT }]}>
              {vehicle.plate_no}
            </Text>
            <Text style={[styles.vehicleModel, { color: COLORS.MUTED }]}>
              {vehicle.brand} {vehicle.model}
            </Text>
            {vehicle.speed != null && hasLocation && online && (
              <Text style={[styles.speedText, { color: COLORS.SUCCESS }]}>
                {Math.round(vehicle.speed)} km/s
              </Text>
            )}
          </View>

          {/* Status Badge */}
          <View style={styles.rightSection}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.color + "20" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusConfig.color },
                ]}
              />
              <Text
                style={[styles.statusTextBadge, { color: statusConfig.color }]}
              >
                {t(statusConfig.i18nKey)}
              </Text>
            </View>
            {!hasLocation && (
              <Text style={[styles.noLocationText, { color: COLORS.MUTED }]}>
                {t("vehicleList.noLocation")}
              </Text>
            )}
          </View>

          {/* Selection */}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.PRIMARY}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedVehicleId, handleSelectVehicle, COLORS, STATUS_CONFIG, t]
  );

  // Dynamic styles
  const dynamicStyles = useMemo(
    () => ({
      modalBg: { backgroundColor: COLORS.SURFACE },
      headerBorder: { borderBottomColor: COLORS.DIVIDER },
      searchBg: { backgroundColor: COLORS.BACKGROUND },
      filterBg: { backgroundColor: COLORS.BACKGROUND },
      filterActiveBg: { backgroundColor: COLORS.PRIMARY },
    }),
    [COLORS]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />

        <View style={[styles.modalContainer, dynamicStyles.modalBg]}>
          {/* Header */}
          <View style={[styles.header, dynamicStyles.headerBorder]}>
            <View style={styles.handleContainer}>
              <View
                style={[styles.handle, { backgroundColor: COLORS.DIVIDER }]}
              />
            </View>

            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { color: COLORS.TEXT }]}>
                {t("vehicleList.title")}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.MUTED} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <Text style={[styles.statsText, { color: COLORS.MUTED }]}>
                {t("vehicleList.total")}:{" "}
                <Text style={styles.statsBold}>{stats.total}</Text>
              </Text>
              <Text style={[styles.statsText, { color: COLORS.SUCCESS }]}>
                {t("vehicleList.online")}:{" "}
                <Text style={styles.statsBold}>{stats.online}</Text>
              </Text>
              <Text style={[styles.statsText, { color: COLORS.MUTED }]}>
                {t("vehicleList.offline")}:{" "}
                <Text style={styles.statsBold}>{stats.offline}</Text>
              </Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputWrapper, dynamicStyles.searchBg]}>
              <Ionicons name="search" size={18} color={COLORS.MUTED} />
              <TextInput
                style={[styles.searchInput, { color: COLORS.TEXT }]}
                placeholder={t("vehicleList.searchPlaceholder")}
                placeholderTextColor={COLORS.MUTED}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.MUTED}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count =
                stats[filter.key] || (filter.key === "all" ? stats.total : 0);
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterTab,
                    isActive
                      ? dynamicStyles.filterActiveBg
                      : dynamicStyles.filterBg,
                  ]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: isActive ? COLORS.WHITE : COLORS.MUTED },
                    ]}
                  >
                    {t(filter.i18nKey)}
                  </Text>
                  <View
                    style={[
                      styles.filterBadge,
                      isActive && styles.filterBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        { color: isActive ? COLORS.WHITE : COLORS.MUTED },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Vehicle List */}
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicleItem}
            keyExtractor={(item) => item.id?.toString()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={48} color={COLORS.MUTED} />
                <Text style={[styles.emptyText, { color: COLORS.MUTED }]}>
                  {searchText
                    ? t("vehicleList.notFound")
                    : t("vehicleList.empty")}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 16 },
    }),
  },
  header: { paddingBottom: 12, borderBottomWidth: 1 },
  handleContainer: { alignItems: "center", paddingVertical: 12 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  closeButton: { padding: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  statsText: { fontSize: 12, marginRight: 16 },
  statsBold: { fontWeight: "700" },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0, marginHorizontal: 8 },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: { fontSize: 12, fontWeight: "600" },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  filterBadgeActive: { backgroundColor: "rgba(255, 255, 255, 0.3)" },
  filterBadgeText: { fontSize: 10, fontWeight: "700" },
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: { flex: 1, marginLeft: 12 },
  plateText: { fontSize: 15, fontWeight: "700" },
  vehicleModel: { fontSize: 12, marginTop: 2 },
  speedText: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  rightSection: { alignItems: "flex-end" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  statusTextBadge: { fontSize: 11, fontWeight: "600" },
  noLocationText: { fontSize: 10, marginTop: 4 },
  selectedIndicator: { marginLeft: 8 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: { fontSize: 14, marginTop: 12 },
});

export default VehicleListModal;
