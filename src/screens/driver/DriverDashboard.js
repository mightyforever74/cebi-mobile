// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// Updated: 11 Şubat 2026 - Card component migration

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
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

// --- helper: #RRGGBB => #RRGGBBAA ---
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
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
      borderRadius: COLORS.RADIUS.xxl,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    quickAccessText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      marginRight: COLORS.SPACING.sm,
    },
    greeting: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80,
    },
    userName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    headerButtons: {
      flexDirection: "row",
    },
    headerButton: {
      backgroundColor: COLORS.WHITE_20,
      padding: 10,
      borderRadius: COLORS.RADIUS.md,
      marginLeft: COLORS.SPACING.sm,
    },
    langFlag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
    },
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin: 16,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: {
      color: COLORS.ERROR,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    offersCard: {
      backgroundColor: COLORS.SUCCESS,
      margin: 16,
      marginBottom: 0,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    offersContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    offersIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      marginRight: COLORS.SPACING.sm,
    },
    offersText: {
      flex: 1,
    },
    offersTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    offersSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.WHITE_80 || withAlpha(COLORS.WHITE, 0.8),
      marginTop: 2,
    },
    // card: KALDIRILDI - Card component kullanılıyor
    // Eski stil referans için:
    // backgroundColor: COLORS.CARD, margin: 16, padding: COLORS.SPACING.md,
    // borderRadius: COLORS.RADIUS.md, elevation: 3
    cardTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    cardTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    noDataText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      paddingVertical: 20,
    },
    vehicleInfo: {
      marginBottom: COLORS.SPACING.md,
    },
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    vehicleModel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    fuelEntryHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: COLORS.RADIUS.sm,
      // gap removed - use marginRight on children
    },
    fuelEntryHintText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    vehicleDetailsRow: {
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
    },
    vehicleDetailItem: {
      flex: 1,
      alignItems: "center",
    },
    vehicleDetailLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    vehicleDetailValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginTop: 2,
    },
    vehicleDetailDivider: {
      width: 1,
      backgroundColor: COLORS.BORDER,
      marginHorizontal: COLORS.SPACING.sm,
    },
    taskCard: {
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    taskHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    taskTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: 4,
      borderRadius: COLORS.RADIUS.sm,
    },
    statusText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE,
    },
    taskDescription: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs,
    },
    taskTime: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    seeAllText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    statsRow: {
      flexDirection: "row",
      marginTop: COLORS.SPACING.sm,
    },
    statItemLarge: {
      flex: 1,
      alignItems: "center",
    },
    statNumberLarge: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
    },
    statTextLarge: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    statDivider: {
      width: 1,
      backgroundColor: COLORS.BORDER,
      marginHorizontal: COLORS.SPACING.md,
    },
    langModalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      paddingHorizontal: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.md,
    },
    langItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: COLORS.SPACING.lg,
    },
    langItemActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    langItemFlag: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      marginRight: COLORS.SPACING.sm,
    },
    langItemName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      flex: 1,
    },
    langItemNameActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    langCloseBtn: {
      marginHorizontal: 20,
      marginTop: COLORS.SPACING.md,
      paddingVertical: 14,
      backgroundColor: COLORS.BORDER,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
    },
    langCloseBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    // FAB + MODAL STYLES
    fab: {
      position: "absolute",
      bottom: COLORS.SPACING.lg, // 24
      right: COLORS.SPACING.lg, // 24
      width: 60,
      height: 60,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.WARNING, // Theme token
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
      ...COLORS.SHADOWS.card,
    },
    fabIcon: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxxl,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    modalSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 20,
    },
    modalInput: {
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
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
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    modalButtonTextSubmit: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.WHITE, // Theme token
    },
  });

// KM formatla (1234.56 -> "1,235")
const formatKm = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n).toLocaleString();
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

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [vehicleRes, tasksRes, statsRes] = await Promise.all([
        driverAPI.getMyVehicle(),
        driverAPI.getMyTasks(),
        driverAPI.getMyStats(),
      ]);

      setVehicle(vehicleRes.vehicle || null);
      const allTasks = tasksRes.tasks || [];
      setTasks(
        allTasks.filter((task) =>
          ["pending_review", "accepted", "in_progress"].includes(task.status)
        )
      );
      setStats(statsRes.stats || {});
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(`${t("common.error")}: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
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

  // Güvenli URL açma
  const safeOpenURL = async (url) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(
          t("common.error"),
          t("common.cannotOpenLink", "Link açılamadı")
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || "Link error");
    }
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
                  📍 {task.pickup_address}
                </Text>
              )}
              {task.scheduled_date && (
                <Text style={styles.taskTime}>
                  🕐{" "}
                  {new Date(task.scheduled_date).toLocaleDateString(
                    i18n.language
                  )}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noDataText}>{t("dashboard.noActiveTasks")}</Text>
        )}
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
              safeOpenURL(
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
              safeOpenURL("https://wttr.in/?lang=" + (i18n.language || "tr"))
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
            onPress={() => safeOpenURL("tel:112")}
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
