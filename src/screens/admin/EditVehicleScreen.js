import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { vehicleAPI } from "../../services/api";

const EditVehicleScreen = ({ navigation, route }) => {
  const { vehicle } = route.params;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    plate_no: vehicle.plate_no || "",
    esp32_device_id: vehicle.esp32_device_id || "",
    brand: vehicle.brand || "",
    model: vehicle.model || "",
    year: vehicle.year ? String(vehicle.year) : "",
    fuel_type: vehicle.fuel_type || "diesel",
    status: vehicle.status || "available",
  });

  const fuelTypes = [
    { value: "diesel", label: "Dizel" },
    { value: "gasoline", label: "Benzin" },
    { value: "electric", label: "Elektrik" },
    { value: "hybrid", label: "Hibrit" },
    { value: "lpg", label: "LPG" },
  ];

  const statusTypes = [
    { value: "available", label: "Müsait" },
    { value: "in_use", label: "Kullanımda" },
    { value: "maintenance", label: "Bakımda" },
    { value: "retired", label: "Emekli" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.plate_no.trim()) {
      Alert.alert("Hata", "Plaka zorunludur");
      return;
    }
    if (!formData.esp32_device_id.trim()) {
      Alert.alert("Hata", "ESP32 Cihaz ID zorunludur");
      return;
    }

    setLoading(true);
    try {
      const data = {
        plate_no: formData.plate_no.trim().toUpperCase(),
        esp32_device_id: formData.esp32_device_id.trim(),
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: formData.year ? parseInt(formData.year) : null,
        fuel_type: formData.fuel_type,
        status: formData.status,
      };

      await vehicleAPI.update(vehicle.id, data);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Araç başarıyla güncellendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update vehicle error:", error);
      Alert.alert("Hata", error.response?.data?.error || "Araç güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, placeholder, keyboardType = "default") => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={formData[field]}
        onChangeText={(value) => handleChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
        keyboardType={keyboardType}
        autoCapitalize={field === "plate_no" ? "characters" : "words"}
      />
    </View>
  );

  const renderSelector = (label, field, options) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectorContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.selectorButton,
              formData[field] === option.value && styles.selectorActive,
            ]}
            onPress={() => handleChange(field, option.value)}
          >
            <Text
              style={[
                styles.selectorText,
                formData[field] === option.value && styles.selectorTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderInput("Plaka *", "plate_no", "34ABC123")}
          {renderInput("ESP32 Cihaz ID *", "esp32_device_id", "ESP32-001")}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput("Marka", "brand", "Ford")}
            </View>
            <View style={styles.halfInput}>
              {renderInput("Model", "model", "Transit")}
            </View>
          </View>

          {renderInput("Yıl", "year", "2023", "numeric")}
          {renderSelector("Yakıt Tipi", "fuel_type", fuelTypes)}
          {renderSelector("Durum", "status", statusTypes)}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Güncelle</Text>
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
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  selectorContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
  },
  selectorActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectorText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectorTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
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

export default EditVehicleScreen;
