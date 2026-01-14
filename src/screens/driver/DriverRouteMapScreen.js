// src/screens/driver/DriverRouteMapScreen.js
// TulipFleet - Driver Navigation Map Screen
// Updated: 12 Ocak 2026 v12 - Compact bottom bar, integrated complete button
// Fixes: navInfoBar moved to bottom, complete button as icon

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS } from "../../constants/config";
import { driverAPI, driverTaskAPI, vehicleAPI } from "../../services/api";

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyCAenCjwzpOicARpk3TQmV49t7-gAp1eIk";

// Waypoint limiti (Google Directions API limiti 25)
const MAX_WAYPOINTS = 10;

// Route noktası limiti (performans için)
const MAX_ROUTE_POINTS = 500;

const DriverRouteMapScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
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
  const [heading, setHeading] = useState(0);
  const [followMode, setFollowMode] = useState(true);

  const routeFetchedRef = useRef(false);
  const lastRouteTaskIdRef = useRef(null);
  const watchSubscriptionRef = useRef(null);
  const mapRef = useRef(null);

  // ══════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    loadActiveTask();
    getLocation();

    return () => {
      stopLocationTracking();
    };
  }, []);

  useEffect(() => {
    if (task?.status === "in_progress" && location) {
      const shouldFetch =
        !routeFetchedRef.current || lastRouteTaskIdRef.current !== task.id;

      if (shouldFetch) {
        routeFetchedRef.current = true;
        lastRouteTaskIdRef.current = task.id;
        fetchRouteAndStartNav();
      }
    }

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
        setLocationError("Araç bulunamadı");
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
        setLocationError("Konum alınamadı");
      }
    } catch (e) {
      console.log("[Nav] Location error:", e);
      setLocationError("Konum alınamadı");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GOOGLE DIRECTIONS API
  // ══════════════════════════════════════════════════════════════

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

    const step = Math.ceil(points.length / maxPoints);
    const sampled = [];

    for (let i = 0; i < points.length; i += step) {
      sampled.push(points[i]);
    }

    if (sampled[sampled.length - 1] !== points[points.length - 1]) {
      sampled.push(points[points.length - 1]);
    }

    console.log(
      `[Nav] Downsampled ${points.length} -> ${sampled.length} points`
    );
    return sampled;
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
          "dk"
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

  // ══════════════════════════════════════════════════════════════
  // NAVIGATION & ROUTE
  // ══════════════════════════════════════════════════════════════

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

      const waypoints = (task?.waypoints || [])
        .map((wp) => {
          if (wp.lat && wp.lng) return { latitude: wp.lat, longitude: wp.lng };
          if (wp.latitude && wp.longitude)
            return { latitude: wp.latitude, longitude: wp.longitude };
          return null;
        })
        .filter(Boolean);

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
            mapRef.current.fitToCoordinates(routeData.coordinates, {
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
          const vehicleId =
            task?.vehicle_id ||
            (await driverAPI.getVehicle())?.vehicle?.id ||
            (await driverAPI.getVehicle())?.id;
          if (!vehicleId) return;
          const res = await vehicleAPI.getLatestLocation(vehicleId);
          const loc = res?.location || res?.data || res;
          if (loc && loc.latitude && loc.longitude) {
            const coords = {
              latitude: parseFloat(loc.latitude),
              longitude: parseFloat(loc.longitude),
            };
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

      // Initial poll then interval (7s default — within 5-10s requested)
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

  // ══════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ══════════════════════════════════════════════════════════════

  const handleStartTask = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      await driverTaskAPI.updateTaskStatus(task.id, "in_progress");
      const updated = { ...task, status: "in_progress" };
      setTask(updated);
      console.log("[Nav] Task started, status: in_progress");
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
      "Bu görevi tamamlamak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tamamla",
          style: "default",
          onPress: async () => {
            setActionLoading(true);
            try {
              await driverTaskAPI.updateTaskStatus(task.id, "completed");
              stopLocationTracking();
              setTask(null);
              setRouteCoords([]);
              setNavigationInfo(null);
              routeFetchedRef.current = false;
              Alert.alert("Başarılı", "Görev tamamlandı!", [
                {
                  text: "Tamam",
                  onPress: () => navigation.navigate("DriverDashboard"),
                },
              ]);
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
      const updated = { ...task, status: "accepted" };
      setTask(updated);
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
        edgePadding: { top: 100, right: 50, bottom: 120, left: 50 },
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
      {/* MAP */}
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
          {/* Current Location Marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Konumunuz"
            description={`${location.latitude.toFixed(
              6
            )}, ${location.longitude.toFixed(6)}`}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={isNavigating}
            rotation={isNavigating ? heading : 0}
            onCalloutPress={() => {
              const coords = `${location.latitude}, ${location.longitude}`;
              Clipboard.setStringAsync(coords);
              Alert.alert("Kopyalandı", coords);
            }}
          >
            {isNavigating ? (
              <View style={styles.navMarkerContainer}>
                <View style={styles.navMarkerOuter}>
                  <View style={styles.navMarkerInner}>
                    <View style={styles.navArrow} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.locationMarker}>
                <Ionicons name="navigate" size={20} color="#fff" />
              </View>
            )}
          </Marker>

          {/* Destination Marker */}
          {isNavigating && getEndLocationCoords() && (
            <Marker coordinate={getEndLocationCoords()} title="Hedef">
              <View style={styles.destinationMarker}>
                <Ionicons name="flag" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Route Polyline with shadow effect */}
          {isNavigating && routeCoords.length > 1 && (
            <>
              <Polyline
                coordinates={routeCoords}
                strokeWidth={8}
                strokeColor="rgba(59, 130, 246, 0.3)"
              />
              <Polyline
                coordinates={routeCoords}
                strokeWidth={5}
                strokeColor="#3B82F6"
              />
            </>
          )}
        </MapView>
      ) : (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorText}>
            {locationError || "Konum alınamadı"}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={getLocation}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryBtnText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#1E293B" />
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

      {/* Fit to Route */}
      {isNavigating && routeCoords.length > 1 && (
        <TouchableOpacity
          style={[styles.headerBtn, styles.fitBtn]}
          onPress={fitToRoute}
        >
          <Ionicons name="expand" size={22} color="#8B5CF6" />
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
            color={followMode ? "#fff" : "#10B981"}
          />
        </TouchableOpacity>
      )}

      {/* Route Loading Indicator */}
      {routeLoading && (
        <View style={styles.routeLoadingBar}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.routeLoadingText}>Güzergah hesaplanıyor...</Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* COMPACT BOTTOM BAR - in_progress (navInfo + Tamamla) */}
      {/* ═══════════════════════════════════════════════════════ */}
      {isNavigating && navigationInfo && (
        <View style={styles.compactBottomBar}>
          {/* Distance */}
          <View style={styles.compactItem}>
            <Ionicons name="speedometer" size={18} color="#94A3B8" />
            <Text style={styles.compactValue}>
              {navigationInfo.distance} km
            </Text>
          </View>

          <View style={styles.compactDivider} />

          {/* ETA */}
          <View style={styles.compactItem}>
            <Ionicons name="time" size={18} color="#94A3B8" />
            <Text style={styles.compactValue}>{navigationInfo.eta} dk</Text>
          </View>

          <View style={styles.compactDivider} />

          {/* Task No */}
          <View style={styles.compactItem}>
            <Text style={styles.compactTaskNo}>{getShortTaskNo()}</Text>
          </View>

          {/* Complete Button */}
          <TouchableOpacity
            style={styles.compactCompleteBtn}
            onPress={handleCompleteTask}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

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
                <Text style={styles.locationLabel}>Hedef</Text>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getEndLocation() || "Belirlenmedi"}
                </Text>
              </View>
            </View>
          </View>

          {getDistance() && (
            <View style={styles.distanceContainer}>
              <Ionicons name="navigate-circle" size={18} color="#64748B" />
              <Text style={styles.distanceText}>
                Toplam: {getDistance()} km
              </Text>
            </View>
          )}

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

  // Back Button
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  // Header Buttons
  headerBtn: {
    position: "absolute",
    top: 50,
    backgroundColor: "#fff",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  centerBtn: {
    right: 16,
  },
  fitBtn: {
    right: 70,
  },
  followBtn: {
    right: 124,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  followBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  // Markers
  locationMarker: {
    backgroundColor: "#3B82F6",
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
  },
  navMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  navMarkerOuter: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navMarkerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
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
    borderBottomColor: "#fff",
    marginTop: -2,
  },
  destinationMarker: {
    backgroundColor: "#EF4444",
    padding: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
    elevation: 4,
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPACT BOTTOM BAR (NEW) - replaces navInfoBar + floatingCompleteBtn
  // ═══════════════════════════════════════════════════════════════
  compactBottomBar: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  compactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  compactTaskNo: {
    color: "#3B82F6",
    fontSize: 13,
    fontWeight: "700",
  },
  compactDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#334155",
    marginHorizontal: 12,
  },
  compactCompleteBtn: {
    marginLeft: "auto",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  // Route Loading
  routeLoadingBar: {
    position: "absolute",
    top: 110,
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

  // Task Card (accepted)
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
});

export default DriverRouteMapScreen;
