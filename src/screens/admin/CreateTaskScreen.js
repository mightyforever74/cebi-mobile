import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native"; // ← Eklendi
import React, { useState } from "react";
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
import SearchableSelect from "../../../components/SearchableSelect";
import { COLORS } from "../../constants/config";
import { driverAPI, taskAPI, vehicleAPI } from "../../services/api";

const CreateTaskScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [formData, setFormData] = useState({
    startAddress: "",
    endAddress: "",
    description: "",
    plannedStart: "",
    plannedEnd: "",
  });

  // useEffect(() => {
  //   fetchData();
  // }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        driverAPI.getList(),
        vehicleAPI.getList(),
      ]);
      setDrivers(driversRes.drivers || []);
      setVehicles(vehiclesRes.vehicles || []);
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
    // Validation
    if (!selectedDriver) {
      Alert.alert("Hata", "Sürücü seçiniz");
      return;
    }
    if (!selectedVehicle) {
      Alert.alert("Hata", "Araç seçiniz");
      return;
    }
    if (!formData.startAddress.trim() || !formData.endAddress.trim()) {
      Alert.alert("Hata", "Başlangıç ve bitiş adresi zorunludur");
      return;
    }

    setLoading(true);
    try {
      // Değiştirilen kısım:
      const data = {
        driver_id: selectedDriver.id,
        vehicle_id: selectedVehicle.id,
        title:
          formData.description.trim() ||
          `${formData.startAddress} → ${formData.endAddress}`,
        description: formData.description.trim(),
        start_location: formData.startAddress.trim(),
        end_location: formData.endAddress.trim(),
        scheduled_start: formData.plannedStart || null,
        scheduled_end: formData.plannedEnd || null,
        priority: "normal",
      };

      await taskAPI.create(data);

      setTimeout(() => {
        Alert.alert(
          "✅ Başarılı",
          "Görev başarıyla oluşturuldu",
          [{ text: "Tamam", onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      }, 100);
    } catch (error) {
      console.error("Create task error:", error);
      Alert.alert(
        "Hata",
        error.response?.data?.error || "Görev oluşturulamadı"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, field, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.inputMultiline]}
        value={formData[field]}
        onChangeText={(value) => handleChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray}
        multiline={options.multiline}
        numberOfLines={options.numberOfLines}
      />
    </View>
  );

  // const renderSelector = (
  //   label,
  //   items,
  //   selected,
  //   setSelected,
  //   displayKey,
  //   icon
  // ) => (
  //   <View style={styles.inputContainer}>
  //     <Text style={styles.label}>{label}</Text>
  //     <ScrollView horizontal showsHorizontalScrollIndicator={false}>
  //       <View style={styles.selectorRow}>
  //         {items.map((item) => (
  //           <TouchableOpacity
  //             key={item.id}
  //             style={[
  //               styles.selectorButton,
  //               selected?.id === item.id && styles.selectorActive,
  //             ]}
  //             onPress={() => setSelected(item)}
  //           >
  //             <Ionicons
  //               name={icon}
  //               size={16}
  //               color={selected?.id === item.id ? COLORS.white : COLORS.primary}
  //             />
  //             <Text
  //               style={[
  //                 styles.selectorText,
  //                 selected?.id === item.id && styles.selectorTextActive,
  //               ]}
  //               numberOfLines={1}
  //             >
  //               {item[displayKey] || item.email?.split("@")[0] || "N/A"}
  //             </Text>
  //           </TouchableOpacity>
  //         ))}
  //       </View>
  //     </ScrollView>
  //   </View>
  // );

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
          {/* Sürücü Seçimi */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sürücü Seç *</Text>
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => navigation.navigate("CreateDriver")}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Yeni Sürücü</Text>
            </TouchableOpacity>
          </View>
          <SearchableSelect
            data={drivers}
            selected={selectedDriver}
            onSelect={setSelectedDriver}
            placeholder="Sürücü seçin..."
            labelField="first_name"
            iconName="person"
            title="Sürücü Seç"
          />
          {selectedDriver && (
            <View style={styles.selectedInfo}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.success || "#10B981"}
              />
              <Text style={styles.selectedText}>
                {selectedDriver.first_name ||
                  selectedDriver.email?.split("@")[0]}{" "}
                - {selectedDriver.license_no}
              </Text>
            </View>
          )}

          {/* Araç Seçimi */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Araç Seç *</Text>
            <TouchableOpacity
              style={styles.addNewButton}
              onPress={() => navigation.navigate("CreateVehicle")}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.primary} />
              <Text style={styles.addNewText}>Yeni Araç</Text>
            </TouchableOpacity>
          </View>
          <SearchableSelect
            data={vehicles}
            selected={selectedVehicle}
            onSelect={setSelectedVehicle}
            placeholder="Araç seçin..."
            labelField="plate_no"
            iconName="car"
            title="Araç Seç"
          />

          {selectedVehicle && (
            <View style={styles.selectedInfo}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.success || "#10B981"}
              />
              <Text style={styles.selectedText}>
                {selectedVehicle.plate_no} - {selectedVehicle.brand}{" "}
                {selectedVehicle.model}
              </Text>
            </View>
          )}

          {/* Rota Bilgileri */}
          <Text style={styles.sectionTitle}>Rota Bilgileri</Text>
          {renderInput(
            "Başlangıç Adresi *",
            "startAddress",
            "Örn: İstanbul, Kadıköy"
          )}
          {renderInput("Bitiş Adresi *", "endAddress", "Örn: Ankara, Kızılay")}
          {renderInput("Açıklama", "description", "Görev detayları...", {
            multiline: true,
            numberOfLines: 3,
          })}

          {/* Zaman Planlaması */}
          <Text style={styles.sectionTitle}>Zaman Planlaması</Text>
          {renderInput(
            "Planlanan Başlangıç",
            "plannedStart",
            "2025-12-10 09:00"
          )}
          {renderInput("Planlanan Bitiş", "plannedEnd", "2025-12-10 17:00")}

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
                <Text style={styles.saveButtonText}>Görev Oluştur</Text>
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
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
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  // selectorRow: {
  //   flexDirection: "row",
  //   gap: 10,
  //   paddingVertical: 4,
  // },
  // selectorButton: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingHorizontal: 16,
  //   paddingVertical: 12,
  //   borderRadius: 25,
  //   backgroundColor: COLORS.white,
  //   borderWidth: 1,
  //   borderColor: COLORS.primary,
  //   gap: 8,
  // },
  // selectorActive: {
  //   backgroundColor: COLORS.primary,
  // },
  // selectorText: {
  //   fontSize: 14,
  //   color: COLORS.primary,
  //   maxWidth: 100,
  // },
  // selectorTextActive: {
  //   color: COLORS.white,
  //   fontWeight: "600",
  // },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  selectedText: {
    fontSize: 13,
    color: COLORS.success || "#10B981",
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    fontStyle: "italic",
    marginBottom: 12,
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
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addNewText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  selectorBusy: {
    borderColor: COLORS.warning || "#FB6340",
    backgroundColor: "#FFF8F0",
  },
  selectorTextBusy: {
    color: COLORS.warning || "#FB6340",
  },
});

export default CreateTaskScreen;
