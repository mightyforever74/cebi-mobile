// src/screens/admin/AdminVehicles.js
// TulipFleet - Admin Araç Listesi Ekranı
// Updated: 22 Şubat 2026 - UI Guide v3 full compliance

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { vehicleAPI } from "../../services/api";

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

// Araç durumu Türkçe karşılıkları
const STATUS_LABELS = {
  active: "Aktif",
  available: "Müsait",
  inactive: "Pasif",
  maintenance: "Bakımda",
  offline: "Çevrimdışı",
};

// ============================================
// makeStyles - UI Guide v3 compliant
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.lg,
    },

    // Stats Header
    statsHeader: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },

    // List
    listContainer: {
      padding: COLORS.SPACING.sm,
      paddingBottom: 80,
    },

    // Card
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    plateContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    plateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginLeft: COLORS.SPACING.sm,
      minWidth: 140,
    },
    plateText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.PRIMARY,
      marginRight: COLORS.SPACING.sm,
    },
    editButton: {
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      marginRight: COLORS.SPACING.xs,
    },
    deleteButton: {
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: withAlpha(COLORS.ERROR, 0.12),
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.md,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    cardBody: {
      padding: COLORS.SPACING.md,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    infoText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      marginLeft: COLORS.SPACING.sm,
    },

    cardFooter: {
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
    },
    metric: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    metricValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    metricLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    metricDivider: {
      width: 1,
      backgroundColor: COLORS.MUTED,
      marginHorizontal: COLORS.SPACING.sm,
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xxxl,
    },
    emptyTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
    },
    emptySubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.lg,
    },

    // Error State
    errorTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.md,
    },
    errorText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
    },
    retryButton: {
      marginTop: COLORS.SPACING.lg,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },

    // Loading
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },

    // FAB
    fab: {
      position: "absolute",
      right: COLORS.SPACING.lg,
      bottom: COLORS.SPACING.lg,
      width: 56,
      height: 56,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
  });

// ============================================
// COMPONENT
// ============================================
const AdminVehicles = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Araç durumu renkleri (tema token'larından)
  const STATUS_COLORS = useMemo(
    () => ({
      active: COLORS.SUCCESS,
      available: COLORS.SUCCESS,
      in_use: COLORS.INFO,
      inactive: COLORS.MUTED,
      maintenance: COLORS.WARNING,
      offline: COLORS.ERROR,
    }),
    [COLORS]
  );

  // API'den araçları çek
  const fetchVehicles = async () => {
    try {
      setError(null);
      console.log("🚗 Fetching vehicles...");

      const data = await vehicleAPI.getList();
      console.log("✅ Vehicles loaded:", data);

      const vehicleList = data.vehicles || data || [];
      setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
    } catch (err) {
      console.error("❌ Fetch vehicles error:", err);
      setError(err.message || "Araçlar yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useFocusEffect(
    React.useCallback(() => {
      fetchVehicles();
    }, [])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicles();
  }, []);

  const handleAddVehicle = () => {
    navigation.navigate("CreateVehicle");
  };

  // Silme işlemi
  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      "🗑️ Aracı Sil",
      `"${vehicle.plate_no}" plakalı aracı silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await vehicleAPI.delete(vehicle.id);
              Alert.alert("✅ Başarılı", "Araç silindi");
              fetchVehicles();
            } catch (e) {
              Alert.alert(
                "Hata",
                e?.response?.data?.error || "Araç silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Araç kartı
  const renderVehicleCard = ({ item: vehicle }) => {
    const status = vehicle.status || "inactive";
    const statusColor = STATUS_COLORS[status] || COLORS.MUTED;
    const statusLabel = STATUS_LABELS[status] || status;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "🚗 " + vehicle.plate_no,
            `Marka: ${vehicle.brand || "-"}\nModel: ${vehicle.model || "-"}\nYıl: ${
              vehicle.year || "-"
            }\nDurum: ${statusLabel}`,
            [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
        {/* Üst Kısım - Plaka ve Durum */}
        <View style={styles.cardHeader}>
          <View style={styles.plateContainer}>
            <Ionicons name="car" size={24} color={COLORS.PRIMARY} />

            <View style={styles.plateRow}>
              <Text style={styles.plateText}>{vehicle.plate_no}</Text>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditVehicle", { vehicle })}
              >
                <Ionicons name="pencil" size={18} color={COLORS.PRIMARY} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVehicle(vehicle)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {/* Orta Kısım - Araç Bilgileri */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="construct" size={16} color={COLORS.MUTED} />
            <Text style={styles.infoText}>
              {vehicle.brand || "Marka"} {vehicle.model || "Model"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color={COLORS.MUTED} />
            <Text style={styles.infoText}>{vehicle.year || "-"}</Text>
          </View>

          {vehicle.esp32_device_id && (
            <View style={styles.infoRow}>
              <Ionicons name="hardware-chip" size={16} color={COLORS.SUCCESS} />
              <Text style={styles.infoText}>
                ESP32: {vehicle.esp32_device_id.substring(0, 12)}...
              </Text>
            </View>
          )}
        </View>

        {/* Alt Kısım - Metrikler */}
        <View style={styles.cardFooter}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {vehicle.total_km?.toLocaleString() ||
                vehicle.current_km?.toLocaleString() ||
                "0"}
            </Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            <Text style={styles.metricValue}>{vehicle.fuel_level || "0"}%</Text>
            <Text style={styles.metricLabel}>Yakıt</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metric}>
            {(() => {
              const now = Date.now();
              const lastTime = vehicle.last_location_time
                ? new Date(vehicle.last_location_time).getTime()
                : 0;
              const isOnline = now - lastTime < 5 * 60 * 1000;
              return (
                <Ionicons
                  name={isOnline ? "wifi" : "wifi-outline"}
                  size={20}
                  color={isOnline ? COLORS.SUCCESS : COLORS.MUTED}
                />
              );
            })()}
            <Text style={styles.metricLabel}>ESP32</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={COLORS.MUTED} />
      <Text style={styles.emptyTitle}>Araç Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz kayıtlı araç yok veya yetkiniz dahilinde araç bulunmuyor.
      </Text>
    </View>
  );

  // Hata durumu
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>Hata Oluştu</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchVehicles}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Araçlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{vehicles.length}</Text>
          <Text style={styles.statLabel}>Toplam Araç</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>
            {
              vehicles.filter(
                (v) => v.status === "active" || v.status === "available"
              ).length
            }
          </Text>
          <Text style={styles.statLabel}>Aktif</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: COLORS.WARNING }]}>
            {vehicles.filter((v) => v.status === "maintenance").length}
          </Text>
          <Text style={styles.statLabel}>Bakımda</Text>
        </View>
      </View>

      {/* Araç Listesi */}
      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item.id?.toString() || item.plate_no}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Yeni Araç Ekle */}
      <TouchableOpacity style={styles.fab} onPress={handleAddVehicle}>
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminVehicles;
