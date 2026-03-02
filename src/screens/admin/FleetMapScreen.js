/**
 * TulipFleet - Fleet Map Screen
 * Coklu Arac Yonetimi ile Guncellenmis
 *
 * Ozellikler:
 * - Real-time vehicle tracking
 * - Google Maps style modern markers
 * - VehicleListModal ile arac secimi
 * - Follow mode with drag-to-disable
 * - Stats bar tiklanabilir
 *
 * @version 1.5.0 - Modern vehicle markers
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import VehicleInfoSheet from "../../components/map/VehicleInfoSheet";
import VehicleListModal from "../../components/map/VehicleListModal";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
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

const REFRESH_INTERVAL = 10000;
const INITIAL_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const DEBUG = __DEV__;

// Marker colors by status
const MARKER_COLORS = {
  in_use: "#10B981", // Green - active
  available: "#3B82F6", // Blue - available
  maintenance: "#F59E0B", // Yellow - maintenance
  offline: "#9CA3AF", // Gray - offline
  default: "#6366F1", // Indigo - default
};

// ============================================================================
// VEHICLE MARKER COMPONENT
// ============================================================================

const VehicleMarker = ({ vehicle, isSelected, onPress }) => {
  const now = Date.now();
  const lastTime = vehicle.last_location_time
    ? new Date(vehicle.last_location_time).getTime()
    : 0;
  const isOnline = now - lastTime < 5 * 60 * 1000;
  const heading = parseFloat(vehicle.heading) || 0;
  const speed = parseFloat(vehicle.speed) || 0;
  const isMoving = speed > 2;

  const markerColor = isOnline
    ? MARKER_COLORS[vehicle.status] || MARKER_COLORS.default
    : MARKER_COLORS.offline;

  return (
    <Marker
      identifier={vehicle.id}
      coordinate={{
        latitude: toFloat(vehicle.latitude),
        longitude: toFloat(vehicle.longitude),
      }}
      title={vehicle.plate_no}
      description={`${speed.toFixed(0)} km/h`}
      onPress={() => onPress(vehicle)}
      anchor={{ x: 0.5, y: 0.5 }}
      flat={isMoving}
      rotation={isMoving ? heading : 0}
      tracksViewChanges={isSelected}
    >
      <View style={mStyles.container}>
        {/* Direction arrow - only when moving */}
        {isMoving && (
          <View style={mStyles.arrowContainer}>
            <View style={[mStyles.arrow, { borderBottomColor: markerColor }]} />
          </View>
        )}

        {/* Main marker body */}
        <View
          style={[
            mStyles.body,
            { backgroundColor: markerColor },
            isSelected && mStyles.bodySelected,
          ]}
        >
          <Ionicons
            name={isMoving ? "car-sport" : "car"}
            size={isSelected ? 18 : 14}
            color="#FFFFFF"
          />
        </View>

        {/* Online pulse ring */}
        {isOnline && isSelected && (
          <View style={[mStyles.pulse, { borderColor: markerColor }]} />
        )}

        {/* Plate label - only for selected */}
        {isSelected && (
          <View style={[mStyles.label, { backgroundColor: markerColor }]}>
            <Text style={mStyles.labelText}>{vehicle.plate_no}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};

const mStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  arrowContainer: {
    alignItems: "center",
    marginBottom: -4,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#3B82F6",
  },
  body: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bodySelected: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  pulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    opacity: 0.3,
  },
  label: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

// ============================================================================
// FLEET MAP SCREEN COMPONENT
// ============================================================================

const FleetMapScreen = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, i18n } = useTranslation();

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

  const normalizedVehicles = useMemo(() => {
    return vehicles
      .map(normalizeVehicle)
      .filter((v) => v && v.latitude && v.longitude);
  }, [vehicles]);

  const allVehicles = useMemo(() => {
    return vehicles.map(normalizeVehicle).filter((v) => v);
  }, [vehicles]);

  useEffect(() => {
    if (DEBUG) {
      console.log(
        "[FleetMap] Vehicles:",
        normalizedVehicles.map((v) => `${v.plate_no}(${v.status})`).join(", ")
      );
    }
  }, [normalizedVehicles]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return normalizedVehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [normalizedVehicles, selectedVehicleId]);

  const stats = useMemo(() => {
    const now = Date.now();
    const ONLINE_THRESHOLD = 5 * 60 * 1000;

    const withOnlineStatus = allVehicles.map((v) => {
      const lastTime = v.last_location_time
        ? new Date(v.last_location_time).getTime()
        : 0;
      const isOnline = now - lastTime < ONLINE_THRESHOLD;
      return { ...v, isOnline };
    });

    return {
      total: allVehicles.length,
      online: withOnlineStatus.filter((v) => v.isOnline).length,
      offline: withOnlineStatus.filter((v) => !v.isOnline).length,
      available: allVehicles.filter((v) => v.status === "available").length,
      withLocation: normalizedVehicles.length,
      active: allVehicles.filter((v) => v.status === "in_use").length,
    };
  }, [allVehicles, normalizedVehicles]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchVehicles = useCallback(async () => {
    try {
      const [vehiclesRes, locationsRes] = await Promise.all([
        vehicleAPI.getAll(),
        vehicleAPI.getAllWithLocations().catch(() => ({ locations: [] })),
      ]);

      const vehicleList = vehiclesRes.vehicles || [];
      const locationList = locationsRes.locations || [];

      const locationMap = new Map();
      locationList.forEach((loc) => {
        if (loc.vehicle_id) {
          locationMap.set(loc.vehicle_id, loc);
        }
      });

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

      if (DEBUG) {
        const withLoc = mergedList.filter((v) => v.latitude && v.longitude);
        console.log(
          `[FleetMap] Fetched: ${mergedList.length} vehicles, ${withLoc.length} with location`
        );
      }

      setVehicles(mergedList);
      setLastUpdate(new Date());
      previousVehiclesRef.current = mergedList;

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

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

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

  const handleSelectFromModal = useCallback((vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setFollowMode(true);

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

  const handleMapPanDrag = useCallback(() => {
    if (followMode) {
      setFollowMode(false);
      followModeActiveRef.current = false;
    }
  }, [followMode]);

  const toggleFollowMode = useCallback(() => {
    const newMode = !followMode;
    setFollowMode(newMode);
    followModeActiveRef.current = newMode;

    if (newMode && selectedVehicle && mapRef.current) {
      const region = createFollowRegion(selectedVehicle);
      if (region) {
        mapRef.current.animateToRegion(
          region,
          FOLLOW_CONFIG.ANIMATION_DURATION
        );
      }
    }
  }, [followMode, selectedVehicle]);

  const handleCloseSheet = useCallback(() => {
    setSelectedVehicleId(null);
    setFollowMode(false);
    followModeActiveRef.current = false;
  }, []);

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
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            isSelected={selectedVehicleId === vehicle.id}
            onPress={handleVehiclePress}
          />
        ))}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.PRIMARY} />
      </TouchableOpacity>

      {/* Vehicle List Button */}
      <TouchableOpacity
        style={styles.listButton}
        onPress={() => setShowVehicleList(true)}
      >
        <Ionicons name="list" size={22} color={COLORS.PRIMARY} />
        {stats.total > 0 && (
          <View style={styles.listBadge}>
            <Text style={styles.listBadgeText}>{stats.total}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchVehicles}>
        <Ionicons name="refresh" size={22} color={COLORS.PRIMARY} />
      </TouchableOpacity>

      {/* Follow Mode Button */}
      {selectedVehicle && (
        <TouchableOpacity
          style={[styles.followButton, followMode && styles.followButtonActive]}
          onPress={toggleFollowMode}
        >
          <Ionicons
            name={followMode ? "locate" : "locate-outline"}
            size={22}
            color={followMode ? COLORS.WHITE : COLORS.PRIMARY}
          />
        </TouchableOpacity>
      )}

      {/* Stats Bar */}
      {!selectedVehicle && (
        <TouchableOpacity
          style={styles.statsBar}
          onPress={() => setShowVehicleList(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.statsText}>
            {"\uD83D\uDE97"} {stats.total} {t("fleetMap.vehicle")}
            {" | "}
            <Text style={styles.activeText}>
              {"\u25CF"} {stats.online} {t("fleetMap.online")}
            </Text>
            {" | "}
            <Text style={styles.offlineText}>
              {"\u25CF"} {stats.offline} {t("fleetMap.offline")}
            </Text>
          </Text>
          {lastUpdate && (
            <Text style={styles.updateText}>
              {t("fleetMap.lastUpdate")}:{" "}
              {lastUpdate.toLocaleTimeString(
                i18n.language === "tr"
                  ? "tr-TR"
                  : i18n.language === "nl"
                    ? "nl-NL"
                    : "en-US"
              )}
            </Text>
          )}
          <View style={styles.statsHint}>
            <Ionicons name="chevron-up" size={14} color={COLORS.TEXT_MUTED} />
            <Text style={styles.statsHintText}>{t("fleetMap.tapForList")}</Text>
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.TEXT_MUTED,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    map: {
      flex: 1,
    },
    backButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      left: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xxl,
      ...COLORS.SHADOWS.md,
    },
    listButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      left: 72,
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xxl,
      ...COLORS.SHADOWS.md,
    },
    listBadge: {
      position: "absolute",
      top: -COLORS.SPACING.xs,
      right: -COLORS.SPACING.xs,
      minWidth: COLORS.SPACING.md,
      height: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: COLORS.SPACING.xs,
    },
    listBadgeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    refreshButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xxl,
      ...COLORS.SHADOWS.md,
    },
    followButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      right: 72,
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xxl,
      ...COLORS.SHADOWS.md,
    },
    followButtonActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    statsBar: {
      position: "absolute",
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      bottom: Platform.OS === "ios" ? 34 : COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      backgroundColor: COLORS.SURFACE,
      ...COLORS.SHADOWS.card,
    },
    statsText: {
      textAlign: "center",
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    activeText: {
      color: COLORS.SUCCESS,
    },
    offlineText: {
      color: COLORS.ERROR,
    },
    updateText: {
      textAlign: "center",
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    statsHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.xs,
    },
    statsHintText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginLeft: COLORS.SPACING.xs,
    },
  });

export default FleetMapScreen;
