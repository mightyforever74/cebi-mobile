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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { vehicleAPI } from "../../services/api";

const CreateVehicleScreen = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(false);
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
          "Basarili",
          "Arac basariyla eklendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Create vehicle error:", error);
      Alert.alert("Hata", error.response?.data?.error || "Arac eklenemedi");
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
        placeholderTextColor={COLORS.PLACEHOLDER}
        keyboardType={keyboardType}
        autoCapitalize={field === "plate_no" ? "characters" : "words"}
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
          <Card variant="flat">
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

            {/* Yil */}
            {renderInput("Yil", "year", "2023", "numeric")}

            {/* Yakit Tipi */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Yakit Tipi</Text>
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
          </Card>

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
                <Ionicons name="add-circle" size={20} color={COLORS.WHITE} />
                <Text style={styles.saveButtonText}>Arac Ekle</Text>
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
    inputContainer: {
      marginBottom: COLORS.SPACING.md,
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
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
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    halfInput: {
      flex: 1,
      marginRight: COLORS.SPACING.sm,
    },
    fuelTypeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    fuelTypeButton: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SURFACE,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    fuelTypeActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    fuelTypeText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
    },
    fuelTypeTextActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      height: COLORS.SPACING.buttonHeight,
      borderRadius: COLORS.RADIUS.button,
      marginTop: COLORS.SPACING.lg,
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

export default CreateVehicleScreen;
