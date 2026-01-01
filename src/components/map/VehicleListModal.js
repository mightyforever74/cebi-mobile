/**
 * TulipFleet - Vehicle List Modal
 * Çoklu araç yönetimi için araç listesi modal'ı
 *
 * Özellikler:
 * - Araç listesi görüntüleme
 * - Plaka ile arama
 * - Durum filtreleme (Tümü/Aktif/Müsait/Offline)
 * - Araç seçimi → Haritada zoom
 *
 * @version 1.0.0
 * @date 28 Aralık 2025
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
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
import { COLORS } from "../../constants/config";

// ============================================================================
// CONSTANTS
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

const STATUS_CONFIG = {
  in_use: {
    label: "Aktif",
    color: "#10B981",
    icon: "car",
    filterLabel: "Aktif",
  },
  available: {
    label: "Müsait",
    color: "#3B82F6",
    icon: "car-outline",
    filterLabel: "Müsait",
  },
  maintenance: {
    label: "Bakımda",
    color: "#F59E0B",
    icon: "construct",
    filterLabel: "Bakımda",
  },
  offline: {
    label: "Offline",
    color: "#6B7280",
    icon: "cloud-offline",
    filterLabel: "Offline",
  },
};

const FILTER_OPTIONS = [
  { key: "all", label: "Tümü" },
  { key: "in_use", label: "Aktif" },
  { key: "available", label: "Müsait" },
  { key: "offline", label: "Offline" },
];

// ============================================================================
// VEHICLE LIST MODAL COMPONENT
// ============================================================================

const VehicleListModal = ({
  visible,
  vehicles = [],
  onClose,
  onSelectVehicle,
  selectedVehicleId,
}) => {
  // State
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // ============================================================================
  // FILTERED VEHICLES
  // ============================================================================

  const filteredVehicles = useMemo(() => {
    let result = vehicles;

    // Durum filtresi
    if (activeFilter !== "all") {
      result = result.filter((v) => v.status === activeFilter);
    }

    // Arama filtresi
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

  // ============================================================================
  // STATS
  // ============================================================================

  const stats = useMemo(
    () => ({
      total: vehicles.length,
      in_use: vehicles.filter((v) => v.status === "in_use").length,
      available: vehicles.filter((v) => v.status === "available").length,
      offline: vehicles.filter((v) => v.status === "offline" || !v.latitude)
        .length,
    }),
    [vehicles]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectVehicle = useCallback(
    (vehicle) => {
      onSelectVehicle && onSelectVehicle(vehicle);
      onClose && onClose();
    },
    [onSelectVehicle, onClose]
  );

  const handleClearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  // ============================================================================
  // RENDER VEHICLE ITEM
  // ============================================================================

  const renderVehicleItem = useCallback(
    ({ item: vehicle }) => {
      const status = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.offline;
      const isSelected = vehicle.id === selectedVehicleId;
      const hasLocation = vehicle.latitude && vehicle.longitude;

      return (
        <TouchableOpacity
          style={[
            styles.vehicleItem,
            isSelected && styles.vehicleItemSelected,
            !hasLocation && styles.vehicleItemNoLocation,
          ]}
          onPress={() => handleSelectVehicle(vehicle)}
          disabled={!hasLocation}
        >
          {/* Status Icon */}
          <View style={[styles.statusIcon, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon} size={18} color="#fff" />
          </View>

          {/* Vehicle Info */}
          <View style={styles.vehicleInfo}>
            <Text style={styles.plateText}>{vehicle.plate_no}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle.brand} {vehicle.model}
            </Text>
            {vehicle.speed != null && hasLocation && (
              <Text style={styles.speedText}>
                {Math.round(vehicle.speed)} km/s
              </Text>
            )}
          </View>

          {/* Status Badge */}
          <View style={styles.rightSection}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${status.color}20` },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: status.color }]}
              />
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            {!hasLocation && (
              <Text style={styles.noLocationText}>Konum yok</Text>
            )}
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.primary}
              />
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [selectedVehicleId, handleSelectVehicle]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />

        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Araç Listesi</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                Toplam: <Text style={styles.statsBold}>{stats.total}</Text>
              </Text>
              <Text style={[styles.statsText, { color: "#10B981" }]}>
                Aktif: <Text style={styles.statsBold}>{stats.in_use}</Text>
              </Text>
              <Text style={[styles.statsText, { color: "#3B82F6" }]}>
                Müsait: <Text style={styles.statsBold}>{stats.available}</Text>
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={18} color={COLORS.gray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Plaka veya model ara..."
                placeholderTextColor={COLORS.gray}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            {FILTER_OPTIONS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count =
                filter.key === "all" ? stats.total : stats[filter.key] || 0;

              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isActive && styles.filterTextActive,
                    ]}
                  >
                    {filter.label}
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
                        isActive && styles.filterBadgeTextActive,
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
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="car-outline" size={48} color={COLORS.gray} />
                <Text style={styles.emptyText}>
                  {searchText ? "Araç bulunamadı" : "Henüz araç yok"}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    height: MODAL_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  statsText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  statsBold: {
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.gray,
  },
  filterTextActive: {
    color: "#fff",
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gray,
  },
  filterBadgeTextActive: {
    color: "#fff",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  vehicleItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  vehicleItemSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: COLORS.primary,
  },
  vehicleItemNoLocation: {
    opacity: 0.5,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  plateText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  vehicleModel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  speedText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 2,
  },
  rightSection: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  noLocationText: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  selectedIndicator: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 12,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default VehicleListModal;
