// src/screens/driver/DriverDashboard.js
// TulipFleet - Driver Dashboard with REAL DATA
// v2.0 - Phase 0 Regeneration: StatCard + DataState + StatusBadge + colorUtils
// withAlpha → colorUtils, ActivityIndicator → DataState, statsRow → StatCard, emoji → Ionicons

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
import DataState from "../../components/ui/DataState";
import StatCard from "../../components/ui/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { LANGUAGES } from "../../locales/i18n";
import { driverAPI, driverProvisionAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

// ─────────────────────────────────────────────
// FUEL TYPE LABELS (i18n fallback)
// ─────────────────────────────────────────────
const FUEL_TYPE_LABELS = {
  diesel:   { tr: "Dizel",     en: "Diesel",   bg: "Дизел",          es: "Diésel",   it: "Diesel",    nl: "Diesel",    ku: "Dîzel"    },
  gasoline: { tr: "Benzin",    en: "Gasoline", bg: "Бензин",         es: "Gasolina", it: "Benzina",   nl: "Benzine",   ku: "Benzîn"   },
  lpg:      { tr: "LPG",       en: "LPG",      bg: "Газ",            es: "GLP",      it: "GPL",       nl: "LPG",       ku: "LPG"      },
  electric: { tr: "Elektrik",  en: "Electric", bg: "Електричество",  es: "Eléctrico",it: "Elettrico", nl: "Elektrisch",ku: "Elektrîk" },
};

// ─────────────────────────────────────────────
// TASK STATUS → StatusBadge severity map
// ─────────────────────────────────────────────
const TASK_STATUS_SEVERITY = {
  pending_review: "WARNING",
  accepted:       "INFO",
  in_progress:    "WARNING",
  completed:      "SUCCESS",
  cancelled:      "OFFLINE",
};

// ─────────────────────────────────────────────
// makeStyles - Phase 0 temizlenmiş
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },

    // ── Header ──
    header: {
      backgroundColor:         COLORS.PRIMARY,
      paddingTop:              60,
      paddingBottom:           COLORS.SPACING.lg,
      paddingHorizontal:       COLORS.SPACING.headerPadding,
      borderBottomLeftRadius:  COLORS.RADIUS.xxl,
      borderBottomRightRadius: COLORS.RADIUS.xxl,
      flexDirection:           "row",
      justifyContent:          "space-between",
      alignItems:              "center",
    },
    greetingContainer: { flexDirection: "row", alignItems: "center" },
    greeting:  { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.WHITE_80 },
    userName:  { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.WHITE },
    headerButtons: { flexDirection: "row" },
    headerButton:  { backgroundColor: COLORS.WHITE_20, padding: 10, borderRadius: COLORS.RADIUS.md, marginLeft: COLORS.SPACING.sm },
    langFlag:      { fontSize: COLORS.TYPOGRAPHY.sizes.xxl },

    // ── Error banner ──
    errorCard: {
      backgroundColor: COLORS.INPUT_ERROR,
      margin:          16,
      padding:         COLORS.SPACING.sm,
      borderRadius:    COLORS.RADIUS.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.ERROR,
    },
    errorText: { color: COLORS.ERROR, fontSize: COLORS.TYPOGRAPHY.sizes.md },

    // ── Task Offers banner ──
    offersCard: {
      backgroundColor: COLORS.SUCCESS,
      margin:          16,
      marginBottom:    0,
      padding:         COLORS.SPACING.md,
      borderRadius:    COLORS.RADIUS.md,
      ...COLORS.SHADOWS.card,
    },
    offersContent: { flexDirection: "row", alignItems: "center" },
    offersText:    { flex: 1 },
    offersTitle:   { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.WHITE },
    offersSubtitle:{ fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.WHITE_80, marginTop: 2 },

    // ── Card common ──
    cardTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: COLORS.SPACING.md },
    cardTitle:    { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT },
    noDataText:   { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, textAlign: "center", paddingVertical: 20 },
    seeAllText:   { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.PRIMARY, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },

    // ── Vehicle card ──
    vehicleInfo:        { marginBottom: COLORS.SPACING.md },
    vehiclePlate:       { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.PRIMARY },
    vehicleModel:       { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, marginTop: COLORS.SPACING.xs },
    fuelEntryHint:      { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.SECONDARY, paddingHorizontal: 10, paddingVertical: 6, borderRadius: COLORS.RADIUS.sm },
    fuelEntryHintText:  { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.PRIMARY, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    vehicleDetailsRow:  { flexDirection: "row", backgroundColor: COLORS.BACKGROUND, borderRadius: COLORS.RADIUS.sm, padding: COLORS.SPACING.sm },
    vehicleDetailItem:  { flex: 1, alignItems: "center" },
    vehicleDetailLabel: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_SECONDARY, marginTop: COLORS.SPACING.xs },
    vehicleDetailValue: { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginTop: 2 },
    vehicleDetailDivider:{ width: 1, backgroundColor: COLORS.BORDER, marginHorizontal: COLORS.SPACING.sm },

    // ── Task card ──
    taskCard:        { backgroundColor: COLORS.BACKGROUND, padding: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.sm, marginBottom: COLORS.SPACING.sm },
    taskHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: COLORS.SPACING.sm },
    taskTitle:       { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT, flex: 1, marginRight: COLORS.SPACING.xs },
    taskDescription: { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, marginBottom: COLORS.SPACING.xs },
    taskTime:        { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_SECONDARY },
    taskMetaRow:     { flexDirection: "row", alignItems: "center", marginBottom: COLORS.SPACING.xs },

    // ── Stats row (StatCard grid) ──
    statsGrid: {
      flexDirection: "row",
      gap:           COLORS.SPACING.sm,
      flex:          1,
    },

    // ── Quick Access ──
    quickAccessGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: COLORS.SPACING.sm },
    quickAccessItem: { width: "48%", alignItems: "center", backgroundColor: COLORS.BACKGROUND, padding: COLORS.SPACING.md, borderRadius: COLORS.RADIUS.card, marginBottom: COLORS.SPACING.sm },
    quickAccessIcon: { width: 48, height: 48, borderRadius: COLORS.RADIUS.xxl, justifyContent: "center", alignItems: "center", marginBottom: COLORS.SPACING.sm },
    quickAccessText: { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT, textAlign: "center" },

    // ── Language modal ──
    langModalOverlay:  { flex: 1, backgroundColor: COLORS.OVERLAY, justifyContent: "flex-end" },
    langModalContent:  { backgroundColor: COLORS.CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32, maxHeight: "70%" },
    langModalTitle:    { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, paddingHorizontal: COLORS.SPACING.lg, marginBottom: COLORS.SPACING.md },
    langItem:          { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: COLORS.SPACING.lg },
    langItemActive:    { backgroundColor: COLORS.PRIMARY },
    langItemFlag:      { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, marginRight: COLORS.SPACING.sm },
    langItemName:      { fontSize: COLORS.TYPOGRAPHY.sizes.lg, color: COLORS.TEXT, flex: 1 },
    langItemNameActive:{ color: COLORS.WHITE, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    langCloseBtn:      { marginHorizontal: 20, marginTop: COLORS.SPACING.md, paddingVertical: 14, backgroundColor: COLORS.BORDER, borderRadius: COLORS.RADIUS.md, alignItems: "center" },
    langCloseBtnText:  { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT },

    // ── FAB ──
    fab: {
      position:        "absolute",
      bottom:          COLORS.SPACING.lg,
      right:           COLORS.SPACING.lg,
      width:           60,
      height:          60,
      borderRadius:    COLORS.RADIUS.full,
      backgroundColor: COLORS.WARNING,
      justifyContent:  "center",
      alignItems:      "center",
      elevation:       5,
      ...COLORS.SHADOWS.card,
    },

    // ── Serial modal ──
    modalOverlay:          { flex: 1, backgroundColor: COLORS.OVERLAY, justifyContent: "center", alignItems: "center" },
    modalContent:          { backgroundColor: COLORS.CARD, borderRadius: COLORS.RADIUS.modal, padding: COLORS.SPACING.lg, width: "85%", maxWidth: 400 },
    modalTitle:            { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, marginBottom: COLORS.SPACING.sm },
    modalSubtitle:         { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, marginBottom: 20 },
    modalInput:            { backgroundColor: COLORS.BACKGROUND, borderWidth: 1, borderColor: COLORS.BORDER, borderRadius: COLORS.RADIUS.sm, padding: COLORS.SPACING.sm, fontSize: COLORS.TYPOGRAPHY.sizes.lg, color: COLORS.TEXT, marginBottom: 20 },
    modalButtons:          { flexDirection: "row", justifyContent: "space-between" },
    modalButton:           { flex: 1, paddingVertical: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.sm, alignItems: "center" },
    modalButtonCancel:     { backgroundColor: COLORS.BORDER, marginRight: COLORS.SPACING.sm },
    modalButtonSubmit:     { backgroundColor: COLORS.WARNING, marginLeft: COLORS.SPACING.sm },
    modalButtonTextCancel: { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT },
    modalButtonTextSubmit: { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.WHITE },
  });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatKm = (km) => {
  const n = Number(km);
  if (!Number.isFinite(n) || n <= 0) return "0";
  return Math.round(n).toLocaleString();
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const DriverDashboard = () => {
  const { user, logout } = useAuth();
  const { i18n, t }      = useTranslation();
  const navigation        = useNavigation();
  const { COLORS }        = useTheme();
  const styles            = useThemedStyles(makeStyles);

  usePushNotifications();

  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [error,           setError]           = useState(null);
  const [vehicle,         setVehicle]         = useState(null);
  const [tasks,           setTasks]           = useState([]);
  const [stats,           setStats]           = useState({});
  const [langModalVisible,setLangModalVisible]= useState(false);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [serialInput,     setSerialInput]     = useState("");
  const [validating,      setValidating]      = useState(false);

  const currentLang = LANGUAGES.find((lang) => lang.code === i18n.language) || LANGUAGES[0];

  const getFuelTypeLabel = (fuelType) => {
    if (!fuelType) return "N/A";
    const labels = FUEL_TYPE_LABELS[fuelType.toLowerCase()];
    return labels ? labels[i18n.language] || labels.en : fuelType;
  };

  // ── Fetch ──
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
      setTasks(allTasks.filter((task) => ["pending_review","accepted","in_progress"].includes(task.status)));
      setStats(statsRes.stats || {});
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setError(`${t("common.error")}: ${err?.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { fetchDashboardData(); }, [fetchDashboardData]));

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  const handleLogout = () => {
    Alert.alert(t("auth.logoutConfirmTitle"), t("auth.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.confirm"), onPress: logout },
    ]);
  };

  const changeLanguage = (code) => { i18n.changeLanguage(code); setLangModalVisible(false); };

  const handleVehiclePress = () => { navigation.navigate("FuelEntry"); };

  const handleTaskPress = (task) => {
    navigation.navigate("MyTasks", { screen: "DriverTaskDetailScreen", params: { taskId: task.id } });
  };

  const safeOpenURL = async (url) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) { Alert.alert(t("common.error"), t("common.cannotOpenLink","Link açılamadı")); return; }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(t("common.error"), e?.message || "Link error");
    }
  };

  const handleAddDevice = () => { setSerialInput(""); setShowSerialModal(true); };

  const handleSerialSubmit = async () => {
    if (!serialInput || serialInput.trim().length === 0) {
      Alert.alert(t("common.error"), t("dashboard.serialEmpty"));
      return;
    }
    try {
      setValidating(true);
      const response = await driverProvisionAPI.validateSerial(serialInput.trim());
      if (response.valid) {
        setShowSerialModal(false);
        navigation.navigate("DeviceSetup", { screen: "DeviceSetupMain", params: { serial: serialInput.trim(), deviceInfo: response.device } });
      } else {
        Alert.alert(t("common.error"), response.message || t("dashboard.deviceNotFound"));
      }
    } catch (error) {
      console.error("[Dashboard] Serial validation error:", error);
      Alert.alert(t("common.error"), t("dashboard.deviceCheckFailed") + ": " + error.message);
    } finally {
      setValidating(false);
    }
  };

  // ── Render ──
  return (
    <DataState
      loading={loading}
      error={error}
      onRetry={() => { setLoading(true); fetchDashboardData(); }}
      retryLabel={t("common.retry","Tekrar Dene")}
    >
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Ionicons name="hand-left-outline" size={28} color={COLORS.WHITE} style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.greeting}>{t("dashboard.hello")}</Text>
              <Text style={styles.userName}>{user?.first_name || user?.email?.split("@")[0] || t("roles.driver")}</Text>
            </View>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={() => setLangModalVisible(true)}>
              <Text style={styles.langFlag}>{currentLang.flag}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.WHITE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Error banner ── */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              <Ionicons name="warning-outline" size={14} color={COLORS.ERROR} /> {error}
            </Text>
          </View>
        )}

        {/* ── Task Offers ── */}
        <TouchableOpacity style={styles.offersCard} onPress={() => navigation.navigate("MyTasks", { screen: "DriverTasksScreen" })}>
          <View style={styles.offersContent}>
            <Ionicons name="mail-unread-outline" size={28} color={COLORS.WHITE} style={{ marginRight: 12 }} />
            <View style={styles.offersText}>
              <Text style={styles.offersTitle}>{t("dashboard.taskOffers")}</Text>
              <Text style={styles.offersSubtitle}>{t("dashboard.viewPendingOffers")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={COLORS.WHITE} />
          </View>
        </TouchableOpacity>

        {/* ── Vehicle Card ── */}
        {vehicle ? (
          <TouchableOpacity onPress={handleVehiclePress} activeOpacity={0.8}>
            <Card>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>
                <View style={styles.fuelEntryHint}>
                  <Ionicons name="flame-outline" size={16} color={COLORS.PRIMARY} />
                  <Text style={styles.fuelEntryHintText}>{t("dashboard.fuelEntry","Yakıt Girişi")}</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.PRIMARY} />
                </View>
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>
                <Text style={styles.vehicleModel}>{vehicle.brand} {vehicle.model}</Text>
              </View>
              <View style={styles.vehicleDetailsRow}>
                <View style={styles.vehicleDetailItem}>
                  <Ionicons name="water-outline" size={20} color={COLORS.INFO} />
                  <Text style={styles.vehicleDetailLabel}>{t("fuel.fuelType","Yakıt")}</Text>
                  <Text style={styles.vehicleDetailValue}>{getFuelTypeLabel(vehicle.fuel_type)}</Text>
                </View>
                <View style={styles.vehicleDetailDivider} />
                <View style={styles.vehicleDetailItem}>
                  <Ionicons name="cube-outline" size={20} color={COLORS.SUCCESS} />
                  <Text style={styles.vehicleDetailLabel}>{t("fuel.tankCapacity","Depo")}</Text>
                  <Text style={styles.vehicleDetailValue}>{vehicle.fuel_capacity || 60}L</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>{t("dashboard.myVehicle")}</Text>
            <Text style={styles.noDataText}>{t("dashboard.noVehicleAssigned")}</Text>
          </Card>
        )}

        {/* ── Active Tasks Card ── */}
        <Card>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{t("dashboard.activeTasks")}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("MyTasks")}>
              <Text style={styles.seeAllText}>{t("dashboard.seeAll")}</Text>
            </TouchableOpacity>
          </View>

          {tasks.length > 0 ? (
            tasks.slice(0, 3).map((task) => (
              <TouchableOpacity key={task.id} style={styles.taskCard} onPress={() => handleTaskPress(task)}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title || `${t("task.title")} #${task.id?.slice(-4)}`}
                  </Text>
                  {/* statusBadge → StatusBadge */}
                  <StatusBadge
                    status={TASK_STATUS_SEVERITY[task.status] || "INFO"}
                    label={t(`task.statuses.${task.status}`) || task.status}
                    size="sm"
                  />
                </View>

                {task.pickup_address && (
                  <View style={styles.taskMetaRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.MUTED} style={{ marginRight: 4 }} />
                    <Text style={styles.taskDescription} numberOfLines={1}>{task.pickup_address}</Text>
                  </View>
                )}
                {task.scheduled_date && (
                  <View style={styles.taskMetaRow}>
                    <Ionicons name="time-outline" size={14} color={COLORS.MUTED} style={{ marginRight: 4 }} />
                    <Text style={styles.taskTime}>{new Date(task.scheduled_date).toLocaleDateString(i18n.language)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noDataText}>{t("dashboard.noActiveTasks")}</Text>
          )}
        </Card>

        {/* ── Stats Card → StatCard × 3 ── */}
        <Card>
          <Text style={styles.cardTitle}>{t("dashboard.myStats")}</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle-outline"
              label={t("dashboard.completedTasks")}
              value={stats?.completed_tasks || 0}
              colorToken="SUCCESS"
            />
            <StatCard
              icon="navigate-outline"
              label={t("dashboard.activeTasksCount")}
              value={stats?.active_tasks || 0}
              colorToken="INFO"
            />
            <StatCard
              icon="speedometer-outline"
              label={t("dashboard.totalKm")}
              value={formatKm(stats?.total_km)}
              colorToken="PRIMARY"
            />
          </View>
        </Card>

        {/* ── Quick Access Card ── */}
        <Card>
          <Text style={styles.cardTitle}>{t("dashboard.quickAccess")}</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => safeOpenURL("https://www.google.com/maps/@?api=1&map_action=map&layer=traffic")}>
              <View style={[styles.quickAccessIcon, { backgroundColor: withAlpha(COLORS.WARNING, 0.12) }]}>
                <Ionicons name="car-outline" size={24} color={COLORS.WARNING} />
              </View>
              <Text style={styles.quickAccessText}>{t("dashboard.traffic")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessItem} onPress={() => safeOpenURL("https://wttr.in/?lang=" + (i18n.language || "tr"))}>
              <View style={[styles.quickAccessIcon, { backgroundColor: withAlpha(COLORS.INFO, 0.12) }]}>
                <Ionicons name="cloud-outline" size={24} color={COLORS.INFO} />
              </View>
              <Text style={styles.quickAccessText}>{t("dashboard.weather")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessItem} onPress={() => safeOpenURL("tel:112")}>
              <View style={[styles.quickAccessIcon, { backgroundColor: withAlpha(COLORS.ERROR, 0.12) }]}>
                <Ionicons name="call-outline" size={24} color={COLORS.ERROR} />
              </View>
              <Text style={styles.quickAccessText}>{t("dashboard.emergency")}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate("HelpCenter")}>
              <View style={[styles.quickAccessIcon, { backgroundColor: withAlpha(COLORS.SUCCESS, 0.12) }]}>
                <Ionicons name="help-circle-outline" size={24} color={COLORS.SUCCESS} />
              </View>
              <Text style={styles.quickAccessText}>{t("dashboard.helpCenter")}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ── Language Modal ── */}
        <Modal visible={langModalVisible} transparent animationType="slide" onRequestClose={() => setLangModalVisible(false)}>
          <View style={styles.langModalOverlay}>
            <View style={styles.langModalContent}>
              <Text style={styles.langModalTitle}>{t("settings.selectLanguage")}</Text>
              <FlatList
                data={LANGUAGES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.langItem, item.code === i18n.language && styles.langItemActive]} onPress={() => changeLanguage(item.code)}>
                    <Text style={styles.langItemFlag}>{item.flag}</Text>
                    <Text style={[styles.langItemName, item.code === i18n.language && styles.langItemNameActive]}>{item.name}</Text>
                    {item.code === i18n.language && <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />}
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={styles.langCloseBtn} onPress={() => setLangModalVisible(false)}>
                <Text style={styles.langCloseBtnText}>{t("common.close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Serial Modal ── */}
        <Modal visible={showSerialModal} transparent={true} animationType="slide" onRequestClose={() => setShowSerialModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t("dashboard.enterSerial")}</Text>
              <Text style={styles.modalSubtitle}>{t("dashboard.enterSerialMessage")}</Text>
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
                <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowSerialModal(false)} disabled={validating}>
                  <Text style={styles.modalButtonTextCancel}>{t("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.modalButtonSubmit]} onPress={handleSerialSubmit} disabled={validating}>
                  {validating
                    ? <ActivityIndicator size="small" color={COLORS.WHITE} />
                    : <Text style={styles.modalButtonTextSubmit}>{t("common.continue")}</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── FAB ── */}
        <TouchableOpacity style={styles.fab} onPress={handleAddDevice} activeOpacity={0.8}>
          <Ionicons name="add-circle" size={28} color={COLORS.WHITE} />
        </TouchableOpacity>
      </ScrollView>
    </DataState>
  );
};

export default DriverDashboard;