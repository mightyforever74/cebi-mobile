/**
 * FuelEntryScreen.js
 * Driver Yakıt Giriş Ekranı - v2.1
 *
 * Düzeltmeler:
 * - UI System Guide v3 uyumu (Card + tokens + no gap + no manual shadow)
 * - Input'lar INPUT_BG / INPUT_BORDER kullanır
 * - 8px grid (SPACING/RADIUS)
 *
 * Konum: src/screens/driver/FuelEntryScreen.js
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

import Card from "../../components/ui/Card";
import DataState from "../../components/ui/DataState";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI, fuelAPI } from "../../services/api";

// Para birimi haritası (dil koduna göre)
const CURRENCY_MAP = {
  tr: { symbol: "₺", code: "TRY" },
  en: { symbol: "€", code: "EUR" },
  de: { symbol: "€", code: "EUR" },
  nl: { symbol: "€", code: "EUR" },
  es: { symbol: "€", code: "EUR" },
  it: { symbol: "€", code: "EUR" },
  bg: { symbol: "лв", code: "BGN" },
  ku: { symbol: "€", code: "EUR" },
};

// Yakıt tipleri
const FUEL_TYPES = [
  {
    id: "diesel",
    label: {
      tr: "Dizel",
      en: "Diesel",
      bg: "Дизел",
      es: "Diésel",
      it: "Diesel",
      nl: "Diesel",
      ku: "Dîzel",
    },
  },
  {
    id: "gasoline",
    label: {
      tr: "Benzin",
      en: "Gasoline",
      bg: "Бензин",
      es: "Gasolina",
      it: "Benzina",
      nl: "Benzine",
      ku: "Benzîn",
    },
  },
  {
    id: "lpg",
    label: {
      tr: "LPG",
      en: "LPG",
      bg: "Газ",
      es: "GLP",
      it: "GPL",
      nl: "LPG",
      ku: "LPG",
    },
  },
  {
    id: "electric",
    label: {
      tr: "Elektrik",
      en: "Electric",
      bg: "Електричество",
      es: "Eléctrico",
      it: "Elettrico",
      nl: "Elektrisch",
      ku: "Elektrîk",
    },
  },
];

// ============================================
// makeStyles - TOKENS
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollView: {
      flex: 1,
      padding: COLORS.SPACING.md, // 16
    },

    // Vehicle Card content
    vehicleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    vehicleHeader: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    vehicleInfo: {
      marginLeft: COLORS.SPACING.md, // 16
      flex: 1,
    },
    plateNo: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    vehicleDetails: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs, // 4
    },
    editButton: {
      padding: COLORS.SPACING.sm, // 8
      borderRadius: COLORS.RADIUS.sm, // 8
      backgroundColor: COLORS.SECONDARY,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },

    // Form
    inputGroup: {
      marginBottom: COLORS.SPACING.md, // 16
    },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    input: {
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input,
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      color: COLORS.TEXT,
    },
    inputError: {
      borderColor: COLORS.ERROR,
      backgroundColor: COLORS.ERROR_LIGHT,
    },
    inputReadonly: {
      backgroundColor: COLORS.DIVIDER,
    },
    readonlyText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
    },
    hint: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs, // 4
    },
    warning: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WARNING,
      marginTop: COLORS.SPACING.xs, // 4
    },

    // Currency Input
    currencyInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    currencySymbol: {
      paddingLeft: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    currencyInput: {
      flex: 1,
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.md, // 16
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },

    // Checkbox
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md, // 16
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: COLORS.RADIUS.sm, // 8
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm, // 8
    },
    checkboxChecked: {
      backgroundColor: COLORS.PRIMARY,
    },
    checkboxLabel: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
    },

    // Calculation Preview
    calculationPreview: {
      backgroundColor: COLORS.SECONDARY,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.md, // 16
      marginBottom: COLORS.SPACING.md, // 16
      borderWidth: 1,
      borderColor: COLORS.PRIMARY,
    },
    calculationTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
      marginBottom: COLORS.SPACING.sm, // 8
    },
    calculationRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.xs, // 4
    },
    calculationLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
    calculationValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },

    // First Record Info
    firstRecordInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.md, // 16
      marginBottom: COLORS.SPACING.md, // 16
      borderWidth: 1,
      borderColor: COLORS.INFO,
    },
    firstRecordText: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm, // 8
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
    },

    // Error
    errorBox: {
      backgroundColor: COLORS.ERROR_LIGHT,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.ERROR,
    },

    // Submit
    submitButton: {
      flexDirection: "row",
      backgroundColor: COLORS.SUCCESS,
      borderRadius: COLORS.RADIUS.button,
      height: COLORS.SPACING.buttonHeight,
      justifyContent: "center",
      alignItems: "center",
      ...COLORS.SHADOWS.button,
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.MUTED,
    },
    submitButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
      marginLeft: COLORS.SPACING.sm, // 8
    },

    // Last Record
    lastRecordTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.md, // 16
    },
    lastRecordRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    lastRecordItem: {
      alignItems: "center",
      flex: 1,
    },
    lastRecordLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    lastRecordValue: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    lastRecordDate: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl, // 20
      borderTopRightRadius: COLORS.RADIUS.xl, // 20
      padding: COLORS.SPACING.lg, // 24
      maxHeight: "80%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      ...COLORS.SHADOWS.modal,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg, // 24
    },
    modalTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },

    // Fuel Type Selector (no gap)
    fuelTypeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    fuelTypeButton: {
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.sm, // 8
      borderRadius: COLORS.RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      backgroundColor: COLORS.INPUT_BG,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    fuelTypeButtonActive: {
      borderColor: COLORS.PRIMARY,
      backgroundColor: COLORS.PRIMARY,
    },
    fuelTypeText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },
    fuelTypeTextActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    spacer: {
      height: COLORS.SPACING.xxxl, // 48 (keyboard breathing room)
    },
  });

// ============================================
// COMPONENT
// ============================================
const FuelEntryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "tr";
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  // Para birimi
  const currency = CURRENCY_MAP[currentLang] || CURRENCY_MAP.tr;

  // Form state
  const [odometerKm, setOdometerKm] = useState("");
  const [odometerDisplay, setOdometerDisplay] = useState(""); // Formatted display
  const [litersFilled, setLitersFilled] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [isFullTank, setIsFullTank] = useState(true);

  // Data state
  const [vehicle, setVehicle] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFuelType, setEditFuelType] = useState("");
  const [editTankCapacity, setEditTankCapacity] = useState("");
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Load vehicle & last record
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const vehicleResponse = await driverAPI.getVehicle();

      if (vehicleResponse && vehicleResponse.vehicle) {
        const v = vehicleResponse.vehicle;
        setVehicle(v);
        setEditFuelType(v.fuel_type || "diesel");
        setEditTankCapacity(v.fuel_capacity?.toString() || "60");

        try {
          const lastRecordResponse = await fuelAPI.getLastRecord(v.id);
          if (lastRecordResponse && lastRecordResponse.data) {
            setLastRecord(lastRecordResponse.data);
          }
        } catch {
          console.log("No previous fuel record");
        }
      }
    } catch (err) {
      console.error("Load error:", err);
      setError(t("fuel.error.loadFailed", "Araç bilgisi alınamadı"));
    } finally {
      setLoading(false);
    }
  };

  // KM formatlama (1.000 şeklinde)
  const formatKm = (value) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    if (!numericValue) return "";
    return Number(numericValue).toLocaleString("tr-TR");
  };

  // KM input handler
  const handleOdometerChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, "");
    setOdometerKm(numericValue);
    setOdometerDisplay(formatKm(numericValue));
    setError(null);

    if (lastRecord && numericValue) {
      const newKm = parseInt(numericValue);
      const lastKm = lastRecord.odometer_km;
      if (newKm <= lastKm) {
        setError(
          t("fuel.validation.odometerMustBeHigher", {
            lastKm: Number(lastKm).toLocaleString("tr-TR"),
            defaultValue: `KM değeri önceki kayıttan (${Number(
              lastKm
            ).toLocaleString("tr-TR")}) büyük olmalı`,
          })
        );
      }
    }
  };

  const validate = () => {
    const km = parseInt(odometerKm);
    const liters = parseFloat(litersFilled);

    if (!odometerKm || isNaN(km)) {
      setError(t("fuel.validation.odometerRequired", "KM sayacı gerekli"));
      return false;
    }

    if (!litersFilled || isNaN(liters) || liters <= 0) {
      setError(t("fuel.validation.litersRequired", "Litre miktarı gerekli"));
      return false;
    }

    if (lastRecord && km <= lastRecord.odometer_km) {
      setError(
        t("fuel.validation.odometerMustBeHigher", {
          lastKm: Number(lastRecord.odometer_km).toLocaleString("tr-TR"),
          defaultValue: `KM değeri önceki kayıttan (${Number(
            lastRecord.odometer_km
          ).toLocaleString("tr-TR")}) büyük olmalı`,
        })
      );
      return false;
    }

    const tankCapacity = parseFloat(vehicle?.fuel_capacity) || 60;
    if (liters > tankCapacity) {
      setError(
        t("fuel.validation.litersExceedsTank", {
          liters,
          capacity: tankCapacity,
          defaultValue: `Maksimum ${tankCapacity}L girebilirsiniz`,
        })
      );
      return false;
    }

    if (lastRecord) {
      const kmTraveled = km - lastRecord.odometer_km;
      const consumption = (liters / kmTraveled) * 100;

      if (consumption < 1 || consumption > 30) {
        setError(
          t("fuel.validation.consumptionUnrealistic", {
            value: consumption.toFixed(1),
            defaultValue: `Hesaplanan tüketim (${consumption.toFixed(
              1
            )} L/100km) mantıksız görünüyor`,
          })
        );
        return false;
      }

      if (kmTraveled > 2000) {
        setError(
          t("fuel.validation.kmTooHigh", {
            km: kmTraveled.toLocaleString("tr-TR"),
            defaultValue: `Tek dolumda ${kmTraveled.toLocaleString(
              "tr-TR"
            )} km çok yüksek görünüyor`,
          })
        );
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!isFullTank) {
      Alert.alert(
        t("fuel.notFullTankWarning.title", "Dikkat"),
        t(
          "fuel.notFullTankWarning.message",
          "Depo FULL değilse bu kayıt tüketim analizine dahil edilmez. Devam etmek istiyor musunuz?"
        ),
        [
          {
            text: t("fuel.notFullTankWarning.cancel", "İptal"),
            style: "cancel",
          },
          {
            text: t("fuel.notFullTankWarning.saveAnyway", "Yine de Kaydet"),
            onPress: submitRecord,
          },
        ]
      );
      return;
    }

    submitRecord();
  };

  const submitRecord = async () => {
    try {
      setSubmitting(true);

      const data = {
        vehicle_id: vehicle.id,
        odometer_km: parseInt(odometerKm),
        liters_filled: parseFloat(litersFilled),
        total_cost: totalCost ? parseFloat(totalCost) : null,
        is_full_tank: isFullTank,
        currency: currency.code,
      };

      const response = await fuelAPI.addRecord(data);

      if (response && response.success) {
        const result = response.data;

        let message = t("fuel.success.message", "Kaydedildi!");
        if (result.km_traveled && result.consumption_per_100km) {
          message += `\n\n• ${Number(result.km_traveled).toLocaleString("tr-TR")} km`;
          message += `\n• ${parseFloat(result.consumption_per_100km).toFixed(1)} L/100km`;
          if (result.cost_per_km) {
            message += `\n• ${currency.symbol}${parseFloat(result.cost_per_km).toFixed(2)}/km`;
          }
        }

        Alert.alert(t("fuel.success.title", "Başarılı"), message, [
          {
            text: t("common.ok", "Tamam"),
            onPress: () => {
              setOdometerKm("");
              setOdometerDisplay("");
              setLitersFilled("");
              setTotalCost("");
              setIsFullTank(true);
              loadData();
            },
          },
        ]);
      } else {
        Alert.alert(
          t("fuel.error.title", "Hata"),
          response?.error || t("fuel.error.saveFailed", "Kayıt eklenemedi")
        );
      }
    } catch (err) {
      console.error("Submit error:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        t("fuel.error.saveFailed", "Kayıt eklenemedi");
      Alert.alert(t("fuel.error.title", "Hata"), errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const saveVehicleInfo = async () => {
    try {
      setSavingVehicle(true);

      const response = await driverAPI.updateVehicleSettings(vehicle.id, {
        fuel_type: editFuelType,
        fuel_capacity: parseFloat(editTankCapacity),
      });

      if (response) {
        setVehicle({
          ...vehicle,
          fuel_type: editFuelType,
          fuel_capacity: parseFloat(editTankCapacity),
        });

        setEditModalVisible(false);
        Alert.alert(
          t("common.success", "Başarılı"),
          t("fuel.vehicleUpdated", "Araç bilgileri güncellendi")
        );
      }
    } catch (err) {
      console.error("Save vehicle error:", err);
      Alert.alert(
        t("fuel.error.title", "Hata"),
        t("fuel.error.vehicleUpdateFailed", "Araç bilgileri güncellenemedi")
      );
    } finally {
      setSavingVehicle(false);
    }
  };

  const getFuelTypeLabel = (fuelType) => {
    const ft = FUEL_TYPES.find((f) => f.id === fuelType);
    if (ft) return ft.label[currentLang] || ft.label.en || fuelType;
    return fuelType || "Dizel";
  };

  // =========================
  // Render
  // =========================
  if (loading) {
    return <DataState loading onRetry={loadData} />;
  }

  if (!vehicle) {
    return (
      <DataState
        empty
        emptyIcon="car-outline"
        emptyTitle={t("fuel.error.noVehicle", "Atanmış aracınız yok")}
        onRetry={loadData}
        retryLabel={t("common.retry", "Tekrar Dene")}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle Info */}
        <Card noMarginBottom>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleHeader}>
              <Ionicons name="car" size={24} color={COLORS.PRIMARY} />
              <View style={styles.vehicleInfo}>
                <Text style={styles.plateNo}>{vehicle.plate_no}</Text>
                <Text style={styles.vehicleDetails}>
                  {getFuelTypeLabel(vehicle.fuel_type)} |{" "}
                  {vehicle.fuel_capacity || 60}L{" "}
                  {t("fuel.tankCapacity", "Depo")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="pencil" size={18} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Form */}
        <Card noMarginBottom>
          {/* KM */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              🛣️ {t("fuel.currentOdometer", "KM Sayacı")} *
            </Text>
            <TextInput
              style={[
                styles.input,
                error && error.includes("KM") && styles.inputError,
              ]}
              placeholder={t("fuel.odometerPlaceholder", "Örn: 100.520")}
              placeholderTextColor={COLORS.PLACEHOLDER}
              keyboardType="numeric"
              value={odometerDisplay}
              onChangeText={handleOdometerChange}
            />
            {lastRecord && (
              <Text style={styles.hint}>
                💡 {t("fuel.lastOdometer", "Son")}:{" "}
                {Number(lastRecord.odometer_km).toLocaleString("tr-TR")} km (
                {new Date(lastRecord.record_date).toLocaleDateString(
                  currentLang === "tr" ? "tr-TR" : "en-GB"
                )}
                )
              </Text>
            )}
          </View>

          {/* Liters */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              ⛽ {t("fuel.litersFilled", "Aldığım Litre")} *
            </Text>
            <TextInput
              style={[
                styles.input,
                error && error.includes("Litre") && styles.inputError,
              ]}
              placeholder={t("fuel.litersPlaceholder", "Örn: 52")}
              placeholderTextColor={COLORS.PLACEHOLDER}
              keyboardType="decimal-pad"
              value={litersFilled}
              onChangeText={(text) => {
                setLitersFilled(
                  text.replace(/[^0-9.,]/g, "").replace(",", ".")
                );
                setError(null);
              }}
            />
            <Text style={styles.warning}>
              ⚠️ {t("fuel.fullTankNote", "Depoyu FULL yapın")}
            </Text>
          </View>

          {/* Total Cost */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              💰 {t("fuel.totalCost", "Tutar")} ({currency.symbol}){" "}
              {t("common.optional", "(opsiyonel)")}
            </Text>
            <View style={styles.currencyInputContainer}>
              <Text style={styles.currencySymbol}>{currency.symbol}</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder={t("fuel.costPlaceholder", "Örn: 2230")}
                placeholderTextColor={COLORS.PLACEHOLDER}
                keyboardType="decimal-pad"
                value={totalCost}
                onChangeText={(text) => {
                  setTotalCost(text.replace(/[^0-9.,]/g, "").replace(",", "."));
                }}
              />
            </View>
            {totalCost && litersFilled && (
              <Text style={styles.hint}>
                💡 {t("fuel.pricePerLiter", "Litre fiyatı")}: {currency.symbol}
                {(parseFloat(totalCost) / parseFloat(litersFilled)).toFixed(2)}
              </Text>
            )}
          </View>

          {/* Full Tank */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsFullTank(!isFullTank)}
            activeOpacity={0.85}
          >
            <View
              style={[styles.checkbox, isFullTank && styles.checkboxChecked]}
            >
              {isFullTank && (
                <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              {t("fuel.isFullTank", "Depo FULL")}
            </Text>
          </TouchableOpacity>

          {/* Preview */}
          {odometerKm && litersFilled && lastRecord && !error && (
            <View style={styles.calculationPreview}>
              <Text style={styles.calculationTitle}>
                📊 {t("fuel.calculation", "Hesaplama Önizleme")}
              </Text>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>
                  {t("fuel.kmTraveled", "Gidilen KM")}:
                </Text>
                <Text style={styles.calculationValue}>
                  {Number(
                    parseInt(odometerKm) - lastRecord.odometer_km
                  ).toLocaleString("tr-TR")}{" "}
                  km
                </Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>
                  {t("fuel.consumption", "Tüketim")}:
                </Text>
                <Text style={styles.calculationValue}>
                  {(
                    (parseFloat(litersFilled) /
                      (parseInt(odometerKm) - lastRecord.odometer_km)) *
                    100
                  ).toFixed(1)}{" "}
                  L/100km
                </Text>
              </View>
              {totalCost && (
                <View style={styles.calculationRow}>
                  <Text style={styles.calculationLabel}>
                    {t("fuel.costPerKm", "KM Başı Maliyet")}:
                  </Text>
                  <Text style={styles.calculationValue}>
                    {currency.symbol}
                    {(
                      parseFloat(totalCost) /
                      (parseInt(odometerKm) - lastRecord.odometer_km)
                    ).toFixed(2)}
                    /km
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* First record */}
          {!lastRecord && odometerKm && litersFilled && (
            <View style={styles.firstRecordInfo}>
              <Ionicons
                name="information-circle"
                size={20}
                color={COLORS.PRIMARY}
              />
              <Text style={styles.firstRecordText}>
                {t(
                  "fuel.firstRecordNote",
                  "Bu ilk kayıttır, tüketim hesaplaması bir sonraki kayıtta yapılacak."
                )}
              </Text>
            </View>
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>❌ {error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.WHITE} />
            ) : (
              <>
                <Ionicons name="save" size={20} color={COLORS.WHITE} />
                <Text style={styles.submitButtonText}>
                  {t("fuel.save", "KAYDET")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Last Record */}
        {lastRecord && (
          <Card noMarginBottom>
            <Text style={styles.lastRecordTitle}>
              📋 {t("fuel.lastRecord", "Son Kayıt")}
            </Text>
            <View style={styles.lastRecordRow}>
              <View style={styles.lastRecordItem}>
                <Text style={styles.lastRecordLabel}>🛣️ KM</Text>
                <Text style={styles.lastRecordValue}>
                  {Number(lastRecord.odometer_km).toLocaleString("tr-TR")}
                </Text>
              </View>
              <View style={styles.lastRecordItem}>
                <Text style={styles.lastRecordLabel}>⛽ Litre</Text>
                <Text style={styles.lastRecordValue}>
                  {lastRecord.liters_filled}L
                </Text>
              </View>
              {lastRecord.consumption_per_100km && (
                <View style={styles.lastRecordItem}>
                  <Text style={styles.lastRecordLabel}>📊 Tüketim</Text>
                  <Text style={styles.lastRecordValue}>
                    {parseFloat(lastRecord.consumption_per_100km).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.lastRecordDate}>
              {new Date(lastRecord.record_date).toLocaleDateString(
                currentLang === "tr" ? "tr-TR" : "en-GB"
              )}
            </Text>
          </Card>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* Edit Vehicle Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("fuel.editVehicle", "Araç Bilgilerini Düzenle")}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            {/* Plate (readonly) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("fuel.plate", "Plaka")}</Text>
              <View style={[styles.input, styles.inputReadonly]}>
                <Text style={styles.readonlyText}>{vehicle.plate_no}</Text>
              </View>
              <Text style={styles.hint}>
                💡 {t("fuel.plateReadonly", "Plaka değiştirilemez")}
              </Text>
            </View>

            {/* Fuel type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("fuel.fuelType", "Yakıt Tipi")}
              </Text>
              <View style={styles.fuelTypeContainer}>
                {FUEL_TYPES.map((ft) => (
                  <TouchableOpacity
                    key={ft.id}
                    style={[
                      styles.fuelTypeButton,
                      editFuelType === ft.id && styles.fuelTypeButtonActive,
                    ]}
                    onPress={() => setEditFuelType(ft.id)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.fuelTypeText,
                        editFuelType === ft.id && styles.fuelTypeTextActive,
                      ]}
                    >
                      {ft.label[currentLang] || ft.label.en}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tank capacity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("fuel.tankCapacity", "Depo Kapasitesi")} (L)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                placeholderTextColor={COLORS.PLACEHOLDER}
                keyboardType="numeric"
                value={editTankCapacity}
                onChangeText={(text) =>
                  setEditTankCapacity(text.replace(/[^0-9]/g, ""))
                }
              />
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                savingVehicle && styles.submitButtonDisabled,
              ]}
              onPress={saveVehicleInfo}
              disabled={savingVehicle}
              activeOpacity={0.85}
            >
              {savingVehicle ? (
                <ActivityIndicator color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                  <Text style={styles.submitButtonText}>
                    {t("common.save", "KAYDET")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default FuelEntryScreen;
