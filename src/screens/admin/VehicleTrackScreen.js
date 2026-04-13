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
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  EndMarker,
  PlaybackMarker,
  StartMarker,
} from "../../components/map/MapMarkers";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { vehicleAPI } from "../../services/api";
import { geocodingAPI } from "../../services/geocoding";
import { exportTripReport } from "../../services/reportExport";
import { calculateDistance, toFloat } from "../../utils/mapMath";
import { withAlpha } from "../../utils/colorUtils";

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

// Idle / moving segment + cluster constants
const IDLE_SPEED_THRESHOLD = 4;
const MIN_IDLE_DURATION_MS = 5 * 60 * 1000; // 5 dakika
const MAX_IDLE_RADIUS_METERS = 80;

// Trip segmentation constants
// NOT: STOP_BREAK_THRESHOLD_MS şu an doğrudan kullanılmıyor — trip boundary'leri
// idleClusters (MIN_IDLE_DURATION_MS) üzerinden belirleniyor. Bu constant ileride
// idleClusters'tan bağımsız trip segmentation (ör. ignition bazlı) için hazır tutuluyor.
const STOP_BREAK_THRESHOLD_MS = 5 * 60 * 1000; // 5 dk stop → trip boundary
const MIN_TRIP_DISTANCE_METERS = 300; // 300m altı trip sayılmaz
const MIN_TRIP_DURATION_MS = 3 * 60 * 1000; // 3 dk altı trip sayılmaz
const MAX_SEGMENT_DISTANCE_METERS = 2000; // GPS outlier filtresi — 2km üstü sıçrama ignore

// Speed tier: idle / normal / fast
const FAST_SPEED_THRESHOLD = 70;

const getSpeedTier = (speed) => {
  if (speed < IDLE_SPEED_THRESHOLD) return "idle";
  if (speed < FAST_SPEED_THRESHOLD) return "normal";
  return "fast";
};

const getSegmentColor = (tier, COLORS) => {
  switch (tier) {
    case "idle":
      return COLORS.WARNING;
    case "fast":
      return COLORS.ERROR;
    case "normal":
    default:
      return COLORS.SUCCESS;
  }
};

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
    const segDist = calculateDistance(
      toFloat(points[i - 1].latitude),
      toFloat(points[i - 1].longitude),
      toFloat(points[i].latitude),
      toFloat(points[i].longitude)
    );
    // GPS outlier filtresi
    if (segDist <= MAX_SEGMENT_DISTANCE_METERS) {
      total += segDist;
    }
  }
  return total;
};

const formatDuration = (startTime, endTime, t) => {
  if (!startTime || !endTime) return "-";

  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);

  const minLabel = t ? t("units.min") : "dk";
  const hourLabel = t ? t("units.h") : "sa";

  if (diffMins < 60) return `${diffMins} ${minLabel}`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours} ${hourLabel} ${mins} ${minLabel}`;
};

const formatTime = (isoString, locale) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleTimeString(locale || "tr-TR", { hour: "2-digit", minute: "2-digit" });
};

const formatDurationShort = (ms, t) => {
  const minLabel = t ? t("units.min") : "dk";
  const hourLabel = t ? t("units.h") : "sa";

  if (!ms || ms <= 0) return `0 ${minLabel}`;

  const totalMins = Math.round(ms / 60000);
  if (totalMins < 60) return `${totalMins} ${minLabel}`;

  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins === 0 ? `${hours} ${hourLabel}` : `${hours} ${hourLabel} ${mins} ${minLabel}`;
};

/**
 * Downsampling — çok fazla nokta geldiğinde harita performansını korur.
 * İlk ve son noktayı her zaman garanti eder.
 * @param {Array} points - Ham GPS noktaları
 * @param {number} max - Maksimum nokta sayısı (varsayılan 800)
 */
const downsampleTrack = (points, max = 800) => {
  if (!points || points.length <= max) return points;

  const step = Math.ceil(points.length / max);
  const result = [];

  for (let i = 0; i < points.length; i += step) {
    result.push(points[i]);
  }

  // Son noktayı garanti ekle
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
};

/**
 * Trip Segmentation — idle cluster'ları boundary olarak kullanarak
 * track'i anlamlı yolculuklara böler.
 *
 * Mantık:
 *   1. idleClusters'ı startIndex/endIndex ile sırala
 *   2. Her cluster arasındaki hareketli parçayı trip olarak ayır
 *   3. Çok kısa / kısa mesafeli parçaları ele
 *
 * @param {Array} points - GPS noktaları (downsampled)
 * @param {Array} idleClusters - 5dk+ idle cluster'lar
 * @returns {Array} trips
 */
const deriveTrips = (points, idleClusters) => {
  if (!points || points.length < 2) return [];

  // Idle cluster'ları startIndex'e göre sırala
  const sortedClusters = [...idleClusters].sort(
    (a, b) => a.startIndex - b.startIndex
  );

  // Trip boundary'leri oluştur: track başı, her cluster sonrası, track sonu
  const boundaries = [];

  // Track başlangıcı
  let currentStart = 0;

  for (const cluster of sortedClusters) {
    // Trip: currentStart → cluster başlangıcının 1 öncesi
    if (cluster.startIndex - 1 > currentStart) {
      boundaries.push({
        startIndex: currentStart,
        endIndex: cluster.startIndex - 1,
      });
    }
    // Cluster sonrasından devam
    currentStart = cluster.endIndex + 1;
  }

  // Son cluster'dan track sonuna kadar
  if (currentStart < points.length - 1) {
    boundaries.push({
      startIndex: currentStart,
      endIndex: points.length - 1,
    });
  }

  // Boundary'leri trip objesine dönüştür ve filtrele
  const trips = [];
  let tripNum = 0;

  for (const b of boundaries) {
    const tripPoints = points.slice(b.startIndex, b.endIndex + 1);
    if (tripPoints.length < 2) continue;

    const startTime = tripPoints[0]?.time
      ? new Date(tripPoints[0].time).getTime()
      : null;
    const endTime = tripPoints[tripPoints.length - 1]?.time
      ? new Date(tripPoints[tripPoints.length - 1].time).getTime()
      : null;

    const durationMs = startTime && endTime ? endTime - startTime : 0;

    // Toplam mesafe hesapla
    let distanceMeters = 0;
    for (let i = 1; i < tripPoints.length; i++) {
      const segDist = calculateDistance(
        toFloat(tripPoints[i - 1].latitude),
        toFloat(tripPoints[i - 1].longitude),
        toFloat(tripPoints[i].latitude),
        toFloat(tripPoints[i].longitude)
      );
      // GPS outlier filtresi — tek sıçrama tüm mesafeyi patlatmasın
      if (segDist <= MAX_SEGMENT_DISTANCE_METERS) {
        distanceMeters += segDist;
      }
    }

    // Minimum filtreler
    if (distanceMeters < MIN_TRIP_DISTANCE_METERS) continue;
    if (durationMs < MIN_TRIP_DURATION_MS) continue;

    tripNum++;
    trips.push({
      id: `trip-${tripNum}`,
      tripNumber: tripNum,
      startIndex: b.startIndex,
      endIndex: b.endIndex,
      startTime,
      endTime,
      durationMs,
      distanceMeters,
      startCoordinate: {
        latitude: toFloat(tripPoints[0].latitude),
        longitude: toFloat(tripPoints[0].longitude),
      },
      endCoordinate: {
        latitude: toFloat(tripPoints[tripPoints.length - 1].latitude),
        longitude: toFloat(tripPoints[tripPoints.length - 1].longitude),
      },
      durationLabel: formatDurationShort(durationMs),
      distanceLabel: distanceMeters > 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${Math.round(distanceMeters)} m`,
      timeLabel: `${formatTime(tripPoints[0]?.time)} - ${formatTime(tripPoints[tripPoints.length - 1]?.time)}`,
    });
  }

  return trips;
};

// ============================================================================
// VEHICLE TRACK SCREEN COMPONENT
// ============================================================================

const VehicleTrackScreen = ({ route, navigation }) => {
  const params = route.params || {};
  const vehicleId = params.vehicleId || params.vehicle?.id;
  const vehiclePlate = params.vehiclePlate || params.vehicle?.plate_no;
  const { COLORS } = useTheme();
  const { t, i18n } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const mapRef = useRef(null);

  // Locale-aware format wrappers
  const locale = i18n.language || "tr";
  const localeMap = { tr: "tr-TR", en: "en-GB", nl: "nl-NL", bg: "bg-BG", es: "es-ES", it: "it-IT", ku: "ku" };
  const fmtLocale = localeMap[locale] || "tr-TR";
  // format wrappers removed — direct calls with params


  const formatDistance = (meters) =>
    meters > 1000
      ? `${(meters / 1000).toFixed(1)} ${t("units.km")}`
      : `${Math.round(meters)} ${t("units.m")}`;
  console.log("[VehicleTrack] params:", {
    vehicleId,
    vehiclePlate,
    raw: route.params,
  });

  // Accordion header renderer
  const renderAccordionHeader = (title, open, onPress, iconName) => (
    <TouchableOpacity
      style={styles.accordionHeader}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons
          name={iconName}
          size={16}
          color={COLORS.PRIMARY}
          style={{ marginRight: COLORS.SPACING.xs }}
        />
        <Text style={styles.accordionTitle}>{title}</Text>
      </View>
      <Ionicons
        name={open ? "chevron-up" : "chevron-down"}
        size={18}
        color={COLORS.TEXT_MUTED}
      />
    </TouchableOpacity>
  );

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

  // Stop detail popup state
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [clusterAddress, setClusterAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // Trip selection state
  const [selectedTripId, setSelectedTripId] = useState(null);

  // Trip address state
  const [tripAddressLoading, setTripAddressLoading] = useState(false);
  const [selectedTripAddresses, setSelectedTripAddresses] = useState({
    start: null,
    end: null,
  });

  // Tek açık accordion için
  const [openSection, setOpenSection] = useState(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportSheetVisible, setExportSheetVisible] = useState(false);

  // Mevcut tarih aralığı (export için)
  const currentDateRange = useMemo(
    () => getDateRange(timePreset),
    [timePreset]
  );

  const isTripOpen = openSection === "trip";
  const isDailyOpen = openSection === "daily";
  const isTimelineOpen = openSection === "timeline";

  // Idle cluster seçildiğinde reverse geocode ile adres çek
  useEffect(() => {
    if (!selectedCluster) {
      setClusterAddress(null);
      setAddressLoading(false);
      return;
    }

    const { latitude, longitude } = selectedCluster.coordinate;

    // Senkron cache kontrolü — varsa loading göstermeden hemen yaz
    const cached = geocodingAPI.peekCache(latitude, longitude);
    if (cached) {
      setClusterAddress(cached);
      setAddressLoading(false);
      return;
    }

    // Cache'de yok — async çek
    let cancelled = false;
    setAddressLoading(true);
    setClusterAddress(null);

    geocodingAPI
      .reverseGeocode(latitude, longitude)
      .then((address) => {
        if (!cancelled) {
          setClusterAddress(address);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAddressLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCluster]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchTrack = useCallback(async () => {
    if (!vehicleId) {
      setError(t("common.error"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setPlayIndex(0);
    setPlaying(false);
    setSelectedCluster(null);
    setSelectedTripId(null);
    setSelectedTripAddresses({ start: null, end: null });
    setTripAddressLoading(false);

    try {
      const { from, to } = getDateRange(timePreset);
      console.log("[VehicleTrack] Fetching:", { vehicleId, from, to });
      const response = await vehicleAPI.getTrack(vehicleId, from, to);

      const raw = response?.points || response || [];
      console.log("[VehicleTrack] Raw points:", raw?.length || 0);
      // Fix 2: accuracy normalize — backend null dönebilir
      const normalized = raw.map((p) => ({
        ...p,
        accuracy: p.accuracy ?? 50,
      }));

      // Fix 3: data validation — NaN/null koordinat filtreleme
      const clean = normalized.filter(
        (p) =>
          p.latitude != null &&
          p.longitude != null &&
          !isNaN(toFloat(p.latitude)) &&
          !isNaN(toFloat(p.longitude))
      );

      // Fix 1: downsampling — 5k+ nokta gelirse map performansını korur
      const sampled = downsampleTrack(clean, 800);

      setPoints(sampled);

      if (sampled.length > 0) {
        fitToTrack(sampled);
      }
    } catch (e) {
      console.error("[VehicleTrack] Fetch error:", e);
      setError(t("vehicleTrack.noData"));
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

  // Segment coloring: idle / normal / fast (merged segments)

  const trackSegments = useMemo(() => {
    if (!points || points.length < 2) return [];

    const segments = [];
    let currentSegment = null;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const coord = {
        latitude: toFloat(curr.latitude),
        longitude: toFloat(curr.longitude),
      };

      const speed = Number(curr.speed ?? prev.speed ?? 0);
      const speedTier = getSpeedTier(speed);

      if (!currentSegment || currentSegment.speedTier !== speedTier) {
        // Yeni segment başlat — önceki noktayı da ekle (süreklilik)
        currentSegment = {
          id: `seg-${i}`,
          speedTier,
          startPointIndex: i - 1,
          coordinates: [
            {
              latitude: toFloat(prev.latitude),
              longitude: toFloat(prev.longitude),
            },
            coord,
          ],
        };
        segments.push(currentSegment);
      } else {
        // Mevcut segmente ekle
        currentSegment.coordinates.push(coord);
      }
    }

    return segments;
  }, [points]);

  // Idle clusters: 5 dk+ beklemeleri grupla ve marker göster
  const idleClusters = useMemo(() => {
    if (!points || points.length < 2) return [];

    const clusters = [];
    let currentCluster = null;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const speed = Number(point.speed ?? 0);
      const isIdle = speed < IDLE_SPEED_THRESHOLD;

      const lat = toFloat(point.latitude);
      const lng = toFloat(point.longitude);

      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      const pointTime = point.time ? new Date(point.time).getTime() : null;
      if (!pointTime) continue;

      if (!isIdle) {
        if (currentCluster) {
          const durationMs = currentCluster.endTime - currentCluster.startTime;
          if (durationMs >= MIN_IDLE_DURATION_MS) {
            clusters.push({ ...currentCluster, durationMs });
          }
          currentCluster = null;
        }
        continue;
      }

      if (!currentCluster) {
        currentCluster = {
          id: `idle-${i}`,
          startIndex: i,
          endIndex: i,
          startTime: pointTime,
          endTime: pointTime,
          points: [{ latitude: lat, longitude: lng, time: point.time }],
        };
        continue;
      }

      // Mevcut cluster'a eklenebilir mi? (mesafe kontrolü)
      const anchor = currentCluster.points[0];
      const dist = calculateDistance(
        anchor.latitude,
        anchor.longitude,
        lat,
        lng
      );

      if (dist <= MAX_IDLE_RADIUS_METERS) {
        currentCluster.endIndex = i;
        currentCluster.endTime = pointTime;
        currentCluster.points.push({
          latitude: lat,
          longitude: lng,
          time: point.time,
        });
      } else {
        // Cluster kapat, yeni başlat
        const durationMs = currentCluster.endTime - currentCluster.startTime;
        if (durationMs >= MIN_IDLE_DURATION_MS) {
          clusters.push({ ...currentCluster, durationMs });
        }

        currentCluster = {
          id: `idle-${i}`,
          startIndex: i,
          endIndex: i,
          startTime: pointTime,
          endTime: pointTime,
          points: [{ latitude: lat, longitude: lng, time: point.time }],
        };
      }
    }

    // Son cluster'ı kapat
    if (currentCluster) {
      const durationMs = currentCluster.endTime - currentCluster.startTime;
      if (durationMs >= MIN_IDLE_DURATION_MS) {
        clusters.push({ ...currentCluster, durationMs });
      }
    }

    // Ortalama koordinat + label üret
    return clusters.map((cluster) => {
      const avgLat =
        cluster.points.reduce((sum, p) => sum + p.latitude, 0) /
        cluster.points.length;
      const avgLng =
        cluster.points.reduce((sum, p) => sum + p.longitude, 0) /
        cluster.points.length;

      return {
        ...cluster,
        coordinate: { latitude: avgLat, longitude: avgLng },
        durationLabel: formatDurationShort(cluster.durationMs),
        timeRangeLabel: `${formatTime(new Date(cluster.startTime).toISOString())} - ${formatTime(new Date(cluster.endTime).toISOString())}`,
      };
    });
  }, [points]);

  // Trip segmentation — idle cluster'ları boundary olarak kullanır
  const trips = useMemo(
    () => deriveTrips(points, idleClusters),
    [points, idleClusters]
  );

  // Segment → Trip eşleştirme: her segment hangi trip'e ait?
  const getSegmentTripId = useCallback(
    (segmentStartIndex) => {
      for (const trip of trips) {
        if (
          segmentStartIndex >= trip.startIndex &&
          segmentStartIndex <= trip.endIndex
        ) {
          return trip.id;
        }
      }
      return null; // idle bölgesi — hiçbir trip'e ait değil
    },
    [trips]
  );

  // Seçili trip derived state
  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return trips.find((trip) => trip.id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  const selectedTripStartPoint = selectedTrip?.startCoordinate || null;
  const selectedTripEndPoint = selectedTrip?.endCoordinate || null;

  // Daily Summary — trips + idleClusters'tan türetilir
  const dailySummary = useMemo(() => {
    if (!trips.length && !idleClusters.length) return null;

    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, t) => sum + t.distanceMeters, 0);
    const totalDriveTime = trips.reduce((sum, t) => sum + t.durationMs, 0);
    const totalIdleTime = idleClusters.reduce(
      (sum, c) => sum + c.durationMs,
      0
    );

    return {
      totalTrips,
      totalDistance,
      totalDriveTime,
      totalIdleTime,
      distanceLabel:
        totalDistance > 1000
          ? `${(totalDistance / 1000).toFixed(1)} ${t("units.km")}`
          : `${Math.round(totalDistance)} ${t("units.m")}`,
    };
  }, [trips, idleClusters]);

  // Trip Timeline — kronolojik sıralı trip + stop listesi
  const timeline = useMemo(() => {
    const items = [];

    trips.forEach((t) => {
      items.push({ type: "trip", start: t.startTime, end: t.endTime, data: t });
    });

    idleClusters.forEach((c) => {
      items.push({ type: "stop", start: c.startTime, end: c.endTime, data: c });
    });

    return items.sort((a, b) => a.start - b.start);
  }, [trips, idleClusters]);

  // Selected trip start/end adresleri — reverse geocode
  useEffect(() => {
    if (!selectedTripStartPoint || !selectedTripEndPoint) {
      setSelectedTripAddresses({ start: null, end: null });
      setTripAddressLoading(false);
      return;
    }

    let cancelled = false;

    // Senkron cache kontrolü — flicker önleme
    const startCached = geocodingAPI.peekCache(
      selectedTripStartPoint.latitude,
      selectedTripStartPoint.longitude
    );
    const endCached = geocodingAPI.peekCache(
      selectedTripEndPoint.latitude,
      selectedTripEndPoint.longitude
    );

    // Cache hit olanları hemen yaz
    setSelectedTripAddresses({
      start: startCached || null,
      end: endCached || null,
    });

    const needsStart = !startCached;
    const needsEnd = !endCached;

    // Her ikisi de cache'de → loading yok, bitir
    if (!needsStart && !needsEnd) {
      setTripAddressLoading(false);
      return;
    }

    setTripAddressLoading(true);

    Promise.all([
      needsStart
        ? geocodingAPI.reverseGeocode(
            selectedTripStartPoint.latitude,
            selectedTripStartPoint.longitude
          )
        : Promise.resolve(startCached),
      needsEnd
        ? geocodingAPI.reverseGeocode(
            selectedTripEndPoint.latitude,
            selectedTripEndPoint.longitude
          )
        : Promise.resolve(endCached),
    ])
      .then(([startAddr, endAddr]) => {
        if (!cancelled) {
          setSelectedTripAddresses({
            start: startAddr || t("geocode.addressNotFound"),
            end: endAddr || t("geocode.addressNotFound"),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedTripAddresses((prev) => ({
            start: prev.start || t("geocode.addressNotFound"),
            end: prev.end || t("geocode.addressNotFound"),
          }));
        }
      })
      .finally(() => {
        if (!cancelled) setTripAddressLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTripStartPoint, selectedTripEndPoint]);

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
          ? `${(totalDistance / 1000).toFixed(1)} ${t("units.km")}`
          : `${Math.round(totalDistance)} ${t("units.m")}`,
      duration: formatDuration(startTime, endTime, t),
      startTime: formatTime(startTime, fmtLocale),
      endTime: formatTime(endTime, fmtLocale),
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

  const clearSelectedTrip = () => {
    setSelectedTripId(null);
    setSelectedTripAddresses({ start: null, end: null });
    setTripAddressLoading(false);
    // Tüm track'e fit
    if (points.length > 0) fitToTrack(points);
  };

  // ── Export handler ──────────────────────────────────────────
  const handleExport = async (format) => {
    if (!vehicleId || exporting) return;

    try {
      setExportSheetVisible(false);
      setExporting(true);

      await exportTripReport({
        vehicleId,
        plate: vehiclePlate || t("common.vehicle", "Vehicle"),
        from: currentDateRange.from,
        to: currentDateRange.to,
        format,
      });
    } catch (error) {
      console.error("[VehicleTrack] Export error:", error);
      Alert.alert(
        t("reportExport.exportError"),
        error?.message ||
          t("reportExport.shareError")
      );
    } finally {
      setExporting(false);
    }
  };

  const handleTripPress = (trip) => {
    // Toggle: tekrar basınca seçimi kaldır
    if (selectedTripId === trip.id) {
      clearSelectedTrip();
      return;
    }

    setSelectedTripId(trip.id);
    setSelectedCluster(null); // popup kapat
    setPlaying(false);
    setPlayIndex(trip.startIndex); // playback o trip'in başına

    // Trip'in segmentine zoom — fitToCoordinates daha hassas
    const tripPoints = points.slice(trip.startIndex, trip.endIndex + 1);
    if (mapRef.current && tripPoints.length > 0) {
      const coords = tripPoints.map((p) => ({
        latitude: toFloat(p.latitude),
        longitude: toFloat(p.longitude),
      }));
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, left: 60, right: 60, bottom: 160 },
        animated: true,
      });
    }
  };

  // ============================================================================
  // LOADING / ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("vehicleTrack.loading")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color={COLORS.ERROR} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTrack}>
          <Text style={styles.retryText}>{t("common.retry")}</Text>
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
        onPress={() => setSelectedCluster(null)}
      >
        {/* Polyline — idle (sarı) / normal (yeşil) / fast (kırmızı) */}
        {/* Seçili trip varsa: seçili kalın+renkli, diğerleri soluk */}
        {trackSegments.map((segment) => {
          const segTripId = getSegmentTripId(segment.startPointIndex);

          const isSelected = selectedTripId === segTripId;
          const isDimmed = Boolean(selectedTripId) && !isSelected;

          return (
            <Polyline
              key={segment.id}
              coordinates={segment.coordinates}
              strokeWidth={isDimmed ? 2 : isSelected ? 5 : 4}
              strokeColor={
                isDimmed
                  ? COLORS.DIVIDER
                  : getSegmentColor(segment.speedTier, COLORS)
              }
              lineCap="round"
              lineJoin="round"
              zIndex={isSelected ? 5 : 1}
              tappable={false}
            />
          );
        })}

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

        {/* Selected Trip Start Marker */}
        {selectedTripStartPoint && (
          <Marker
            coordinate={selectedTripStartPoint}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={12}
          >
            <View style={styles.tripMarkerWrap}>
              <View style={[styles.tripMarker, styles.tripStartMarker]}>
                <Ionicons name="play" size={14} color={COLORS.WHITE} />
              </View>
              <View style={styles.tripMarkerBadge}>
                <Text style={styles.tripMarkerBadgeText}>{t("vehicleTrack.tripDetail.start")}</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Selected Trip End Marker */}
        {selectedTripEndPoint && (
          <Marker
            coordinate={selectedTripEndPoint}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={12}
          >
            <View style={styles.tripMarkerWrap}>
              <View style={[styles.tripMarker, styles.tripEndMarker]}>
                <Ionicons name="stop" size={14} color={COLORS.WHITE} />
              </View>
              <View style={styles.tripMarkerBadge}>
                <Text style={styles.tripMarkerBadgeText}>{t("vehicleTrack.tripDetail.end")}</Text>
              </View>
            </View>
          </Marker>
        )}

        {/* Idle Cluster Markers — 5 dk+ beklemeler */}
        {idleClusters.map((cluster) => (
          <Marker
            key={cluster.id}
            coordinate={cluster.coordinate}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={10}
            onPress={() => {
              // Trip'i kapat
              setSelectedTripId(null);
              setSelectedTripAddresses({ start: null, end: null });
              setTripAddressLoading(false);

              // Cluster aç
              setSelectedCluster(cluster);

              mapRef.current?.animateCamera(
                { center: cluster.coordinate },
                { duration: 300 }
              );
            }}
          >
            <View
              style={[
                styles.idleMarkerWrap,
                selectedTripId ? { opacity: 0.3 } : null,
              ]}
            >
              <View style={styles.idleMarker}>
                <Ionicons name="pause" size={14} color={COLORS.WHITE} />
              </View>
              <View style={styles.idleBadge}>
                <Text style={styles.idleBadgeText}>
                  {cluster.durationLabel}
                </Text>
              </View>
            </View>
          </Marker>
        ))}

        {/* Playback Marker — segment rengiyle sync */}
        {currentPoint && (
          <Marker
            coordinate={{
              latitude: toFloat(currentPoint.latitude),
              longitude: toFloat(currentPoint.longitude),
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={20}
          >
            <PlaybackMarker
              heading={currentPoint.heading || 0}
              color={getSegmentColor(
                getSpeedTier(Number(currentPoint.speed ?? 0)),
                COLORS
              )}
            />
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
          {vehiclePlate || t("common.vehicle", "Araç")} - {t("vehicleTrack.title")}
        </Text>
      </View>

      {/* Time Preset Selector */}
      <View style={styles.presetBar}>
        {[
          { key: TIME_PRESETS.LAST_HOUR, label: t("vehicleTrack.presets.lastHour") },
          { key: TIME_PRESETS.LAST_3_HOURS, label: t("vehicleTrack.presets.last3Hours") },
          { key: TIME_PRESETS.TODAY, label: t("vehicleTrack.presets.today") },
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

      {/* Export Button */}
      {points.length > 0 && (
        <TouchableOpacity
          style={[
            styles.exportButton,
            exporting && styles.exportButtonDisabled,
          ]}
          onPress={() => setExportSheetVisible(true)}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Ionicons name="share-outline" size={18} color={COLORS.WHITE} />
          )}
        </TouchableOpacity>
      )}

      {/* Stop Detail Popup — idle marker'a tıklayınca */}
      {selectedCluster && (
        <View style={styles.stopDetailCard}>
          <View style={styles.stopHeader}>
            <Ionicons name="pause-circle" size={18} color={COLORS.WARNING} />
            <Text style={styles.stopTitle}>{t("vehicleTrack.stopDetail.title")}</Text>
          </View>

          {/* Adres — reverse geocode */}
          <View style={styles.stopAddressRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.PRIMARY}
            />
            {addressLoading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.PRIMARY}
                style={{ marginLeft: COLORS.SPACING.xs }}
              />
            ) : (
              <Text style={styles.stopAddressText} numberOfLines={2}>
                {clusterAddress || t("geocode.addressLoadFailed")}
              </Text>
            )}
          </View>

          <Text style={styles.stopText}>
            {"\u23F1\uFE0F"} Süre: {selectedCluster.durationLabel}
          </Text>

          <Text style={styles.stopText}>
            {"\uD83D\uDD52"} {selectedCluster.timeRangeLabel}
          </Text>

          <TouchableOpacity
            style={styles.stopCloseBtn}
            onPress={() => setSelectedCluster(null)}
          >
            <Text style={styles.stopCloseText}>{t("vehicleTrack.stopDetail.close")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trip Detail Card — trip seçilince */}
      {selectedTrip && (
        <View style={styles.tripDetailCard}>
          <View style={styles.tripDetailHeader}>
            <Ionicons name="navigate-circle" size={18} color={COLORS.PRIMARY} />
            <Text style={styles.tripDetailTitle}>
              {t("vehicleTrack.tripDetail.title", { number: selectedTrip.tripNumber })}
            </Text>
          </View>

          {/* Start address */}
          <View style={styles.tripAddressRow}>
            <Ionicons
              name="log-in-outline"
              size={14}
              color={COLORS.SUCCESS}
              style={styles.tripAddressIcon}
            />
            {tripAddressLoading && !selectedTripAddresses.start ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <Text style={styles.tripAddressText} numberOfLines={2}>
                {selectedTripAddresses.start || t("geocode.addressNotFound")}
              </Text>
            )}
          </View>

          {/* End address */}
          <View style={styles.tripAddressRow}>
            <Ionicons
              name="log-out-outline"
              size={14}
              color={COLORS.ERROR}
              style={styles.tripAddressIcon}
            />
            {tripAddressLoading && !selectedTripAddresses.end ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <Text style={styles.tripAddressText} numberOfLines={2}>
                {selectedTripAddresses.end || t("geocode.addressNotFound")}
              </Text>
            )}
          </View>

          <Text style={styles.tripCardText}>
            {"\uD83D\uDD52"} {selectedTrip.timeLabel}
          </Text>

          <Text style={styles.tripCardText}>
            {"\u23F1\uFE0F"} {selectedTrip.durationLabel}
          </Text>

          <Text style={styles.tripCardText}>
            {"\uD83D\uDCCD"} {selectedTrip.distanceLabel}
          </Text>

          <TouchableOpacity
            style={styles.tripDetailCloseBtn}
            onPress={clearSelectedTrip}
          >
            <Text style={styles.tripDetailCloseText}>{t("vehicleTrack.tripDetail.clear")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        <ScrollView
          style={styles.bottomPanelScroll}
          contentContainerStyle={styles.bottomPanelContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
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
                <Text style={styles.statLabel}>{t("vehicleTrack.stats.points")}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="speedometer-outline"
                  size={16}
                  color={COLORS.TEXT_MUTED}
                />
                <Text style={styles.statValue}>{stats.distance}</Text>
                <Text style={styles.statLabel}>{t("vehicleTrack.stats.distance")}</Text>
              </View>

              <View style={styles.statItem}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.TEXT_MUTED}
                />
                <Text style={styles.statValue}>{stats.duration}</Text>
                <Text style={styles.statLabel}>{t("vehicleTrack.stats.duration")}</Text>
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
                <Text style={styles.statLabel}>{t("vehicleTrack.stats.range")}</Text>
              </View>
            </View>
          )}

          {/* Trip Summary */}
          {trips.length > 0 && (
            <View style={styles.sectionCard}>
              {renderAccordionHeader(
                `${t("vehicleTrack.sections.trips")} (${trips.length})`,
                isTripOpen,
                () => setOpenSection(isTripOpen ? null : "trip"),
                "swap-horizontal"
              )}

              {isTripOpen && (
                <View style={styles.sectionBody}>
                  {trips.map((trip) => (
                    <TouchableOpacity
                      key={trip.id}
                      style={[
                        styles.tripRow,
                        selectedTripId === trip.id && styles.tripRowActive,
                      ]}
                      onPress={() => handleTripPress(trip)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tripNumberBadge}>
                        <Text style={styles.tripNumberText}>
                          {trip.tripNumber}
                        </Text>
                      </View>

                      <View style={styles.tripInfo}>
                        <Text style={styles.tripTimeText}>
                          {trip.timeLabel}
                        </Text>
                        <Text style={styles.tripDetailText}>
                          {trip.distanceLabel} {"\u2022"} {trip.durationLabel}
                        </Text>
                      </View>

                      <Ionicons
                        name={
                          selectedTripId === trip.id
                            ? "locate"
                            : "chevron-forward"
                        }
                        size={16}
                        color={
                          selectedTripId === trip.id
                            ? COLORS.PRIMARY
                            : COLORS.TEXT_MUTED
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Daily Summary */}
          {dailySummary && (
            <View style={styles.sectionCard}>
              {renderAccordionHeader(
                t("vehicleTrack.sections.dailySummary"),
                isDailyOpen,
                () => setOpenSection(isDailyOpen ? null : "daily"),
                "bar-chart-outline"
              )}

              {isDailyOpen && (
                <View style={styles.sectionBody}>
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {dailySummary.totalTrips}
                      </Text>
                      <Text style={styles.summaryLabel}>{t("vehicleTrack.summary.trip")}</Text>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {dailySummary.distanceLabel}
                      </Text>
                      <Text style={styles.summaryLabel}>{t("vehicleTrack.summary.distance")}</Text>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {formatDurationShort(dailySummary.totalDriveTime, t)}
                      </Text>
                      <Text style={styles.summaryLabel}>{t("vehicleTrack.summary.drive")}</Text>
                    </View>

                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryValue}>
                        {formatDurationShort(dailySummary.totalIdleTime, t)}
                      </Text>
                      <Text style={styles.summaryLabel}>{t("vehicleTrack.summary.idle")}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Trip Timeline */}
          {timeline.length > 0 && (
            <View style={styles.sectionCard}>
              {renderAccordionHeader(
                `${t("vehicleTrack.sections.timeline")} (${timeline.length})`,
                isTimelineOpen,
                () => setOpenSection(isTimelineOpen ? null : "timeline"),
                "time-outline"
              )}

              {isTimelineOpen && (
                <View style={styles.sectionBody}>
                  {timeline.map((item, idx) => {
                    const isTrip = item.type === "trip";

                    return (
                      <TouchableOpacity
                        key={`tl-${idx}`}
                        style={styles.timelineRow}
                        activeOpacity={isTrip ? 0.7 : 1}
                        onPress={() => {
                          if (isTrip) handleTripPress(item.data);
                        }}
                      >
                        <View style={styles.timelineLeft}>
                          <View
                            style={[
                              styles.timelineDot,
                              {
                                backgroundColor: isTrip
                                  ? COLORS.SUCCESS
                                  : COLORS.WARNING,
                              },
                            ]}
                          />
                          {idx < timeline.length - 1 && (
                            <View style={styles.timelineLine} />
                          )}
                        </View>

                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>
                            {isTrip ? `${t("vehicleTrack.summary.trip")} ${item.data.tripNumber}` : t("vehicleTrack.stopDetail.title")}
                            {isTrip
                              ? ` · ${item.data.distanceLabel}`
                              : ` · ${item.data.durationLabel}`}
                          </Text>

                          <Text style={styles.timelineTime}>
                            {formatTime(new Date(item.start).toISOString(), fmtLocale)} -{" "}
                            {formatTime(new Date(item.end).toISOString(), fmtLocale)}
                          </Text>
                        </View>

                        {isTrip && (
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={COLORS.TEXT_MUTED}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* No Data Message */}
          {points.length === 0 && (
            <View style={styles.noDataContainer}>
              <Ionicons
                name="map-outline"
                size={32}
                color={COLORS.TEXT_MUTED}
              />
              <Text style={styles.noDataText}>
                {t("vehicleTrack.noData")}
              </Text>
            </View>
          )}

          {/* Playback Controls */}
          {points.length > 1 && (
            <View style={styles.playbackControls}>
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
                    {formatTime(currentPoint.time, fmtLocale)}
                    {currentPoint.speed != null &&
                      ` \u2022 ${Math.round(currentPoint.speed)} ${t("units.kmh")}`}
                  </Text>
                )}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={resetPlayback}
                >
                  <Ionicons
                    name="refresh"
                    size={20}
                    color={COLORS.TEXT_MUTED}
                  />
                </TouchableOpacity>

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

                <TouchableOpacity
                  style={styles.controlBtn}
                  onPress={cycleSpeed}
                >
                  <Text style={styles.speedText}>{playbackSpeed}x</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Export Sheet */}
      <Modal
        transparent
        visible={exportSheetVisible}
        animationType="fade"
        onRequestClose={() => setExportSheetVisible(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setExportSheetVisible(false)}
        >
          <Pressable style={styles.sheetCard} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{t("reportExport.title")}</Text>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => handleExport("pdf")}
              disabled={exporting}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={COLORS.PRIMARY}
              />
              <Text style={styles.sheetActionText}>{t("reportExport.sharePdf")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetAction}
              onPress={() => handleExport("csv")}
              disabled={exporting}
            >
              <Ionicons name="grid-outline" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.sheetActionText}>{t("reportExport.shareCsv")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setExportSheetVisible(false)}
              disabled={exporting}
            >
              <Text style={styles.sheetCancelText}>{t("reportExport.cancel")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const makeStyles = (COLORS) =>
  StyleSheet.create({
    sectionCard: {
      marginTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      paddingTop: COLORS.SPACING.sm,
    },

    sectionBody: {
      paddingTop: COLORS.SPACING.xs,
    },

    accordionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: COLORS.SPACING.xs,
    },

    accordionTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
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

    // ── Export styles ──
    exportButton: {
      position: "absolute",
      top: Platform.OS === "ios" ? 48 : COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xxl,
      ...COLORS.SHADOWS.md,
    },
    exportButtonDisabled: {
      opacity: 0.7,
    },
    sheetOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.35),
      justifyContent: "flex-end",
    },
    sheetCard: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      padding: COLORS.SPACING.md,
      paddingBottom: Platform.OS === "ios" ? 30 : COLORS.SPACING.md,
    },
    sheetTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    sheetAction: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    sheetActionText: {
      marginLeft: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
    },
    sheetCancel: {
      marginTop: COLORS.SPACING.md,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    sheetCancelText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.ERROR,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    bottomPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      maxHeight: "52%",
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      paddingTop: COLORS.SPACING.md,
      ...COLORS.SHADOWS.lg,
    },
    bottomPanelScroll: {
      flexGrow: 0,
    },
    bottomPanelContent: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingBottom: Platform.OS === "ios" ? 34 : COLORS.SPACING.md,
    },
    statsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingBottom: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },

    statItem: {
      width: "48%",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },

    statValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.xs,
      textAlign: "center",
    },

    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs / 2,
      textAlign: "center",
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
      paddingVertical: COLORS.SPACING.xs / 2,
      borderRadius: COLORS.RADIUS.xs,
      marginTop: COLORS.SPACING.xs / 2,
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

    // Idle cluster marker styles
    idleMarkerWrap: {
      alignItems: "center",
    },
    idleMarker: {
      width: 28,
      height: 28,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.WARNING,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.WHITE,
      ...COLORS.SHADOWS.md,
    },
    idleBadge: {
      marginTop: COLORS.SPACING.xs,
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: COLORS.SPACING.xs / 2,
      borderRadius: COLORS.RADIUS.xs,
      ...COLORS.SHADOWS.xs,
    },
    idleBadgeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // Stop detail popup styles
    stopDetailCard: {
      position: "absolute",
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      bottom: 140,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    stopHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    stopTitle: {
      marginLeft: COLORS.SPACING.xs,
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    stopAddressRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
      paddingBottom: COLORS.SPACING.xs,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    stopAddressText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
      flex: 1,
    },
    stopText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.xs / 2,
    },
    stopCloseBtn: {
      marginTop: COLORS.SPACING.sm,
      alignSelf: "flex-end",
    },
    stopCloseText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Trip summary styles
    tripSummary: {
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    tripHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    tripHeaderText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.xs,
    },
    tripRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
      paddingHorizontal: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.xs / 2,
    },
    tripRowActive: {
      backgroundColor: COLORS.PRIMARY + "15",
    },
    tripNumberBadge: {
      width: 24,
      height: 24,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: COLORS.PRIMARY,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    tripNumberText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    tripInfo: {
      flex: 1,
    },
    tripTimeText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    tripDetailText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },

    // Trip marker styles (selected trip start/end)
    tripMarkerWrap: {
      alignItems: "center",
    },
    tripMarker: {
      width: 30,
      height: 30,
      borderRadius: COLORS.RADIUS.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.WHITE,
      ...COLORS.SHADOWS.md,
    },
    tripStartMarker: {
      backgroundColor: COLORS.SUCCESS,
    },
    tripEndMarker: {
      backgroundColor: COLORS.ERROR,
    },
    tripMarkerBadge: {
      marginTop: COLORS.SPACING.xs,
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: COLORS.SPACING.xs / 2,
      borderRadius: COLORS.RADIUS.xs,
      ...COLORS.SHADOWS.xs,
    },
    tripMarkerBadgeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // Trip detail card styles
    tripDetailCard: {
      position: "absolute",
      left: COLORS.SPACING.md,
      right: COLORS.SPACING.md,
      bottom: 220,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    tripDetailHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    tripDetailTitle: {
      marginLeft: COLORS.SPACING.xs,
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    tripCardText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.xs / 2,
    },
    tripAddressRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop: COLORS.SPACING.xs / 2,
    },
    tripAddressIcon: {
      marginTop: COLORS.SPACING.xs / 2,
      marginRight: COLORS.SPACING.xs,
    },
    tripAddressText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      flex: 1,
    },
    tripDetailCloseBtn: {
      marginTop: COLORS.SPACING.sm,
      alignSelf: "flex-end",
    },
    tripDetailCloseText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Daily Summary styles
    summaryCard: {
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    summaryTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.xs,
    },
    summaryGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    summaryItem: {
      alignItems: "center",
      flex: 1,
    },
    summaryValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    summaryLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },

    // Timeline styles
    timeline: {
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    timelineRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.xs / 2,
      paddingVertical: COLORS.SPACING.xs,
      paddingHorizontal: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
    },
    timelineLeft: {
      alignItems: "center",
      width: 16,
      marginRight: COLORS.SPACING.xs,
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: COLORS.RADIUS.sm,
      marginTop: COLORS.SPACING.xs / 2,
    },
    timelineLine: {
      width: 2,
      flex: 1,
      minHeight: 20,
      backgroundColor: COLORS.DIVIDER,
      marginTop: COLORS.SPACING.xs / 2,
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
    },
    timelineTime: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },
  });

export default VehicleTrackScreen;
