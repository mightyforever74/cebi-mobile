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
import { driverAPI } from "../../services/api";

const EditDriverScreen = ({ navigation, route }) => {
  const { driver } = route.params;
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
    { value: "idle", label: "Boşta" },
    { value: "active", label: "Aktif" },
    { value: "paused", label: "Duraklatıldı" },
    { value: "offline", label: "Çevrimdışı" },
  ];

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.license_no.trim()) {
      Alert.alert("Hata", "Ehliyet numarası zorunludur");
      return;
    }

    setLoading(true);
    try {
      await driverAPI.update(driver.id, formData);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Sürücü başarıyla güncellendi",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Update driver error:", error);
      Alert.alert(
        "Hata",
        error.response?.data?.error || "Sürücü güncellenemedi"
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
        placeholderTextColor={COLORS.gray}
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
          {/* Email (readonly) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={driver.email}
              editable={false}
            />
          </View>

          {/* Kişisel Bilgiler */}
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              {renderInput("Ad", "first_name", "Ali", {
                autoCapitalize: "words",
              })}
            </View>
            <View style={styles.halfInput}>
              {renderInput("Soyad", "last_name", "Yılmaz", {
                autoCapitalize: "words",
              })}
            </View>
          </View>

          {renderInput("Telefon", "phone", "05XX XXX XX XX", {
            keyboardType: "phone-pad",
          })}

          {/* Ehliyet Bilgileri */}
          <Text style={styles.sectionTitle}>Ehliyet Bilgileri</Text>

          {renderInput("Ehliyet No *", "license_no", "TR123456789", {
            autoCapitalize: "characters",
          })}

          {renderInput("Ehliyet Bitiş Tarihi", "license_expiry", "2025-12-31")}

          {/* Durum */}
          {renderSelector("Durum", "status", statusTypes)}

          {/* Acil Durum */}
          <Text style={styles.sectionTitle}>Acil Durum</Text>
          {renderInput(
            "Acil Durum Kişisi",
            "emergency_contact",
            "Ayşe Yılmaz - 05XX XXX XX XX"
          )}

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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 12,
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
  inputDisabled: {
    backgroundColor: "#F0F0F0",
    color: COLORS.gray,
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

export default EditDriverScreen;
