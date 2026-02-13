/**
 * CreateTaskScreen.js - User-Friendly Date/Time Picker (v2)
 * TulipFleet - Task Creation with Modern DateTime Selection
 *
 * v2 Fixes (korundu):
 * - iOS DateTimePicker Modal wrapper + Done button
 * - Modal overlay propagation fix
 * - End time validation (same day check)
 * - Timezone handling (UTC aware)
 * - i18n keys for all strings
 * - Removed unused imports
 *
 * Dark Mode Regen:
 * - Migration Rehberi pattern: makeStyles + useThemedStyles + useTheme
 * - Hardcoded HEX kaldırıldı (token + withAlpha)
 */

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text } from "galio-framework";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI, taskAPI, vehicleAPI } from "../../services/api";

// --- helper: #RRGGBB => #RRGGBBAA (soft bg/overlay için) ---
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

// Öncelik seçenekleri (renkler token ile component içinde çözülür)
const PRIORITY_OPTIONS = [
  {
    value: "low",
    labelKey: "priority_low",
    colorToken: "SUCCESS",
    icon: "chevron-down-circle",
  },
  {
    value: "normal",
    labelKey: "priority_normal",
    colorToken: "PRIMARY",
    icon: "remove-circle",
  },
  {
    value: "high",
    labelKey: "priority_high",
    colorToken: "WARNING",
    icon: "chevron-up-circle",
  },
  {
    value: "urgent",
    labelKey: "priority_urgent",
    colorToken: "ERROR",
    icon: "alert-circle",
  },
];

// i18n fallback helper
const getText = (t, key, fallbackTr, fallbackEn, isEn) => {
  const translated = t(key);
  if (translated === key) return isEn ? fallbackEn : fallbackTr;
  return translated;
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: COLORS.MUTED,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 50 : 16,
      paddingBottom: 16,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    // Content
    content: {
      flex: 1,
      padding: 16,
    },

    // Section
    section: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.35) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginBottom: 16,
    },

    // Input
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.MUTED,
      marginBottom: 8,
    },
    textInput: {
      backgroundColor:
        withAlpha(COLORS.SECONDARY, 0.65) || (COLORS.SURFACE ?? COLORS.WHITE),
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
    },
    textArea: {
      minHeight: 80,
      paddingTop: 14,
    },

    // Select Button
    selectButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor:
        withAlpha(COLORS.SECONDARY, 0.65) || (COLORS.SURFACE ?? COLORS.WHITE),
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
    },
    selectContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      paddingRight: 10,
    },
    selectText: {
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
    },
    selectPlaceholder: {
      color: COLORS.MUTED,
    },

    // DateTime
    dateTimeSection: {
      marginBottom: 16,
    },
    dateTimeGroupLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginBottom: 10,
    },
    dateTimeRow: {
      flexDirection: "row",
      gap: 12,
    },
    dateTimeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        withAlpha(COLORS.SECONDARY, 0.65) || (COLORS.SURFACE ?? COLORS.WHITE),
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
    },
    dateTimeIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    dateTimeContent: {
      flex: 1,
      marginLeft: 10,
    },
    dateTimeLabel: {
      fontSize: 12,
      color: COLORS.MUTED,
    },
    dateTimeValue: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 2,
    },

    // Duration Info
    durationInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
      borderRadius: 10,
      gap: 8,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },
    durationText: {
      fontSize: 14,
      fontWeight: "600",
      color: COLORS.PRIMARY,
    },

    // Location
    locationInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        withAlpha(COLORS.SECONDARY, 0.65) || (COLORS.SURFACE ?? COLORS.WHITE),
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
      paddingHorizontal: 12,
    },
    locationIcon: {
      marginRight: 10,
    },
    locationInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    // Route Line
    routeLine: {
      paddingVertical: 8,
      paddingLeft: 28,
    },
    routeDots: {
      alignItems: "center",
      height: 40,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    routeLineVertical: {
      width: 2,
      flex: 1,
      backgroundColor: COLORS.DIVIDER ?? COLORS.BORDER,
      marginVertical: 2,
    },

    // Submit Button
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      borderRadius: 14,
      paddingVertical: 16,
      marginTop: 8,
      gap: 10,
      shadowColor: COLORS.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.MUTED,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      fontSize: 17,
      fontWeight: "700",
      color: COLORS.WHITE,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.5),
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "70%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    modalList: {
      padding: 12,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 14,
      borderRadius: 12,
      marginBottom: 8,
    },
    modalItemSelected: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
    },
    modalItemContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
      paddingRight: 12,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    modalItemTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    modalItemSubtitle: {
      fontSize: 13,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    emptyText: {
      textAlign: "center",
      color: COLORS.MUTED,
      fontSize: 15,
      paddingVertical: 30,
    },

    // iOS DateTime Picker Modal
    iosPickerModal: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    iosPickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    iosPickerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    iosPickerCancel: {
      fontSize: 16,
      color: COLORS.MUTED,
    },
    iosPickerDone: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.PRIMARY,
    },
    iosPicker: {
      height: 216,
    },
  });

export default function CreateTaskScreen({ navigation }) {
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [driverId, setDriverId] = useState(null);
  const [vehicleId, setVehicleId] = useState(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [waypoints, setWaypoints] = useState([]);

  // Date/Time State
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );

  // Picker Visibility
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // iOS temporary values (for spinner mode)
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  // Dropdown State
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showDriverPicker, setShowDriverPicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  // Loading State
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Priority colors from theme
  const PRIORITY_RESOLVED = useMemo(() => {
    const tokenToColor = (token) => COLORS[token] || COLORS.PRIMARY;
    return PRIORITY_OPTIONS.map((p) => ({
      ...p,
      color: tokenToColor(p.colorToken),
    }));
  }, [COLORS]);

  // Fetch drivers and vehicles
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [driversRes, vehiclesRes] = await Promise.all([
        driverAPI.getList(),
        vehicleAPI.getList(),
      ]);
      setDrivers(driversRes.drivers || driversRes || []);
      setVehicles(vehiclesRes.vehicles || vehiclesRes || []);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Waypoint helpers
  const addWaypoint = () => {
    setWaypoints((prev) => [
      ...prev,
      {
        id: `wp-${prev.length + 1}`,
        name: "",
        address: "",
        latitude: null,
        longitude: null,
        planned_arrival: null,
        status: "pending",
      },
    ]);
  };

  const removeWaypoint = (id) => {
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const copy = [...waypoints];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    setWaypoints(copy);
  };

  const moveDown = (index) => {
    if (index === waypoints.length - 1) return;
    const copy = [...waypoints];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    setWaypoints(copy);
  };

  const updateWaypoint = (id, field, value) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  // Combine date and time
  const combineDateAndTime = (date, time) => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

  // Format date for display
  const formatDate = (date) =>
    date.toLocaleDateString(isEn ? "en-GB" : "tr-TR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  // Format time for display
  const formatTime = (time) =>
    time.toLocaleTimeString(isEn ? "en-GB" : "tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Android: Direct selection closes picker
  // iOS: Modal wrapper + Done button

  const onStartDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowStartDatePicker(false);
      if (event.type === "set" && selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) setEndDate(selectedDate);
      }
    } else {
      if (selectedDate) setTempStartDate(selectedDate);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowStartTimePicker(false);
      if (event.type === "set" && selectedTime) setStartTime(selectedTime);
    } else {
      if (selectedTime) setTempStartTime(selectedTime);
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
      if (event.type === "set" && selectedDate) setEndDate(selectedDate);
    } else {
      if (selectedDate) setTempEndDate(selectedDate);
    }
  };

  const validateAndSetEndTime = (newTime) => {
    const newEnd = combineDateAndTime(endDate, newTime);
    const start = combineDateAndTime(startDate, startTime);

    if (newEnd <= start) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "end_time_before_start",
          "Bitiş saati başlangıçtan sonra olmalı",
          "End time must be after start time",
          isEn
        )
      );
      return;
    }
    setEndTime(newTime);
  };

  const onEndTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
      if (event.type === "set" && selectedTime)
        validateAndSetEndTime(selectedTime);
    } else {
      if (selectedTime) setTempEndTime(selectedTime);
    }
  };

  // iOS Done button handlers
  const handleIOSStartDateDone = () => {
    setStartDate(tempStartDate);
    if (tempStartDate > endDate) {
      setEndDate(tempStartDate);
      setTempEndDate(tempStartDate);
    }
    setShowStartDatePicker(false);
  };

  const handleIOSStartTimeDone = () => {
    setStartTime(tempStartTime);
    setShowStartTimePicker(false);
  };

  const handleIOSEndDateDone = () => {
    setEndDate(tempEndDate);
    setShowEndDatePicker(false);
  };

  const handleIOSEndTimeDone = () => {
    const newEnd = combineDateAndTime(endDate, tempEndTime);
    const start = combineDateAndTime(startDate, startTime);

    if (newEnd <= start) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "end_time_before_start",
          "Bitiş saati başlangıçtan sonra olmalı",
          "End time must be after start time",
          isEn
        )
      );
      return;
    }
    setEndTime(tempEndTime);
    setShowEndTimePicker(false);
  };

  // Open picker handlers (set temp values for iOS)
  const openStartDatePicker = () => {
    setTempStartDate(startDate);
    setShowStartDatePicker(true);
  };
  const openStartTimePicker = () => {
    setTempStartTime(startTime);
    setShowStartTimePicker(true);
  };
  const openEndDatePicker = () => {
    setTempEndDate(endDate);
    setShowEndDatePicker(true);
  };
  const openEndTimePicker = () => {
    setTempEndTime(endTime);
    setShowEndTimePicker(true);
  };

  // Form Validation
  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "enter_task_title",
          "Görev başlığı girin",
          "Please enter task title",
          isEn
        )
      );
      return false;
    }
    if (!startLocation.trim()) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "enter_start_location",
          "Başlangıç konumu girin",
          "Please enter start location",
          isEn
        )
      );
      return false;
    }
    if (!endLocation.trim()) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "enter_destination",
          "Varış konumu girin",
          "Please enter destination",
          isEn
        )
      );
      return false;
    }

    const scheduledStart = combineDateAndTime(startDate, startTime);
    const scheduledEnd = combineDateAndTime(endDate, endTime);

    if (scheduledEnd <= scheduledStart) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "end_after_start",
          "Bitiş tarihi/saati başlangıçtan sonra olmalı",
          "End date/time must be after start date/time",
          isEn
        )
      );
      return false;
    }

    return true;
  };
  const GOOGLE_MAPS_API_KEY = "AIzaSyCAenCjwzpOicARpk3TQmV49t7-gAp1eIk";
  // Timezone handling - UTC to backend
  const handleSubmit = async () => {
    if (!validateForm()) return;

    const scheduledStart = combineDateAndTime(startDate, startTime);
    const scheduledEnd = combineDateAndTime(endDate, endTime);

    try {
      setLoading(true);

      // Waypoint adreslerini geocode et
      const geocodedWaypoints = await Promise.all(
        waypoints.map(async (wp) => {
          if (wp.latitude && wp.longitude) return wp;
          const addr = wp.address || wp.name;
          if (!addr) return wp;
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${GOOGLE_MAPS_API_KEY}&language=tr&region=tr`
            );
            const data = await res.json();
            if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
              const { lat, lng } = data.results[0].geometry.location;
              return { ...wp, latitude: lat, longitude: lng };
            }
          } catch (e) {
            console.error("Geocode error:", e);
          }
          return wp;
        })
      );

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        driver_id: driverId,
        vehicle_id: vehicleId,
        start_location: startLocation.trim(),
        end_location: endLocation.trim(),
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        waypoints: geocodedWaypoints.map((wp) => ({
          id: wp.id,
          name: wp.name || "",
          address: wp.address || "",
          latitude: Number(wp.latitude) || null,
          longitude: Number(wp.longitude) || null,
          planned_arrival: wp.planned_arrival || null,
          status: "pending",
        })),
      };

      await taskAPI.create(taskData);

      Alert.alert(
        getText(t, "success", "Başarılı", "Success", isEn),
        getText(
          t,
          "task_created",
          "Görev başarıyla oluşturuldu",
          "Task created successfully",
          isEn
        ),
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Görev oluşturulurken hata:", error);
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        error.response?.data?.error ||
          getText(
            t,
            "task_create_failed",
            "Görev oluşturulamadı",
            "Failed to create task",
            isEn
          )
      );
    } finally {
      setLoading(false);
    }
  };

  // Get selected driver/vehicle names
  const getDriverName = () => {
    if (!driverId)
      return getText(t, "select_driver", "Sürücü Seç", "Select Driver", isEn);
    const driver = drivers.find((d) => d.id === driverId);
    return driver
      ? `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
          driver.email
      : "";
  };

  const getVehicleName = () => {
    if (!vehicleId)
      return getText(t, "select_vehicle", "Araç Seç", "Select Vehicle", isEn);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle
      ? `${vehicle.plate_no} - ${vehicle.brand || ""} ${vehicle.model || ""}`.trim()
      : "";
  };

  const getPriorityLabel = () => {
    const p = PRIORITY_OPTIONS.find((opt) => opt.value === priority);
    if (!p) return "";
    return getText(
      t,
      p.labelKey,
      p.value === "low"
        ? "Düşük"
        : p.value === "normal"
          ? "Normal"
          : p.value === "high"
            ? "Yüksek"
            : "Acil",
      p.value === "low"
        ? "Low"
        : p.value === "normal"
          ? "Normal"
          : p.value === "high"
            ? "High"
            : "Urgent",
      isEn
    );
  };

  const DateTimeButton = ({
    icon,
    label,
    value,
    onPress,
    color = COLORS.PRIMARY,
  }) => (
    <TouchableOpacity
      style={styles.dateTimeButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.dateTimeIconBox,
          { backgroundColor: withAlpha(color, 0.12) },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.dateTimeContent}>
        <Text style={styles.dateTimeLabel}>{label}</Text>
        <Text style={styles.dateTimeValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.MUTED} />
    </TouchableOpacity>
  );

  const IOSDateTimePickerModal = ({
    visible,
    onClose,
    onDone,
    value,
    onChange,
    mode,
    minimumDate,
    title,
  }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.iosPickerModal} onPress={() => {}}>
          <SafeAreaView>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.iosPickerCancel}>
                  {getText(t, "cancel", "İptal", "Cancel", isEn)}
                </Text>
              </TouchableOpacity>
              <Text style={styles.iosPickerTitle}>{title}</Text>
              <TouchableOpacity onPress={onDone}>
                <Text style={styles.iosPickerDone}>
                  {getText(t, "done", "Tamam", "Done", isEn)}
                </Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={value}
              mode={mode}
              display="spinner"
              onChange={onChange}
              minimumDate={minimumDate}
              locale={isEn ? "en" : "tr"}
              style={styles.iosPicker}
            />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const SelectionModal = ({
    visible,
    onClose,
    title,
    data,
    selectedId,
    onSelect,
    renderItem,
  }) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={COLORS.TEXT ?? COLORS.DEFAULT}
              />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>
                {getText(
                  t,
                  "no_options",
                  "Seçenek bulunamadı",
                  "No options available",
                  isEn
                )}
              </Text>
            ) : (
              data.map((item) => (
                <TouchableOpacity
                  key={item.id || item.value}
                  style={[
                    styles.modalItem,
                    (item.id || item.value) === selectedId &&
                      styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.id || item.value);
                    onClose();
                  }}
                >
                  {renderItem(item)}
                  {(item.id || item.value) === selectedId && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={COLORS.PRIMARY}
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {getText(t, "loading", "Yükleniyor...", "Loading...", isEn)}
        </Text>
      </View>
    );
  }

  const priorityIcon =
    PRIORITY_OPTIONS.find((p) => p.value === priority)?.icon || "remove-circle";
  const priorityColor =
    PRIORITY_RESOLVED.find((p) => p.value === priority)?.color ||
    COLORS.PRIMARY;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={COLORS.TEXT ?? COLORS.DEFAULT}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {getText(t, "new_task", "Yeni Görev", "New Task", isEn)}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Task Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="clipboard-outline"
              size={18}
              color={COLORS.PRIMARY}
            />
            {"  "}
            {getText(
              t,
              "task_information",
              "Görev Bilgileri",
              "Task Information",
              isEn
            )}
          </Text>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "title", "Başlık", "Title", isEn)} *
            </Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder={getText(
                t,
                "task_title_placeholder",
                "Görev başlığını girin",
                "Enter task title",
                isEn
              )}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "description", "Açıklama", "Description", isEn)}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={getText(
                t,
                "description_placeholder",
                "Görev açıklaması (opsiyonel)",
                "Task description (optional)",
                isEn
              )}
              placeholderTextColor={COLORS.PLACEHOLDER}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Priority */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "priority", "Öncelik", "Priority", isEn)}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowPriorityPicker(true)}
            >
              <View style={styles.selectContent}>
                <Ionicons name={priorityIcon} size={20} color={priorityColor} />
                <Text style={styles.selectText}>{getPriorityLabel()}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.PRIMARY}
            />
            {"  "}
            {getText(t, "schedule", "Zamanlama", "Schedule", isEn)}
          </Text>

          {/* Start Date/Time */}
          <View style={styles.dateTimeSection}>
            <Text style={styles.dateTimeGroupLabel}>
              {getText(t, "start", "Başlangıç", "Start", isEn)}
            </Text>
            <View style={styles.dateTimeRow}>
              <DateTimeButton
                icon="calendar"
                label={getText(t, "date", "Tarih", "Date", isEn)}
                value={formatDate(startDate)}
                onPress={openStartDatePicker}
                color={COLORS.SUCCESS}
              />
              <DateTimeButton
                icon="time"
                label={getText(t, "time", "Saat", "Time", isEn)}
                value={formatTime(startTime)}
                onPress={openStartTimePicker}
                color={COLORS.SUCCESS}
              />
            </View>
          </View>

          {/* End Date/Time */}
          <View style={styles.dateTimeSection}>
            <Text style={styles.dateTimeGroupLabel}>
              {getText(t, "end", "Bitiş", "End", isEn)}
            </Text>
            <View style={styles.dateTimeRow}>
              <DateTimeButton
                icon="calendar"
                label={getText(t, "date", "Tarih", "Date", isEn)}
                value={formatDate(endDate)}
                onPress={openEndDatePicker}
                color={COLORS.ERROR}
              />
              <DateTimeButton
                icon="time"
                label={getText(t, "time", "Saat", "Time", isEn)}
                value={formatTime(endTime)}
                onPress={openEndTimePicker}
                color={COLORS.ERROR}
              />
            </View>
          </View>

          {/* Duration Info */}
          <View style={styles.durationInfo}>
            <Ionicons name="hourglass-outline" size={16} color={COLORS.MUTED} />
            <Text style={styles.durationText}>
              {getText(t, "duration", "Süre", "Duration", isEn)}:{" "}
              {(() => {
                const start = combineDateAndTime(startDate, startTime);
                const end = combineDateAndTime(endDate, endTime);
                const diff = end - start;
                if (diff <= 0)
                  return getText(t, "invalid", "Geçersiz", "Invalid", isEn);
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor(
                  (diff % (1000 * 60 * 60)) / (1000 * 60)
                );
                if (hours > 0 && minutes > 0)
                  return isEn
                    ? `${hours}h ${minutes}m`
                    : `${hours} saat ${minutes} dk`;
                if (hours > 0) return isEn ? `${hours} hours` : `${hours} saat`;
                return isEn ? `${minutes} minutes` : `${minutes} dakika`;
              })()}
            </Text>
          </View>
        </View>

        {/* Assignment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people-outline" size={18} color={COLORS.PRIMARY} />
            {"  "}
            {getText(t, "assignment", "Atama", "Assignment", isEn)}
          </Text>

          {/* Driver */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "driver", "Sürücü", "Driver", isEn)}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowDriverPicker(true)}
            >
              <View style={styles.selectContent}>
                <Ionicons name="person" size={20} color={COLORS.PRIMARY} />
                <Text
                  style={[
                    styles.selectText,
                    !driverId && styles.selectPlaceholder,
                  ]}
                >
                  {getDriverName()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>

          {/* Vehicle */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "vehicle", "Araç", "Vehicle", isEn)}
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowVehiclePicker(true)}
            >
              <View style={styles.selectContent}>
                <Ionicons name="car" size={20} color={COLORS.PRIMARY} />
                <Text
                  style={[
                    styles.selectText,
                    !vehicleId && styles.selectPlaceholder,
                  ]}
                >
                  {getVehicleName()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name="navigate-outline"
              size={18}
              color={COLORS.PRIMARY}
            />
            {"  "}
            {getText(t, "route", "Rota", "Route", isEn)}
          </Text>

          {/* Start Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(
                t,
                "start_location",
                "Başlangıç Konumu",
                "Start Location",
                isEn
              )}{" "}
              *
            </Text>
            <View style={styles.locationInputContainer}>
              <Ionicons
                name="location"
                size={20}
                color={COLORS.SUCCESS}
                style={styles.locationIcon}
              />
              <TextInput
                style={styles.locationInput}
                value={startLocation}
                onChangeText={setStartLocation}
                placeholder={getText(
                  t,
                  "enter_start_address",
                  "Başlangıç adresini girin",
                  "Enter start address",
                  isEn
                )}
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>

          {/* Route Line */}
          <View style={styles.routeLine}>
            <View style={styles.routeDots}>
              <View
                style={[styles.routeDot, { backgroundColor: COLORS.SUCCESS }]}
              />
              <View style={styles.routeLineVertical} />
              <View
                style={[styles.routeDot, { backgroundColor: COLORS.ERROR }]}
              />
            </View>
          </View>

          {/* End Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "destination", "Varış Konumu", "Destination", isEn)} *
            </Text>
            <View style={styles.locationInputContainer}>
              <Ionicons
                name="flag"
                size={20}
                color={COLORS.ERROR}
                style={styles.locationIcon}
              />
              <TextInput
                style={styles.locationInput}
                value={endLocation}
                onChangeText={setEndLocation}
                placeholder={getText(
                  t,
                  "enter_destination_address",
                  "Varış adresini girin",
                  "Enter destination address",
                  isEn
                )}
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>
        </View>

        {/* ═══ Waypoints / Duraklar ═══ */}
        <View style={styles.section}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text style={styles.sectionTitle}>
              {getText(t, "waypoints", "Duraklar", "Stops", isEn)}
            </Text>
            <TouchableOpacity
              onPress={addWaypoint}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                gap: 6,
              }}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.PRIMARY} />
              <Text
                style={{
                  color: COLORS.PRIMARY,
                  fontWeight: "600",
                  fontSize: 14,
                }}
              >
                {getText(t, "add_stop", "Durak Ekle", "Add Stop", isEn)}
              </Text>
            </TouchableOpacity>
          </View>

          {waypoints.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                color: COLORS.MUTED,
                paddingVertical: 20,
                fontSize: 14,
              }}
            >
              {getText(
                t,
                "no_stops_yet",
                "Henüz durak eklenmedi",
                "No stops added yet",
                isEn
              )}
            </Text>
          )}

          {waypoints.map((wp, index) => (
            <View
              key={wp.id}
              style={{
                backgroundColor: withAlpha(COLORS.SECONDARY, 0.4),
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
              }}
            >
              {/* Header: #index + controls */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: COLORS.PRIMARY,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: COLORS.WHITE,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontWeight: "600",
                      color: COLORS.TEXT,
                      fontSize: 15,
                    }}
                  >
                    {wp.name ||
                      getText(t, "stop", "Durak", "Stop", isEn) +
                        " " +
                        (index + 1)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === waypoints.length - 1}
                    style={{
                      opacity: index === waypoints.length - 1 ? 0.3 : 1,
                      padding: 4,
                    }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeWaypoint(wp.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={COLORS.ERROR}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stop Name */}
              <TextInput
                style={styles.textInput}
                placeholder={getText(
                  t,
                  "stop_name",
                  "Durak Adı",
                  "Stop Name",
                  isEn
                )}
                placeholderTextColor={COLORS.PLACEHOLDER ?? COLORS.MUTED}
                value={wp.name}
                onChangeText={(val) => updateWaypoint(wp.id, "name", val)}
              />

              {/* Address */}
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder={getText(
                  t,
                  "stop_address",
                  "Durak Adresi",
                  "Stop Address",
                  isEn
                )}
                placeholderTextColor={COLORS.PLACEHOLDER ?? COLORS.MUTED}
                value={wp.address || ""}
                onChangeText={(val) => updateWaypoint(wp.id, "address", val)}
              />

              {/* Planned Arrival */}
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: COLORS.MUTED,
                    marginBottom: 4,
                  }}
                >
                  {getText(
                    t,
                    "planned_arrival",
                    "Planlanan Varış",
                    "Planned Arrival",
                    isEn
                  )}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="2026-02-15T14:30"
                  placeholderTextColor={COLORS.PLACEHOLDER ?? COLORS.MUTED}
                  value={
                    wp.planned_arrival ? wp.planned_arrival.slice(0, 16) : ""
                  }
                  onChangeText={(val) => {
                    if (!val) {
                      updateWaypoint(wp.id, "planned_arrival", null);
                      return;
                    }
                    try {
                      const d = new Date(val);
                      if (!isNaN(d.getTime()))
                        updateWaypoint(
                          wp.id,
                          "planned_arrival",
                          d.toISOString()
                        );
                    } catch {}
                  }}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={COLORS.WHITE}
              />
              <Text style={styles.submitButtonText}>
                {getText(
                  t,
                  "create_task",
                  "Görev Oluştur",
                  "Create Task",
                  isEn
                )}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Android Pickers - Native UI */}
      {Platform.OS === "android" && showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="calendar"
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {Platform.OS === "android" && showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display="clock"
          onChange={onStartTimeChange}
          is24Hour
        />
      )}

      {Platform.OS === "android" && showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="calendar"
          onChange={onEndDateChange}
          minimumDate={startDate}
        />
      )}

      {Platform.OS === "android" && showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          display="clock"
          onChange={onEndTimeChange}
          is24Hour
        />
      )}

      {/* iOS Pickers - Modal with Done button */}
      {Platform.OS === "ios" && (
        <>
          <IOSDateTimePickerModal
            visible={showStartDatePicker}
            onClose={() => setShowStartDatePicker(false)}
            onDone={handleIOSStartDateDone}
            value={tempStartDate}
            onChange={onStartDateChange}
            mode="date"
            minimumDate={new Date()}
            title={getText(
              t,
              "select_start_date",
              "Başlangıç Tarihi",
              "Start Date",
              isEn
            )}
          />

          <IOSDateTimePickerModal
            visible={showStartTimePicker}
            onClose={() => setShowStartTimePicker(false)}
            onDone={handleIOSStartTimeDone}
            value={tempStartTime}
            onChange={onStartTimeChange}
            mode="time"
            title={getText(
              t,
              "select_start_time",
              "Başlangıç Saati",
              "Start Time",
              isEn
            )}
          />

          <IOSDateTimePickerModal
            visible={showEndDatePicker}
            onClose={() => setShowEndDatePicker(false)}
            onDone={handleIOSEndDateDone}
            value={tempEndDate}
            onChange={onEndDateChange}
            mode="date"
            minimumDate={startDate}
            title={getText(
              t,
              "select_end_date",
              "Bitiş Tarihi",
              "End Date",
              isEn
            )}
          />

          <IOSDateTimePickerModal
            visible={showEndTimePicker}
            onClose={() => setShowEndTimePicker(false)}
            onDone={handleIOSEndTimeDone}
            value={tempEndTime}
            onChange={onEndTimeChange}
            mode="time"
            title={getText(
              t,
              "select_end_time",
              "Bitiş Saati",
              "End Time",
              isEn
            )}
          />
        </>
      )}

      {/* Selection Modals */}
      <SelectionModal
        visible={showDriverPicker}
        onClose={() => setShowDriverPicker(false)}
        title={getText(t, "select_driver", "Sürücü Seç", "Select Driver", isEn)}
        data={drivers}
        selectedId={driverId}
        onSelect={setDriverId}
        renderItem={(driver) => (
          <View style={styles.modalItemContent}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color={COLORS.PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalItemTitle} numberOfLines={1}>
                {`${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
                  driver.email}
              </Text>
              <Text style={styles.modalItemSubtitle} numberOfLines={1}>
                {driver.license_no || driver.email}
              </Text>
            </View>
          </View>
        )}
      />

      <SelectionModal
        visible={showVehiclePicker}
        onClose={() => setShowVehiclePicker(false)}
        title={getText(t, "select_vehicle", "Araç Seç", "Select Vehicle", isEn)}
        data={vehicles}
        selectedId={vehicleId}
        onSelect={setVehicleId}
        renderItem={(vehicle) => (
          <View style={styles.modalItemContent}>
            <View style={styles.avatarCircle}>
              <Ionicons name="car" size={20} color={COLORS.PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalItemTitle} numberOfLines={1}>
                {vehicle.plate_no}
              </Text>
              <Text style={styles.modalItemSubtitle} numberOfLines={1}>
                {`${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "-"}
              </Text>
            </View>
          </View>
        )}
      />

      <SelectionModal
        visible={showPriorityPicker}
        onClose={() => setShowPriorityPicker(false)}
        title={getText(
          t,
          "select_priority",
          "Öncelik Seç",
          "Select Priority",
          isEn
        )}
        data={PRIORITY_RESOLVED}
        selectedId={priority}
        onSelect={setPriority}
        renderItem={(p) => (
          <View style={styles.modalItemContent}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: withAlpha(p.color, 0.12) },
              ]}
            >
              <Ionicons name={p.icon} size={20} color={p.color} />
            </View>
            <Text
              style={[styles.modalItemTitle, { color: p.color }]}
              numberOfLines={1}
            >
              {getText(
                t,
                p.labelKey,
                p.value === "low"
                  ? "Düşük"
                  : p.value === "normal"
                    ? "Normal"
                    : p.value === "high"
                      ? "Yüksek"
                      : "Acil",
                p.value === "low"
                  ? "Low"
                  : p.value === "normal"
                    ? "Normal"
                    : p.value === "high"
                      ? "High"
                      : "Urgent",
                isEn
              )}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
