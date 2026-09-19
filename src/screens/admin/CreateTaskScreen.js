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
 * - Hardcoded HEX kaldirildi (token + withAlpha)
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

import WaypointEditor from "../../components/admin/WaypointEditor";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI, taskAPI, vehicleAPI } from "../../services/api";
import { formatDate, formatTime } from "../../utils/helpers";

// --- helper: #RRGGBB => #RRGGBBAA (soft bg/overlay icin) ---
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

// ncelik secenekleri (renkler token ile component icinde cozulur)
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
  // Obje döndüyse (nested namespace) veya key bulunamadıysa fallback kullan
  if (translated === key || typeof translated === "object") {
    return isEn ? fallbackEn : fallbackTr;
  }
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
      marginTop: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.MUTED,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.md,
      paddingTop: Platform.OS === "ios" ? 50 : 16,
      paddingBottom: COLORS.SPACING.md,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },

    // Content
    content: {
      flex: 1,
      padding: COLORS.SPACING.md,
    },

    // Section
    section: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.lg,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.35),
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.md,
    },

    // Input
    inputGroup: {
      marginBottom: COLORS.SPACING.md,
    },
    inputLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.sm,
    },
    textInput: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    textArea: {
      minHeight: 80,
      paddingTop: COLORS.SPACING.sm,
    },

    // Select Button
    selectButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    selectContent: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - children use marginRight
      flex: 1,
      paddingRight: COLORS.SPACING.sm,
    },
    selectText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      flex: 1,
    },
    selectPlaceholder: {
      color: COLORS.MUTED,
    },

    // DateTime
    dateTimeSection: {
      marginBottom: COLORS.SPACING.md,
    },
    dateTimeGroupLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    dateTimeRow: {
      flexDirection: "row",
      // gap removed - children use marginRight
    },
    dateTimeButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    dateTimeIconBox: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      justifyContent: "center",
      alignItems: "center",
    },
    dateTimeContent: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm,
    },
    dateTimeLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
    },
    dateTimeValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: 2,
    },

    // Duration Info
    durationInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
      borderRadius: COLORS.RADIUS.md,
      // gap removed - children use marginRight
      borderWidth: 1,
      borderColor: withAlpha(COLORS.PRIMARY, 0.18),
    },
    durationText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
    },

    // Location
    locationInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.sm,
    },
    locationIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    locationInput: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
    },

    // Route Line
    routeLine: {
      paddingVertical: COLORS.SPACING.xs,
      paddingLeft: 28,
    },
    routeDots: {
      alignItems: "center",
      height: 40,
    },
    routeDot: {
      width: 10,
      height: 10,
      borderRadius: COLORS.RADIUS.xs,
    },
    routeLineVertical: {
      width: 2,
      flex: 1,
      backgroundColor: COLORS.DIVIDER,
      marginVertical: 2,
    },

    // Submit Button
    submitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.lg,
      paddingVertical: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.sm,
      // gap removed - children use marginRight
      ...COLORS.SHADOWS.card,
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.MUTED,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },

    // Zorunlu alan vurgusu
    requiredStar: {
      color: COLORS.ERROR || "#FF3B30",
      fontWeight: "700",
    },
    inputError: {
      borderColor: COLORS.ERROR || "#FF3B30",
      borderWidth: 1.5,
    },
    locationInputError: {
      borderColor: COLORS.ERROR || "#FF3B30",
      borderWidth: 1.5,
    },

    // Hızlı şablon butonları
    templateRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 16,
      gap: 8,
    },
    templateButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      gap: 6,
    },
    templateText: {
      fontSize: 13,
      fontWeight: "600",
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.5),
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "70%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: COLORS.SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    modalList: {
      padding: COLORS.SPACING.sm,
    },
    modalItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
    },
    modalItemSelected: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.08),
    },
    modalItemContent: {
      flexDirection: "row",
      alignItems: "center",
      // gap removed - children use marginRight
      flex: 1,
      paddingRight: COLORS.SPACING.sm,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    modalItemTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    modalItemSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    emptyText: {
      textAlign: "center",
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      paddingVertical: COLORS.SPACING.xxl,
    },

    // iOS DateTime Picker Modal
    iosPickerModal: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    iosPickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    iosPickerTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    iosPickerCancel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.MUTED,
    },
    iosPickerDone: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
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

  // Touched state — zorunlu alanlar boşken kırmızı border göstermek için
  const [touched, setTouched] = useState({
    title: false,
    startLocation: false,
    endLocation: false,
  });

  // Hızlı şablon preset'leri
  const TASK_TEMPLATES = useMemo(
    () => [
      {
        key: "delivery",
        icon: "cube-outline",
        labelTr: "Teslimat",
        labelEn: "Delivery",
        title: isEn ? "Delivery" : "Teslimat",
        priority: "normal",
        color: COLORS.PRIMARY,
      },
      {
        key: "transfer",
        icon: "swap-horizontal-outline",
        labelTr: "Transfer",
        labelEn: "Transfer",
        title: isEn ? "Transfer" : "Transfer",
        priority: "high",
        color: COLORS.WARNING,
      },
      {
        key: "service",
        icon: "construct-outline",
        labelTr: "Servis",
        labelEn: "Service",
        title: isEn ? "Service" : "Servis",
        priority: "normal",
        color: COLORS.SUCCESS,
      },
      {
        key: "warehouse",
        icon: "business-outline",
        labelTr: "Depo",
        labelEn: "Warehouse",
        title: isEn ? "Warehouse Run" : "Depo Görevi",
        priority: "low",
        color: COLORS.MUTED,
      },
    ],
    [isEn, COLORS]
  );

  const applyTemplate = (tpl) => {
    setTitle(tpl.title);
    setPriority(tpl.priority);
  };

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
      console.error("Veri yuklenirken hata:", error);
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "data_load_error",
          "Sürücü/araç listesi yüklenemedi",
          "Could not load drivers/vehicles",
          isEn
        )
      );
    } finally {
      setDataLoading(false);
    }
  };

  // Waypoint helpers -> moved to WaypointEditor component

  // Combine date and time
  const combineDateAndTime = (date, time) => {
    const combined = new Date(date);
    combined.setHours(time.getHours());
    combined.setMinutes(time.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

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
      if (event.type === "set" && selectedDate) {
        setEndDate(selectedDate);
        // endDate geçmişe/start'a çekilince endTime'ı otomatik düzelt
        const start = combineDateAndTime(startDate, startTime);
        const newEnd = combineDateAndTime(selectedDate, endTime);
        if (newEnd <= start) {
          const bumped = new Date(start.getTime() + 15 * 60 * 1000);
          setEndTime(bumped);
          setTempEndTime(bumped);
        }
      }
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
          "Bitis saati baslangictan sonra olmali",
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
    // iOS: endDate değişince endTime validity kontrol et
    const start = combineDateAndTime(startDate, startTime);
    const newEnd = combineDateAndTime(tempEndDate, endTime);
    if (newEnd <= start) {
      const bumped = new Date(start.getTime() + 15 * 60 * 1000);
      setEndTime(bumped);
      setTempEndTime(bumped);
    }
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
          "Bitis saati baslangictan sonra olmali",
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
          "Gorev basliIi girin",
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
          "Baslangic konumu girin",
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
          "Varis konumu girin",
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
          "Bitis tarihi/saati baslangictan sonra olmali",
          "End date/time must be after start date/time",
          isEn
        )
      );
      return false;
    }

    // En az sürücü veya araç seçilmeli
    if (!driverId && !vehicleId) {
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        getText(
          t,
          "driver_or_vehicle_required",
          "En az bir sürücü veya araç seçmelisiniz",
          "Please select at least a driver or a vehicle",
          isEn
        )
      );
      return false;
    }

    return true;
  };
  // Timezone handling - UTC to backend
  // NOT: Waypoint geocoding backend tarafından yapılıyor (POST /api/tasks içinde)
  // Mobil sadece ham adres gönderir, server GMAPS_KEY ile geocode eder.

  const handleSubmit = async () => {
    if (loading) return; // double-tap koruması
    if (!validateForm()) return;

    const scheduledStart = combineDateAndTime(startDate, startTime);
    const scheduledEnd = combineDateAndTime(endDate, endTime);

    try {
      setLoading(true);

      const taskData = {
        title: title.trim(),
        description: description.trim(),
        priority,
        ...(driverId ? { driver_id: driverId } : {}),
        ...(vehicleId ? { vehicle_id: vehicleId } : {}),
        start_location: startLocation.trim(),
        end_location: endLocation.trim(),
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        waypoints: waypoints.map((wp) => ({
          id: wp.id,
          name: wp.name || "",
          address: wp.address || "",
          latitude: wp.latitude ? Number(wp.latitude) : null,
          longitude: wp.longitude ? Number(wp.longitude) : null,
          planned_arrival: wp.planned_arrival || null,
          status: "pending",
        })),
      };

      await taskAPI.create(taskData);

      Alert.alert(
        getText(t, "success", "Basarili", "Success", isEn),
        getText(
          t,
          "task_created",
          "Gorev basariyla olusturuldu",
          "Task created successfully",
          isEn
        ),
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Gorev olusturulurken hata:", error);
      Alert.alert(
        getText(t, "error", "Hata", "Error", isEn),
        error.response?.data?.error ||
          getText(
            t,
            "task_create_failed",
            "Gorev olusturulamadi",
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
      return getText(t, "select_driver", "Surucu Sec", "Select Driver", isEn);
    const driver = drivers.find((d) => d.id === driverId);
    return driver
      ? `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
          driver.email
      : "";
  };

  const getVehicleName = () => {
    if (!vehicleId)
      return getText(t, "select_vehicle", "Arac Sec", "Select Vehicle", isEn);
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
        ? "Dusuk"
        : p.value === "normal"
          ? "Normal"
          : p.value === "high"
            ? "Yuksek"
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
                  {getText(t, "cancel", "ptal", "Cancel", isEn)}
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
              <Ionicons name="close" size={24} color={COLORS.TEXT} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {data.length === 0 ? (
              <Text style={styles.emptyText}>
                {getText(
                  t,
                  "no_options",
                  "Secenek bulunamadi",
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
          {getText(t, "loading", "Yukleniyor...", "Loading...", isEn)}
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
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {getText(t, "new_task", "Yeni Gorev", "New Task", isEn)}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── 1. Task Info Section (şablonlar + title + description + priority) ── */}
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
              "Gorev Bilgileri",
              "Task Information",
              isEn
            )}
          </Text>

          {/* Hızlı Şablonlar */}
          <View style={styles.templateRow}>
            {TASK_TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.key}
                style={[
                  styles.templateButton,
                  {
                    backgroundColor: withAlpha(tpl.color, 0.08),
                    borderColor: withAlpha(tpl.color, 0.2),
                  },
                ]}
                onPress={() => applyTemplate(tpl)}
                activeOpacity={0.7}
              >
                <Ionicons name={tpl.icon} size={16} color={tpl.color} />
                <Text style={[styles.templateText, { color: tpl.color }]}>
                  {isEn ? tpl.labelEn : tpl.labelTr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Title — zorunlu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "title", "Baslik", "Title", isEn)}{" "}
              <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                touched.title && !title.trim() && styles.inputError,
              ]}
              value={title}
              onChangeText={setTitle}
              onBlur={() => setTouched((p) => ({ ...p, title: true }))}
              placeholder={getText(
                t,
                "task_title_placeholder",
                "Gorev basliIini girin",
                "Enter task title",
                isEn
              )}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "description", "Aciklama", "Description", isEn)}
            </Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={getText(
                t,
                "description_placeholder",
                "Gorev aciklamasi (opsiyonel)",
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
              {getText(t, "priority", "ncelik", "Priority", isEn)}
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

        {/* ── 2. Assignment Section (sürücü + araç) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people-outline" size={18} color={COLORS.PRIMARY} />
            {"  "}
            {getText(t, "assignment", "Atama", "Assignment", isEn)}
          </Text>

          {/* Driver */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "driverLabel", "Surucu", "Driver", isEn)}
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
              {getText(t, "vehicleLabel", "Arac", "Vehicle", isEn)}
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

        {/* ── 3. Schedule Section (tarih/saat) ── */}
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
              {getText(t, "start", "Baslangic", "Start", isEn)}
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
              {getText(t, "end", "Bitis", "End", isEn)}
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
              {getText(t, "duration", "Sure", "Duration", isEn)}:{" "}
              {(() => {
                const start = combineDateAndTime(startDate, startTime);
                const end = combineDateAndTime(endDate, endTime);
                const diff = end - start;
                if (diff <= 0)
                  return getText(t, "invalid", "Gecersiz", "Invalid", isEn);
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

        {/* ── 4. Route Section (konum) ── */}
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

          {/* Start Location — zorunlu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(
                t,
                "start_location",
                "Baslangic Konumu",
                "Start Location",
                isEn
              )}{" "}
              <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View
              style={[
                styles.locationInputContainer,
                touched.startLocation &&
                  !startLocation.trim() &&
                  styles.locationInputError,
              ]}
            >
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
                onBlur={() =>
                  setTouched((p) => ({ ...p, startLocation: true }))
                }
                autoCorrect={false}
                autoCapitalize="sentences"
                placeholder={getText(
                  t,
                  "enter_start_address",
                  "Baslangic adresini girin",
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

          {/* End Location — zorunlu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {getText(t, "destination", "Varis Konumu", "Destination", isEn)}{" "}
              <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View
              style={[
                styles.locationInputContainer,
                touched.endLocation &&
                  !endLocation.trim() &&
                  styles.locationInputError,
              ]}
            >
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
                onBlur={() => setTouched((p) => ({ ...p, endLocation: true }))}
                autoCorrect={false}
                autoCapitalize="sentences"
                placeholder={getText(
                  t,
                  "enter_destination_address",
                  "Varis adresini girin",
                  "Enter destination address",
                  isEn
                )}
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>
        </View>

        {/* ── 5. Waypoints / Stops ── */}
        <View style={styles.section}>
          <WaypointEditor
            waypoints={waypoints}
            setWaypoints={setWaypoints}
            COLORS={COLORS}
            inputStyle={styles.textInput}
            maxStops={10}
            labels={{
              title: getText(t, "waypoints", "Duraklar", "Stops", isEn),
              add: getText(t, "add_stop", "Durak Ekle", "Add Stop", isEn),
              limitReached: getText(
                t,
                "limit_reached",
                "Durak limiti doldu",
                "Stop limit reached",
                isEn
              ),
              name: getText(t, "stop_name", "Durak Adi", "Stop Name", isEn),
              address: getText(
                t,
                "stop_address",
                "Durak Adresi",
                "Stop Address",
                isEn
              ),
              lat: "Lat",
              lng: "Lng",
              planned: getText(
                t,
                "planned_arrival",
                "Planlanan Varis",
                "Planned Arrival",
                isEn
              ),
              invalid: getText(
                t,
                "invalid_coords",
                "Koordinatlar gecersiz",
                "Invalid coordinates",
                isEn
              ),
              noStops: getText(
                t,
                "no_stops_yet",
                "Henuz durak eklenmedi",
                "No stops added yet",
                isEn
              ),
              coordsToggle: getText(
                t,
                "coordinates",
                "Koordinatlar",
                "Coordinates",
                isEn
              ),
              clearConfirm: getText(
                t,
                "remove_stop_confirm",
                "Bu duragi kaldirmak istediginize emin misiniz?",
                "Are you sure you want to remove this stop?",
                isEn
              ),
              clearStop: getText(t, "remove", "Kaldir", "Remove", isEn),
              cancel: getText(t, "cancel", "ptal", "Cancel", isEn),
              done: getText(t, "done", "Tamam", "Done", isEn),
            }}
          />
        </View>

        {/* ── 6. Submit Button ── */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={() => {
            // Tüm zorunlu alanları touched yap — boş olanlar kırmızı olur
            setTouched({ title: true, startLocation: true, endLocation: true });
            handleSubmit();
          }}
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
                  "Gorev Olustur",
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
              "Baslangic Tarihi",
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
              "Baslangic Saati",
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
              "Bitis Tarihi",
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
              "Bitis Saati",
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
        title={getText(t, "select_driver", "Surucu Sec", "Select Driver", isEn)}
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
        title={getText(t, "select_vehicle", "Arac Sec", "Select Vehicle", isEn)}
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
          "ncelik Sec",
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
                  ? "Dusuk"
                  : p.value === "normal"
                    ? "Normal"
                    : p.value === "high"
                      ? "Yuksek"
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
