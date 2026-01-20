/**
 * FuelEntryScreen.js
 * Driver Yakıt Giriş Ekranı - v2.0
 *
 * Düzeltmeler:
 * - KM sayacı 1.000 formatında gösterim
 * - KM validasyonu (önceki değerden büyük olmalı)
 * - Araç bilgisi düzenleme modalı
 * - Dil bazlı para birimi (₺/€)
 * - i18n desteği
 *
 * Konum: src/screens/driver/FuelEntryScreen.js
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
} from "react-native";
import { useAuth } from "../../context/AuthContext";
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

const FuelEntryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "tr";

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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Sürücünün aracını al
      const vehicleResponse = await driverAPI.getVehicle();

      if (vehicleResponse && vehicleResponse.vehicle) {
        const v = vehicleResponse.vehicle;
        setVehicle(v);
        setEditFuelType(v.fuel_type || "diesel");
        setEditTankCapacity(v.fuel_capacity?.toString() || "60");

        // 2. Son yakıt kaydını al
        try {
          const lastRecordResponse = await fuelAPI.getLastRecord(v.id);
          if (lastRecordResponse && lastRecordResponse.data) {
            setLastRecord(lastRecordResponse.data);
          }
        } catch (err) {
          // İlk kayıt olabilir, hata değil
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

    // Anlık validation - önceki KM kontrolü
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

  // Validation
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
          liters: liters,
          capacity: tankCapacity,
          defaultValue: `Maksimum ${tankCapacity}L girebilirsiniz`,
        })
      );
      return false;
    }

    // Mantıklı tüketim kontrolü
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

  // Submit
  const handleSubmit = async () => {
    if (!validate()) return;

    // FULL değilse uyar
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
        currency: currency.code, // Para birimi kodu
      };

      const response = await fuelAPI.addRecord(data);

      if (response && response.success) {
        const result = response.data;

        let message = t("fuel.success.message", "Kaydedildi!");
        if (result.km_traveled && result.consumption_per_100km) {
          message += `\n\n• ${Number(result.km_traveled).toLocaleString(
            "tr-TR"
          )} km`;
          message += `\n• ${parseFloat(result.consumption_per_100km).toFixed(
            1
          )} L/100km`;
          if (result.cost_per_km) {
            message += `\n• ${currency.symbol}${parseFloat(
              result.cost_per_km
            ).toFixed(2)}/km`;
          }
        }

        Alert.alert(t("fuel.success.title", "Başarılı"), message, [
          {
            text: t("common.ok", "Tamam"),
            onPress: () => {
              // Formu temizle
              setOdometerKm("");
              setOdometerDisplay("");
              setLitersFilled("");
              setTotalCost("");
              setIsFullTank(true);
              // Son kaydı güncelle
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

  // Araç bilgisi kaydet
  const saveVehicleInfo = async () => {
    try {
      setSavingVehicle(true);

      // driverAPI.updateVehicleSettings kullanarak güncelle
      const response = await driverAPI.updateVehicleSettings(vehicle.id, {
        fuel_type: editFuelType,
        fuel_capacity: parseFloat(editTankCapacity),
      });

      if (response) {
        // Local state güncelle
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

  // Yakıt tipi label
  const getFuelTypeLabel = (fuelType) => {
    const ft = FUEL_TYPES.find((f) => f.id === fuelType);
    if (ft) {
      return ft.label[currentLang] || ft.label.en || fuelType;
    }
    return fuelType || "Dizel";
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={styles.loadingText}>
          {t("common.loading", "Yükleniyor...")}
        </Text>
      </View>
    );
  }

  if (!vehicle) {
    return (
      <View style={styles.centered}>
        <Ionicons name="car-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>
          {t("fuel.error.noVehicle", "Atanmış aracınız yok")}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>
            {t("common.retry", "Tekrar Dene")}
          </Text>
        </TouchableOpacity>
      </View>
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
        {/* Araç Bilgisi */}
        <View style={styles.vehicleCard}>
          <View style={styles.vehicleHeader}>
            <Ionicons name="car" size={24} color="#5E72E4" />
            <View style={styles.vehicleInfo}>
              <Text style={styles.plateNo}>{vehicle.plate_no}</Text>
              <Text style={styles.vehicleDetails}>
                {getFuelTypeLabel(vehicle.fuel_type)} |{" "}
                {vehicle.fuel_capacity || 60}L {t("fuel.tankCapacity", "Depo")}
              </Text>
            </View>
          </View>
          {/* Edit butonu */}
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="pencil" size={18} color="#5E72E4" />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* KM Sayacı */}
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

          {/* Litre */}
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

          {/* Tutar (Opsiyonel) */}
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

          {/* Full Tank Checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setIsFullTank(!isFullTank)}
          >
            <View
              style={[styles.checkbox, isFullTank && styles.checkboxChecked]}
            >
              {isFullTank && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              {t("fuel.isFullTank", "Depo FULL")}
            </Text>
          </TouchableOpacity>

          {/* Hesaplama Önizleme */}
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

          {/* İlk Kayıt Bilgisi */}
          {!lastRecord && odometerKm && litersFilled && (
            <View style={styles.firstRecordInfo}>
              <Ionicons name="information-circle" size={20} color="#5E72E4" />
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

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {t("fuel.save", "KAYDET")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Son Kayıt Bilgisi */}
        {lastRecord && (
          <View style={styles.lastRecordCard}>
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
          </View>
        )}

        {/* Spacer for keyboard */}
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Araç Düzenleme Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("fuel.editVehicle", "Araç Bilgilerini Düzenle")}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#525f7f" />
              </TouchableOpacity>
            </View>

            {/* Plaka (readonly) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t("fuel.plate", "Plaka")}</Text>
              <View style={[styles.input, styles.inputReadonly]}>
                <Text style={styles.readonlyText}>{vehicle.plate_no}</Text>
              </View>
              <Text style={styles.hint}>
                💡 {t("fuel.plateReadonly", "Plaka değiştirilemez")}
              </Text>
            </View>

            {/* Yakıt Tipi */}
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

            {/* Depo Kapasitesi */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {t("fuel.tankCapacity", "Depo Kapasitesi")} (L)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                keyboardType="numeric"
                value={editTankCapacity}
                onChangeText={(text) =>
                  setEditTankCapacity(text.replace(/[^0-9]/g, ""))
                }
              />
            </View>

            {/* Kaydet Butonu */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                savingVehicle && styles.submitButtonDisabled,
              ]}
              onPress={saveVehicleInfo}
              disabled={savingVehicle}
            >
              {savingVehicle ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f5f7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#8898aa",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8898aa",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#5E72E4",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },

  // Vehicle Card
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vehicleInfo: {
    marginLeft: 12,
    flex: 1,
  },
  plateNo: {
    fontSize: 18,
    fontWeight: "700",
    color: "#32325d",
  },
  vehicleDetails: {
    fontSize: 14,
    color: "#8898aa",
    marginTop: 2,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f3ff",
  },

  // Form
  form: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#525f7f",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  inputError: {
    borderColor: "#f5365c",
    backgroundColor: "#fff5f5",
  },
  inputReadonly: {
    backgroundColor: "#e9ecef",
  },
  readonlyText: {
    fontSize: 16,
    color: "#525f7f",
  },
  hint: {
    fontSize: 12,
    color: "#8898aa",
    marginTop: 6,
  },
  warning: {
    fontSize: 12,
    color: "#fb6340",
    marginTop: 6,
  },

  // Currency Input
  currencyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  currencySymbol: {
    paddingLeft: 14,
    fontSize: 16,
    color: "#525f7f",
    fontWeight: "600",
  },
  currencyInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#5E72E4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#5E72E4",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#32325d",
  },

  // Calculation Preview
  calculationPreview: {
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#5E72E4",
  },
  calculationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5E72E4",
    marginBottom: 8,
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  calculationLabel: {
    fontSize: 13,
    color: "#525f7f",
  },
  calculationValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#32325d",
  },

  // First Record Info
  firstRecordInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f3ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  firstRecordText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#5E72E4",
  },

  // Error
  errorBox: {
    backgroundColor: "#fff5f5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#f5365c",
    fontSize: 14,
  },

  // Submit
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#2dce89",
    borderRadius: 8,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#adb5bd",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  // Last Record
  lastRecordCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  lastRecordTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#525f7f",
    marginBottom: 12,
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
    fontSize: 12,
    color: "#8898aa",
    marginBottom: 4,
  },
  lastRecordValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#32325d",
  },
  lastRecordDate: {
    fontSize: 12,
    color: "#8898aa",
    textAlign: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#32325d",
  },

  // Fuel Type Selector
  fuelTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fuelTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    backgroundColor: "#f7fafc",
  },
  fuelTypeButtonActive: {
    borderColor: "#5E72E4",
    backgroundColor: "#5E72E4",
  },
  fuelTypeText: {
    fontSize: 14,
    color: "#525f7f",
  },
  fuelTypeTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default FuelEntryScreen;
