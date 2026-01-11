// src/screens/driver/DriverRouteMapScreen.js
// TulipFleet - Driver Navigation Map Screen
// Updated: 11 Ocak 2026 v5 - Google Directions API ile gerçek yol güzergahı
// Fixes: API key restriction, URL encode, routeLoading stuck, double-start, performans

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS } from "../../constants/config";
import { driverTaskAPI } from "../../services/api";

const { width } = Dimensions.get("window");

// Google Maps API Key
// NOT: Bu key Android/iOS app restriction ile kısıtlanmış olmalı
// Package: com.tulipfleet.app, SHA-1 fingerprint eklenmiş olmalı
// Sadece Directions API + Maps SDK açık, quota limit konulmuş olmalı
const GOOGLE_MAPS_API_KEY = "AIzaSyCF0dHTuw9SJULB56eiimUt3RJIRnph3gk";

// Waypoint limiti (Google Directions API limiti 25)
const MAX_WAYPOINTS = 10;

// Route noktası limiti (performans için)
const MAX_ROUTE_POINTS = 500;

const DriverRouteMapScreen = ({ navigation, route }) => {
  const initialTask = route?.params?.task || null;

  const [task, setTask] = useState(initialTask);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [navigationInfo, setNavigationInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Route fetch'in tek sefer çalışmasını garantilemek için
  const routeFetchedRef = useRef(false);
  const lastRouteTaskIdRef = useRef(null); // FIX #1: Task ID değişimini takip et

  // FIX #2: watchSubscription için ref kullan (state closure riski önleme)
  const watchSubscriptionRef = useRef(null);

  const mapRef = useRef(null);

  // ══════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    loadActiveTask();
    getLocation();

    return () => {
      // FIX #2: Ref üzerinden temizle
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, []);

  // Görev durumu veya konum değiştiğinde route başlat
  // FIX #1: Hem task.status hem task.id hem location dependency'de olmalı
  useEffect(() => {
    // Sadece in_progress durumunda ve location varsa
    if (task?.status === "in_progress" && location) {
      // FIX #1: Task ID değiştiyse yeniden fetch yap
      const shouldFetch =
        !routeFetchedRef.current || lastRouteTaskIdRef.current !== task.id;

      if (shouldFetch) {
        routeFetchedRef.current = true;
        lastRouteTaskIdRef.current = task.id;
        fetchRouteAndStartNav();
      }
    }

    // Task null olursa veya in_progress değilse reset
    if (!task || task.status !== "in_progress") {
      routeFetchedRef.current = false;
      lastRouteTaskIdRef.current = null;
    }
  }, [task?.status, task?.id, location]);

  // ══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════

  const loadActiveTask = async () => {
    try {
      const res = await driverTaskAPI.getMyTasks();
      const activeTask =
        res.tasks?.find((t) => t.status === "in_progress") ||
        res.tasks?.find((t) => t.status === "accepted") ||
        res.tasks?.find((t) => t.status === "pending_review") ||
        null;
      setTask(activeTask);
    } catch (e) {
      console.log("[Nav] Task load error:", e);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Konum izni verilmedi");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc.coords);
    } catch (e) {
      console.log("[Nav] Location error:", e);
      setLocationError("Konum alınamadı");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GOOGLE DIRECTIONS API - Gerçek Yol Güzergahı
  // ══════════════════════════════════════════════════════════════

  // Polyline decode fonksiyonu (null-safe)
  const decodePolyline = (encoded) => {
    // FIX: null/undefined check
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

  // Route noktalarını downsample et (performans için)
  const downsampleRoute = (points, maxPoints = MAX_ROUTE_POINTS) => {
    if (!points || points.length <= maxPoints) return points;

    const step = Math.ceil(points.length / maxPoints);
    const sampled = [];

    for (let i = 0; i < points.length; i += step) {
      sampled.push(points[i]);
    }

    // Son noktayı mutlaka ekle
    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
      sampled.push(points[points.length - 1]);
    }

    console.log(
      `[Nav] Downsampled ${points.length} -> ${sampled.length} points`
    );
    return sampled;
  };

  // Google Directions API ile rota al
  const fetchRouteFromGoogle = async (origin, destination, waypoints = []) => {
    try {
      // FIX: Waypoint limiti kontrolü
      const limitedWaypoints = waypoints.slice(0, MAX_WAYPOINTS);
      if (waypoints.length > MAX_WAYPOINTS) {
        console.log(
          `[Nav] Waypoints limited: ${waypoints.length} -> ${MAX_WAYPOINTS}`
        );
      }

      // Base URL
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      // FIX: Waypoint'leri URL encode ile ekle
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
        const points = route.overview_polyline?.points;
        let decodedPoints = decodePolyline(points);

        // FIX: Performans için downsample
        decodedPoints = downsampleRoute(decodedPoints);

        // Mesafe ve süre bilgisi
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
          "dk"
        );

        return {
          coordinates: decodedPoints,
          distance: totalDistance / 1000, // km
          duration: Math.ceil(totalDuration / 60), // dakika
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

  // ══════════════════════════════════════════════════════════════
  // NAVIGATION & ROUTE (in_progress için)
  // ══════════════════════════════════════════════════════════════

  const fetchRouteAndStartNav = async () => {
    // FIX: Early return'lerde routeLoading stuck kalmaz
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
      // FIX: Önce mevcut tracking'i durdur (double-start önleme)
      stopLocationTracking();

      // Waypoint'leri hazırla
      const waypoints = (task?.waypoints || [])
        .map((wp) => {
          if (wp.lat && wp.lng) return { latitude: wp.lat, longitude: wp.lng };
          if (wp.latitude && wp.longitude)
            return { latitude: wp.latitude, longitude: wp.longitude };
          return null;
        })
        .filter(Boolean);

      // Google Directions API'den rota al
      const routeResult = await fetchRouteFromGoogle(
        { latitude: location.latitude, longitude: location.longitude },
        endCoords,
        waypoints
      );

      if (routeResult && routeResult.coordinates.length > 0) {
        // Google'dan gelen gerçek rota
        setRouteCoords(routeResult.coordinates);
        setNavigationInfo({
          distance: routeResult.distance.toFixed(1),
          eta: routeResult.duration,
        });

        // Haritayı rotaya sığdır
        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(routeResult.coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
              animated: true,
            });
          }, 500);
        }
      } else {
        // Fallback: Düz çizgi
        console.log("[Nav] Using fallback straight line");
        const coords = [
          { latitude: location.latitude, longitude: location.longitude },
          ...waypoints,
          endCoords,
        ];
        setRouteCoords(coords);

        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          endCoords.latitude,
          endCoords.longitude
        );
        setNavigationInfo({
          distance: distance.toFixed(1),
          eta: Math.ceil(distance * 2),
        });

        if (mapRef.current && coords.length > 1) {
          setTimeout(() => {
            mapRef.current?.fitToCoordinates(coords, {
              edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
              animated: true,
            });
          }, 500);
        }
      }

      // Konum takibini başlat
      startLocationTracking();
    } catch (error) {
      console.log("[Nav] fetchRouteAndStartNav error:", error);
    } finally {
      // FIX: Her durumda routeLoading false olmalı
      setRouteLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      // FIX #2: Ref üzerinden önce mevcut subscription'ı temizle (double-start kesin önleme)
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation.coords);
          updateNavigationInfo(newLocation.coords);
        }
      );
      // FIX #2: Ref'e ata
      watchSubscriptionRef.current = subscription;
      setWatchSubscription(subscription); // UI için state de tut
      console.log("[Nav] Location tracking started");
    } catch (e) {
      console.log("[Nav] Watch error:", e);
    }
  };

  const stopLocationTracking = () => {
    // FIX #2: Ref üzerinden temizle
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
      setWatchSubscription(null);
      console.log("[Nav] Location tracking stopped");
    }
  };

  const updateNavigationInfo = (coords) => {
    const endCoords = getEndLocationCoords();
    if (!endCoords) return;

    const distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      endCoords.latitude,
      endCoords.longitude
    );

    setNavigationInfo((prev) => ({
      ...prev,
      distance: distance.toFixed(1),
    }));
  };

  // Haversine formülü ile mesafe hesapla (km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ══════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ══════════════════════════════════════════════════════════════

  const handleStartTask = async () => {
    if (!task) return;

    setActionLoading(true);
    try {
      await driverTaskAPI.startTask(task.id);
      // FIX: Sadece status güncelle, route useEffect'te başlayacak
      setTask({ ...task, status: "in_progress" });
      Alert.alert("🚀 Görev Başladı", "Navigasyon aktif. İyi yolculuklar!");
    } catch (e) {
      Alert.alert("Hata", e.message || "Görev başlatılamadı");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;

    Alert.alert(
      "Görevi Tamamla",
      "Görevi tamamlamak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tamamla",
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.completeTask(task.id);
              stopLocationTracking();
              setTask(null);
              setRouteCoords([]);
              setNavigationInfo(null);
              routeFetchedRef.current = false;
              Alert.alert("🎉 Tebrikler!", "Görev başarıyla tamamlandı!");
              loadActiveTask();
            } catch (e) {
              Alert.alert("Hata", e.message || "Görev tamamlanamadı");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAcceptTask = async () => {
    if (!task) return;

    setActionLoading(true);
    try {
      await driverTaskAPI.acceptTask(task.id);
      setTask({ ...task, status: "accepted" });
      Alert.alert("✅ Görev Kabul Edildi", "Görevi başlatmak için hazırsınız.");
    } catch (e) {
      Alert.alert("Hata", e.message || "Görev kabul edilemedi");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectTask = async () => {
    if (!task) return;
    Alert.alert(
      "Görevi Reddet",
      "Bu görevi reddetmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Reddet",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.rejectTask(task.id);
              setTask(null);
              Alert.alert(
                "Görev Reddedildi",
                "Başka görevler için bekleyebilirsiniz."
              );
              loadActiveTask();
            } catch (e) {
              Alert.alert("Hata", e.message || "Görev reddedilemedi");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ══════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════

  const getStartLocation = () => {
    if (task?.route_json?.origin) return task.route_json.origin;
    if (task?.start_location) return task.start_location;
    return null;
  };

  const getEndLocation = () => {
    if (task?.route_json?.destination) return task.route_json.destination;
    if (task?.end_location) return task.end_location;
    return null;
  };

  const getEndLocationCoords = () => {
    if (task?.route_json?.destination_coords) {
      return task.route_json.destination_coords;
    }
    if (task?.route_json?.dest_lat && task?.route_json?.dest_lng) {
      return {
        latitude: parseFloat(task.route_json.dest_lat),
        longitude: parseFloat(task.route_json.dest_lng),
      };
    }
    // Waypoint'lerin sonuncusu
    if (task?.waypoints?.length > 0) {
      const last = task.waypoints[task.waypoints.length - 1];
      if (last.lat && last.lng) {
        return {
          latitude: parseFloat(last.lat),
          longitude: parseFloat(last.lng),
        };
      }
    }
    return null;
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
        edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
  }, [routeCoords]);

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Konum alınıyor...</Text>
      </View>
    );
  }

  const isNavigating = task?.status === "in_progress";
  const isAccepted = task?.status === "accepted";
  const isPendingReview = task?.status === "pending_review";
  const showTaskCard = task && isAccepted;

  return (
    <View style={{ flex: 1 }}>
      {/* ═══════════════════════════════════════════════════════ */}
      {/* MAP */}
      {/* ═══════════════════════════════════════════════════════ */}
      {location ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
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
          {/* Mevcut Konum Marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Konumunuz"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={[
                styles.currentMarker,
                isNavigating && styles.navigatingMarker,
              ]}
            >
              <Ionicons
                name={isNavigating ? "car-sport" : "location"}
                size={22}
                color="#fff"
              />
            </View>
          </Marker>

          {/* Rota Çizgisi (in_progress) - Gerçek Yol */}
          {isNavigating && routeCoords.length > 1 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#3B82F6"
              strokeWidth={5}
              lineDashPattern={[0]}
            />
          )}

          {/* Waypoint Marker'ları (in_progress) */}
          {isNavigating &&
            task?.waypoints?.map((wp, index) => (
              <Marker
                key={`wp-${index}`}
                coordinate={{
                  latitude: parseFloat(wp.lat || wp.latitude),
                  longitude: parseFloat(wp.lng || wp.longitude),
                }}
                title={wp.name || `Durak ${index + 1}`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.waypointMarker}>
                  <Text style={styles.waypointText}>{index + 1}</Text>
                </View>
              </Marker>
            ))}

          {/* Varış Noktası Marker (in_progress) */}
          {isNavigating && getEndLocationCoords() && (
            <Marker
              coordinate={getEndLocationCoords()}
              title="Varış Noktası"
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={24} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="location-outline" size={64} color={COLORS.gray} />
          <Text style={styles.errorText}>
            {locationError || "Konum alınamadı"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HEADER BUTTONS */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.headerBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color="#333" />
      </TouchableOpacity>

      {/* Center on Location */}
      {location && (
        <TouchableOpacity
          style={[styles.headerBtn, styles.centerBtn]}
          onPress={centerOnLocation}
        >
          <Ionicons name="locate" size={22} color="#3B82F6" />
        </TouchableOpacity>
      )}

      {/* Fit to Route (in_progress) */}
      {isNavigating && routeCoords.length > 1 && (
        <TouchableOpacity
          style={[styles.headerBtn, styles.fitBtn]}
          onPress={fitToRoute}
        >
          <Ionicons name="expand" size={22} color="#8B5CF6" />
        </TouchableOpacity>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NAVIGATION INFO BAR (in_progress) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isNavigating && navigationInfo && (
        <View style={styles.navInfoBar}>
          <View style={styles.navInfoItem}>
            <Ionicons name="speedometer" size={20} color="#fff" />
            <Text style={styles.navInfoValue}>
              {navigationInfo.distance} km
            </Text>
            <Text style={styles.navInfoLabel}>Kalan</Text>
          </View>
          <View style={styles.navInfoDivider} />
          <View style={styles.navInfoItem}>
            <Ionicons name="time" size={20} color="#fff" />
            <Text style={styles.navInfoValue}>{navigationInfo.eta} dk</Text>
            <Text style={styles.navInfoLabel}>Tahmini</Text>
          </View>
          <View style={styles.navInfoDivider} />
          <View style={styles.navInfoItem}>
            <Text style={styles.navInfoTaskNo}>{getShortTaskNo()}</Text>
            <Text style={styles.navInfoLabel}>Görev</Text>
          </View>
        </View>
      )}

      {/* Route Loading Indicator */}
      {routeLoading && (
        <View style={styles.routeLoadingBar}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.routeLoadingText}>Güzergah hesaplanıyor...</Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* NO TASK - Banner gösterme (ürün kararı: görev yoksa sessiz kal) */}
      {/* ═══════════════════════════════════════════════════════ */}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* PENDING REVIEW BANNER */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isPendingReview && location && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingIconContainer}>
            <Ionicons name="time" size={24} color="#F59E0B" />
          </View>
          <View style={styles.pendingTextContainer}>
            <Text style={styles.pendingTitle}>Bekleyen Görev Var</Text>
            <Text style={styles.pendingSubtitle}>
              {task.title || "Yeni görev teklifi"} •{" "}
              {getDistance() ? `${getDistance()} km` : ""}
            </Text>
          </View>
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleRejectTask}
              disabled={actionLoading}
            >
              <Ionicons name="close" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAcceptTask}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TASK CARD - SADECE accepted DURUMUNDA */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showTaskCard && (
        <View style={styles.taskCard}>
          {/* Header */}
          <View style={styles.taskHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskCode}>{getShortTaskNo()}</Text>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title || "Teslimat Görevi"}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#3B82F6" />
              <Text style={styles.statusText}>Başlamaya Hazır</Text>
            </View>
          </View>

          {/* Locations */}
          <View style={styles.locationsContainer}>
            <View style={styles.locationRow}>
              <View
                style={[styles.locationDot, { backgroundColor: "#10B981" }]}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Başlangıç</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getStartLocation() || "Mevcut konum"}
                </Text>
              </View>
            </View>

            <View style={styles.locationLine} />

            <View style={styles.locationRow}>
              <View
                style={[styles.locationDot, { backgroundColor: "#EF4444" }]}
              />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Varış</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getEndLocation() || "Belirtilmemiş"}
                </Text>
              </View>
            </View>
          </View>

          {/* Distance */}
          {getDistance() && (
            <View style={styles.distanceContainer}>
              <Ionicons name="analytics" size={16} color="#64748B" />
              <Text style={styles.distanceText}>
                Toplam: {getDistance()} km
              </Text>
            </View>
          )}

          {/* BAŞLA BUTONU */}
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStartTask}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play-circle" size={22} color="#fff" />
                <Text style={styles.startBtnText}>Görevi Başlat</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* FLOATING TAMAMLA BUTONU - SADECE in_progress DURUMUNDA */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isNavigating && (
        <TouchableOpacity
          style={styles.floatingCompleteBtn}
          onPress={handleCompleteTask}
          disabled={actionLoading}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.floatingCompleteBtnText}>Tamamla</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  errorText: {
    color: "#64748B",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    gap: 8,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  // Header Buttons
  headerBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  centerBtn: {
    left: "auto",
    right: 16,
  },
  fitBtn: {
    left: "auto",
    right: 70,
  },

  // Markers
  currentMarker: {
    backgroundColor: "#3B82F6",
    padding: 10,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  navigatingMarker: {
    backgroundColor: "#10B981",
    padding: 12,
  },
  waypointMarker: {
    backgroundColor: "#F59E0B",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 3,
  },
  waypointText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  destinationMarker: {
    backgroundColor: "#EF4444",
    padding: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
  },

  // Navigation Info Bar
  navInfoBar: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 16,
    elevation: 6,
  },
  navInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  navInfoValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  navInfoTaskNo: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
  },
  navInfoLabel: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  navInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#334155",
  },

  // Route Loading
  routeLoadingBar: {
    position: "absolute",
    top: 180,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  routeLoadingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },

  // No Task Banner
  noTaskBanner: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  noTaskTextContainer: {
    flex: 1,
  },
  noTaskTitle: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "600",
  },
  noTaskSubtitle: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4,
  },
  goToTasksBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  goToTasksBtnText: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "600",
  },

  // Pending Review Banner
  pendingBanner: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  pendingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  pendingSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 8,
  },
  rejectBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },

  // Task Card (sadece accepted)
  taskCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 30,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  taskCode: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },

  // Locations
  locationsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  locationLine: {
    width: 2,
    height: 16,
    backgroundColor: "#E2E8F0",
    marginLeft: 5,
    marginVertical: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  locationText: {
    fontSize: 14,
    color: "#1E293B",
    marginTop: 2,
    fontWeight: "500",
  },

  // Distance
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },

  // Start Button (accepted kartında)
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  startBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  // Floating Complete Button (in_progress)
  floatingCompleteBtn: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  floatingCompleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});

export default DriverRouteMapScreen;
