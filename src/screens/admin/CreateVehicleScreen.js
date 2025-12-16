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

const CreateVehicleScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  // formData'yı güncelle
  const [formData, setFormData] = useState({
    plate_no: "",
    esp32_device_id: "",
    brand: "",
    model: "",
    year: "",
    fuelType: "diesel",
  });

  const fuelTypes = [
    { value: "diesel", label: "Dizel" },
    { value: "gasoline", label: "Benzin" },
    { value: "electric", label: "Elektrik" },
    { value: "hybrid", label: "Hibrit" },
    { value: "lpg", label: "LPG" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (!formData.plate_no.trim()) {
      Alert.alert("Hata", "Plaka zorunludur");
      return;
    }
    if (!formData.esp32_device_id.trim()) {
      Alert.alert("Hata", "ESP32 Cihaz ID zorunludur");
      return;
    }
    if (!formData.brand.trim()) {
      Alert.alert("Hata", "Marka zorunludur");
      return;
    }
    if (!formData.model.trim()) {
      Alert.alert("Hata", "Model zorunludur");
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
        fuel_type: formData.fuelType,
      };

      await vehicleAPI.create(data);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Araç başarıyla eklendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Create vehicle error:", error);
      Alert.alert("Hata", error.response?.data?.error || "Araç eklenemedi");
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
        autoCapitalize={field === "plate" ? "characters" : "words"}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Plaka */}
          {renderInput("Plaka *", "plate_no", "34ABC123")}

          {/* ESP32 Cihaz ID */}
          {renderInput("ESP32 Cihaz ID *", "esp32_device_id", "ESP32-001")}

          {/* Marka & Model */}
          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput("Marka *", "brand", "Ford")}
            </View>
            <View style={styles.halfInput}>
              {renderInput("Model *", "model", "Transit")}
            </View>
          </View>

          {/* Yıl */}
          {renderInput("Yıl", "year", "2023", "numeric")}

          {/* Yakıt Tipi */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Yakıt Tipi</Text>
            <View style={styles.fuelTypeContainer}>
              {fuelTypes.map((fuel) => (
                <TouchableOpacity
                  key={fuel.value}
                  style={[
                    styles.fuelTypeButton,
                    formData.fuelType === fuel.value && styles.fuelTypeActive,
                  ]}
                  onPress={() => handleChange("fuelType", fuel.value)}
                >
                  <Text
                    style={[
                      styles.fuelTypeText,
                      formData.fuelType === fuel.value &&
                        styles.fuelTypeTextActive,
                    ]}
                  >
                    {fuel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
                <Ionicons name="add-circle" size={20} color={COLORS.white} />
                <Text style={styles.saveButtonText}>Araç Ekle</Text>
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
  fuelTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fuelTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border || "#E5E5E5",
  },
  fuelTypeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fuelTypeText: {
    fontSize: 14,
    color: COLORS.text,
  },
  fuelTypeTextActive: {
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

export default CreateVehicleScreen;
