/**
 * TulipFleet - Vehicle Track Screen
 * Faz 3: Geçmiş Rota Görüntüleme + Playback
 *
 * Özellikler:
 * - Polyline ile geçmiş rota çizimi
 * - Start/End marker'ları
 * - Playback slider + Play/Pause
 * - Tarih seçimi (Bugün / Son 1 Saat / Özel)
 * - Rota istatistikleri
 *
 * Referans: TULIPFLEET_MASTER_SPEC.md > Faz 3
 *
 * @version 1.0.0
 * @date 27 Aralık 2025
 */

import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS } from "../../constants/config";
import { vehicleAPI } from "../../services/api";
import { calculateDistance, toFloat } from "../../utils/mapMath";

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_PRESETS = {
  TODAY: "today",
  LAST_HOUR: "last_hour",
  LAST_3_HOURS: "last_3_hours",
  CUSTOM: "custom",
};

const PLAYBACK_SPEEDS = [1, 2, 4];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Tarih preset'ine göre from/to hesapla
 */
const getDateRange = (preset) => {
  const now = new Date();
  let from;

  switch (preset) {
    case TIME_PRESETS.LAST_HOUR:
      from = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case TIME_PRESETS.LAST_3_HOURS:
      from = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      break;
    case TIME_PRESETS.TODAY:
    default:
      from = new Date(now.setHours(0, 0, 0, 0));
      break;
  }

  return {
    from: from.toISOString(),
    to: new Date().toISOString(),
  };
};

/**
 * Toplam mesafe hesapla (metre)
 */
const calculateTotalDistance = (points) => {
  if (!points || points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateDistance(
      toFloat(points[i - 1].latitude),
      toFloat(points[i - 1].longitude),
      toFloat(points[i].latitude),
      toFloat(points[i].longitude)
    );
  }
  return total;
};

/**
 * Süre formatla
 */
const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "-";

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins} dk`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours} sa ${mins} dk`;
};

/**
 * Zaman formatla
 */
const formatTime = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
};

// ============================================================================
// VEHICLE TRACK SCREEN COMPONENT
// ============================================================================

const VehicleTrackScreen = ({ route, navigation }) => {
  const { vehicleId, vehiclePlate } = route.params || {};
  const mapRef = useRef(null);

  // Data state
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState([]);
  const [error, setError] = useState(null);

  // Filter state
  const [timePreset, setTimePreset] = useState(TIME_PRESETS.TODAY);

  // Playback state
  const [playIndex, setPlayIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTrack = useCallback(async () => {
    if (!vehicleId) {
      setError("Araç ID bulunamadı");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPlayIndex(0);
    setPlaying(false);

    try {
      const { from, to } = getDateRange(timePreset);
      const response = await vehicleAPI.getTrack(vehicleId, from, to);

      const list = response?.points || response || [];
      setPoints(list);

      if (list.length > 0) {
        fitToTrack(list);
      }
    } catch (e) {
      console.error("[VehicleTrack] Fetch error:", e);
      setError("Rota verisi alınamadı");
    } finally {
      setLoading(false);
    }
  }, [vehicleId, timePreset]);

  useEffect(() => {
    fetchTrack();
  }, [fetchTrack]);

  // ============================================================================
  // MAP HELPERS
  // ============================================================================

  const fitToTrack = useCallback((list) => {
    if (!mapRef.current || !list || list.length === 0) return;

    setTimeout(() => {
      try {
        const coords = list.map((p) => ({
          latitude: toFloat(p.latitude),
          longitude: toFloat(p.longitude),
        }));

        // Koordinat sınırlarını hesapla
        const lats = coords.map((c) => c.latitude);
        const lngs = coords.map((c) => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Delta hesapla (minimum 0.005 ~ 500m görüş)
        const latDelta = Math.max(maxLat - minLat, 0.005) * 1.5;
        const lngDelta = Math.max(maxLng - minLng, 0.005) * 1.5;

        // Merkez hesapla ve bölgeye animasyon yap
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;

        mapRef.current?.animateToRegion(
          {
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: latDelta,
            longitudeDelta: lngDelta,
          },
          500
        );
      } catch (e) {
        console.log("[VehicleTrack] fitToTrack error:", e);
      }
    }, 800);
  }, []);

  // ============================================================================
  // PLAYBACK LOGIC
  // ============================================================================

  useEffect(() => {
    if (!playing) return;
    if (playIndex >= points.length - 1) {
      setPlaying(false);
      return;
    }

    const interval = 700 / playbackSpeed;
    const timer = setTimeout(() => {
      setPlayIndex((i) => i + 1);
    }, interval);

    return () => clearTimeout(timer);
  }, [playing, playIndex, points.length, playbackSpeed]);

  // Playback pozisyonu değişince kamerayı takip et
  useEffect(() => {
    if (!playing || !mapRef.current || !points[playIndex]) return;

    const point = points[playIndex];
    mapRef.current.animateCamera(
      {
        center: {
          latitude: toFloat(point.latitude),
          longitude: toFloat(point.longitude),
        },
      },
      { duration: 300 }
    );
  }, [playIndex, playing, points]);

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const polylineCoords = useMemo(
    () =>
      points.map((p) => ({
        latitude: toFloat(p.latitude),
        longitude: toFloat(p.longitude),
      })),
    [points]
  );

  const startPoint = polylineCoords[0];
  const endPoint = polylineCoords[polylineCoords.length - 1];
  const currentPoint = points[playIndex];

  const stats = useMemo(() => {
    if (points.length === 0) return null;

    const totalDistance = calculateTotalDistance(points);
    const startTime = points[0]?.time;
    const endTime = points[points.length - 1]?.time;

    return {
      pointCount: points.length,
      distance:
        totalDistance > 1000
          ? `${(totalDistance / 1000).toFixed(1)} km`
          : `${Math.round(totalDistance)} m`,
      duration: formatDuration(startTime, endTime),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
    };
  }, [points]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleTimePresetChange = (preset) => {
    setTimePreset(preset);
  };

  const handleSliderChange = (value) => {
    setPlayIndex(Math.floor(value));
    setPlaying(false);
  };

  const togglePlayback = () => {
    if (playIndex >= points.length - 1) {
      setPlayIndex(0);
    }
    setPlaying((p) => !p);
  };

  const cycleSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
    setPlaybackSpeed(PLAYBACK_SPEEDS[nextIndex]);
  };

  const resetPlayback = () => {
    setPlayIndex(0);
    setPlaying(false);
  };

  // ============================================================================
  // LOADING / ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Rota yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle"
          size={48}
          color={COLORS.error || "#EF4444"}
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTrack}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
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
        onMapReady={() => {
          if (points.length > 0) {
            fitToTrack(points);
          }
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Polyline - Rota çizgisi */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeWidth={4}
            strokeColor={COLORS.primary}
          />
        )}

        {/* Start Marker - Yeşil */}
        {startPoint && (
          <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.markerContainer}>
              <Ionicons name="flag" size={28} color="#10B981" />
              <Text style={styles.markerLabel}>Başlangıç</Text>
            </View>
          </Marker>
        )}

        {/* End Marker - Kırmızı */}
        {endPoint && polylineCoords.length > 1 && (
          <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.markerContainer}>
              <Ionicons name="flag" size={28} color="#EF4444" />
              <Text style={styles.markerLabel}>Bitiş</Text>
            </View>
          </Marker>
        )}

        {/* Playback Marker - Mavi araç */}
        {currentPoint && (
          <Marker
            coordinate={{
              latitude: toFloat(currentPoint.latitude),
              longitude: toFloat(currentPoint.longitude),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.playbackMarker}>
              <Ionicons name="car" size={24} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleBar}>
        <Ionicons name="navigate" size={18} color={COLORS.primary} />
        <Text style={styles.titleText}>
          {vehiclePlate || "Araç"} - Geçmiş Rota
        </Text>
      </View>

      {/* Time Preset Selector */}
      <View style={styles.presetBar}>
        {[
          { key: TIME_PRESETS.LAST_HOUR, label: "Son 1 Saat" },
          { key: TIME_PRESETS.LAST_3_HOURS, label: "Son 3 Saat" },
          { key: TIME_PRESETS.TODAY, label: "Bugün" },
        ].map((preset) => (
          <TouchableOpacity
            key={preset.key}
            style={[
              styles.presetBtn,
              timePreset === preset.key && styles.presetBtnActive,
            ]}
            onPress={() => handleTimePresetChange(preset.key)}
          >
            <Text
              style={[
                styles.presetText,
                timePreset === preset.key && styles.presetTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location-outline" size={16} color={COLORS.gray} />
              <Text style={styles.statValue}>{stats.pointCount}</Text>
              <Text style={styles.statLabel}>nokta</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="speedometer-outline"
                size={16}
                color={COLORS.gray}
              />
              <Text style={styles.statValue}>{stats.distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.gray} />
              <Text style={styles.statValue}>{stats.duration}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="play-outline" size={16} color={COLORS.gray} />
              <Text style={styles.statValue}>
                {stats.startTime} - {stats.endTime}
              </Text>
            </View>
          </View>
        )}

        {/* No Data Message */}
        {points.length === 0 && (
          <View style={styles.noDataContainer}>
            <Ionicons name="map-outline" size={32} color={COLORS.gray} />
            <Text style={styles.noDataText}>
              Bu zaman aralığında rota verisi bulunamadı
            </Text>
          </View>
        )}

        {/* Playback Controls */}
        {points.length > 1 && (
          <View style={styles.playbackControls}>
            {/* Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>
                {playIndex + 1} / {points.length}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={points.length - 1}
                value={playIndex}
                onValueChange={handleSliderChange}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor={COLORS.primary}
              />
              {currentPoint && (
                <Text style={styles.timeLabel}>
                  {formatTime(currentPoint.time)}
                  {currentPoint.speed != null &&
                    ` • ${Math.round(currentPoint.speed)} km/h`}
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              {/* Reset */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={resetPlayback}
              >
                <Ionicons name="refresh" size={20} color={COLORS.gray} />
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                style={[styles.controlBtn, styles.playBtn]}
                onPress={togglePlayback}
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              {/* Speed */}
              <TouchableOpacity style={styles.controlBtn} onPress={cycleSpeed}>
                <Text style={styles.speedText}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || "#F9FAFB",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background || "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.error || "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
  titleBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 14,
    left: 60,
    right: 14,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  titleText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  presetBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 64,
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: 8,
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  presetTextActive: {
    color: "#FFFFFF",
  },
  bottomPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noDataText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.gray,
    textAlign: "center",
  },
  playbackControls: {
    marginTop: 12,
  },
  sliderContainer: {
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: "center",
    marginBottom: 4,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
  },
  speedText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
    backgroundColor: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    overflow: "hidden",
  },
  playbackMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default VehicleTrackScreen;
