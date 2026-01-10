/**
 * TulipFleet - Fleet Map Screen
 * Çoklu Araç Yönetimi ile Güncellenmiş
 *
 * Özellikler:
 * - Real-time vehicle tracking
 * - VehicleListModal ile araç seçimi
 * - Follow mode with drag-to-disable
 * - Stats bar tıklanabilir
 *
 * @version 1.3.0
 * @date 11 Ocak 2026 - Location endpoint fix
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import VehicleInfoSheet from "../../components/map/VehicleInfoSheet";
import VehicleListModal from "../../components/map/VehicleListModal";
import { COLORS } from "../../constants/config";
import { vehicleAPI } from "../../services/api";
import {
  createFollowRegion,
  FOLLOW_CONFIG,
  normalizeVehicle,
  toFloat,
} from "../../utils/mapMath";

// ============================================================================
// CONSTANTS
// ============================================================================

const REFRESH_INTERVAL = 10000; // 10 saniye
const INITIAL_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// Debug mode - production'da false
const DEBUG = __DEV__;

// ============================================================================
// FLEET MAP SCREEN COMPONENT
// ============================================================================

const FleetMapScreen = ({ navigation }) => {
  // Refs
  const mapRef = useRef(null);
  const previousVehiclesRef = useRef([]);
  const followModeActiveRef = useRef(false);

  // State
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [followMode, setFollowMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showVehicleList, setShowVehicleList] = useState(false);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Normalize edilmiş araçlar
  const normalizedVehicles = useMemo(() => {
    return vehicles
      .map(normalizeVehicle)
      .filter((v) => v && v.latitude && v.longitude);
  }, [vehicles]);

  // Tüm araçlar (konum olmayanlar dahil) - Modal için
  const allVehicles = useMemo(() => {
    return vehicles.map(normalizeVehicle).filter((v) => v);
  }, [vehicles]);

  // Debug log
  useEffect(() => {
    if (DEBUG) {
      console.log(
        "[FleetMap] Vehicles:",
        normalizedVehicles.map((v) => `${v.plate_no}(${v.status})`).join(", ")
      );
    }
  }, [normalizedVehicles]);

  // Seçili araç
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return normalizedVehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [normalizedVehicles, selectedVehicleId]);

  // İstatistikler
  const stats = useMemo(
    () => ({
      total: allVehicles.length,
      active: allVehicles.filter((v) => v.status === "in_use").length,
      available: allVehicles.filter((v) => v.status === "available").length,
      withLocation: normalizedVehicles.length,
    }),
    [allVehicles, normalizedVehicles]
  );

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchVehicles = useCallback(async () => {
    try {
      // FIX: Önce araçları, sonra konumları al ve birleştir
      const [vehiclesRes, locationsRes] = await Promise.all([
        vehicleAPI.getAll(),
        vehicleAPI.getAllWithLocations().catch(() => ({ locations: [] })),
      ]);

      const vehicleList = vehiclesRes.vehicles || [];
      const locationList = locationsRes.locations || [];

      // Konum verilerini araçlarla birleştir
      const locationMap = new Map();
      locationList.forEach((loc) => {
        if (loc.vehicle_id) {
          locationMap.set(loc.vehicle_id, loc);
        }
      });

      // Araçlara konum ekle
      const mergedList = vehicleList.map((vehicle) => {
        const location = locationMap.get(vehicle.id);
        if (location) {
          return {
            ...vehicle,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            heading: location.heading,
            last_location_time: location.time,
          };
        }
        return vehicle;
      });

      // Debug log
      if (DEBUG) {
        const withLoc = mergedList.filter((v) => v.latitude && v.longitude);
        console.log(
          `[FleetMap] Fetched: ${mergedList.length} vehicles, ${withLoc.length} with location`
        );
      }

      // State güncelle
      setVehicles(mergedList);
      setLastUpdate(new Date());
      previousVehiclesRef.current = mergedList;

      // İlk yüklemede fit to coordinates
      if (loading && mergedList.length > 0) {
        const located = mergedList.filter((v) => v.latitude && v.longitude);
        if (mapRef.current && located.length > 0) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(
              located.map((v) => ({
                latitude: toFloat(v.latitude),
                longitude: toFloat(v.longitude),
              })),
              {
                edgePadding: { top: 80, left: 60, right: 60, bottom: 140 },
                animated: true,
              }
            );
          }, 500);
        }
      }
    } catch (e) {
      console.error("[FleetMap] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initial fetch & interval
  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  // Follow Mode: Kamera takibi
  useEffect(() => {
    if (!followMode || !selectedVehicle || !mapRef.current) return;

    followModeActiveRef.current = true;

    const region = createFollowRegion(selectedVehicle);
    if (region) {
      mapRef.current.animateToRegion(region, FOLLOW_CONFIG.ANIMATION_DURATION);
    }
  }, [followMode, selectedVehicle?.latitude, selectedVehicle?.longitude]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Araç seçimi (marker'dan)
  const handleVehiclePress = useCallback(
    (vehicle) => {
      const isSameVehicle = selectedVehicleId === vehicle.id;

      if (isSameVehicle) {
        setFollowMode(true);
      } else {
        setSelectedVehicleId(vehicle.id);
        setFollowMode(true);

        if (mapRef.current) {
          const region = createFollowRegion(vehicle);
          if (region) {
            mapRef.current.animateToRegion(
              region,
              FOLLOW_CONFIG.ANIMATION_DURATION
            );
          }
        }
      }
    },
    [selectedVehicleId]
  );

  // Araç seçimi (modal'dan)
  const handleSelectFromModal = useCallback((vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setFollowMode(true);

    // Haritada araca zoom yap
    if (mapRef.current && vehicle.latitude && vehicle.longitude) {
      const region = createFollowRegion(vehicle);
      if (region) {
        mapRef.current.animateToRegion(
          region,
          FOLLOW_CONFIG.ANIMATION_DURATION
        );
      }
    }
  }, []);

  // Harita drag → follow kapat
  const handleMapPanDrag = useCallback(() => {
    if (followModeActiveRef.current) {
      if (DEBUG) console.log("[FleetMap] User dragged, follow disabled");
      setFollowMode(false);
      followModeActiveRef.current = false;
    }
  }, []);

  // Sheet kapat
  const handleCloseSheet = useCallback(() => {
    setSelectedVehicleId(null);
    setFollowMode(false);
    followModeActiveRef.current = false;
  }, []);

  // Follow toggle
  const toggleFollowMode = useCallback(() => {
    if (selectedVehicle) {
      setFollowMode((prev) => !prev);
    }
  }, [selectedVehicle]);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Harita yükleniyor...</Text>
      </View>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPanDrag={handleMapPanDrag}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
      >
        {normalizedVehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            identifier={vehicle.id}
            coordinate={{
              latitude: toFloat(vehicle.latitude),
              longitude: toFloat(vehicle.longitude),
            }}
            title={vehicle.plate_no}
            description={`${vehicle.speed || 0} km/h`}
            onPress={() => handleVehiclePress(vehicle)}
          />
        ))}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Vehicle List Button */}
      <TouchableOpacity
        style={styles.listButton}
        onPress={() => setShowVehicleList(true)}
      >
        <Ionicons name="list" size={22} color={COLORS.primary} />
        {stats.total > 0 && (
          <View style={styles.listBadge}>
            <Text style={styles.listBadgeText}>{stats.total}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchVehicles}>
        <Ionicons name="refresh" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Follow Mode Button (sadece seçili araç varken) */}
      {selectedVehicle && (
        <TouchableOpacity
          style={[styles.followButton, followMode && styles.followButtonActive]}
          onPress={toggleFollowMode}
        >
          <Ionicons
            name={followMode ? "locate" : "locate-outline"}
            size={22}
            color={followMode ? "#fff" : COLORS.primary}
          />
        </TouchableOpacity>
      )}

      {/* Stats Bar - Tıklanabilir - Sheet açıkken gizle */}
      {!selectedVehicle && (
        <TouchableOpacity
          style={styles.statsBar}
          onPress={() => setShowVehicleList(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.statsText}>
            {"🚗"} {stats.withLocation} Araç{" | "}
            <Text style={styles.activeText}>
              {"●"} {stats.active} Aktif
            </Text>
            {" | "}
            <Text style={styles.availableText}>
              {"●"} {stats.available} Müsait
            </Text>
          </Text>
          {lastUpdate && (
            <Text style={styles.updateText}>
              Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}
            </Text>
          )}
          <View style={styles.statsHint}>
            <Ionicons name="chevron-up" size={14} color={COLORS.gray} />
            <Text style={styles.statsHintText}>Liste için dokun</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Vehicle Info Sheet */}
      {selectedVehicle && (
        <VehicleInfoSheet
          vehicle={selectedVehicle}
          onClose={handleCloseSheet}
          isFollowing={followMode}
          onToggleFollow={toggleFollowMode}
          onPressHistory={(vehicleId) => {
            navigation.navigate("VehicleTrack", {
              vehicleId: vehicleId,
              vehiclePlate: selectedVehicle?.plate_no,
            });
          }}
          isTablet={false}
        />
      )}

      {/* Vehicle List Modal */}
      <VehicleListModal
        visible={showVehicleList}
        vehicles={allVehicles}
        onClose={() => setShowVehicleList(false)}
        onSelectVehicle={handleSelectFromModal}
        selectedVehicleId={selectedVehicleId}
      />
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray,
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 14,
    left: 14,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  listButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 14,
    left: 70,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  listBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  listBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  refreshButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 14,
    right: 14,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  followButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 14,
    right: 70,
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  followButtonActive: {
    backgroundColor: COLORS.primary,
  },
  statsBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 34 : 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statsText: {
    textAlign: "center",
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  activeText: {
    color: "#10B981",
  },
  availableText: {
    color: "#3B82F6",
  },
  updateText: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  statsHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    gap: 4,
  },
  statsHintText: {
    fontSize: 11,
    color: COLORS.gray,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default FleetMapScreen;
