// src/screens/admin/AdminDrivers.js
// TulipFleet - Admin Sürücü Listesi Ekranı
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
import { driverAPI } from "../../services/api";

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

// Durum label'ları
const STATUS_LABELS = {
  active: "Aktif",
  available: "Müsait",
  on_duty: "Görevde",
  off_duty: "İzinli",
  inactive: "Pasif",
  suspended: "Askıda",
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

    // Header Stats
    statsHeader: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    headerStatBox: {
      flex: 1,
      alignItems: "center",
    },
    headerStatValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    headerStatLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
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
    cardContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.md,
    },

    // Avatar
    avatar: {
      width: 50,
      height: 50,
      borderRadius: COLORS.RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    avatarText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // Driver Info
    driverInfo: {
      flex: 1,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.xs,
    },
    driverName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
      marginRight: COLORS.SPACING.sm,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 3,
      borderRadius: COLORS.RADIUS.md,
      marginLeft: COLORS.SPACING.sm,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    detailText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
    },
    editButton: {
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: withAlpha(COLORS.INFO, 0.12),
    },
    deleteButton: {
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: withAlpha(COLORS.ERROR, 0.12),
    },

    // Stats Row
    statsRow: {
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
    },
    statItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    statValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginLeft: COLORS.SPACING.xs,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
    },
    statDivider: {
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
      marginTop: COLORS.SPACING.sm,
    },
    emptySubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
      textAlign: "center",
      paddingHorizontal: COLORS.SPACING.lg,
    },

    // Loading / Error
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.TEXT_SECONDARY,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    errorTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.sm,
    },
    errorText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
      textAlign: "center",
      paddingHorizontal: COLORS.SPACING.lg,
    },
    retryButton: {
      marginTop: COLORS.SPACING.sm,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },

    // FAB
    fab: {
      position: "absolute",
      right: COLORS.SPACING.md,
      bottom: COLORS.SPACING.md,
      width: 50,
      height: 50,
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
const AdminDrivers = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Sürücü durumu renkleri (tema token'larından)
  const STATUS_COLORS = useMemo(
    () => ({
      active: COLORS.SUCCESS,
      available: COLORS.SUCCESS,
      on_duty: COLORS.INFO,
      off_duty: COLORS.TEXT_SECONDARY,
      inactive: COLORS.MUTED,
      suspended: COLORS.ERROR,
    }),
    [COLORS]
  );

  // API'den sürücüleri çek
  const fetchDrivers = async () => {
    try {
      setError(null);
      console.log("👥 Fetching drivers...");

      const data = await driverAPI.getList();
      console.log("✅ Drivers loaded:", data);

      const driverList = data.drivers || data || [];
      setDrivers(Array.isArray(driverList) ? driverList : []);
    } catch (err) {
      console.error("❌ Fetch drivers error:", err);
      setError(err.message || "Sürücüler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useFocusEffect(
    React.useCallback(() => {
      fetchDrivers();
    }, [])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrivers();
  }, []);

  // Avatar rengi (token tabanlı, theme-safe)
  const getAvatarColor = (name) => {
    const palette = [
      COLORS.PRIMARY,
      COLORS.SUCCESS,
      COLORS.WARNING,
      COLORS.INFO,
      COLORS.ERROR,
      COLORS.LABEL ?? COLORS.GRADIENT_END ?? COLORS.PRIMARY,
    ];
    const index = (name?.charCodeAt(0) || 0) % palette.length;
    return palette[index];
  };

  const handleAddDriver = () => {
    navigation.navigate("CreateDriver");
  };

  // Silme işlemi
  const handleDeleteDriver = (driver) => {
    const driverName = driver.first_name
      ? `${driver.first_name} ${driver.last_name || ""}`.trim()
      : driver.email?.split("@")[0];

    Alert.alert(
      "🗑️ Sürücüyü Sil",
      `"${driverName}" sürücüsünü silmek istediğinize emin misiniz?\n\nDikkat: Kullanıcı hesabı da silinecek!`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await driverAPI.delete(driver.id);
              Alert.alert("✅ Başarılı", "Sürücü silindi");
              fetchDrivers();
            } catch (e) {
              Alert.alert(
                "Hata",
                e?.response?.data?.error || "Sürücü silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Sürücü kartı
  const renderDriverCard = ({ item }) => {
    const status = item.status || "inactive";
    const statusColor = STATUS_COLORS[status] || COLORS.TEXT_SECONDARY;
    const statusLabel = STATUS_LABELS[status] || status;

    const displayName =
      item.first_name && item.last_name
        ? `${item.first_name} ${item.last_name}`
        : item.first_name || item.email?.split("@")[0] || "İsimsiz Sürücü";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            `👤 ${displayName}`,
            `Email: ${item.email || "-"}\nTelefon: ${item.phone || "-"}\nEhliyet: ${
              item.license_number || "-"
            }\nDurum: ${statusLabel}`,
            [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: getAvatarColor(item.first_name || item.email),
              },
            ]}
          >
            <Text style={styles.avatarText}>
              {`${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`.toUpperCase() ||
                "?"}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.driverInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.driverName} numberOfLines={1}>
                {displayName}
              </Text>
              <View
                style={[styles.statusBadge, { backgroundColor: statusColor }]}
              >
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.detailRow}>
              <Ionicons
                name="mail-outline"
                size={14}
                color={COLORS.TEXT_SECONDARY}
              />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.email || "-"}
              </Text>
            </View>

            {/* Phone */}
            {item.phone && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={COLORS.TEXT_SECONDARY}
                />
                <Text style={styles.detailText}>{item.phone}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                navigation.navigate("EditDriver", { driver: item })
              }
            >
              <Ionicons name="create-outline" size={18} color={COLORS.INFO} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { marginTop: COLORS.SPACING.xs }]}
              onPress={() => handleDeleteDriver(item)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="car" size={14} color={COLORS.INFO} />
            <Text style={styles.statValue}>
              {item.assigned_vehicle_plate || "-"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="navigate" size={14} color={COLORS.SUCCESS} />
            <Text style={styles.statValue}>{item.completed_tasks ?? 0}</Text>
            <Text style={styles.statLabel}>görev</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={COLORS.WARNING} />
            <Text style={styles.statValue}>{item.safety_score ?? "-"}</Text>
            <Text style={styles.statLabel}>puan</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={COLORS.MUTED} />
      <Text style={styles.emptyTitle}>Sürücü Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz kayıtlı sürücü yok veya yetkiniz dahilinde sürücü bulunmuyor.
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
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
        <Text style={styles.loadingText}>Sürücüler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.headerStatBox}>
          <Text style={styles.headerStatValue}>{drivers.length}</Text>
          <Text style={styles.headerStatLabel}>Toplam Sürücü</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.SUCCESS }]}>
            {
              drivers.filter(
                (d) =>
                  d.status === "active" ||
                  d.status === "available" ||
                  d.status === "on_duty"
              ).length
            }
          </Text>
          <Text style={styles.headerStatLabel}>Aktif</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.INFO }]}>
            {drivers.filter((d) => d.status === "on_duty").length}
          </Text>
          <Text style={styles.headerStatLabel}>Görevde</Text>
        </View>
      </View>

      {/* Sürücü Listesi */}
      <FlatList
        data={drivers}
        renderItem={renderDriverCard}
        keyExtractor={(item) => item.id?.toString() || item.email}
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

      {/* FAB - Yeni Sürücü Ekle */}
      <TouchableOpacity style={styles.fab} onPress={handleAddDriver}>
        <Ionicons name="person-add" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminDrivers;
