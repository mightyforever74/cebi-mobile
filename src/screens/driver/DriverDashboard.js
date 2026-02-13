// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// Updated: 11 Şubat 2026 - Card component migration

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { LANGUAGES } from "../../locales/i18n";
import { driverAPI, driverProvisionAPI } from "../../services/api";

// YakÄ±t tipi Ã§evirisi
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    // Safety Score Card
    safetyScoreContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 12,
    },
    safetyScoreCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: COLORS.BACKGROUND,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    safetyScoreNumber: {
      fontSize: 28,
      fontWeight: "bold",
    },
    safetyScoreMax: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
      marginTop: -2,
    },
    safetyScoreBar: {
      flex: 1,
    },
    safetyBarTrack: {
      height: 8,
      backgroundColor: COLORS.BORDER,
      borderRadius: 4,
      overflow: "hidden",
    },
    safetyBarFill: {
      height: 8,
      borderRadius: 4,
    },
    safetyScoreLabel: {
      fontSize: 13,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 6,
    },
    // Quick Access Card
    quickAccessGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: COLORS.SPACING.sm, // 8
    },

    quickAccessItem: {
      width: "48%", // 47 yerine 48 (space-between ile daha stabil)
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card, // 12
      marginBottom: COLORS.SPACING.sm, // 8 (row spacing)
    },
    quickAccessIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    quickAccessText: {
      fontSize: 13,
      fontWeight: "600",
      color: COLORS.TEXT,
      textAlign: "center",
    },
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
      marginTop: 10,
      fontSize: 16,
      color: COLORS.TEXT_SECONDARY,
    },
    header: {
      backgroundColor: COLORS.PRIMARY,
      paddingTop: 60,
      paddingBottom: COLORS.SPACING.lg, // 24
      paddingHorizontal: COLORS.SPACING.headerPadding, // 24 (8px grid)
      borderBottomLeftRadius: COLORS.RADIUS.xxl, // 24
      borderBottomRightRadius: COLORS.RADIUS.xxl,
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
      color: COLORS.WHITE_80,
    },
    userName: {
      fontSize: 22,
      fontWeight: "bold",
      color: COLORS.WHITE,
    },
    headerButtons: {
      flexDirection: "row",
      gap: COLORS.SPACING.sm, // 8
    },
    headerButton: {
      backgroundColor: COLORS.WHITE_20,
      padding: 10,
      borderRadius: 12,
    },
    langFlag: {
      fontSize: 20,
    },
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: 16,
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: {
      color: COLORS.ERROR,
      fontSize: 14,
    },
    offersCard: {
      backgroundColor: COLORS.SUCCESS,
      margin: 16,
      marginBottom: 0,
      padding: 16,
      borderRadius: 12,
      shadowColor: COLORS.SHADOW,
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
      color: COLORS.WHITE,
    },
    offersSubtitle: {
      fontSize: 13,
      color: "rgba(255,255,255,0.8)",
      marginTop: 2,
    },
    // card: KALDIRILDI - Card component kullanılıyor
    // Eski stil referans için:
    // backgroundColor: COLORS.CARD, margin: 16, padding: 16,
    // borderRadius: 12, elevation: 3
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT,
    },
    noDataText: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingVertical: 20,
    },
    vehicleInfo: {
      marginBottom: 16,
    },
    vehiclePlate: {
      fontSize: 24,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    vehicleModel: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    fuelEntryHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 4,
    },
    fuelEntryHintText: {
      fontSize: 12,
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    vehicleDetailsRow: {
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: 8,
      padding: 12,
    },
    vehicleDetailItem: {
      flex: 1,
      alignItems: "center",
    },
    vehicleDetailLabel: {
      fontSize: 11,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    vehicleDetailValue: {
      fontSize: 16,
      fontWeight: "700",
      color: COLORS.TEXT,
      marginTop: 2,
    },
    vehicleDetailDivider: {
      width: 1,
      backgroundColor: COLORS.BORDER,
      marginHorizontal: 8,
    },
    taskCard: {
      backgroundColor: COLORS.BACKGROUND,
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
      color: COLORS.TEXT,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
      color: COLORS.WHITE,
    },
    taskDescription: {
      fontSize: 13,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 4,
    },
    taskTime: {
      fontSize: 12,
      color: COLORS.TEXT_SECONDARY,
    },
    seeAllText: {
      fontSize: 14,
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      marginTop: 12,
    },
    statItemLarge: {
      flex: 1,
      alignItems: "center",
    },
    statNumberLarge: {
      fontSize: 28,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
    },
    statTextLarge: {
      fontSize: 13,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      backgroundColor: COLORS.BORDER,
      marginHorizontal: 16,
    },
    langModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    langModalContent: {
      backgroundColor: COLORS.CARD,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      paddingBottom: 32,
      maxHeight: "70%",
    },
    langModalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: COLORS.TEXT,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    langItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    langItemActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    langItemFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    langItemName: {
      fontSize: 16,
      color: COLORS.TEXT,
      flex: 1,
    },
    langItemNameActive: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },
    langCloseBtn: {
      marginHorizontal: 20,
      marginTop: 16,
      paddingVertical: 14,
      backgroundColor: COLORS.BORDER,
      borderRadius: 12,
      alignItems: "center",
    },
    langCloseBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT,
    },
    // FAB + MODAL STYLES
    fab: {
      position: "absolute",
      bottom: COLORS.SPACING.lg, // 24
      right: COLORS.SPACING.lg, // 24
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.WARNING, // Theme token
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
      shadowColor: COLORS.SHADOW,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    fabIcon: {
      fontSize: 28,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.modal, // 16
      padding: COLORS.SPACING.lg, // 24
      width: "85%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: COLORS.TEXT,
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 20,
    },
    modalInput: {
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: COLORS.TEXT,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    modalButtonCancel: {
      backgroundColor: COLORS.BORDER,
      marginRight: COLORS.SPACING.sm,
    },
    modalButtonSubmit: {
      backgroundColor: COLORS.WARNING, // Theme token (FAB ile aynı)
      marginLeft: COLORS.SPACING.sm,
    },
    modalButtonTextCancel: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT,
    },
    modalButtonTextSubmit: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.WHITE, // Theme token
    },
  });

// Safety score renk hesaplama (COLORS parametresi alır)
const getSafetyColor = (score, COLORS) => {
  const s = score || 5.0;
  if (s >= 4.0) return COLORS.SUCCESS;
  if (s >= 3.0) return COLORS.WARNING;
  if (s >= 2.0) return COLORS.WARNING; // turuncu yerine warning
  return COLORS.ERROR;
};

// Safety score etiket
const getSafetyLabel = (score, t) => {
  const s = score || 5.0;
  if (s >= 4.5) return t("dashboard.safetyExcellent");
  if (s >= 4.0) return t("dashboard.safetyGood");
  if (s >= 3.0) return t("dashboard.safetyAverage");
  if (s >= 2.0) return t("dashboard.safetyBelowAvg");
  return t("dashboard.safetyPoor");
};

// KM formatla (1234.56 â†’ "1,235")
const formatKm = (km) => {
  if (!km || km === 0) return "0";
  return Math.round(km).toLocaleString();
};

const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const navigation = useNavigation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  usePushNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [langModalVisible, setLangModalVisible] = useState(false);

  // MODAL STATES
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialInput, setSerialInput] = useState("");
  const [validating, setValidating] = useState(false);

  const currentLang =
    LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const getFuelTypeLabel = (fuelType) => {
    if (!fuelType) return "N/A";
    const labels = FUEL_TYPE_LABELS[fuelType.toLowerCase()];
    return labels ? labels[i18n.language] || labels.en : fuelType;
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [vehicleRes, tasksRes, statsRes] = await Promise.all([
        driverAPI.getMyVehicle(),
        driverAPI.getMyTasks(),
        driverAPI.getMyStats(),
      ]);

      setVehicle(vehicleRes.vehicle || null);
      setTasks(tasksRes.tasks || []);
      setStats(statsRes.stats || {});
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(t("common.error") + ": " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = () => {
    Alert.alert(t("auth.logoutConfirmTitle"), t("auth.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.confirm"), onPress: logout },
    ]);
  };

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    setLangModalVisible(false);
  };

  const handleVehiclePress = () => {
    navigation.navigate("FuelEntry");
  };

  const handleTaskPress = (task) => {
    navigation.navigate("MyTasks", {
      screen: "DriverTaskDetailScreen",
      params: { taskId: task.id },
    });
  };

  // FAB HANDLER - MODAL
  const handleAddDevice = () => {
    setSerialInput("");
    setShowSerialModal(true);
  };

  const handleSerialSubmit = async () => {
    if (!serialInput || serialInput.trim().length === 0) {
      Alert.alert(t("common.error"), t("dashboard.serialEmpty"));
      return;
    }

    try {
      setValidating(true);

      const response = await driverProvisionAPI.validateSerial(
        serialInput.trim()
      );

      if (response.valid) {
        setShowSerialModal(false);
        navigation.navigate("DeviceSetup", {
          screen: "DeviceSetupMain",
          params: {
            serial: serialInput.trim(),
            deviceInfo: response.device,
          },
        });
      } else {
        Alert.alert(
          t("common.error"),
          response.message || t("dashboard.deviceNotFound")
        );
      }
    } catch (error) {
      console.error("[Dashboard] Serial validation error:", error);
      Alert.alert(
        t("common.error"),
        t("dashboard.deviceCheckFailed") + ": " + error.message
      );
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.PRIMARY}
          colors={[COLORS.PRIMARY]}
        />
      }
    >
      {/* Header with Greeting + Language + Logout */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Ionicons
            name="hand-left-outline"
            size={28}
            color={COLORS.WHITE}
            style={{ marginRight: 12 }}
          />
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
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.langFlag}>{currentLang.flag}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.WHITE} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>âš ï¸ {error}</Text>
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
          <Ionicons
            name="mail-unread-outline"
            size={28}
            color={COLORS.WHITE}
            style={{ marginRight: 12 }}
          />
          <View style={styles.offersText}>
            <Text style={styles.offersTitle}>{t("dashboard.taskOffers")}</Text>
            <Text style={styles.offersSubtitle}>
              {t("dashboard.viewPendingOffers")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
        </View>
      </TouchableOpacity>

      {/* Vehicle Card */}
      {vehicle ? (
        <TouchableOpacity onPress={handleVehiclePress} activeOpacity={0.8}>
          <Card>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>

              <View style={styles.fuelEntryHint}>
                <Ionicons
                  name="flame-outline"
                  size={16}
                  color={COLORS.PRIMARY}
                />
                <Text style={styles.fuelEntryHintText}>
                  {t("dashboard.fuelEntry", "Yakıt Girişi")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.PRIMARY}
                />
              </View>
            </View>

            <View style={styles.vehicleInfo}>
              <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
              <Text style={styles.vehicleModel}>
                {vehicle.brand} {vehicle.model}
              </Text>
            </View>

            <View style={styles.vehicleDetailsRow}>
              <View style={styles.vehicleDetailItem}>
                <Ionicons name="water-outline" size={20} color={COLORS.INFO} />
                <Text style={styles.vehicleDetailLabel}>
                  {t("fuel.fuelType", "Yakıt")}
                </Text>
                <Text style={styles.vehicleDetailValue}>
                  {getFuelTypeLabel(vehicle.fuel_type)}
                </Text>
              </View>

              <View style={styles.vehicleDetailDivider} />

              <View style={styles.vehicleDetailItem}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={COLORS.SUCCESS}
                />
                <Text style={styles.vehicleDetailLabel}>
                  {t("fuel.tankCapacity", "Depo")}
                </Text>
                <Text style={styles.vehicleDetailValue}>
                  {vehicle.fuel_capacity || 60}L
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ) : (
        <Card>
          <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>
          <Text style={styles.noDataText}>
            {t("dashboard.noVehicleAssigned")}
          </Text>
        </Card>
      )}

      {/* Active Tasks Card */}
      <Card>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{t("dashboard.activeTasks")}</Text>
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
                          ? COLORS.WARNING
                          : task.status === "completed"
                            ? COLORS.SUCCESS
                            : COLORS.INFO,
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
                  ðŸ“ {task.pickup_address}
                </Text>
              )}
              {task.scheduled_date && (
                <Text style={styles.taskTime}>
                  ðŸ• {new Date(task.scheduled_date).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>{t("dashboard.noActiveTasks")}</Text>
        )}
      </Card>

      {/* Safety Score Card */}
      <Card>
        <Text style={styles.cardTitle}>{t("dashboard.safetyScore")}</Text>
        <View style={styles.safetyScoreContainer}>
          <View style={styles.safetyScoreCircle}>
            <Text
              style={[
                styles.safetyScoreNumber,
                { color: getSafetyColor(stats?.safety_score, COLORS) },
              ]}
            >
              {(stats?.safety_score || 5.0).toFixed(1)}
            </Text>
            <Text style={styles.safetyScoreMax}>/5.0</Text>
          </View>
          <View style={styles.safetyScoreBar}>
            <View style={styles.safetyBarTrack}>
              <View
                style={[
                  styles.safetyBarFill,
                  {
                    width: `${((stats?.safety_score || 5.0) / 5) * 100}%`,
                    backgroundColor: getSafetyColor(
                      stats?.safety_score,
                      COLORS
                    ),
                  },
                ]}
              />
            </View>
            <Text style={styles.safetyScoreLabel}>
              {getSafetyLabel(stats?.safety_score, t)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Stats Card */}
      <Card>
        <Text style={styles.cardTitle}>{t("dashboard.myStats")}</Text>
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
          <View style={styles.statDivider} />
          <View style={styles.statItemLarge}>
            <Text style={styles.statNumberLarge}>
              {formatKm(stats?.total_km)}
            </Text>
            <Text style={styles.statTextLarge}>{t("dashboard.totalKm")}</Text>
          </View>
        </View>
      </Card>

      {/* Quick Access Card */}
      <Card>
        <Text style={styles.cardTitle}>{t("dashboard.quickAccess")}</Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() =>
              Linking.openURL(
                "https://www.google.com/maps/@?api=1&map_action=map&layer=traffic"
              )
            }
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: COLORS.WARNING_LIGHT },
              ]}
            >
              <Ionicons name="car-outline" size={24} color={COLORS.WARNING} />
            </View>
            <Text style={styles.quickAccessText}>{t("dashboard.traffic")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() =>
              Linking.openURL(
                "https://wttr.in/?lang=" + (i18n.language || "tr")
              )
            }
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: COLORS.INFO_LIGHT },
              ]}
            >
              <Ionicons name="cloud-outline" size={24} color={COLORS.INFO} />
            </View>
            <Text style={styles.quickAccessText}>{t("dashboard.weather")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => Linking.openURL("tel:112")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: COLORS.ERROR_LIGHT },
              ]}
            >
              <Ionicons name="call-outline" size={24} color={COLORS.ERROR} />
            </View>
            <Text style={styles.quickAccessText}>
              {t("dashboard.emergency")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate("HelpCenter")}
          >
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: COLORS.SUCCESS_LIGHT },
              ]}
            >
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={COLORS.SUCCESS}
              />
            </View>
            <Text style={styles.quickAccessText}>
              {t("dashboard.helpCenter")}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

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
                    <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
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

      {/* Serial Input Modal */}
      <Modal
        visible={showSerialModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSerialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("dashboard.enterSerial")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("dashboard.enterSerialMessage")}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={serialInput}
              onChangeText={setSerialInput}
              placeholder="TF-2025-00001-1"
              placeholderTextColor={COLORS.PLACEHOLDER}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!validating}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSerialModal(false)}
                disabled={validating}
              >
                <Text style={styles.modalButtonTextCancel}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleSerialSubmit}
                disabled={validating}
              >
                {validating ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.modalButtonTextSubmit}>
                    {t("common.continue")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddDevice}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default DriverDashboard;
