/**
 * TulipFleet - Vehicle Track Screen
 * Faz 3: Gecmis Rota Goruntuleme + Playback
 *
 * Ozellikler:
 * - Polyline ile gecmis rota cizimi
 * - Start/End marker'lari
 * - Playback slider + Play/Pause
 * - Tarih secimi (Bugun / Son 1 Saat / Ozel)
 * - Rota istatistikleri
 *
 * @version 1.1.0 - UI System Guide v3 uyumlu
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
import { StartMarker } from "../../components/map/MapMarkers";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
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
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
      setError("Arac ID bulunamadi");
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
      setError("Rota verisi alinamadi");
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

        const lats = coords.map((c) => c.latitude);
        const lngs = coords.map((c) => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latDelta = Math.max(maxLat - minLat, 0.005) * 1.5;
        const lngDelta = Math.max(maxLng - minLng, 0.005) * 1.5;

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
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Rota yukleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={COLORS.ERROR} />
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
        {/* Polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeWidth={4}
            strokeColor={COLORS.PRIMARY}
          />
        )}

        {/* Start Marker */}
        {startPoint && (
          <Marker coordinate={startPoint} anchor={{ x: 0.5, y: 1 }}>
            <StartMarker />
          </Marker>
        )}

        {/* End Marker */}
        {endPoint && polylineCoords.length > 1 && (
          <Marker coordinate={endPoint} anchor={{ x: 0.5, y: 1 }}>
            <EndMarker />
          </Marker>
        )}

        {/* Playback Marker */}
        {currentPoint && (
          <Marker
            coordinate={{
              latitude: toFloat(currentPoint.latitude),
              longitude: toFloat(currentPoint.longitude),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <PlaybackMarker heading={currentPoint.heading || 0} />
          </Marker>
        )}
      </MapView>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.PRIMARY} />
      </TouchableOpacity>

      {/* Title */}
      <View style={styles.titleBar}>
        <Ionicons name="navigate" size={18} color={COLORS.PRIMARY} />
        <Text style={styles.titleText}>
          {vehiclePlate || "Arac"} - Gecmis Rota
        </Text>
      </View>

      {/* Time Preset Selector */}
      <View style={styles.presetBar}>
        {[
          { key: TIME_PRESETS.LAST_HOUR, label: "Son 1 Saat" },
          { key: TIME_PRESETS.LAST_3_HOURS, label: "Son 3 Saat" },
          { key: TIME_PRESETS.TODAY, label: "Bugun" },
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
              <Ionicons
                name="location-outline"
                size={16}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={styles.statValue}>{stats.pointCount}</Text>
              <Text style={styles.statLabel}>nokta</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="speedometer-outline"
                size={16}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={styles.statValue}>{stats.distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={styles.statValue}>{stats.duration}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="play-outline"
                size={16}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={styles.statValue}>
                {stats.startTime} - {stats.endTime}
              </Text>
            </View>
          </View>
        )}

        {/* No Data Message */}
        {points.length === 0 && (
          <View style={styles.noDataContainer}>
            <Ionicons name="map-outline" size={32} color={COLORS.TEXT_MUTED} />
            <Text style={styles.noDataText}>
              Bu zaman araliginda rota verisi bulunamadi
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
                minimumTrackTintColor={COLORS.PRIMARY}
                maximumTrackTintColor={COLORS.DIVIDER}
                thumbTintColor={COLORS.PRIMARY}
              />
              {currentPoint && (
                <Text style={styles.timeLabel}>
                  {formatTime(currentPoint.time)}
                  {currentPoint.speed != null &&
                    ` \u2022 ${Math.round(currentPoint.speed)} km/h`}
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
                <Ionicons name="refresh" size={20} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>

              {/* Play/Pause */}
              <TouchableOpacity
                style={[styles.controlBtn, styles.playBtn]}
                onPress={togglePlayback}
              >
                <Ionicons
                  name={playing ? "pause" : "play"}
                  size={24}
                  color={COLORS.WHITE}
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
    errorText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.ERROR,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.button,
    },
    retryText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
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
    titleBar: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      left: 56, // 16 + 32 + 8
      right: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      flexDirection: "row",
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    titleText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    presetBar: {
      position: "absolute",
      top: Platform.OS === "ios" ? 104 : 64,
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    presetBtn: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.button,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.xs,
    },
    presetBtnActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    presetText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
    },
    presetTextActive: {
      color: COLORS.WHITE,
    },
    bottomPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      paddingTop: COLORS.SPACING.md,
      paddingBottom: Platform.OS === "ios" ? 34 : COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.md,
      ...COLORS.SHADOWS.lg,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingBottom: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
    },
    noDataContainer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
    },
    noDataText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_MUTED,
      textAlign: "center",
    },
    playbackControls: {
      marginTop: COLORS.SPACING.sm,
    },
    sliderContainer: {
      marginBottom: COLORS.SPACING.sm,
    },
    sliderLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      textAlign: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    slider: {
      width: "100%",
      height: COLORS.SPACING.xxl,
    },
    timeLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      textAlign: "center",
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    controlBtn: {
      width: 44, // 8px grid
      height: 44,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.SECONDARY,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: COLORS.SPACING.sm,
    },
    playBtn: {
      width: 56,
      height: 56,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
    },
    speedText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    markerContainer: {
      alignItems: "center",
    },
    markerLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.xs,
      marginTop: 2,
      overflow: "hidden",
    },
    playbackMarker: {
      width: COLORS.SPACING.xxl,
      height: COLORS.SPACING.xxl,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: COLORS.WHITE,
      ...COLORS.SHADOWS.md,
    },
  });

export default VehicleTrackScreen;
