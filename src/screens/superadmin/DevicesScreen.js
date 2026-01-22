// src/screens/superadmin/DevicesScreen.js
// TulipFleet - ESP32 Cihaz Yönetimi
// Updated: 26 Aralık 2025 - Token from AuthContext
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği (Rehbere uygun)

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// --- helper: #RRGGBB => #RRGGBBAA (rgba/hardcode olmadan) ---
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: 10,
      color: COLORS.MUTED,
      fontWeight: "500",
    },

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
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    statCardActive: {
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
    },
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
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
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
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
      elevation: 1,
    },
    filterButtonActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    filterText: {
      fontSize: 12,
      color: COLORS.MUTED,
      fontWeight: "600",
    },
    filterTextActive: {
      color: COLORS.WHITE,
    },

    // Summary
    summaryBar: {
      paddingHorizontal: 15,
      paddingBottom: 10,
    },
    summaryText: {
      color: COLORS.MUTED,
      fontSize: 13,
      fontWeight: "600",
    },

    // Device Card
    listContainer: {
      paddingHorizontal: 15,
      paddingBottom: 20,
    },
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
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    statusBar: {
      width: 4,
    },
    deviceContent: {
      flex: 1,
      padding: 15,
    },
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
    onlineText: {
      color: COLORS.WHITE,
      fontSize: 9,
      fontWeight: "800",
    },
    firmwareVersion: {
      fontSize: 11,
      color: COLORS.MUTED,
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.14) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    deviceInfo: {
      marginTop: 4,
    },
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
    emptyState: {
      alignItems: "center",
      padding: 50,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 15,
      marginBottom: 8,
    },
    emptyText: {
      color: COLORS.MUTED,
      textAlign: "center",
      fontWeight: "500",
    },
  });

const DevicesScreen = ({ navigation }) => {
  const { token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

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

  const fetchDevices = async () => {
    try {
      console.log("🔑 Token exists:", !!token);

      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      const params = filter !== "all" ? `?status=${filter}` : "";
      console.log("📡 Fetching:", `${API_URL}/api/superadmin/devices${params}`);

      const response = await fetch(
        `${API_URL}/api/superadmin/devices${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📦 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Devices loaded:", data.devices?.length || 0);
        setDevices(data.devices || []);
        setStats(data.stats || {});
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, errorData);
        Alert.alert("Hata", errorData.error || "Cihazlar yüklenemedi");
      }
    } catch (error) {
      console.error("❌ Fetch devices error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Filtrelenmiş cihazlar
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

  // Durum rengi (token tabanlı)
  const getStatusColor = (status, isOnline) => {
    if (isOnline) return STATUS_COLORS.online;
    if (status && STATUS_COLORS[status]) return STATUS_COLORS[status];
    return STATUS_COLORS.default;
  };

  // Zaman farkı
  const getTimeDifference = (dateStr) => {
    if (!dateStr) return "Hiç görülmedi";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  // İstatistik kartı
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

  // Cihaz kartı
  const renderDeviceItem = ({ item }) => {
    const statusColor = getStatusColor(item.status, item.is_online);

    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => navigation.navigate("DeviceDetail", { device: item })}
        activeOpacity={0.85}
      >
        {/* Sol renk çubuğu */}
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

        <View style={styles.deviceContent}>
          {/* Header */}
          <View style={styles.deviceHeader}>
            <View style={styles.deviceCodeContainer}>
              <Ionicons name="hardware-chip" size={20} color={statusColor} />
              <Text style={styles.deviceCode} numberOfLines={1}>
                {item.device_code}
              </Text>

              {item.is_online && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineText}>ONLINE</Text>
                </View>
              )}
            </View>

            <Text style={styles.firmwareVersion}>
              v{item.firmware_version || "?"}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.deviceInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MAC:</Text>
              <Text style={styles.infoValue}>{item.mac_address || "-"}</Text>
            </View>

            {item.company_name ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Şirket:</Text>
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
                  Atanmamış
                </Text>
              </View>
            )}

            {item.vehicle_plate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Araç:</Text>
                <Text style={[styles.infoValue, { color: COLORS.SUCCESS }]}>
                  {item.vehicle_plate}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Son görülme:</Text>
              <Text style={styles.infoValue}>
                {getTimeDifference(item.last_seen_at)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Cihazlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Toplam"
          value={stats.total || 0}
          color={COLORS.PRIMARY}
          filterKey="all"
        />
        <StatCard
          title="Online"
          value={stats.online_now || 0}
          color={COLORS.SUCCESS}
          filterKey="active"
        />
        <StatCard
          title="Bekleyen"
          value={stats.pending || 0}
          color={COLORS.WARNING}
          filterKey="pending"
        />
        <StatCard
          title="Arızalı"
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
          placeholder="Cihaz kodu, MAC, şirket ara..."
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

      {/* Filtre butonları */}
      <View style={styles.filterContainer}>
        {[
          { key: "all", label: "Tümü" },
          { key: "active", label: "Aktif" },
          { key: "pending", label: "Bekleyen" },
          { key: "offline", label: "Offline" },
          { key: "faulty", label: "Arızalı" },
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

      {/* Özet */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filteredDevices.length} cihaz {filter !== "all" && `(${filter})`}
        </Text>
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
            <Text style={styles.emptyTitle}>Cihaz Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Arama kriterlerine uygun cihaz yok"
                : filter !== "all"
                  ? `${filter} durumunda cihaz yok`
                  : "ESP32 cihazlar otomatik olarak kaydedilir"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default DevicesScreen;
