import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { COLORS } from "../../constants/config";
import { taskAPI } from "../../services/api";

const DriverRouteMapScreen = ({ navigation, route }) => {
  // Eğer route params'tan task geliyorsa onu kullan
  const initialTask = route?.params?.task || null;

  const [task, setTask] = useState(initialTask);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (!initialTask) {
      loadActiveTask();
    }
    getLocation();
  }, []);

  const loadActiveTask = async () => {
    try {
      const res = await taskAPI.getDriverTasks();
      // in_progress olan görevi bul, yoksa assigned olanı al
      const activeTask =
        res.tasks?.find((t) => t.status === "in_progress") ||
        res.tasks?.find((t) => t.status === "assigned") ||
        res.tasks?.[0];
      setTask(activeTask || null);
    } catch (e) {
      console.log("Task load error:", e);
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
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);
    } catch (e) {
      console.log("Location error:", e);
      setLocationError("Konum alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const openInMaps = () => {
    if (!task?.end_location) return;

    const destination = encodeURIComponent(task.end_location);
    const url = Platform.select({
      ios: `maps://app?daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
    });

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to Google Maps web
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${destination}`
        );
      }
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      in_progress: { label: "Devam Ediyor", color: "#8B5CF6", bg: "#EDE9FE" },
      assigned: { label: "Atandı", color: "#3B82F6", bg: "#DBEAFE" },
      pending: { label: "Bekliyor", color: "#F59E0B", bg: "#FEF3C7" },
    };
    return config[status] || { label: status, color: "#6B7280", bg: "#F3F4F6" };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Konum alınıyor...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Ionicons name="map-outline" size={64} color={COLORS.gray} />
        <Text style={styles.emptyTitle}>Aktif Görev Yok</Text>
        <Text style={styles.emptyText}>
          Haritada gösterilecek bir görev bulunamadı.
        </Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusBadge = getStatusBadge(task.status);

  return (
    <View style={{ flex: 1 }}>
      {/* Map */}
      {location ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Mevcut Konum Marker */}
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title="Mevcut Konum"
          >
            <View style={styles.currentMarker}>
              <Ionicons name="navigate" size={20} color="#fff" />
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={[styles.center, { flex: 1 }]}>
          <Ionicons name="location-outline" size={48} color={COLORS.gray} />
          <Text style={styles.errorText}>
            {locationError || "Konum alınamadı"}
          </Text>
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.headerBackBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Task Info Card */}
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.taskCode}>{task.task_code}</Text>
            <Text style={styles.taskTitle} numberOfLines={1}>
              {task.title || "Görev"}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.badgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.locations}>
          <View style={styles.locationRow}>
            <View
              style={[styles.locationDot, { backgroundColor: "#10B981" }]}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Başlangıç</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {task.start_location || "Belirtilmemiş"}
              </Text>
            </View>
          </View>

          <View style={styles.locationLine} />

          <View style={styles.locationRow}>
            <View
              style={[styles.locationDot, { backgroundColor: "#EF4444" }]}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Bitiş</Text>
              <Text style={styles.locationText} numberOfLines={2}>
                {task.end_location || "Belirtilmemiş"}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        {task.end_location && (
          <TouchableOpacity style={styles.navigateBtn} onPress={openInMaps}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.navigateBtnText}>Google Maps'te Aç</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.gray,
    fontSize: 14,
    marginTop: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  headerBackBtn: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  currentMarker: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#fff",
  },
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  taskCode: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  locations: {
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
    height: 20,
    backgroundColor: "#E5E5E5",
    marginLeft: 5,
    marginVertical: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: "500",
  },
  locationText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 2,
  },
  navigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  navigateBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default DriverRouteMapScreen;
