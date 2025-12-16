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
import { COLORS } from "../../constants/config";
import { driverAPI, taskAPI, vehicleAPI } from "../../services/api";

const STATUS_OPTIONS = [
  { value: "pending", label: "Bekliyor", color: "#FB6340" },
  { value: "assigned", label: "Atandı", color: "#11CDEF" },
  { value: "in_progress", label: "Devam Ediyor", color: "#5E72E4" },
  { value: "completed", label: "Tamamlandı", color: "#2DCE89" },
  { value: "cancelled", label: "İptal", color: "#F5365C" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Düşük", color: "#2DCE89" },
  { value: "normal", label: "Normal", color: "#11CDEF" },
  { value: "high", label: "Yüksek", color: "#FB6340" },
  { value: "urgent", label: "Acil", color: "#F5365C" },
];

const EditTaskScreen = ({ navigation, route }) => {
  const { task } = route.params;
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

      // Set selected driver and vehicle
      const currentDriver = driversList.find((d) => d.id === task.driver_id);
      const currentVehicle = vehiclesList.find((v) => v.id === task.vehicle_id);
      setSelectedDriver(currentDriver || null);
      setSelectedVehicle(currentVehicle || null);
    } catch (error) {
      console.error("Fetch data error:", error);
      Alert.alert("Hata", "Veriler yüklenemedi");
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedDriver) {
      Alert.alert("Hata", "Sürücü seçiniz");
      return;
    }
    if (!selectedVehicle) {
      Alert.alert("Hata", "Araç seçiniz");
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
      };

      await taskAPI.update(task.id, data);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Görev başarıyla güncellendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update task error:", error);
      Alert.alert(
        "Hata",
        error.response?.data?.error || "Görev güncellenemedi"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
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
          <View style={styles.taskCodeContainer}>
            <Text style={styles.taskCodeLabel}>Görev Kodu</Text>
            <Text style={styles.taskCode}>{task.task_code}</Text>
          </View>

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
          <Text style={styles.sectionTitle}>Öncelik</Text>
          <View style={styles.optionRow}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  formData.priority === option.value && {
                    backgroundColor: option.color,
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
          <Text style={styles.sectionTitle}>Sürücü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {drivers.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={[
                    styles.optionButton,
                    selectedDriver?.id === driver.id && styles.optionActive,
                    driver.is_busy &&
                      driver.id !== task.driver_id &&
                      styles.optionBusy,
                  ]}
                  onPress={() => setSelectedDriver(driver)}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={
                      selectedDriver?.id === driver.id
                        ? COLORS.white
                        : COLORS.primary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedDriver?.id === driver.id &&
                        styles.optionTextActive,
                    ]}
                  >
                    {driver.first_name || driver.email?.split("@")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Vehicle Selection */}
          <Text style={styles.sectionTitle}>Araç</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.id}
                  style={[
                    styles.optionButton,
                    selectedVehicle?.id === vehicle.id && styles.optionActive,
                    vehicle.is_busy &&
                      vehicle.id !== task.vehicle_id &&
                      styles.optionBusy,
                  ]}
                  onPress={() => setSelectedVehicle(vehicle)}
                >
                  <Ionicons
                    name="car"
                    size={16}
                    color={
                      selectedVehicle?.id === vehicle.id
                        ? COLORS.white
                        : COLORS.primary
                    }
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedVehicle?.id === vehicle.id &&
                        styles.optionTextActive,
                    ]}
                  >
                    {vehicle.plate_no}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Title */}
          <Text style={styles.sectionTitle}>Başlık</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(v) => handleChange("title", v)}
            placeholder="Görev başlığı"
            placeholderTextColor={COLORS.gray}
          />

          {/* Locations */}
          <Text style={styles.sectionTitle}>Rota</Text>
          <TextInput
            style={styles.input}
            value={formData.startLocation}
            onChangeText={(v) => handleChange("startLocation", v)}
            placeholder="Başlangıç adresi"
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={formData.endLocation}
            onChangeText={(v) => handleChange("endLocation", v)}
            placeholder="Bitiş adresi"
            placeholderTextColor={COLORS.gray}
          />

          {/* Description */}
          <Text style={styles.sectionTitle}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={formData.description}
            onChangeText={(v) => handleChange("description", v)}
            placeholder="Görev detayları..."
            placeholderTextColor={COLORS.gray}
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
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={COLORS.white}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray,
  },
  taskCodeContainer: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  taskCodeLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  taskCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  optionActive: {
    backgroundColor: COLORS.primary,
  },
  optionBusy: {
    borderColor: "#FB6340",
    backgroundColor: "#FFF8F0",
  },
  optionText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  optionTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EditTaskScreen;
