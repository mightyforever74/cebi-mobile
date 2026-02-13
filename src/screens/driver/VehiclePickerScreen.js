// src/screens/driver/VehiclePickerScreen.js
// TulipFleet - Vehicle Picker Screen (Device Provision Flow)
// Updated: 11 Şubat 2026 - Theme migration (UI System Guide v3)
// ✅ useTheme + useThemedStyles + makeStyles
// ✅ Card component, 8px grid, no hardcoded hex/rgba, dark mode ready

import { Ionicons } from "@expo/vector-icons";
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

import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverProvisionAPI } from "../../services/api";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // Loading / Empty
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.lg, // 24
    },
    loadingText: {
      marginTop: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
    },
    emptyText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginBottom: COLORS.SPACING.lg, // 24
    },

    // Header
    header: {
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.lg, // 24
      paddingVertical: COLORS.SPACING.lg, // 24
    },
    title: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },

    // List
    listContainer: {
      flex: 1,
      padding: COLORS.SPACING.md, // 16
    },

    // Vehicle card (use Card component)
    vehicleTouchable: {
      // touch wrapper, no styles needed; keep for readability
    },
    vehicleCard: {
      // Card provides base. We'll add internal layout.
    },
    vehicleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    vehicleIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: COLORS.WARNING_LIGHT,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    vehicleInfo: {
      flex: 1,
    },
    vehiclePlate: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    vehicleDetails: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    vehicleFuel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
    },
    arrowIcon: {
      marginLeft: COLORS.SPACING.sm, // 8
    },

    // Footer
    footer: {
      padding: COLORS.SPACING.md, // 16
      backgroundColor: COLORS.SURFACE,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    cancelButton: {
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button, // 8
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.DIVIDER,
    },
    cancelButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.TEXT_SECONDARY,
    },

    // Retry button (empty state)
    retryButton: {
      height: COLORS.SPACING.buttonHeight, // 48
      borderRadius: COLORS.RADIUS.button,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: COLORS.SPACING.lg, // 24
      backgroundColor: COLORS.PRIMARY,
      ...COLORS.SHADOWS.button,
    },
    retryButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },

    // Assign overlay
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
      padding: COLORS.SPACING.lg, // 24
    },
    loadingOverlayText: {
      marginTop: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

const VehiclePickerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const { serial, deviceId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [assigning, setAssigning] = useState(false);

  const displayName = user?.first_name || user?.name || user?.email || "Sürücü";

  useEffect(() => {
    fetchVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await driverProvisionAPI.getAvailableVehicles();
      setVehicles(response?.vehicles || []);
    } catch (error) {
      console.error("[VehiclePicker] Error:", error);
      Alert.alert("Hata", "Araçlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = async (vehicle) => {
    const plate = vehicle.plate || vehicle.plate_no || "Bilinmeyen";

    Alert.alert(
      "Cihaz Ataması",
      `${plate} plakalı aracı seçtiniz. Devam etmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        { text: "Devam", onPress: () => assignDevice(vehicle) },
      ]
    );
  };

  const assignDevice = async (vehicle) => {
    if (!deviceId) {
      console.error("[VehiclePicker] ❌ No deviceId - cannot proceed!");
      Alert.alert(
        "BLE Bağlantısı Yok",
        "WiFi kurulumu için BLE bağlantısı gerekli. Baştan başlatmak ister misiniz?",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Baştan Başlat",
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: "DriverDashboard" }],
              });
            },
          },
        ]
      );
      return;
    }

    try {
      setAssigning(true);

      console.log("[VehiclePicker] Assigning device:", {
        serial,
        vehicle_id: vehicle.id,
        deviceId,
      });

      const response = await driverProvisionAPI.assignDevice({
        device_serial: serial,
        vehicle_id: vehicle.id,
      });

      if (response?.success) {
        console.log("[VehiclePicker] ✅ Assignment success");
        navigation.replace("WiFiPickerMain", {
          serial,
          vehicle,
          assignment_id: response.assignment_id,
          deviceId,
        });
      } else {
        Alert.alert("Hata", response?.message || "Atama başarısız");
      }
    } catch (error) {
      console.error("[VehiclePicker] Assign error:", error);
      Alert.alert(
        "Hata",
        "Cihaz ataması başarısız: " + (error.message || "Bilinmeyen hata")
      );
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  if (vehicles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Kullanılabilir araç bulunamadı</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchVehicles}
          activeOpacity={0.85}
        >
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

      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {vehicles.map((vehicle) => {
          const plate = vehicle.plate || vehicle.plate_no || "-";
          const fuelLabel =
            vehicle.fuel_type === "diesel"
              ? "Dizel"
              : vehicle.fuel_type === "gasoline"
                ? "Benzin"
                : vehicle.fuel_type || "-";

          return (
            <TouchableOpacity
              key={vehicle.id}
              style={styles.vehicleTouchable}
              onPress={() => handleVehicleSelect(vehicle)}
              disabled={assigning}
              activeOpacity={0.85}
            >
              <Card
                variant="default"
                noMarginBottom
                style={assigning ? { opacity: 0.6 } : null}
              >
                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleIcon}>
                    <Ionicons
                      name="car-sport-outline"
                      size={22}
                      color={COLORS.WARNING}
                    />
                  </View>

                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehiclePlate}>{plate}</Text>
                    <Text style={styles.vehicleDetails}>
                      {vehicle.brand} {vehicle.model} {vehicle.year}
                    </Text>
                    <Text style={styles.vehicleFuel}>Yakıt: {fuelLabel}</Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.MUTED}
                    style={styles.arrowIcon}
                  />
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={assigning}
          activeOpacity={0.85}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>

      {assigning && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.WHITE} />
          <Text style={styles.loadingOverlayText}>Atanıyor...</Text>
        </View>
      )}
    </View>
  );
};

export default VehiclePickerScreen;
