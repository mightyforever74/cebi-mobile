// src/screens/superadmin/DevicesScreen.js
// TulipFleet - ESP32 Cihaz Yönetimi + Yeni Cihaz Kayıt
// Updated: 23 February 2026 - Register Device modal added
// Theme: useTheme + useThemedStyles (UI Guide v3)

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { getTimeAgo } from "../../utils/helpers";

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

// --- MAC address formatter ---
const formatMacAddress = (text) => {
  const clean = text.replace(/[^A-Fa-f0-9]/g, "").toUpperCase();
  let formatted = "";
  for (let i = 0; i < clean.length && i < 12; i++) {
    if (i > 0 && i % 2 === 0) formatted += ":";
    formatted += clean[i];
  }
  return formatted;
};

const CHIP_MODELS = [
  { label: "ESP32-S3-N16R8", value: "ESP32-S3-N16R8" },
  { label: "ESP32-S3-WROOM", value: "ESP32-S3-WROOM" },
  { label: "ESP32-WROOM-32", value: "ESP32-WROOM-32" },
];

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: { marginTop: 10, color: COLORS.MUTED, fontWeight: "500" },

    // Stats
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 15,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.18) || COLORS.BORDER,
    },
    statCardActive: { borderWidth: 2, borderColor: COLORS.PRIMARY },
    statValue: { fontSize: 24, fontWeight: "bold" },
    statLabel: {
      fontSize: 11,
      color: COLORS.MUTED,
      marginTop: 2,
      fontWeight: "600",
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginHorizontal: 15,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.18) || COLORS.BORDER,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    // Filter
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: 15,
      marginBottom: 10,
      flexWrap: "wrap",
      gap: 8,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.18) || COLORS.BORDER,
      elevation: 1,
    },
    filterButtonActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    filterText: { fontSize: 12, color: COLORS.MUTED, fontWeight: "600" },
    filterTextActive: { color: COLORS.WHITE },

    // Summary
    summaryBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingBottom: 10,
    },
    summaryText: { color: COLORS.MUTED, fontSize: 13, fontWeight: "600" },

    // FAB
    fab: {
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    fabText: { color: COLORS.WHITE, fontSize: 13, fontWeight: "700" },

    // Device Card
    listContainer: { paddingHorizontal: 15, paddingBottom: 20 },
    deviceCard: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 12,
      marginBottom: 12,
      overflow: "hidden",
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.18) || COLORS.BORDER,
    },
    statusBar: { width: 4 },
    deviceContent: { flex: 1, padding: 15 },
    deviceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      gap: 10,
    },
    deviceCodeContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 150,
    },
    deviceCode: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginLeft: 8,
      flex: 1,
    },
    onlineBadge: {
      backgroundColor: COLORS.SUCCESS,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginLeft: 8,
    },
    onlineText: { color: COLORS.WHITE, fontSize: 9, fontWeight: "800" },
    firmwareVersion: {
      fontSize: 11,
      color: COLORS.MUTED,
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.BORDER, 0.14) || COLORS.BORDER,
    },
    deviceInfo: { marginTop: 4 },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      flexWrap: "wrap",
    },
    infoLabel: {
      fontSize: 12,
      color: COLORS.MUTED,
      width: 80,
      fontWeight: "700",
    },
    infoValue: {
      fontSize: 12,
      color: COLORS.HEADER ?? COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
      fontWeight: "600",
    },

    // Empty
    emptyState: { alignItems: "center", padding: 50 },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 15,
      marginBottom: 8,
    },
    emptyText: { color: COLORS.MUTED, textAlign: "center", fontWeight: "500" },

    // ============ MODAL ============
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      width: "92%",
      maxHeight: "88%",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 16,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.BORDER,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    modalBody: { padding: 20 },
    modalSection: { marginBottom: 20 },
    modalSectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: COLORS.PRIMARY,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    formGroup: { marginBottom: 14 },
    formLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.MUTED,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    formInput: {
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    formInputFocused: {
      borderColor: COLORS.PRIMARY,
    },
    formHint: { fontSize: 11, color: COLORS.MUTED, marginTop: 4 },
    formRow: { flexDirection: "row", gap: 12 },
    formRowItem: { flex: 1 },

    // Selector
    selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    selectorItem: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    selectorItemActive: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.15) || COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    selectorText: { fontSize: 12, fontWeight: "600", color: COLORS.MUTED },
    selectorTextActive: { color: COLORS.PRIMARY },

    // Modal Footer
    modalFooter: {
      flexDirection: "row",
      gap: 12,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: COLORS.BORDER,
    },
    btnCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    btnCancelText: { fontSize: 15, fontWeight: "600", color: COLORS.MUTED },
    btnRegister: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
    },
    btnRegisterDisabled: { opacity: 0.5 },
    btnRegisterText: { fontSize: 15, fontWeight: "700", color: COLORS.WHITE },

    // Result card
    resultCard: {
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.1) || COLORS.SUCCESS,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.SUCCESS, 0.3) || COLORS.SUCCESS,
    },
    resultTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.SUCCESS,
      marginBottom: 12,
    },
    resultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    resultLabel: { fontSize: 12, color: COLORS.MUTED, fontWeight: "600" },
    resultValue: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
  });

const DevicesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const HW_VERSIONS = [
    { label: t("superadmin.devices.hwNew"), value: "v2.0" },
    { label: t("superadmin.devices.hwOld"), value: "v1.0" },
  ];

  const FW_VERSIONS = [
    { label: t("superadmin.devices.fwCurrent"), value: "v4.4.1" },
    { label: "v4.4.0", value: "v4.4.0" },
    { label: "v4.3.11", value: "v4.3.11" },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  // Register Modal
  const [registerVisible, setRegisterVisible] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState(null);
  const [form, setForm] = useState({
    device_code: "",
    mac_address: "",
    esp_chip_id: "",
    chip_model: "ESP32-S3-N16R8",
    hardware_version: "v2.0",
    firmware_version: "v4.4.1",
    owner_type: "platform",
    notes: "",
  });

  const STATUS_COLORS = useMemo(
    () => ({
      online: COLORS.SUCCESS,
      active: COLORS.INFO,
      pending: COLORS.WARNING,
      faulty: COLORS.ERROR,
      offline: COLORS.MUTED,
      default: COLORS.MUTED,
    }),
    [COLORS]
  );

  // ============ FETCH DEVICES ============
  const fetchDevices = async () => {
    try {
      if (!token) {
        Alert.alert(
          t("common.error"),
          t("superadmin.sessionExpiredLong")
        );
        setLoading(false);
        return;
      }

      const params = filter !== "all" ? `?status=${filter}` : "";
      const response = await fetch(
        `${API_URL}/api/superadmin/devices${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
        setStats(data.stats || {});
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          t("common.error"),
          errorData.error || t("superadmin.devices.loadFailed")
        );
      }
    } catch (error) {
      console.error("Fetch devices error:", error);
      Alert.alert(t("common.error"), t("superadmin.connectionError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices();
  }, [filter]);

  // ============ REGISTER DEVICE ============
  const handleRegister = async () => {
    // Validation
    if (!form.device_code.trim()) {
      return Alert.alert(t("common.error"), t("superadmin.devices.codeRequired"));
    }
    if (!form.mac_address || form.mac_address.length < 17) {
      return Alert.alert(t("common.error"), t("superadmin.devices.macInvalid"));
    }
    if (!form.esp_chip_id.trim()) {
      return Alert.alert(t("common.error"), t("superadmin.devices.chipRequired"));
    }

    setRegistering(true);
    try {
      const response = await fetch(
        `${API_URL}/api/superadmin/devices/register`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            device_code: form.device_code.trim(),
            mac_address: form.mac_address.toUpperCase(),
            esp_chip_id: form.esp_chip_id.trim().toUpperCase(),
            notes: form.notes.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setRegisterResult(data);
        fetchDevices(); // Refresh list
      } else {
        Alert.alert(
          t("superadmin.devices.registerError"),
          data.details || data.error || t("superadmin.devices.registerFailed")
        );
      }
    } catch (error) {
      console.error("Register device error:", error);
      Alert.alert(t("common.error"), t("superadmin.connectionError"));
    } finally {
      setRegistering(false);
    }
  };

  const resetRegisterForm = () => {
    setForm({
      device_code: "",
      mac_address: "",
      esp_chip_id: "",
      chip_model: "ESP32-S3-N16R8",
      hardware_version: "v2.0",
      firmware_version: "v4.4.1",
      owner_type: "platform",
      notes: "",
    });
    setRegisterResult(null);
    setRegisterVisible(false);
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ============ FILTERED DEVICES ============
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        device.device_code?.toLowerCase().includes(query) ||
        device.mac_address?.toLowerCase().includes(query) ||
        device.company_name?.toLowerCase().includes(query) ||
        device.vehicle_plate?.toLowerCase().includes(query)
      );
    });
  }, [devices, searchQuery]);

  const getStatusColor = (status, isOnline) => {
    if (isOnline) return STATUS_COLORS.online;
    if (status && STATUS_COLORS[status]) return STATUS_COLORS[status];
    return STATUS_COLORS.default;
  };

  const lastSeenText = (dateStr) => {
    if (!dateStr) return t("superadmin.devices.neverSeen");
    return getTimeAgo(dateStr);
  };

  // ============ STAT CARD ============
  const StatCard = ({ title, value, color, filterKey }) => (
    <TouchableOpacity
      style={[styles.statCard, filter === filterKey && styles.statCardActive]}
      onPress={() => setFilter(filterKey)}
      activeOpacity={0.85}
    >
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </TouchableOpacity>
  );

  // ============ DEVICE CARD ============
  const renderDeviceItem = ({ item }) => {
    const statusColor = getStatusColor(item.status, item.is_online);

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => navigation.navigate("DeviceDetail", { device: item })}
        activeOpacity={0.85}
      >
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
        <View style={styles.deviceContent}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceCodeContainer}>
              <Ionicons name="hardware-chip" size={20} color={statusColor} />
              <Text style={styles.deviceCode} numberOfLines={1}>
                {item.device_code}
              </Text>
              {item.is_online && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineText}>
                    {t("superadmin.devices.online")}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.firmwareVersion}>
              v{item.firmware_version || "?"}
            </Text>
          </View>

          <View style={styles.deviceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("superadmin.devices.mac")}
              </Text>
              <Text style={styles.infoValue}>{item.mac_address || "-"}</Text>
            </View>
            {item.company_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t("superadmin.devices.company")}
                </Text>
                <Text
                  style={[styles.infoValue, { color: COLORS.PRIMARY }]}
                  numberOfLines={1}
                >
                  {item.company_name}
                </Text>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={COLORS.WARNING}
                />
                <Text
                  style={[
                    styles.infoValue,
                    { color: COLORS.WARNING, marginLeft: 4 },
                  ]}
                >
                  {t("device.unassigned")}
                </Text>
              </View>
            )}
            {item.vehicle_plate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  {t("superadmin.devices.vehicle")}
                </Text>
                <Text style={[styles.infoValue, { color: COLORS.SUCCESS }]}>
                  {item.vehicle_plate}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("superadmin.devices.lastSeen")}
              </Text>
              <Text style={styles.infoValue}>
                {lastSeenText(item.last_seen_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ============ SELECTOR COMPONENT ============
  const Selector = ({ options, value, onChange }) => (
    <View style={styles.selectorRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.selectorItem,
            value === opt.value && styles.selectorItemActive,
          ]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.selectorText,
              value === opt.value && styles.selectorTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ============ LOADING ============
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("superadmin.devices.loading")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <StatCard
          title={t("superadmin.devices.total")}
          value={stats.total || 0}
          color={COLORS.PRIMARY}
          filterKey="all"
        />
        <StatCard
          title={t("device.online")}
          value={stats.online_now || 0}
          color={COLORS.SUCCESS}
          filterKey="active"
        />
        <StatCard
          title={t("superadmin.devices.pending")}
          value={stats.pending || 0}
          color={COLORS.WARNING}
          filterKey="pending"
        />
        <StatCard
          title={t("superadmin.device.statusFaulty")}
          value={stats.faulty || 0}
          color={COLORS.ERROR}
          filterKey="faulty"
        />
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("superadmin.devices.searchPlaceholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.MUTED}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtre */}
      <View style={styles.filterContainer}>
        {[
          { key: "all", label: t("common.all") },
          { key: "active", label: t("superadmin.device.statusActive") },
          { key: "pending", label: t("superadmin.devices.pending") },
          { key: "offline", label: t("superadmin.devices.offline") },
          { key: "faulty", label: t("superadmin.device.statusFaulty") },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              filter === f.key && styles.filterButtonActive,
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Özet + Kayıt Butonu */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {t("superadmin.devices.listCount", {
            count: filteredDevices.length,
          })}
        </Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setRegisterVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color={COLORS.WHITE} />
          <Text style={styles.fabText}>
            {t("superadmin.devices.newDevice")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cihaz Listesi */}
      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDeviceItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="hardware-chip-outline"
              size={64}
              color={withAlpha(COLORS.MUTED, 0.35) || COLORS.MUTED}
            />
            <Text style={styles.emptyTitle}>
              {t("superadmin.devices.empty")}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? t("superadmin.devices.emptySearch")
                : filter !== "all"
                  ? t("superadmin.devices.emptyFilter", { filter })
                  : t("superadmin.devices.emptyNone")}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* ============ REGISTER MODAL ============ */}
      <Modal
        visible={registerVisible}
        transparent
        animationType="fade"
        onRequestClose={resetRegisterForm}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalContainer}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {registerResult
                  ? `✅ ${t("superadmin.devices.registerSuccessTitle")}`
                  : `📟 ${t("superadmin.devices.registerModalTitle")}`}
              </Text>
              <TouchableOpacity
                onPress={resetRegisterForm}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={24} color={COLORS.MUTED} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {registerResult ? (
                /* ===== RESULT VIEW ===== */
                <View>
                  <View style={styles.resultCard}>
                    <Text style={styles.resultTitle}>
                      {t("superadmin.devices.registered")}
                    </Text>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.deviceCode")}
                      </Text>
                      <Text style={styles.resultValue}>
                        {registerResult.device?.device_code}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.serial")}
                      </Text>
                      <Text style={styles.resultValue}>
                        {registerResult.device?.serial}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.mac")}
                      </Text>
                      <Text style={styles.resultValue}>
                        {registerResult.device?.mac_address}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.chipId")}
                      </Text>
                      <Text style={styles.resultValue}>
                        {registerResult.device?.esp_chip_id}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.deviceToken")}
                      </Text>
                      <Text
                        style={[styles.resultValue, { fontSize: 10 }]}
                        selectable
                      >
                        {registerResult.device_token}
                      </Text>
                    </View>
                    <View style={styles.resultRow}>
                      <Text style={styles.resultLabel}>
                        {t("superadmin.devices.qrToken")}
                      </Text>
                      <Text
                        style={[styles.resultValue, { fontSize: 10 }]}
                        selectable
                      >
                        {registerResult.qr_token}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.formHint,
                      { textAlign: "center", marginBottom: 20 },
                    ]}
                  >
                    {t("superadmin.devices.tokenHint")}
                    {"\n"}
                    {t("superadmin.devices.provisionHint")}
                  </Text>
                </View>
              ) : (
                /* ===== FORM VIEW ===== */
                <View>
                  {/* Cihaz Kimlik */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      {t("superadmin.devices.identity")}
                    </Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.deviceCode")}
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="FLEET-009"
                        value={form.device_code}
                        onChangeText={(text) => updateForm("device_code", text)}
                        placeholderTextColor={COLORS.MUTED}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.formHint}>
                        {t("superadmin.devices.shortCodeHint")}
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.macAddress")}
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        value={form.mac_address}
                        onChangeText={(text) =>
                          updateForm("mac_address", formatMacAddress(text))
                        }
                        placeholderTextColor={COLORS.MUTED}
                        maxLength={17}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.formHint}>
                        {t("superadmin.devices.serialMonitor")}
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.espChipId")}
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="83E8B0AF6E8"
                        value={form.esp_chip_id}
                        onChangeText={(text) =>
                          updateForm("esp_chip_id", text.toUpperCase())
                        }
                        placeholderTextColor={COLORS.MUTED}
                        autoCapitalize="characters"
                      />
                      <Text style={styles.formHint}>
                        {t("superadmin.devices.serialMonitor")}
                      </Text>
                    </View>
                  </View>

                  {/* Donanım */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      {t("superadmin.devices.hardware")}
                    </Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.chipModel")}
                      </Text>
                      <Selector
                        options={CHIP_MODELS}
                        value={form.chip_model}
                        onChange={(v) => updateForm("chip_model", v)}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.hardwareVersion")}
                      </Text>
                      <Selector
                        options={HW_VERSIONS}
                        value={form.hardware_version}
                        onChange={(v) => updateForm("hardware_version", v)}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.firmware")}
                      </Text>
                      <Selector
                        options={FW_VERSIONS}
                        value={form.firmware_version}
                        onChange={(v) => updateForm("firmware_version", v)}
                      />
                    </View>
                  </View>

                  {/* Notlar */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      {t("superadmin.devices.extra")}
                    </Text>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>
                        {t("superadmin.devices.notes")}
                      </Text>
                      <TextInput
                        style={[
                          styles.formInput,
                          { minHeight: 60, textAlignVertical: "top" },
                        ]}
                        placeholder={t("superadmin.devices.notesPlaceholder")}
                        value={form.notes}
                        onChangeText={(text) => updateForm("notes", text)}
                        placeholderTextColor={COLORS.MUTED}
                        multiline
                      />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={resetRegisterForm}
                activeOpacity={0.85}
              >
                <Text style={styles.btnCancelText}>
                  {registerResult ? t("common.close") : t("common.cancel")}
                </Text>
              </TouchableOpacity>

              {!registerResult && (
                <TouchableOpacity
                  style={[
                    styles.btnRegister,
                    registering && styles.btnRegisterDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={registering}
                  activeOpacity={0.85}
                >
                  {registering ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={COLORS.WHITE}
                    />
                  )}
                  <Text style={styles.btnRegisterText}>
                    {registering
                      ? t("superadmin.devices.saving")
                      : t("superadmin.devices.saveDevice")}
                  </Text>
                </TouchableOpacity>
              )}

              {registerResult && (
                <TouchableOpacity
                  style={styles.btnRegister}
                  onPress={() => {
                    setRegisterResult(null);
                    setForm({
                      device_code: "",
                      mac_address: "",
                      esp_chip_id: "",
                      chip_model: "ESP32-S3-N16R8",
                      hardware_version: "v2.0",
                      firmware_version: "v4.4.1",
                      owner_type: "platform",
                      notes: "",
                    });
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={20} color={COLORS.WHITE} />
                  <Text style={styles.btnRegisterText}>
                    {t("superadmin.devices.addAnother")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

export default DevicesScreen;
