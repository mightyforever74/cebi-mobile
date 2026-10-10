// src/screens/driver/DriverRouteMapScreen.js
// TulipFleet - Driver Navigation Map Screen
// Updated: 19 Feb 2026 - UTF-8 cleanup, smart down sample, route fixes
// Fixes: navInfoBar moved to bottom, complete button as icon, marker slide animation

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import WaypointsPanel from "../../components/driver/WaypointsPanel";
import { DestinationMarker, NavMarker } from "../../components/map/MapMarkers";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import i18n from "../../locales/i18n";
import { driverAPI, driverTaskAPI, vehicleAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error(
    "[Nav] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY missing - polyline will fail"
  );
}

// Waypoint limiti (Google Directions API limiti 25)
const MAX_WAYPOINTS = 10;

// Route nokta limiti (performans icin)
const MAX_ROUTE_POINTS = 500;

// Geocoding cache - ayni adres icin tekrar API cagrisini onle
const geocodeCache = new Map();
const GEOCODE_CACHE_MAX = 200;

const setGeocodeCacheItem = (key, coords) => {
  if (geocodeCache.size >= GEOCODE_CACHE_MAX && !geocodeCache.has(key)) {
    // En eski entry'yi sil (FIFO)
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, coords);
};

// ============================================
// makeStyles - BUYUK HARF TOKEN'LAR
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.md,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    errorText: {
      marginTop: COLORS.SPACING.md,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingHorizontal: COLORS.SPACING.xl,
    },
    retryBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      marginTop: COLORS.SPACING.lg,
      // gap removed
    },
    retryBtnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },

    // Header Buttons
    backBtn: {
      position: "absolute",
      top: COLORS.SPACING.xxxl,
      left: COLORS.SPACING.md,
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SURFACE,
      alignItems: "center",
      justifyContent: "center",
      ...COLORS.SHADOWS.card,
    },
    headerBtn: {
      position: "absolute",
      top: COLORS.SPACING.xxxl,
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SURFACE,
      alignItems: "center",
      justifyContent: "center",
      ...COLORS.SHADOWS.card,
    },
    centerBtn: {
      right: COLORS.SPACING.md,
    },
    fitBtn: {
      right: 70,
    },
    followBtn: {
      right: 124,
      borderWidth: 2,
      borderColor: COLORS.SUCCESS,
    },
    followBtnActive: {
      backgroundColor: COLORS.SUCCESS,
      borderColor: COLORS.SUCCESS,
    },

    // Markers
    locationMarker: {
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      borderWidth: 3,
      borderColor: COLORS.WHITE,
      elevation: 4,
    },
    navMarkerContainer: {
      alignItems: "center",
      justifyContent: "center",
    },
    navMarkerOuter: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.xxl,
      backgroundColor: COLORS.PRIMARY + "33", // 0.2 opacity
      alignItems: "center",
      justifyContent: "center",
    },
    navMarkerInner: {
      width: 36,
      height: 36,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: COLORS.WHITE,
      elevation: 4,
    },
    navArrow: {
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderBottomWidth: 14,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderBottomColor: COLORS.WHITE,
      marginTop: -2,
    },
    destinationMarker: {
      backgroundColor: COLORS.ERROR,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      borderWidth: 3,
      borderColor: COLORS.WHITE,
      elevation: 4,
    },

    // COMPACT BOTTOM BAR (in_progress)
    compactBottomBar: {
      position: "absolute",
      bottom: COLORS.SPACING.lg,
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.lg,
      ...COLORS.SHADOWS.card,
    },
    compactItem: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed
    },
    compactValue: {
      color: COLORS.TEXT,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    compactTaskNo: {
      color: COLORS.PRIMARY,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    compactDivider: {
      width: 1,
      height: 20,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.sm,
    },
    compactCompleteBtn: {
      marginLeft: "auto",
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.xxl,
      backgroundColor: COLORS.SUCCESS,
      alignItems: "center",
      justifyContent: "center",
      ...COLORS.SHADOWS.card,
    },

    // Drive Conditions Banner
    condBanner: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 0,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
    },
    condBannerText: {
      flex: 1,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.sm,
    },
    condSpeakBtn: {
      padding: COLORS.SPACING.xs,
    },

    // Route Loading
    routeLoadingBar: {
      position: "absolute",
      top: 110, // header butonlari 48px + bosluk — sabit kalmali
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed
    },
    routeLoadingText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },

    // Pending Review Banner
    pendingBanner: {
      position: "absolute",
      bottom: COLORS.SPACING.lg,
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.lg,
      ...COLORS.SHADOWS.card,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.WARNING,
    },
    pendingIconContainer: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.INPUT_ERROR,
      alignItems: "center",
      justifyContent: "center",
    },
    pendingTextContainer: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm,
    },
    pendingTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    pendingSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    pendingActions: {
      flexDirection: "row",
      // gap removed
    },
    rejectBtn: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.INPUT_ERROR,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptBtn: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SUCCESS,
      alignItems: "center",
      justifyContent: "center",
    },

    // Task Card (accepted)
    taskCard: {
      position: "absolute",
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      bottom: COLORS.SPACING.lg,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.xl,
      padding: COLORS.SPACING.lg,
      ...COLORS.SHADOWS.card,
    },
    taskHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    taskCode: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.normal,
      marginTop: 2,
    },
    taskTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.xl,
      // gap removed
    },
    statusText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
    },
    locationsContainer: {
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      // gap removed
    },
    locationDot: {
      width: 12,
      height: 12,
      borderRadius: COLORS.RADIUS.sm,
      marginTop: COLORS.SPACING.xs,
    },
    locationLine: {
      width: 2,
      height: 16,
      backgroundColor: COLORS.DIVIDER,
      marginLeft: COLORS.SPACING.xs,
      marginVertical: COLORS.SPACING.xs,
    },
    locationInfo: {
      flex: 1,
    },
    locationLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    locationText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      marginTop: 2,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    distanceContainer: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed
      marginBottom: COLORS.SPACING.md,
    },
    distanceText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    startBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      // gap removed
    },
    startBtnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
    },

    // Waypoints Panel placement (compactBottomBar kaldÄ±rÄ±ldÄ±, bottom azaltÄ±ldÄ±)
    waypointsPanel: {
      position: "absolute",
      bottom: COLORS.SPACING.md,
      left: 0,
      right: 0,
    },

    // Harita uzerindeki waypoint marker'lari
    waypointMarker: {
      width: 28,
      height: 28,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.MUTED,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: COLORS.WHITE,
      ...COLORS.SHADOWS.card,
    },
    waypointCompleted: {
      backgroundColor: COLORS.SUCCESS,
    },
    waypointCurrent: {
      backgroundColor: COLORS.PRIMARY,
      transform: [{ scale: 1.2 }],
    },
    waypointMarkerText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
  });

// ============================================
// COMPONENT
// ============================================
const DriverRouteMapScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  const { COLORS, isDark } = useTheme();

  // Google Maps dark mode style
  const darkMapStyle = isDark
    ? [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
          featureType: "administrative.locality",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "poi.park",
          elementType: "geometry",
          stylers: [{ color: "#263c3f" }],
        },
        {
          featureType: "poi.park",
          elementType: "labels.text.fill",
          stylers: [{ color: "#6b9a76" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#38414e" }],
        },
        {
          featureType: "road",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212a37" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#9ca5b3" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#746855" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry.stroke",
          stylers: [{ color: "#1f2835" }],
        },
        {
          featureType: "road.highway",
          elementType: "labels.text.fill",
          stylers: [{ color: "#f3d19c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f3948" }],
        },
        {
          featureType: "transit.station",
          elementType: "labels.text.fill",
          stylers: [{ color: "#d59563" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#17263c" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.stroke",
          stylers: [{ color: "#17263c" }],
        },
      ]
    : [];

  // 1) normalizeCoords
  const normalizeCoords = useCallback((c) => {
    if (!c) return null;
    if (typeof c.latitude === "number" && typeof c.longitude === "number")
      return c;
    const lat = c.lat ?? c.latitude;
    const lng = c.lng ?? c.longitude;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  }, []);

  // 2) normalizeTaskPayload
  const normalizeTaskPayload = useCallback((raw) => {
    if (!raw) return raw;

    let route_json = raw.route_json;
    if (typeof route_json === "string") {
      try {
        route_json = JSON.parse(route_json);
      } catch {
        route_json = null;
      }
    }

    let waypoints = raw.waypoints;
    if (typeof waypoints === "string") {
      try {
        waypoints = JSON.parse(waypoints);
      } catch {
        waypoints = [];
      }
    }

    return { ...raw, route_json, waypoints };
  }, []);

  // 3) rawInitialTask
  const rawInitialTask = route?.params?.task || null;

  // 4) initialTask
  const initialTask = rawInitialTask
    ? normalizeTaskPayload(rawInitialTask)
    : null;

  // Initial coords hesapla (ilk render'da null olmasin)
  const getInitialDestinationCoords = () => {
    if (!initialTask) return null;

    const c1 = initialTask?.route_json?.destination_coords;
    const n1 = normalizeCoords(c1);
    if (n1) return n1;

    const { dest_lat, dest_lng } = initialTask?.route_json || {};
    if (dest_lat && dest_lng) {
      const n2 = normalizeCoords({ lat: dest_lat, lng: dest_lng });
      if (n2) return n2;
    }

    const wps = initialTask?.waypoints;
    if (Array.isArray(wps) && wps.length > 0) {
      const n3 = normalizeCoords(wps[wps.length - 1]);
      if (n3) return n3;
    }

    return null;
  };

  const [task, setTask] = useState(initialTask);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [navigationInfo, setNavigationInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [heading, setHeading] = useState(0);
  const [followMode, setFollowMode] = useState(true);
  const [geocodedDestination, setGeocodedDestination] = useState(
    getInitialDestinationCoords
  );
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);

  // Drive Conditions (trafik + hava banner)
  const [driveConditions, setDriveConditions] = useState(null);
  const [odometerModal, setOdometerModal] = useState(false);
  const [odometerInput, setOdometerInput] = useState("");
  const [conditionsLoading, setConditionsLoading] = useState(false);

  const routeFetchedRef = useRef(false);
  const lastRouteTaskIdRef = useRef(null);
  const watchSubscriptionRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Smooth marker animation duration (ms)
  const MARKER_ANIMATION_DURATION = 2000;

  // ======
  // LIFECYCLE
  // ======

  useEffect(() => {
    loadActiveTask();
    getLocation();

    return () => {
      stopLocationTracking();
    };
  }, []);

  // BUG-3a fix (2026-07-31): gorev baska ekrandan baslatilip bu ekrana
  // donulunce task state bayat kaliyordu (mount-only fetch) -> rota cizilmiyordu.
  // Focus'ta aktif gorevi tazele; kill&relaunch workaround'u tarihe karisir.
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadActiveTask();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!task || task.status !== "in_progress") {
      lastRouteTaskIdRef.current = null;
      routeFetchedRef.current = false;
      return;
    }

    if (!location) return;
    if (!geocodedDestination) return;

    const routeKey =
      task.id +
      ":" +
      geocodedDestination.latitude +
      ":" +
      geocodedDestination.longitude;
    if (lastRouteTaskIdRef.current === routeKey) return;

    lastRouteTaskIdRef.current = routeKey;
    routeFetchedRef.current = true;
    fetchRouteAndStartNav();
  }, [task?.status, task?.id, location, geocodedDestination]);

  // ======
  // GEOCODING - Text adres -> Koordinat (cache + abort + normalize)
  // ======

  // Stabil dependency key (JSON.stringify yerine)
  const destCoordsKey = useMemo(() => {
    const c = task?.route_json?.destination_coords;
    if (!c) return "";
    const n = normalizeCoords(c);
    return n ? `${n.latitude},${n.longitude}` : "";
  }, [task?.route_json?.destination_coords, normalizeCoords]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const geocodeDestination = async () => {
      // 1. route_json'dan koordinat (normalize edilmis)
      if (task?.route_json?.destination_coords) {
        const normalized = normalizeCoords(task.route_json.destination_coords);
        if (normalized) {
          setGeocodedDestination(normalized);
          return;
        }
      }

      // 2. dest_lat/dest_lng
      if (task?.route_json?.dest_lat && task?.route_json?.dest_lng) {
        const normalized = normalizeCoords({
          lat: task.route_json.dest_lat,
          lng: task.route_json.dest_lng,
        });
        if (normalized) {
          setGeocodedDestination(normalized);
          return;
        }
      }

      // 3. waypoints'ten son nokta
      if (task?.waypoints?.length > 0) {
        const last = task.waypoints[task.waypoints.length - 1];
        const normalized = normalizeCoords(last);
        if (normalized) {
          setGeocodedDestination(normalized);
          return;
        }
      }

      // 4. Text adres varsa Geocoding API ile koordinat al
      const textAddress = task?.end_location;
      if (
        !textAddress ||
        typeof textAddress !== "string" ||
        textAddress.trim() === ""
      ) {
        setGeocodedDestination(null);
        return;
      }

      // Cache kontrol
      const cacheKey = textAddress.trim().toLowerCase();
      if (geocodeCache.has(cacheKey)) {
        console.log("[Nav] Geocode cache hit:", cacheKey);
        setGeocodedDestination(geocodeCache.get(cacheKey));
        return;
      }

      try {
        console.log("[Nav] Geocoding destination:", textAddress);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          textAddress
        )}&key=${GOOGLE_MAPS_API_KEY}&language=${i18n.language === "ku" ? "en" : i18n.language}&region=${i18n.language === "ku" ? "en" : i18n.language}`;

        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();

        if (cancelled) return;

        if (data.status === "OK" && data.results?.length > 0) {
          const { lat, lng } = data.results[0].geometry.location;
          const coords = { latitude: lat, longitude: lng };
          console.log("[Nav] Geocoded:", textAddress, "->", lat, lng);

          // Cache'e kaydet (limit kontrollu)
          setGeocodeCacheItem(cacheKey, coords);
          setGeocodedDestination(coords);
        } else {
          // Detayli hata loglari
          switch (data.status) {
            case "ZERO_RESULTS":
              console.log("[Nav] Geocoding: adres bulunamadi:", textAddress);
              break;
            case "OVER_QUERY_LIMIT":
              console.log("[Nav] Geocoding: API limit doldu!");
              break;
            case "REQUEST_DENIED":
              console.log(
                "[Nav] Geocoding: API key/izin sorunu:",
                data.error_message
              );
              break;
            case "INVALID_REQUEST":
              console.log("[Nav] Geocoding: gecersiz istek:", textAddress);
              break;
            default:
              console.log(
                "[Nav] Geocoding failed:",
                data.status,
                data.error_message || ""
              );
          }
          setGeocodedDestination(null);
        }
      } catch (error) {
        if (cancelled) return;
        // AbortError ise sessizce gec
        if (error.name !== "AbortError") {
          console.log("[Nav] Geocoding error:", error.message);
        }
        setGeocodedDestination(null);
      }
    };

    if (task) {
      geocodeDestination();
    } else {
      setGeocodedDestination(null);
    }

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    task?.id,
    task?.end_location,
    task?.route_json?.dest_lat,
    task?.route_json?.dest_lng,
    destCoordsKey,
    task?.waypoints?.length,
    normalizeCoords,
  ]);

  // =========
  // DATA LOADING
  // =========

  // Drive Conditions fetch
  const fetchDriveConditions = async () => {
    setConditionsLoading(true);
    try {
      const [trafficRes, weatherRes] = await Promise.allSettled([
        driverAPI.getRouteTraffic(),
        driverAPI.getRouteWeather(i18n.language || "en"),
      ]);
      setDriveConditions({
        traffic:
          trafficRes.status === "fulfilled" ? trafficRes.value?.traffic : null,
        weather:
          weatherRes.status === "fulfilled" ? weatherRes.value?.weather : null,
      });
    } catch (err) {
      console.log("[RouteMap] DriveConditions error:", err);
    } finally {
      setConditionsLoading(false);
    }
  };

  const loadActiveTask = async () => {
    try {
      const res = await driverTaskAPI.getMyTasks();
      const activeTask =
        res.tasks?.find((t) => t.status === "in_progress") ||
        res.tasks?.find((t) => t.status === "accepted") ||
        res.tasks?.find((t) => t.status === "assigned") ||
        res.tasks?.find((t) => t.status === "pending_review") ||
        null;
      const active = activeTask ? normalizeTaskPayload(activeTask) : null;
      setTask(active);
      if (active) fetchDriveConditions();
    } catch (e) {
      console.log("[Nav] Task load error:", e);
    }
  };

  const getLocation = async () => {
    try {
      // Resolve vehicle id: prefer task.vehicle_id, fallback to driver's assigned vehicle
      const resolveVehicleId = async () => {
        if (task?.vehicle_id) return task.vehicle_id;
        try {
          const resp = await driverAPI.getVehicle();
          const vehicle = resp?.vehicle || resp;
          return vehicle?.id || null;
        } catch (e) {
          return null;
        }
      };

      const vehicleId = await resolveVehicleId();
      if (!vehicleId) {
        setLocationError(t("routeMap.vehicleNotFound"));
        setLoading(false);
        return;
      }

      const res = await vehicleAPI.getLatestLocation(vehicleId);
      // Normalize response: backend may return { location: {...} } or raw coords
      const loc = res?.location || res?.data || res;
      if (loc && loc.latitude && loc.longitude) {
        setLocation({
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
        });
        if (loc.heading !== undefined && loc.heading !== null)
          setHeading(parseFloat(loc.heading) || 0);
      } else {
        setLocationError(t("routeMap.locationNotAvailable"));
      }
    } catch (e) {
      console.log("[Nav] Location error:", e);
      setLocationError(t("routeMap.locationNotAvailable"));
    } finally {
      setLoading(false);
    }
  };

  // ====
  // GOOGLE DIRECTIONS API
  // ======

  const decodePolyline = (encoded) => {
    if (!encoded || typeof encoded !== "string") return [];

    const points = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const downsampleRoute = (points, maxPoints = MAX_ROUTE_POINTS) => {
    if (!points || points.length <= maxPoints) return points;

    // Ramer-Douglas-Peucker: virajlari koruyarak nokta azaltir
    const perpDist = (p, a, b) => {
      const dx = b.longitude - a.longitude;
      const dy = b.latitude - a.latitude;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) {
        const ex = p.longitude - a.longitude;
        const ey = p.latitude - a.latitude;
        return Math.sqrt(ex * ex + ey * ey);
      }
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.longitude - a.longitude) * dx + (p.latitude - a.latitude) * dy) /
            lenSq
        )
      );
      const projLng = a.longitude + t * dx;
      const projLat = a.latitude + t * dy;
      const ex = p.longitude - projLng;
      const ey = p.latitude - projLat;
      return Math.sqrt(ex * ex + ey * ey);
    };

    const rdp = (pts, eps) => {
      if (pts.length <= 2) return pts;
      let maxD = 0,
        idx = 0;
      const first = pts[0],
        last = pts[pts.length - 1];
      for (let i = 1; i < pts.length - 1; i++) {
        const d = perpDist(pts[i], first, last);
        if (d > maxD) {
          maxD = d;
          idx = i;
        }
      }
      if (maxD > eps) {
        const left = rdp(pts.slice(0, idx + 1), eps);
        const right = rdp(pts.slice(idx), eps);
        return left.slice(0, -1).concat(right);
      }
      return [first, last];
    };

    // Adaptive epsilon: kucuk baslayip buyuterek maxPoints'e yakinlastir
    let eps = 0.00005; // ~5m
    let result = rdp(points, eps);
    let iterations = 0;
    while (result.length > maxPoints && iterations < 10) {
      eps *= 2;
      result = rdp(points, eps);
      iterations++;
    }

    console.log(
      `[Nav] Smart downsample: ${points.length} -> ${result.length} points (eps=${eps.toFixed(6)})`
    );

    // Guard: RDP cok agresif sadeleÅŸtiyse orijinal noktalara geri don
    if (result.length < 50)
      return points.slice(0, Math.min(points.length, maxPoints));

    return result;
  };

  // Helper: pushDedup - only push if not duplicate (prevents zigzag artifacts)
  const pushDedup = (arr, pts) => {
    for (const p of pts) {
      const last = arr[arr.length - 1];
      if (
        !last ||
        Math.abs(last.latitude - p.latitude) > 1e-6 ||
        Math.abs(last.longitude - p.longitude) > 1e-6
      ) {
        arr.push(p);
      }
    }
  };

  const fetchRouteFromGoogle = async (origin, destination, waypoints = []) => {
    try {
      const limitedWaypoints = waypoints.slice(0, MAX_WAYPOINTS);
      if (waypoints.length > MAX_WAYPOINTS) {
        console.log(
          `[Nav] Waypoints limited: ${waypoints.length} -> ${MAX_WAYPOINTS}`
        );
      }

      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      if (limitedWaypoints.length > 0) {
        const waypointStr = limitedWaypoints
          .map((wp) => `${wp.latitude},${wp.longitude}`)
          .join("|");
        url += `&waypoints=${encodeURIComponent(waypointStr)}`;
      }

      console.log("[Nav] Fetching route from Google Directions API...");
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        //  BEST: build path from legs[].steps[].polyline (most road-accurate)
        const stepCoords = [];
        (route.legs || []).forEach((leg) => {
          (leg.steps || []).forEach((step) => {
            const pts = step?.polyline?.points;
            const decoded = decodePolyline(pts);
            if (decoded.length) pushDedup(stepCoords, decoded);
          });
        });

        if (stepCoords.length > 0) {
          const sampled = stepCoords; // downsample KAPALI - steps polyline zaten yol geometrisini birebir verir
          let totalDistance = 0;
          let totalDuration = 0;
          (route.legs || []).forEach((leg) => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
          });

          return {
            coordinates: sampled,
            distance: totalDistance / 1000,
            duration: Math.ceil(totalDuration / 60),
          };
        }

        //  1) overview_path varsa onu kullan (daha guvenilir yol geometrisi)
        if (
          Array.isArray(route.overview_path) &&
          route.overview_path.length > 0
        ) {
          let pathCoords = route.overview_path.map((p) => ({
            latitude: p.lat,
            longitude: p.lng,
          }));
          pathCoords = downsampleRoute(pathCoords);

          let totalDistance = 0;
          let totalDuration = 0;
          (route.legs || []).forEach((leg) => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
          });

          return {
            coordinates: pathCoords,
            distance: totalDistance / 1000,
            duration: Math.ceil(totalDuration / 60),
          };
        }

        //  2) fallback: overview_polyline decode (mevcut davranisin)
        const points = route.overview_polyline?.points;
        let decodedPoints = decodePolyline(points);
        decodedPoints = downsampleRoute(decodedPoints);

        let totalDistance = 0;
        let totalDuration = 0;
        (route.legs || []).forEach((leg) => {
          totalDistance += leg.distance?.value || 0;
          totalDuration += leg.duration?.value || 0;
        });

        console.log(
          "[Nav] Route fetched:",
          decodedPoints.length,
          "points,",
          (totalDistance / 1000).toFixed(1),
          "km,",
          Math.ceil(totalDuration / 60),
          "min"
        );

        return {
          coordinates: decodedPoints,
          distance: totalDistance / 1000,
          duration: Math.ceil(totalDuration / 60),
        };
      } else {
        console.log(
          "[Nav] Directions API error:",
          data.status,
          data.error_message || ""
        );
        return null;
      }
    } catch (error) {
      console.log("[Nav] Directions API fetch error:", error.message || error);
      return null;
    }
  };

  // ======
  // NAVIGATION & ROUTE
  // ======

  const fetchRouteAndStartNav = async () => {
    if (!location) {
      console.log("[Nav] No location, skipping route fetch");
      return;
    }

    const endCoords = getEndLocationCoords();
    if (!endCoords) {
      console.log("[Nav] No destination coordinates, skipping route fetch");
      return;
    }

    setRouteLoading(true);

    try {
      stopLocationTracking();

      //  Waypoints: gorev ara noktalari
      let waypoints = (task?.waypoints || [])
        .map((wp) => {
          if (wp.lat && wp.lng) return { latitude: wp.lat, longitude: wp.lng };
          if (wp.latitude && wp.longitude)
            return { latitude: wp.latitude, longitude: wp.longitude };
          return null;
        })
        .filter(Boolean);

      //  FIX: Gorevin baslangic noktasini (origin_coords) ilk waypoint olarak ekle
      // Arac (ESP32 GPS) gorevin origin'inden farkli yerde olabilir.
      // rnek: Arac stanbul'da, gorev Ankara'dan basliyor -> Ankara ilk waypoint olmali.
      const sameCoord = (a, b, eps = 1e-4) =>
        Math.abs(a.latitude - b.latitude) < eps &&
        Math.abs(a.longitude - b.longitude) < eps;

      const originCoords = normalizeCoords(task?.route_json?.origin_coords);
      if (
        originCoords &&
        (!waypoints[0] || !sameCoord(waypoints[0], originCoords))
      ) {
        waypoints = [originCoords, ...waypoints];
        console.log("[Nav] Added task origin as first waypoint:", originCoords);
      }

      const routeData = await fetchRouteFromGoogle(
        { latitude: location.latitude, longitude: location.longitude },
        endCoords,
        waypoints
      );

      if (routeData?.coordinates?.length > 0) {
        setRouteCoords(routeData.coordinates);
        setNavigationInfo({
          distance: routeData.distance.toFixed(1),
          eta: routeData.duration,
        });

        setTimeout(() => {
          if (mapRef.current && routeData.coordinates.length > 1) {
            // fitToCoordinates icin max 200 nokta (crash engelle)
            const fitCoords =
              routeData.coordinates.length > 200
                ? routeData.coordinates.filter(
                    (_, i) =>
                      i % Math.ceil(routeData.coordinates.length / 200) === 0
                  )
                : routeData.coordinates;
            mapRef.current.fitToCoordinates(fitCoords, {
              edgePadding: { top: 100, right: 50, bottom: 120, left: 50 },
              animated: true,
            });
          }
        }, 500);
      } else {
        console.log("[Nav] No valid route coordinates received");
        setNavigationInfo({
          distance: getDistance() || "?",
          eta: "?",
        });
      }

      startLocationTracking();
    } catch (error) {
      console.log("[Nav] Route fetch error:", error);
    } finally {
      setRouteLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // stop previous tracker if any
      if (watchSubscriptionRef.current) {
        if (typeof watchSubscriptionRef.current.remove === "function") {
          await watchSubscriptionRef.current.remove();
        } else {
          clearInterval(watchSubscriptionRef.current);
        }
        watchSubscriptionRef.current = null;
      }

      // Polling function that fetches latest location from backend
      const pollLocation = async () => {
        try {
          let vehicleId = task?.vehicle_id;
          if (!vehicleId) {
            const vehicleResp = await driverAPI.getVehicle();
            vehicleId = vehicleResp?.vehicle?.id || vehicleResp?.id;
          }
          if (!vehicleId) return;
          const res = await vehicleAPI.getLatestLocation(vehicleId);
          const loc = res?.location || res?.data || res;
          if (loc && loc.latitude && loc.longitude) {
            const coords = {
              latitude: parseFloat(loc.latitude),
              longitude: parseFloat(loc.longitude),
            };

            // Smooth marker animation: slide instead of teleport
            if (markerRef.current && Platform.OS === "android") {
              try {
                markerRef.current.animateMarkerToCoordinate(
                  coords,
                  MARKER_ANIMATION_DURATION
                );
              } catch (e) {
                // fallback: direct set
              }
            } else if (markerRef.current && Platform.OS === "ios") {
              try {
                markerRef.current.animateMarkerToCoordinate(
                  coords,
                  MARKER_ANIMATION_DURATION
                );
              } catch (e) {
                // fallback: direct set
              }
            }

            setLocation(coords);
            if (loc.heading !== undefined && loc.heading !== null)
              setHeading(parseFloat(loc.heading) || 0);

            if (followMode && mapRef.current) {
              mapRef.current.animateCamera({
                center: {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                },
                pitch: 45,
                heading: parseFloat(loc.heading) || 0,
                zoom: 17,
              });
            }
          }
        } catch (e) {
          console.log("[Nav] Polling error:", e);
        }
      };

      // Initial poll then interval (7s default  within 5-10s requested)
      await pollLocation();
      const intervalId = setInterval(pollLocation, 7000);
      watchSubscriptionRef.current = intervalId;
      setWatchSubscription(intervalId);
      console.log("[Nav] Location polling started");
    } catch (e) {
      console.log("[Nav] Location polling error:", e);
    }
  };

  const stopLocationTracking = async () => {
    if (watchSubscriptionRef.current) {
      try {
        if (typeof watchSubscriptionRef.current.remove === "function") {
          await watchSubscriptionRef.current.remove();
        } else {
          clearInterval(watchSubscriptionRef.current);
        }
      } catch (e) {
        console.log("[Nav] Error stopping tracker:", e);
      }
      watchSubscriptionRef.current = null;
      setWatchSubscription(null);
      console.log("[Nav] Location tracking stopped");
    }
  };

  // =========
  // TASK ACTIONS
  // =========

  const handleStartTask = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await driverTaskAPI.startTask(task.id);
      const updated = { ...task, status: "in_progress" };
      setTask(updated);
      console.log("[Nav] Task started, status: in_progress");
    } catch (e) {
      Alert.alert(
        t("routeMap.error"),
        e.response?.data?.message || e.message || t("routeMap.taskCouldNotStart")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    setOdometerInput("");
    setOdometerModal(true);
  };

  const handleCompleteConfirm = async () => {
    setOdometerModal(false);
    setActionLoading(true);
    try {
      const data = {};
      const odomEnd = parseFloat(odometerInput);
      if (!isNaN(odomEnd) && odomEnd > 0) {
        data.odometer_end = odomEnd;
      }
      await driverTaskAPI.completeTask(task.id, data);
      stopLocationTracking();
      setTask(null);
      setRouteCoords([]);
      setNavigationInfo(null);
      routeFetchedRef.current = false;
      Alert.alert(t("routeMap.success"), t("routeMap.taskCompleted"), [
        {
          text: t("routeMap.ok"),
          onPress: () => navigation.navigate("DriverDashboard"),
        },
      ]);
    } catch (e) {
      Alert.alert(
        t("routeMap.error"),
        e.response?.data?.message || e.message || t("routeMap.taskCouldNotComplete")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptTask = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await driverTaskAPI.acceptTask(task.id);
      const updated = { ...task, status: "accepted" };
      setTask(updated);
    } catch (e) {
      Alert.alert(
        t("routeMap.error"),
        e.response?.data?.message || e.message || t("routeMap.taskCouldNotAccept")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async () => {
    if (!task) return;

    Alert.alert(t("routeMap.rejectTask"), t("routeMap.rejectConfirm"), [
      { text: t("routeMap.cancel"), style: "cancel" },
      {
        text: t("routeMap.reject"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await driverTaskAPI.rejectTask(task.id);
            setTask(null);
            Alert.alert(
              t("routeMap.taskRejected"),
              t("routeMap.waitForOtherTasks")
            );
            loadActiveTask();
          } catch (e) {
            Alert.alert(
              t("routeMap.error"),
              e.response?.data?.message || e.message || t("routeMap.taskCouldNotReject")
            );
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ===
  // HELPERS
  // ===

  // Task'tan gelen waypoints'i panel formatina cevir
  const prepareWaypoints = (task) => {
    if (!task) return { origin: null, destination: null, waypoints: [] };

    // Origin - baslangic noktasi
    const origin = task.start_location
      ? {
          id: "origin",
          name: t("nav.start_point"),
          address: task.start_location,
          latitude: task.route_json?.origin?.lat,
          longitude: task.route_json?.origin?.lng,
        }
      : null;

    // Destination - varis noktasi
    const destination = task.end_location
      ? {
          id: "destination",
          name: t("nav.destination"),
          address: task.end_location,
          latitude: task.route_json?.destination?.lat,
          longitude: task.route_json?.destination?.lng,
        }
      : null;

    const waypoints = (task.waypoints || []).map((wp, idx) => ({
      id: wp.id || `wp-${idx}`,
      name: wp.name || `${t("nav.stop")} ${idx + 1}`,
      address: wp.address,
      latitude: wp.latitude || wp.lat,
      longitude: wp.longitude || wp.lng,
      stop_duration_min: wp.stop_duration_min || wp.stopDuration,
      notes: wp.notes,
      distance_km: wp.distance_km,
      duration_min: wp.duration_min,
      eta: wp.eta,
      status: wp.status || "pending",
      completed_at: wp.completed_at,
    }));

    return { origin, destination, waypoints };
  };

  const addressText = (value) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const getStartLocation = () => {
    // route_json.origin is a {lat,lng} object and is not rendered.
    return addressText(task?.start_location);
  };

  const getEndLocation = () => {
    // route_json.destination is a {lat,lng} object and is not rendered.
    return addressText(task?.end_location);
  };

  const getEndLocationCoords = () => {
    // Geocoding useEffect tum kaynaklari kontrol edip
    // normalize edilmis koordinat donduruyor
    return geocodedDestination;
  };

  const getDistance = () => {
    if (task?.route_json?.distance) return task.route_json.distance;
    if (task?.total_distance_km) return task.total_distance_km;
    return null;
  };

  const getShortTaskNo = () => {
    const taskNo = task?.task_no || task?.task_code;
    if (!taskNo) return `TSK-${task?.id?.slice(0, 6) || "??????"}`;
    if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
    return taskNo;
  };

  const centerOnLocation = useCallback(() => {
    if (mapRef.current && location) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [location]);

  const fitToRoute = useCallback(() => {
    if (mapRef.current && routeCoords.length > 1) {
      mapRef.current.fitToCoordinates(routeCoords, {
        edgePadding: { top: 100, right: 50, bottom: 120, left: 50 },
        animated: true,
      });
    }
  }, [routeCoords]);

  // Waypoint press handler
  const handleWaypointPress = (waypoint, index) => {
    if (waypoint?.latitude && waypoint?.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: waypoint.latitude,
          longitude: waypoint.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      );
    }
  };

  // Waypoint complete handler
  const handleWaypointComplete = async (waypointId) => {
    try {
      if (task?.id && waypointId) {
        await driverAPI.completeWaypoint(task.id, waypointId);
      }
      // Basariliysa local ilerleme yap
      setCurrentWaypointIndex((prev) => prev + 1);
      // Gorevi tazele (backend guncellemesi yansisin)
      await loadActiveTask();
    } catch (error) {
      console.error("Waypoint tamamlanamadi:", error);
    }
  };

  // ===
  // RENDER
  // ===

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("routeMap.loading")}</Text>
      </View>
    );
  }

  const isNavigating = task?.status === "in_progress";
  // Dispatcher gorevleri "assigned" baslar (kabul adimi yok): kart + Baslat ayni
  const isAccepted =
    task?.status === "accepted" || task?.status === "assigned";
  const isPendingReview = task?.status === "pending_review";
  const showTaskCard = task && isAccepted;

  // Waypoints verisini hazirla
  const { origin, destination, waypoints } = prepareWaypoints(task);

  return (
    <View style={{ flex: 1 }}>
      {/* MAP */}
      {location ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          customMapStyle={darkMapStyle}
          showsBuildings={!isDark}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          showsTraffic={isNavigating}
          rotateEnabled={true}
          pitchEnabled={isNavigating}
        >
          {/* Current Location Marker - Smooth animated */}
          <Marker
            ref={markerRef}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={isNavigating}
            rotation={isNavigating ? heading : 0}
            onPress={() => {
              const coords = `${location.latitude.toFixed(
                6
              )}, ${location.longitude.toFixed(6)}`;
              Clipboard.setStringAsync(coords);
              Alert.alert(t("routeMap.coordinateCopied"), coords);
            }}
          >
            <NavMarker color={COLORS.PRIMARY} />
          </Marker>

          {/* Destination Marker */}
          {isNavigating && getEndLocationCoords() && (
            <Marker
              coordinate={getEndLocationCoords()}
              anchor={{ x: 0.5, y: 1 }}
            >
              <DestinationMarker label={t("routeMap.target")} />
            </Marker>
          )}

          {/* Route Polyline with shadow effect */}
          {isNavigating && routeCoords.length > 1 && (
            <>
              <Polyline
                coordinates={routeCoords}
                strokeWidth={8}
                strokeColor={COLORS.PRIMARY + "4D"}
              />
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor={COLORS.PRIMARY}
              />
            </>
          )}

          {/* Waypoint Markers */}
          {Array.isArray(waypoints) &&
            waypoints.length > 0 &&
            waypoints
              .filter(
                (wp) =>
                  typeof wp.latitude === "number" &&
                  typeof wp.longitude === "number"
              )
              .map((wp, idx) => (
                <Marker
                  key={wp.id || `wp-${idx}`}
                  coordinate={{
                    latitude: wp.latitude,
                    longitude: wp.longitude,
                  }}
                  title={wp.name}
                  description={wp.address}
                  onPress={() => handleWaypointPress(wp, idx)}
                >
                  <View
                    style={[
                      styles.waypointMarker,
                      wp.status === "completed" && styles.waypointCompleted,
                      idx === currentWaypointIndex && styles.waypointCurrent,
                    ]}
                  >
                    <Text style={styles.waypointMarkerText}>{idx + 1}</Text>
                  </View>
                </Marker>
              ))}
        </MapView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color={COLORS.MUTED} />
          <Text style={styles.errorText}>
            {locationError || t("routeMap.locationNotAvailable")}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
            <Ionicons name="refresh" size={18} color={COLORS.WHITE} />
            <Text style={styles.retryBtnText}>{t("routeMap.retry")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Waypoints Panel - Collapsible */}
      {(origin ||
        destination ||
        (Array.isArray(waypoints) && waypoints.length > 0)) && (
        <WaypointsPanel
          waypoints={waypoints}
          currentWaypointIndex={currentWaypointIndex}
          origin={origin}
          destination={destination}
          onWaypointPress={handleWaypointPress}
          onOriginPress={() => origin && handleWaypointPress(origin, -1)}
          onDestinationPress={() =>
            destination && handleWaypointPress(destination, -1)
          }
          onWaypointComplete={handleWaypointComplete}
          distance={
            isNavigating && navigationInfo ? navigationInfo.distance : null
          }
          duration={isNavigating && navigationInfo ? navigationInfo.eta : null}
          taskNo={task ? getShortTaskNo() : null}
          onComplete={isNavigating ? handleCompleteTask : null}
          actionLoading={actionLoading}
          style={styles.waypointsPanel}
        />
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
      </TouchableOpacity>

      {/* Center on Location */}
      {location && (
        <TouchableOpacity
          style={[styles.headerBtn, styles.centerBtn]}
          onPress={centerOnLocation}
        >
          <Ionicons name="locate" size={22} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      )}

      {/* Fit to Route */}
      {isNavigating && routeCoords.length > 1 && (
        <TouchableOpacity
          style={[styles.headerBtn, styles.fitBtn]}
          onPress={fitToRoute}
        >
          <Ionicons name="expand" size={22} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      )}

      {/* Follow Mode Toggle */}
      {isNavigating && (
        <TouchableOpacity
          style={[
            styles.headerBtn,
            styles.followBtn,
            followMode && styles.followBtnActive,
          ]}
          onPress={() => setFollowMode(!followMode)}
        >
          <Ionicons
            name={followMode ? "navigate" : "navigate-outline"}
            size={22}
            color={followMode ? COLORS.WHITE : COLORS.SUCCESS}
          />
        </TouchableOpacity>
      )}

      {/* Drive Conditions Banner */}
      {driveConditions &&
        !conditionsLoading &&
        (() => {
          const tr = driveConditions?.traffic;
          const we = driveConditions?.weather;
          const isCrit = tr?.delay_min > 10 || !!we?.alert;
          const isWarn = !isCrit && tr?.delay_min > 0;
          const bgColor = isCrit
            ? withAlpha(COLORS.ERROR, 0.75)
            : isWarn
              ? withAlpha(COLORS.WARNING, 0.75)
              : withAlpha(COLORS.SUCCESS, 0.75);
          const iconName = isCrit
            ? "warning"
            : isWarn
              ? "alert-circle"
              : "checkmark-circle";
          let bannerText = "";
          if (tr?.delay_min > 0)
            bannerText += t("routeMap.delayMin", { delay: tr.delay_min });
          if (we?.alert) bannerText += (bannerText ? " - " : "") + we.alert;
          if (!bannerText && we?.temp_c !== undefined)
            bannerText = `${we.temp_c}C - ${we.description || ""}`;
          if (!bannerText) return null;
          const speechText = [
            tr?.delay_min > 0
              ? t("routeMap.delayOnRoute", { delay: tr.delay_min })
              : "",
            we?.alert ? we.alert + "." : "",
            !we?.alert && we?.temp_c !== undefined
              ? t("routeMap.weatherTemp", { temp: we.temp_c })
              : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <TouchableOpacity
              key="condBanner"
              style={[styles.condBanner, { backgroundColor: bgColor }]}
              onPress={() => {
                if (!speechText) return;
                Speech.stop();
                Speech.speak(speechText, {
                  language:
                    i18n.language === "tr"
                      ? "tr-TR"
                      : i18n.language === "nl"
                        ? "nl-NL"
                        : i18n.language === "de"
                          ? "de-DE"
                          : i18n.language === "fr"
                            ? "fr-FR"
                            : i18n.language === "es"
                              ? "es-ES"
                              : i18n.language === "it"
                                ? "it-IT"
                                : i18n.language === "bg"
                                  ? "bg-BG"
                                  : i18n.language === "ku"
                                    ? "tr-TR"
                                    : "en-US",
                  rate: 0.9,
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name={iconName} size={16} color={COLORS.WHITE} />
              <Text
                style={[styles.condBannerText, { color: COLORS.WHITE }]}
                numberOfLines={1}
              >
                {bannerText}
              </Text>
              <View style={styles.condSpeakBtn}>
                <Ionicons
                  name="volume-medium-outline"
                  size={14}
                  color={COLORS.WHITE}
                />
              </View>
            </TouchableOpacity>
          );
        })()}

      {/* Route Loading Indicator */}
      {routeLoading && (
        <View style={styles.routeLoadingBar}>
          <ActivityIndicator size="small" color={COLORS.WHITE} />
          <Text style={styles.routeLoadingText}>
            {t("routeMap.calculatingRoute")}
          </Text>
        </View>
      )}

      {/* compactBottomBar kaldÄ±rÄ±ldÄ± - km/dk/Tamamla WaypointsPanel.infoBar'a taÅŸÄ±ndÄ± */}

      {/* PENDING REVIEW BANNER */}
      {isPendingReview && location && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingIconContainer}>
            <Ionicons name="time" size={24} color={COLORS.WARNING} />
          </View>
          <View style={styles.pendingTextContainer}>
            <Text style={styles.pendingTitle}>{t("routeMap.pendingTask")}</Text>
            <Text style={styles.pendingSubtitle}>
              {task.title || t("routeMap.newTaskOffer")} â€¢{" "}
              {getDistance() ? `${getDistance()} km` : ""}
            </Text>
          </View>
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleRejectTask}
              disabled={actionLoading}
            >
              <Ionicons name="close" size={20} color={COLORS.ERROR} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAcceptTask}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* TASK CARD - SADECE accepted DURUMUNDA */}
      {showTaskCard && (
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title || t("routeMap.deliveryTask")}
              </Text>
              <Text style={styles.taskCode}>{getShortTaskNo()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.PRIMARY}
              />
              <Text style={styles.statusText}>
                {t("routeMap.readyToStart")}
              </Text>
            </View>
          </View>

          <View style={styles.locationsContainer}>
            <View style={styles.locationRow}>
              <View
                style={[
                  styles.locationDot,
                  { backgroundColor: COLORS.SUCCESS },
                ]}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>{t("routeMap.origin")}</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getStartLocation() || t("routeMap.currentLocation")}
                </Text>
              </View>
            </View>

            <View style={styles.locationLine} />

            <View style={styles.locationRow}>
              <View
                style={[styles.locationDot, { backgroundColor: COLORS.ERROR }]}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>
                  {t("routeMap.destination")}
                </Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getEndLocation() || t("routeMap.notDetermined")}
                </Text>
              </View>
            </View>
          </View>

          {getDistance() && (
            <View style={styles.distanceContainer}>
              <Ionicons
                name="navigate-circle"
                size={18}
                color={COLORS.TEXT_SECONDARY}
              />
              <Text style={styles.distanceText}>
                {t("routeMap.total")}: {getDistance()} km
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartTask}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="play-circle" size={22} color={COLORS.WHITE} />
                <Text style={styles.startBtnText}>
                  {t("routeMap.startTask")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Odometre Girişi Modal */}
      <Modal
        visible={odometerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setOdometerModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.SURFACE,
              borderRadius: COLORS.RADIUS.card,
              padding: COLORS.SPACING.lg,
              width: "100%",
            }}
          >
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.lg,
                fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                color: COLORS.TEXT,
                marginBottom: COLORS.SPACING.sm,
              }}
            >
              {t("routeMap.completeTask")}
            </Text>
            <Text
              style={{
                fontSize: COLORS.TYPOGRAPHY.sizes.sm,
                color: COLORS.TEXT_SECONDARY,
                marginBottom: COLORS.SPACING.md,
              }}
            >
              {t(
                "routeMap.odometerPrompt",
                "Araç km sayacını girin (isteğe bağlı):"
              )}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.INPUT_BORDER,
                borderRadius: COLORS.RADIUS.md,
                padding: COLORS.SPACING.sm,
                fontSize: COLORS.TYPOGRAPHY.sizes.md,
                color: COLORS.TEXT,
                backgroundColor: COLORS.BACKGROUND,
                marginBottom: COLORS.SPACING.md,
              }}
              placeholder="12500"
              placeholderTextColor={COLORS.TEXT_MUTED}
              keyboardType="numeric"
              value={odometerInput}
              onChangeText={setOdometerInput}
            />
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: COLORS.SPACING.sm,
                  borderRadius: COLORS.RADIUS.md,
                  backgroundColor: COLORS.BACKGROUND,
                  alignItems: "center",
                  marginRight: COLORS.SPACING.sm,
                  borderWidth: 1,
                  borderColor: COLORS.DIVIDER,
                }}
                onPress={() => setOdometerModal(false)}
              >
                <Text
                  style={{
                    color: COLORS.TEXT_SECONDARY,
                    fontWeight: COLORS.TYPOGRAPHY.weights.medium,
                  }}
                >
                  {t("routeMap.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: COLORS.SPACING.sm,
                  borderRadius: COLORS.RADIUS.md,
                  backgroundColor: COLORS.SUCCESS,
                  alignItems: "center",
                }}
                onPress={handleCompleteConfirm}
              >
                <Text
                  style={{
                    color: COLORS.WHITE,
                    fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
                  }}
                >
                  {t("routeMap.complete")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DriverRouteMapScreen;
