// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// Updated: 21 Ocak 2026 - Aracım kartı yakıt girişine yönlendirir, İstatistikler sadeleştirildi

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { LANGUAGES } from "../../locales/i18n";
import { driverAPI } from "../../services/api";

// Yakıt tipi çevirisi
const FUEL_TYPE_LABELS = {
  diesel: {
    tr: "Dizel",
    en: "Diesel",
    bg: "Дизел",
    es: "Diésel",
    it: "Diesel",
    nl: "Diesel",
    ku: "Dîzel",
  },
  gasoline: {
    tr: "Benzin",
    en: "Gasoline",
    bg: "Бензин",
    es: "Gasolina",
    it: "Benzina",
    nl: "Benzine",
    ku: "Benzîn",
  },
  lpg: {
    tr: "LPG",
    en: "LPG",
    bg: "Газ",
    es: "GLP",
    it: "GPL",
    nl: "LPG",
    ku: "LPG",
  },
  electric: {
    tr: "Elektrik",
    en: "Electric",
    bg: "Електричество",
    es: "Eléctrico",
    it: "Elettrico",
    nl: "Elektrisch",
    ku: "Elektrîk",
  },
};

const DriverDashboard = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { expoPushToken, error: pushError } = usePushNotifications();

  const currentLangCode = i18n.language || "tr";

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [error, setError] = useState(null);

  // Gate Logic State
  const [deviceCheckDone, setDeviceCheckDone] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);

  // Language Modal State
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Gate Logic - Her ekran açılışında cihaz durumu kontrol
  useFocusEffect(
    useCallback(() => {
      checkDeviceStatus();
    }, [])
  );

  const checkDeviceStatus = async () => {
    try {
      setCheckingDevice(true);
      console.log("[Gate] Checking device status...");

      const response = await driverAPI.getVehicle();
      console.log("[Gate] Response:", JSON.stringify(response));

      const veh = response?.vehicle || null;
      if (!veh) {
        console.log("[Gate] No vehicle assigned");
        setCheckingDevice(false);
        setDeviceCheckDone(true);
        return;
      }

      const setupRequired =
        response?.setup_required ?? response?.vehicle?.setup_required;

      if (setupRequired) {
        console.log("[Gate] Setup required, redirecting to DeviceSetup...");
        setCheckingDevice(false);
        navigation.navigate("DeviceSetup", {
          vehicle: veh,
        });
        return;
      }

      console.log("[Gate] All good, showing dashboard");
      setCheckingDevice(false);
      setDeviceCheckDone(true);
    } catch (error) {
      console.log("[Gate] Error:", error.message);
      setCheckingDevice(false);
      setDeviceCheckDone(true);
    }
  };

  // Fetch data on mount - deviceCheckDone olunca çalışsın
  useEffect(() => {
    if (deviceCheckDone) {
      fetchAllData();
    }
  }, [deviceCheckDone]);

  // Debug: show push token when ready
  useEffect(() => {
    if (expoPushToken) {
      console.log("🔔 Driver push token ready:", expoPushToken);
    }
  }, [expoPushToken]);

  const fetchAllData = async () => {
    try {
      setError(null);

      const [statsData, tasksData, vehicleData] = await Promise.all([
        driverAPI.getStats().catch((err) => ({ stats: getDefaultStats() })),
        driverAPI.getTasks().catch((err) => ({ tasks: [] })),
        driverAPI.getVehicle().catch((err) => ({ vehicle: null })),
      ]);

      setStats(statsData.stats);
      setTasks(tasksData.tasks || []);
      setVehicle(vehicleData.vehicle);

      console.log("✅ Driver data loaded:", {
        stats: statsData.stats,
        taskCount: tasksData.tasks?.length,
        vehicle: vehicleData.vehicle?.plate,
      });
    } catch (error) {
      console.error("❌ Error fetching driver data:", error);
      setError(t("dashboard.loadError"));
      setStats(getDefaultStats());
      setTasks([]);
      setVehicle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getDefaultStats = () => ({
    completed_tasks: 0,
    active_tasks: 0,
  });

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      console.log("✅ Çıkış yapıldı");
    }
  };

  // Görev kartına tıklanınca Görevlerim'e git
  const handleTaskPress = (task) => {
    console.log("Task pressed:", task.id);
    navigation.navigate("MyTasks");
  };

  // Aracım kartına tıklanınca Yakıt Girişi'ne git
  const handleVehiclePress = () => {
    if (vehicle) {
      navigation.navigate("FuelEntry");
    }
  };

  // Yakıt tipi label
  const getFuelTypeLabel = (fuelType) => {
    const labels = FUEL_TYPE_LABELS[fuelType];
    if (labels) {
      return labels[currentLangCode] || labels.en || fuelType;
    }
    return fuelType || "Dizel";
  };

  // Dil değiştir
  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setLangModalVisible(false);
  };

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Device Check Loading
  if (checkingDevice) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("dashboard.checkingDevice")}</Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Greeting + Language + Logout */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingEmoji}>👋</Text>
          <View>
            <Text style={styles.greeting}>{t("dashboard.hello")}</Text>
            <Text style={styles.userName}>
              {user?.first_name ||
                user?.email?.split("@")[0] ||
                t("roles.driver")}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          {/* Language Button */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.langFlag}>{currentLang.flag}</Text>
          </TouchableOpacity>
          {/* Logout Button */}
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Task Offers Card */}
      <TouchableOpacity
        style={styles.offersCard}
        onPress={() =>
          navigation.navigate("MyTasks", { screen: "DriverTasksScreen" })
        }
      >
        <View style={styles.offersContent}>
          <Text style={styles.offersIcon}>📬</Text>
          <View style={styles.offersText}>
            <Text style={styles.offersTitle}>{t("dashboard.taskOffers")}</Text>
            <Text style={styles.offersSubtitle}>
              {t("dashboard.viewPendingOffers")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </View>
      </TouchableOpacity>

      {/* Vehicle Card - Tıklanınca Yakıt Girişi'ne git */}
      {vehicle ? (
        <TouchableOpacity
          style={styles.card}
          onPress={handleVehiclePress}
          activeOpacity={0.8}
        >
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>🚙 {t("dashboard.myVehicle")}</Text>
            <View style={styles.fuelEntryHint}>
              <Ionicons name="flame-outline" size={16} color={COLORS.primary} />
              <Text style={styles.fuelEntryHintText}>
                {t("dashboard.fuelEntry", "Yakıt Girişi")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.primary}
              />
            </View>
          </View>

          {/* Araç Bilgileri */}
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle.brand} {vehicle.model}
            </Text>
          </View>

          {/* Yakıt Tipi ve Depo Kapasitesi */}
          <View style={styles.vehicleDetailsRow}>
            <View style={styles.vehicleDetailItem}>
              <Ionicons name="water-outline" size={20} color={COLORS.info} />
              <Text style={styles.vehicleDetailLabel}>
                {t("fuel.fuelType", "Yakıt")}
              </Text>
              <Text style={styles.vehicleDetailValue}>
                {getFuelTypeLabel(vehicle.fuel_type)}
              </Text>
            </View>
            <View style={styles.vehicleDetailDivider} />
            <View style={styles.vehicleDetailItem}>
              <Ionicons name="cube-outline" size={20} color={COLORS.success} />
              <Text style={styles.vehicleDetailLabel}>
                {t("fuel.tankCapacity", "Depo")}
              </Text>
              <Text style={styles.vehicleDetailValue}>
                {vehicle.fuel_capacity || 60}L
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚙 {t("dashboard.myVehicle")}</Text>
          <Text style={styles.noDataText}>
            {t("dashboard.noVehicleAssigned")}
          </Text>
        </View>
      )}

      {/* Active Tasks Card */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>📋 {t("dashboard.activeTasks")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("MyTasks")}>
            <Text style={styles.seeAllText}>{t("dashboard.seeAll")}</Text>
          </TouchableOpacity>
        </View>

        {tasks.length > 0 ? (
          tasks.slice(0, 3).map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => handleTaskPress(task)}
            >
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title || `${t("task.title")} #${task.id?.slice(-4)}`}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        task.status === "in_progress"
                          ? COLORS.warning
                          : task.status === "completed"
                          ? COLORS.success
                          : COLORS.info,
                    },
                  ]}
                >
                  <Text style={styles.statusText}>
                    {t(`task.statuses.${task.status}`) || task.status}
                  </Text>
                </View>
              </View>
              {task.pickup_address && (
                <Text style={styles.taskDescription} numberOfLines={1}>
                  📍 {task.pickup_address}
                </Text>
              )}
              {task.scheduled_date && (
                <Text style={styles.taskTime}>
                  🕐 {new Date(task.scheduled_date).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>{t("dashboard.noActiveTasks")}</Text>
        )}
      </View>

      {/* Stats Card - Sadeleştirildi */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 {t("dashboard.myStats")}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItemLarge}>
            <Text style={styles.statNumberLarge}>
              {stats?.completed_tasks || 0}
            </Text>
            <Text style={styles.statTextLarge}>
              {t("dashboard.completedTasks")}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItemLarge}>
            <Text style={styles.statNumberLarge}>
              {stats?.active_tasks || 0}
            </Text>
            <Text style={styles.statTextLarge}>
              {t("dashboard.activeTasksCount")}
            </Text>
          </View>
        </View>
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.langModalOverlay}>
          <View style={styles.langModalContent}>
            <Text style={styles.langModalTitle}>
              {t("settings.selectLanguage")}
            </Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    item.code === i18n.language && styles.langItemActive,
                  ]}
                  onPress={() => changeLanguage(item.code)}
                >
                  <Text style={styles.langItemFlag}>{item.flag}</Text>
                  <Text
                    style={[
                      styles.langItemName,
                      item.code === i18n.language && styles.langItemNameActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.code === i18n.language && (
                    <Ionicons name="checkmark" size={20} color={COLORS.white} />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.langCloseBtn}
              onPress={() => setLangModalVisible(false)}
            >
              <Text style={styles.langCloseBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 12,
  },
  langFlag: {
    fontSize: 20,
  },
  errorCard: {
    backgroundColor: "#FEE",
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  // Task Offers Card
  offersCard: {
    backgroundColor: COLORS.success,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  offersContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  offersIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  offersText: {
    flex: 1,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.white,
  },
  offersSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  // Card
  card: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: 20,
  },
  // Vehicle Card
  vehicleInfo: {
    marginBottom: 16,
  },
  vehiclePlate: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  vehicleModel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  fuelEntryHint: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f3ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  fuelEntryHintText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  // Vehicle Details Row (Yakıt Tipi + Depo)
  vehicleDetailsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  vehicleDetailItem: {
    flex: 1,
    alignItems: "center",
  },
  vehicleDetailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  vehicleDetailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  vehicleDetailDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  // Task Card
  taskCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  // Stats - Sadeleştirilmiş (2 kutu)
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItemLarge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
  },
  statNumberLarge: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  statTextLarge: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.border,
  },
  // Language Modal
  langModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  langModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    textAlign: "center",
    marginBottom: 16,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F7FAFC",
  },
  langItemActive: {
    backgroundColor: COLORS.primary,
  },
  langItemFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langItemName: {
    fontSize: 16,
    color: "#32325D",
    flex: 1,
  },
  langItemNameActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  langCloseBtn: {
    backgroundColor: "#8898AA",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  langCloseBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DriverDashboard;
