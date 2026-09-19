import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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

const EditVehicleScreen = ({ navigation, route }) => {
  const { vehicle } = route.params;
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
    { value: "diesel" },
    { value: "gasoline" },
    { value: "electric" },
    { value: "hybrid" },
    { value: "lpg" },
  ];

  const statusTypes = [
    { value: "available" },
    { value: "in_use" },
    { value: "maintenance" },
    { value: "retired" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.plate_no.trim()) {
      Alert.alert(t("common.error"), t("createVehicle.plateRequired"));
      return;
    }
    if (!formData.esp32_device_id.trim()) {
      Alert.alert(t("common.error"), t("createVehicle.deviceIdRequired"));
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
          t("common.success"),
          t("createVehicle.updated"),
          [{ text: t("common.ok"), onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update vehicle error:", error);
      Alert.alert(
        t("common.error"),
        error.response?.data?.error || t("createVehicle.updateFailed")
      );
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

  const renderSelector = (label, field, options, keyPrefix) => (
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
              {t(`${keyPrefix}.${option.value}`)}
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
          <Card variant="flat">
            {renderInput(t("createVehicle.plate"), "plate_no", "34ABC123")}
            {renderInput(
              t("createVehicle.deviceId"),
              "esp32_device_id",
              "ESP32-001"
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                {renderInput(
                  t("createVehicle.brandOptional"),
                  "brand",
                  "Ford"
                )}
              </View>
              <View style={styles.halfInput}>
                {renderInput(
                  t("createVehicle.modelOptional"),
                  "model",
                  "Transit"
                )}
              </View>
            </View>

            {renderInput(t("createVehicle.year"), "year", "2023", "numeric")}
          </Card>

          {renderSelector(
            t("createVehicle.fuelType"),
            "fuel_type",
            fuelTypes,
            "adminVehicles.fuelTypes"
          )}
          {renderSelector(
            t("createVehicle.status"),
            "status",
            statusTypes,
            "adminVehicles.status"
          )}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                <Text style={styles.saveButtonText}>
                  {t("createVehicle.updateButton")}
                </Text>
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
    selectorContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: COLORS.SPACING.md,
    },
    selectorButton: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.SURFACE,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    selectorActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    selectorText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
    },
    selectorTextActive: {
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

export default EditVehicleScreen;
