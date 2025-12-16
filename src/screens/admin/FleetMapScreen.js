/**
 * TulipFleet - Fleet Map Screen
 * Paket A: Pro Marker System
 *
 * Özellikler:
 * - Real-time vehicle tracking with smooth animations (A.2)
 * - Follow mode with drag-to-disable (A.3)
 * - Z-index control for selected marker (A.4)
 * - Performance optimized updates (A.4)
 * - Type normalized data (A.1)
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
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import VehicleInfoSheet from "../../components/map/VehicleInfoSheet";
import VehicleMarker from "../../components/map/VehicleMarker";
import { COLORS } from "../../constants/config";
import { vehicleAPI } from "../../services/api";
import {
  createFollowRegion,
  FOLLOW_CONFIG,
  normalizeVehicle,
  shouldUpdateVehicle,
  toFloat,
} from "../../utils/mapMath";

// ============================================================================
// CONSTANTS
// ============================================================================

const REFRESH_INTERVAL = 10000; // 10 saniye (daha sık güncelleme)
const INITIAL_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

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

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  // Normalize edilmiş araçlar
  const normalizedVehicles = useMemo(() => {
    return vehicles
      .map(normalizeVehicle)
      .filter((v) => v && v.latitude && v.longitude);
  }, [vehicles]);

  // Seçili araç
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return normalizedVehicles.find((v) => v.id === selectedVehicleId) || null;
  }, [normalizedVehicles, selectedVehicleId]);

  // İstatistikler
  const stats = useMemo(
    () => ({
      total: normalizedVehicles.length,
      active: normalizedVehicles.filter((v) => v.status === "in_use").length,
      available: normalizedVehicles.filter((v) => v.status === "available")
        .length,
    }),
    [normalizedVehicles]
  );

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await vehicleAPI.getAll();
      const list = res.vehicles || [];

      // A.4 Performance: Sadece değişen araçları logla
      const previousMap = new Map(
        previousVehiclesRef.current.map((v) => [v.id, v])
      );
      const updatedCount = list.filter((v) =>
        shouldUpdateVehicle(previousMap.get(v.id), v)
      ).length;

      console.log(
        `[FleetMap] Fetched: ${list.length} total, ${updatedCount} updated`
      );

      // State güncelle
      setVehicles(list);
      setLastUpdate(new Date());
      previousVehiclesRef.current = list;

      // İlk yüklemede fit to coordinates
      if (loading && list.length > 0) {
        const located = list.filter((v) => v.latitude && v.longitude);
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

  // A.3 Follow Mode: Kamera takibi
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

  // A.3: Araç seçimi
  const handleVehiclePress = useCallback(
    (vehicle) => {
      const isSameVehicle = selectedVehicleId === vehicle.id;

      if (isSameVehicle) {
        // Aynı araç tekrar seçildi → follow mode aç
        setFollowMode(true);
      } else {
        // Farklı araç seçildi
        setSelectedVehicleId(vehicle.id);
        setFollowMode(true); // Yeni araç seçilince follow başlat

        // Kamerayı araca götür
        if (mapRef.current) {
          mapRef.current.animateToRegion(
            createFollowRegion(vehicle),
            FOLLOW_CONFIG.ANIMATION_DURATION
          );
        }
      }
    },
    [selectedVehicleId]
  );

  // A.3: Harita drag → follow kapat
  const handleMapPanDrag = useCallback(() => {
    if (followModeActiveRef.current) {
      console.log("[FleetMap] User dragged map, disabling follow mode");
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
        showsUserLocation={false}
        showsMyLocationButton={false}
        onPanDrag={handleMapPanDrag}
        onPress={() => {
          // Boş alana tıklanınca sheet kapat (opsiyonel)
          // handleCloseSheet();
        }}
      >
        {/* A.4: Markers - selectedVehicleId en sona render (zIndex backup) */}
        {normalizedVehicles
          .filter((v) => v.id !== selectedVehicleId)
          .map((vehicle) => (
            <VehicleMarker
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={false}
              onPress={handleVehiclePress}
              tracksViewChanges={false}
            />
          ))}

        {/* Seçili marker en son render (her zaman üstte) */}
        {selectedVehicle && (
          <VehicleMarker
            key={`selected-${selectedVehicle.id}`}
            vehicle={selectedVehicle}
            isSelected={true}
            onPress={handleVehiclePress}
            tracksViewChanges={true}
          />
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchVehicles}>
        <Ionicons name="refresh" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* A.3: Follow Mode Indicator */}
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

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          🚗 {stats.total} Araç |
          <Text style={styles.activeText}> ● {stats.active} Aktif</Text> |
          <Text style={styles.availableText}> ● {stats.available} Müsait</Text>
        </Text>
        {lastUpdate && (
          <Text style={styles.updateText}>
            Son güncelleme: {lastUpdate.toLocaleTimeString("tr-TR")}
          </Text>
        )}
      </View>

      {/* Vehicle Info Sheet */}
      {selectedVehicle && (
        <VehicleInfoSheet
          vehicle={selectedVehicle}
          onClose={handleCloseSheet}
          isFollowing={followMode}
          onToggleFollow={toggleFollowMode}
          isTablet={false}
        />
      )}
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
});

// ============================================================================
// EXPORTS
// ============================================================================

export default FleetMapScreen;
