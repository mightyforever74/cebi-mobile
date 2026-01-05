// src/screens/driver/DriverRouteMapScreen.js
// TulipFleet - Driver Navigation Map Screen
// Updated: 05 Ocak 2026 - Akışa uygun: accepted/in_progress'te kart, dahili navigasyon

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS } from "../../constants/config";
import { driverTaskAPI } from "../../services/api";

const { width, height } = Dimensions.get("window");

const DriverRouteMapScreen = ({ navigation, route }) => {
  // Route params'tan task geliyorsa onu kullan
  const initialTask = route?.params?.task || null;

  const [task, setTask] = useState(initialTask);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [watchSubscription, setWatchSubscription] = useState(null);
  const [navigationInfo, setNavigationInfo] = useState(null); // Dahili nav bilgisi

  const mapRef = useRef(null);

  // ══════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ══════════════════════════════════════════════════════════════

  useEffect(() => {
    loadActiveTask();
    getLocation();

    return () => {
      // Cleanup location watch
      if (watchSubscription) {
        watchSubscription.remove();
      }
    };
  }, []);

  // Görev durumu değiştiğinde
  useEffect(() => {
    if (task?.status === "in_progress" && location) {
      fetchRouteAndStartNav();
    }
  }, [task?.status]);

  // ══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════

  const loadActiveTask = async () => {
    try {
      const res = await driverTaskAPI.getMyTasks();
      // Sadece accepted veya in_progress görevleri al (pending_review hariç)
      const activeTask =
        res.tasks?.find((t) => t.status === "in_progress") ||
        res.tasks?.find((t) => t.status === "accepted") ||
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
  // NAVIGATION & ROUTE
  // ══════════════════════════════════════════════════════════════

  const fetchRouteAndStartNav = async () => {
    if (!location) return;

    const endCoords = getEndLocationCoords();
    const waypoints = task?.waypoints || [];

    // Rota koordinatlarını oluştur
    const coords = [
      { latitude: location.latitude, longitude: location.longitude },
    ];

    // Waypoint'leri ekle
    waypoints.forEach((wp) => {
      if (wp.lat && wp.lng) {
        coords.push({ latitude: wp.lat, longitude: wp.lng });
      } else if (wp.latitude && wp.longitude) {
        coords.push({ latitude: wp.latitude, longitude: wp.longitude });
      }
    });

    // Varış noktasını ekle
    if (endCoords) {
      coords.push(endCoords);
    }

    setRouteCoords(coords);

    // Haritayı rotaya sığdır
    if (mapRef.current && coords.length > 1) {
      setTimeout(() => {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }, 500);
    }

    // Navigasyon bilgisini hesapla
    if (endCoords) {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        endCoords.latitude,
        endCoords.longitude
      );
      setNavigationInfo({
        distance: distance.toFixed(1),
        eta: Math.ceil(distance * 2), // Yaklaşık süre (dakika)
      });
    }

    // Konum takibini başlat
    startLocationTracking();
  };

  const startLocationTracking = async () => {
    try {
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
      setWatchSubscription(subscription);
      console.log("[Nav] Location tracking started");
    } catch (e) {
      console.log("[Nav] Watch error:", e);
    }
  };

  const stopLocationTracking = () => {
    if (watchSubscription) {
      watchSubscription.remove();
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

    setNavigationInfo({
      distance: distance.toFixed(1),
      eta: Math.ceil(distance * 2),
    });

    // Rota güncelle (ilk nokta = mevcut konum)
    setRouteCoords((prev) => {
      if (prev.length > 0) {
        return [
          { latitude: coords.latitude, longitude: coords.longitude },
          ...prev.slice(1),
        ];
      }
      return prev;
    });
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
      await driverTaskAPI.updateTaskStatus(task.id, "in_progress");
      setTask({ ...task, status: "in_progress" });

      // Rota ve navigasyonu başlat
      fetchRouteAndStartNav();

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
              await driverTaskAPI.updateTaskStatus(task.id, "completed");
              stopLocationTracking();
              setTask(null);
              setRouteCoords([]);
              setNavigationInfo(null);
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
        latitude: task.route_json.dest_lat,
        longitude: task.route_json.dest_lng,
      };
    }
    // Waypoint'lerin sonuncusu
    if (task?.waypoints?.length > 0) {
      const last = task.waypoints[task.waypoints.length - 1];
      if (last.lat && last.lng) {
        return { latitude: last.lat, longitude: last.lng };
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

  const openInGoogleMaps = () => {
    const destination = getEndLocation();
    if (!destination) return;

    const encodedDest = encodeURIComponent(destination);
    const url = Platform.select({
      ios: `maps://app?daddr=${encodedDest}`,
      android: `google.navigation:q=${encodedDest}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${encodedDest}`
        );
      }
    });
  };

  const getStatusConfig = (status) => {
    const config = {
      in_progress: {
        label: "Navigasyon Aktif",
        color: "#10B981",
        bg: "#D1FAE5",
        icon: "navigate",
      },
      accepted: {
        label: "Başlamaya Hazır",
        color: "#3B82F6",
        bg: "#DBEAFE",
        icon: "checkmark-circle",
      },
    };
    return (
      config[status] || {
        label: status,
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "help",
      }
    );
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
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
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
  const showTaskCard =
    task && (task.status === "accepted" || task.status === "in_progress");
  const statusConfig = task ? getStatusConfig(task.status) : null;

  return (
    <View style={{ flex: 1 }}>
      {/* ════════════════════════════════════════════════════════ */}
      {/* MAP - Her zaman göster */}
      {/* ════════════════════════════════════════════════════════ */}
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

          {/* Rota Çizgisi (in_progress) */}
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
                  latitude: wp.lat || wp.latitude,
                  longitude: wp.lng || wp.longitude,
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

      {/* ════════════════════════════════════════════════════════ */}
      {/* HEADER BUTTONS */}
      {/* ════════════════════════════════════════════════════════ */}

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

      {/* ════════════════════════════════════════════════════════ */}
      {/* NAVIGATION INFO BAR (in_progress) */}
      {/* ════════════════════════════════════════════════════════ */}
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
          <TouchableOpacity
            style={styles.navInfoMapsBtn}
            onPress={openInGoogleMaps}
          >
            <Ionicons name="navigate" size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* NO TASK INFO */}
      {/* ════════════════════════════════════════════════════════ */}
      {!task && location && (
        <View style={styles.noTaskBanner}>
          <Ionicons name="information-circle" size={22} color="#3B82F6" />
          <View style={styles.noTaskTextContainer}>
            <Text style={styles.noTaskTitle}>Aktif Görev Yok</Text>
            <Text style={styles.noTaskSubtitle}>
              Görevlerim sayfasından bekleyen görevleri kabul edebilirsiniz.
            </Text>
          </View>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* TASK CARD (accepted veya in_progress) */}
      {/* ════════════════════════════════════════════════════════ */}
      {showTaskCard && (
        <View
          style={[styles.taskCard, isNavigating && styles.taskCardNavigating]}
        >
          {/* Header */}
          <View style={styles.taskHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskCode}>{getShortTaskNo()}</Text>
              <Text style={styles.taskTitle} numberOfLines={1}>
                {task.title || "Teslimat Görevi"}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
            >
              <Ionicons
                name={statusConfig.icon}
                size={14}
                color={statusConfig.color}
              />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
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
              <Ionicons name="analytics" size={16} color={COLORS.gray} />
              <Text style={styles.distanceText}>
                Toplam: {getDistance()} km
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {actionLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                {/* accepted: Başla butonu */}
                {task.status === "accepted" && (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={handleStartTask}
                  >
                    <Ionicons name="play-circle" size={22} color="#fff" />
                    <Text style={styles.startBtnText}>Görevi Başlat</Text>
                  </TouchableOpacity>
                )}

                {/* in_progress: Tamamla butonu */}
                {task.status === "in_progress" && (
                  <TouchableOpacity
                    style={styles.completeBtn}
                    onPress={handleCompleteTask}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.completeBtnText}>Görevi Tamamla</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
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
    padding: 12,
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
  navInfoMapsBtn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginLeft: 12,
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

  // Task Card
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
  taskCardNavigating: {
    borderWidth: 2,
    borderColor: "#10B981",
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
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

  // Actions
  actionContainer: {
    marginTop: 4,
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
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  completeBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

export default DriverRouteMapScreen;
