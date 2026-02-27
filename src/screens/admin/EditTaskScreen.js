import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import WaypointEditor from "../../components/admin/WaypointEditor";
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI, taskAPI, vehicleAPI } from "../../services/api";

const EditTaskScreen = ({ navigation, route }) => {
  const { task } = route.params;
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Status/Priority options use semantic COLORS tokens
  const STATUS_OPTIONS = [
    { value: "pending", label: "Bekliyor", color: COLORS.WARNING },
    { value: "assigned", label: "Atandi", color: COLORS.INFO },
    { value: "in_progress", label: "Devam Ediyor", color: COLORS.PRIMARY },
    { value: "completed", label: "Tamamlandi", color: COLORS.SUCCESS },
    { value: "cancelled", label: "Iptal", color: COLORS.ERROR },
  ];

  const PRIORITY_OPTIONS = [
    { value: "low", label: "Dusuk", color: COLORS.SUCCESS },
    { value: "normal", label: "Normal", color: COLORS.INFO },
    { value: "high", label: "Yuksek", color: COLORS.WARNING },
    { value: "urgent", label: "Acil", color: COLORS.ERROR },
  ];

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    title: task.title || "",
    description: task.description || "",
    startLocation: task.start_location || "",
    endLocation: task.end_location || "",
    status: task.status || "pending",
    priority: task.priority || "normal",
  });

  // Waypoints state - parse from task (string or array)
  const [waypoints, setWaypoints] = useState(() => {
    let wp = task.waypoints || [];
    if (typeof wp === "string") {
      try {
        wp = JSON.parse(wp);
      } catch {
        wp = [];
      }
    }
    if (!Array.isArray(wp)) wp = [];
    return wp;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        driverAPI.getList(),
        vehicleAPI.getList(),
      ]);
      const driversList = driversRes.drivers || [];
      const vehiclesList = vehiclesRes.vehicles || [];

      setDrivers(driversList);
      setVehicles(vehiclesList);

      const currentDriver = driversList.find((d) => d.id === task.driver_id);
      const currentVehicle = vehiclesList.find((v) => v.id === task.vehicle_id);
      setSelectedDriver(currentDriver || null);
      setSelectedVehicle(currentVehicle || null);
    } catch (error) {
      console.error("Fetch data error:", error);
      Alert.alert("Hata", "Veriler yuklenemedi");
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedDriver) {
      Alert.alert("Hata", "Surucu seciniz");
      return;
    }
    if (!selectedVehicle) {
      Alert.alert("Hata", "Arac seciniz");
      return;
    }

    setLoading(true);
    try {
      const data = {
        driver_id: selectedDriver.id,
        vehicle_id: selectedVehicle.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        start_location: formData.startLocation.trim(),
        end_location: formData.endLocation.trim(),
        status: formData.status,
        priority: formData.priority,
        waypoints: waypoints.map((wp, idx) => {
          const lat = Number(wp.latitude ?? wp.lat);
          const lng = Number(wp.longitude ?? wp.lng);
          return {
            id: wp.id || `wp-${Date.now()}-${idx}`,
            name: wp.name || "",
            address: wp.address || "",
            latitude: Number.isFinite(lat) ? lat : null,
            longitude: Number.isFinite(lng) ? lng : null,
            planned_arrival: wp.planned_arrival || null,
            status: wp.status || "pending",
          };
        }),
      };

      await taskAPI.update(task.id, data);

      setTimeout(() => {
        Alert.alert(
          "Basarili",
          "Gorev basariyla guncellendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update task error:", error);
      Alert.alert(
        "Hata",
        error.response?.data?.error || "Gorev guncellenemedi"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Yukleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Task Code (Readonly) */}
          <Card variant="elevated">
            <View style={styles.taskCodeInner}>
              <Text style={styles.taskCodeLabel}>Gorev Kodu</Text>
              <Text style={styles.taskCode}>{task.task_code}</Text>
            </View>
          </Card>

          {/* Status Selection */}
          <Text style={styles.sectionTitle}>Durum</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    formData.status === option.value && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    },
                  ]}
                  onPress={() => handleChange("status", option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      formData.status === option.value &&
                        styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Priority Selection */}
          <Text style={styles.sectionTitle}>Oncelik</Text>
          <View style={styles.optionRow}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  formData.priority === option.value && {
                    backgroundColor: option.color,
                    borderColor: option.color,
                  },
                ]}
                onPress={() => handleChange("priority", option.value)}
              >
                <Text
                  style={[
                    styles.optionText,
                    formData.priority === option.value &&
                      styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Driver Selection */}
          <Text style={styles.sectionTitle}>Surucu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {drivers.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.optionButton,
                    selectedDriver?.id === d.id && styles.optionActive,
                    d.is_busy && d.id !== task.driver_id && styles.optionBusy,
                  ]}
                  onPress={() => setSelectedDriver(d)}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={
                      selectedDriver?.id === d.id
                        ? COLORS.WHITE
                        : COLORS.PRIMARY
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedDriver?.id === d.id && styles.optionTextActive,
                    ]}
                  >
                    {d.first_name || d.email?.split("@")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Vehicle Selection */}
          <Text style={styles.sectionTitle}>Arac</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.optionButton,
                    selectedVehicle?.id === v.id && styles.optionActive,
                    v.is_busy && v.id !== task.vehicle_id && styles.optionBusy,
                  ]}
                  onPress={() => setSelectedVehicle(v)}
                >
                  <Ionicons
                    name="car"
                    size={16}
                    color={
                      selectedVehicle?.id === v.id
                        ? COLORS.WHITE
                        : COLORS.PRIMARY
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedVehicle?.id === v.id && styles.optionTextActive,
                    ]}
                  >
                    {v.plate_no}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Title */}
          <Text style={styles.sectionTitle}>Baslik</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(v) => handleChange("title", v)}
            placeholder="Gorev basligi"
            placeholderTextColor={COLORS.PLACEHOLDER}
          />

          {/* Locations */}
          <Text style={styles.sectionTitle}>Rota</Text>
          <TextInput
            style={styles.input}
            value={formData.startLocation}
            onChangeText={(v) => handleChange("startLocation", v)}
            placeholder="Baslangic adresi"
            placeholderTextColor={COLORS.PLACEHOLDER}
          />
          <TextInput
            style={[styles.input, { marginTop: COLORS.SPACING.sm }]}
            value={formData.endLocation}
            onChangeText={(v) => handleChange("endLocation", v)}
            placeholder="Bitis adresi"
            placeholderTextColor={COLORS.PLACEHOLDER}
          />

          {/* Waypoints / Stops */}
          <View style={{ marginTop: COLORS.SPACING.md }}>
            <WaypointEditor
              waypoints={waypoints}
              setWaypoints={setWaypoints}
              COLORS={{
                PRIMARY: COLORS.PRIMARY,
                SECONDARY: COLORS.SECONDARY,
                SURFACE: COLORS.SURFACE,
                TEXT: COLORS.TEXT_PRIMARY,
                MUTED: COLORS.TEXT_MUTED,
                ERROR: COLORS.ERROR,
                WHITE: COLORS.WHITE,
                DIVIDER: COLORS.DIVIDER,
                PLACEHOLDER: COLORS.PLACEHOLDER,
              }}
              inputStyle={styles.input}
              maxStops={10}
              labels={{
                title: "Duraklar",
                add: "Durak Ekle",
                limitReached: "Durak limiti doldu",
                name: "Durak Adi",
                address: "Durak Adresi",
                lat: "Lat",
                lng: "Lng",
                planned: "Planlanan Varis",
                invalid: "Koordinatlar gecersiz",
                noStops: "Henuz durak eklenmedi",
              }}
            />
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Aciklama</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={formData.description}
            onChangeText={(v) => handleChange("description", v)}
            placeholder="Gorev detaylari..."
            placeholderTextColor={COLORS.PLACEHOLDER}
            multiline
            numberOfLines={3}
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.WHITE}
                />
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      padding: COLORS.SPACING.md,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_MUTED,
    },
    taskCodeInner: {
      alignItems: "center",
    },
    taskCodeLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginBottom: COLORS.SPACING.xs,
    },
    taskCode: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.PRIMARY,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
    },
    optionRow: {
      flexDirection: "row",
      paddingVertical: COLORS.SPACING.xs,
    },
    optionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SURFACE,
      borderWidth: 1,
      borderColor: COLORS.PRIMARY,
      marginRight: COLORS.SPACING.sm,
    },
    optionActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    optionBusy: {
      borderColor: COLORS.WARNING,
      backgroundColor: COLORS.WARNING_LIGHT,
    },
    optionText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      marginLeft: COLORS.SPACING.xs,
    },
    optionTextActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    input: {
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input,
      padding: COLORS.SPACING.md,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    inputMultiline: {
      minHeight: 96, // 8px grid: 12 * 8
      textAlignVertical: "top",
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight,
      borderRadius: COLORS.RADIUS.button,
      marginTop: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.xl,
      ...COLORS.SHADOWS.button,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.button,
      marginLeft: COLORS.SPACING.sm,
    },
  });

export default EditTaskScreen;
