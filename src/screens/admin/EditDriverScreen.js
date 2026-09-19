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
import { driverAPI } from "../../services/api";

const EditDriverScreen = ({ navigation, route }) => {
  const { driver } = route.params;
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: driver.first_name || "",
    last_name: driver.last_name || "",
    phone: driver.phone || "",
    license_no: driver.license_no || "",
    license_expiry: driver.license_expiry || "",
    emergency_contact: driver.emergency_contact || "",
    status: driver.status || "idle",
  });

  const statusTypes = [
    { value: "idle", key: "createDriver.statusIdle" },
    { value: "active", key: "createDriver.statusActive" },
    { value: "paused", key: "createDriver.statusPaused" },
    { value: "offline", key: "adminDrivers.status.offline" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.license_no.trim()) {
      Alert.alert(t("common.error"), t("createDriver.licenseRequired"));
      return;
    }

    setLoading(true);
    try {
      await driverAPI.update(driver.id, formData);

      setTimeout(() => {
        Alert.alert(
          t("common.success"),
          t("createDriver.updated"),
          [{ text: t("common.ok"), onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update driver error:", error);
      Alert.alert(
        t("common.error"),
        error.response?.data?.error || t("createDriver.updateFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          options.editable === false && styles.inputDisabled,
        ]}
        value={formData[field]}
        onChangeText={(value) => handleChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.PLACEHOLDER}
        keyboardType={options.keyboardType || "default"}
        autoCapitalize={options.autoCapitalize || "none"}
        editable={options.editable !== false}
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
              {t(option.key)}
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
          {/* Email (readonly) */}
          <Card variant="flat">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("createDriver.email")}</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={driver.email}
                editable={false}
              />
            </View>
          </Card>

          {/* Kisisel Bilgiler */}
          <Text style={styles.sectionTitle}>
            {t("createDriver.personalInfo")}
          </Text>
          <Card variant="flat">
            <View style={styles.row}>
              <View style={styles.halfInput}>
                {renderInput(t("createDriver.firstName"), "first_name", "Ali", {
                  autoCapitalize: "words",
                })}
              </View>
              <View style={styles.halfInput}>
                {renderInput(t("createDriver.lastName"), "last_name", "Yilmaz", {
                  autoCapitalize: "words",
                })}
              </View>
            </View>

            {renderInput(t("createDriver.phone"), "phone", "05XX XXX XX XX", {
              keyboardType: "phone-pad",
            })}
          </Card>

          {/* Ehliyet Bilgileri */}
          <Text style={styles.sectionTitle}>
            {t("createDriver.licenseInfo")}
          </Text>
          <Card variant="flat">
            {renderInput(
              t("createDriver.licenseNo"),
              "license_no",
              "TR123456789",
              {
              autoCapitalize: "characters",
            })}

            {renderInput(
              t("createDriver.licenseExpiry"),
              "license_expiry",
              "2025-12-31"
            )}
          </Card>

          {/* Durum */}
          {renderSelector(t("createDriver.statusLabel"), "status", statusTypes)}

          {/* Acil Durum */}
          <Text style={styles.sectionTitle}>{t("createDriver.emergency")}</Text>
          <Card variant="flat">
            {renderInput(
              t("createDriver.emergencyContact"),
              "emergency_contact",
              "Ayse Yilmaz - 05XX XXX XX XX"
            )}
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
                <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                <Text style={styles.saveButtonText}>
                  {t("createDriver.updateButton")}
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
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
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
    inputDisabled: {
      backgroundColor: COLORS.DISABLED_BG,
      color: COLORS.DISABLED,
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

export default EditDriverScreen;
