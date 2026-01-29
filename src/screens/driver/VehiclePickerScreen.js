// src/screens/driver/VehiclePickerScreen.js
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { driverProvisionAPI } from "../../services/api";

const VehiclePickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { serial } = route.params;

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // User display name with fallback
  const displayName = user?.first_name || user?.name || user?.email || "Sürücü";

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await driverProvisionAPI.getAvailableVehicles();
      setVehicles(response.vehicles || []);
    } catch (error) {
      console.error("[VehiclePicker] Error:", error);
      Alert.alert("Hata", "Araçlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = async (vehicle) => {
    // Plate with fallback
    const plate = vehicle.plate || vehicle.plate_no || "Bilinmeyen";

    Alert.alert(
      "Cihaz Ataması",
      `${plate} plakalı aracı seçtiniz. Devam etmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Devam",
          onPress: () => assignDevice(vehicle),
        },
      ]
    );
  };

  const assignDevice = async (vehicle) => {
    try {
      setAssigning(true);

      const response = await driverProvisionAPI.assignDevice({
        device_serial: serial,
        vehicle_id: vehicle.id,
      });

      if (response.success) {
        // WiFi Picker ekranına geç
        navigation.navigate("WiFiPicker", {
          serial,
          vehicle,
          assignment_id: response.assignment_id,
        });
      } else {
        Alert.alert("Hata", response.message || "Atama başarısız");
      }
    } catch (error) {
      console.error("[VehiclePicker] Assign error:", error);
      Alert.alert("Hata", "Cihaz ataması başarısız");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Kullanılabilir araç bulunamadı</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicles}>
          <Text style={styles.retryButtonText}>Yeniden Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Araç Seçin</Text>
        <Text style={styles.subtitle}>
          {displayName}, hangi aracı kullanacaksınız?
        </Text>
      </View>

      <ScrollView style={styles.listContainer}>
        {vehicles.map((vehicle, index) => {
          const plate = vehicle.plate || vehicle.plate_no || "-";

          return (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleCard,
                assigning && styles.vehicleCardDisabled,
              ]}
              onPress={() => handleVehicleSelect(vehicle)}
              disabled={assigning}
            >
              <View style={styles.vehicleIcon}>
                <Text style={styles.vehicleIconText}>🚗</Text>
              </View>

              <View style={styles.vehicleInfo}>
                <Text style={styles.vehiclePlate}>{plate}</Text>
                <Text style={styles.vehicleDetails}>
                  {vehicle.brand} {vehicle.model} {vehicle.year}
                </Text>
                <Text style={styles.vehicleFuel}>
                  Yakıt: {vehicle.fuel_type === "diesel" ? "Dizel" : "Benzin"}
                </Text>
              </View>

              <View style={styles.arrowIcon}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={assigning}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>

      {assigning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingOverlayText}>Atanıyor...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  header: {
    padding: 20,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardDisabled: {
    opacity: 0.5,
  },
  vehicleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  vehicleIconText: {
    fontSize: 28,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehiclePlate: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  vehicleFuel: {
    fontSize: 12,
    color: "#999",
  },
  arrowIcon: {
    marginLeft: 8,
  },
  arrowText: {
    fontSize: 24,
    color: "#FF6B35",
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 16,
    color: "#FFF",
  },
});

export default VehiclePickerScreen;
