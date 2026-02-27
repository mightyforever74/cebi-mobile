// src/screens/admin/AdminAlerts.js
// TulipFleet - Admin Uyarılar Ekranı (Dark Mode uyumlu - Migration Rehberi ile)
// v1.1.x - Rehbere uygun regen: useThemedStyles + useTheme + hardcoded hex temizliği

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { alertAPI } from "../../services/api";

// --- helper: #RRGGBB => #RRGGBBAA (soft background için) ---
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
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.md,
    },

    statsHeader: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    headerStatBox: {
      flex: 1,
      alignItems: "center",
    },
    headerStatValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    headerStatLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    deleteAllButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.ERROR,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginLeft: COLORS.SPACING.sm,
    },
    deleteAllText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // List
    listContainer: {
      padding: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.lg,
    },

    // Card
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardActive: {
      borderLeftWidth: COLORS.SPACING.xs,
      borderLeftColor: COLORS.ERROR,
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: COLORS.SPACING.md,
    },

    // Icon
    iconContainer: {
      width: COLORS.SPACING.xxxl,
      height: COLORS.SPACING.xxxl,
      borderRadius: COLORS.RADIUS.xxl,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
    },

    // Alert Info
    alertInfo: {
      flex: 1,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    alertType: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    alertMessage: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.xs,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    metaText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },

    // Action Buttons
    actionButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.xs,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.sm,
    },
    actionButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
    },
    resolveBtn: {
      backgroundColor: COLORS.SUCCESS,
    },
    deleteBtn: {
      backgroundColor: COLORS.ERROR,
    },
    resolvedBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.12),
      borderRadius: COLORS.RADIUS.sm,
    },
    resolvedText: {
      color: COLORS.SUCCESS,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
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
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.md,
    },
    emptySubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
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
      paddingHorizontal: COLORS.SPACING.xl,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Loading
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
  });

const AdminAlerts = () => {
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Uyarı tipi renkleri ve ikonları (COLORS'a bağlı olduğundan memo ile içeride)
  const ALERT_CONFIG = useMemo(
    () => ({
      HARD_BRAKE: { color: COLORS.ERROR, icon: "warning", label: "Ani Fren" },
      HARD_ACCEL: {
        color: COLORS.WARNING,
        icon: "trending-up",
        label: "Sert Hızlanma",
      },
      HARD_TURN: {
        color: COLORS.WARNING,
        icon: "return-down-forward",
        label: "Sert Viraj",
      },
      SHARP_TURN: {
        color: COLORS.WARNING,
        icon: "return-down-forward",
        label: "Keskin Viraj",
      },
      IMPACT: {
        color: COLORS.ERROR,
        icon: "alert-circle",
        label: "Çarpma/Kaza",
      },
      OVERSPEED: {
        color: COLORS.ERROR,
        icon: "speedometer",
        label: "Hız Aşımı",
      },
      speed: { color: COLORS.ERROR, icon: "speedometer", label: "Hız İhlali" },
      geofence: {
        color: COLORS.WARNING,
        icon: "location",
        label: "Bölge İhlali",
      },
      fuel: { color: COLORS.INFO, icon: "water", label: "Yakıt Uyarısı" },
      maintenance: {
        color: COLORS.WARNING,
        icon: "construct",
        label: "Bakım Uyarısı",
      },
      battery: {
        color: COLORS.ERROR,
        icon: "battery-dead",
        label: "Akü Uyarısı",
      },
      idle: { color: COLORS.INFO, icon: "time", label: "Rölanti" },
      sos: { color: COLORS.ERROR, icon: "alert-circle", label: "SOS" },
      default: {
        color: COLORS.SECONDARY,
        icon: "notifications",
        label: "Uyarı",
      },
    }),
    [COLORS]
  );

  // API'den uyarıları çek
  const fetchAlerts = async () => {
    try {
      setError(null);
      const data = await alertAPI.getAll();
      const alertList = data.alerts || data || [];
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch (err) {
      setError(err.message || "Uyarılar yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, []);

  // Tarih formatla
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Uyarıyı çözümle
  const handleResolveAlert = (item) => {
    if (item.is_resolved) {
      Alert.alert("Bilgi", "Bu uyarı zaten çözümlenmiş");
      return;
    }

    Alert.alert(
      "✅ Uyarıyı Çözümle",
      "Bu uyarıyı çözümlenmiş olarak işaretlemek istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çözümle",
          onPress: async () => {
            try {
              await alertAPI.resolve(item.id);
              Alert.alert("✅ Başarılı", "Uyarı çözümlendi");
              fetchAlerts();
            } catch (e) {
              Alert.alert(
                "Hata",
                e.response?.data?.error || "Uyarı çözümlenemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Uyarıyı sil
  const handleDeleteAlert = (item) => {
    Alert.alert(
      "🗑️ Uyarıyı Sil",
      "Bu uyarıyı silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await alertAPI.delete(item.id);
              Alert.alert("✅ Başarılı", "Uyarı silindi");
              fetchAlerts();
            } catch (e) {
              Alert.alert(
                "Hata",
                e.response?.data?.error || "Uyarı silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Tümünü sil
  const handleDeleteAll = () => {
    if (alerts.length === 0) {
      Alert.alert("Bilgi", "Silinecek uyarı yok");
      return;
    }

    Alert.alert(
      "🗑️ Tüm Uyarıları Sil",
      `${alerts.length} uyarının tamamını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tümünü Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await alertAPI.deleteAll();
              Alert.alert("✅ Başarılı", "Tüm uyarılar silindi");
              fetchAlerts();
            } catch (e) {
              Alert.alert(
                "Hata",
                e.response?.data?.error || "Uyarılar silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  const renderAlertCard = ({ item }) => {
    const alertType = item.alert_type || item.type || "default";
    const config = ALERT_CONFIG[alertType] || ALERT_CONFIG.default;
    const isResolved = !!item.is_resolved;

    return (
      <View style={[styles.card, !isResolved && styles.cardActive]}>
        <View style={styles.cardContent}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: withAlpha(config.color, 0.12) },
            ]}
          >
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>

          {/* Info */}
          <View style={styles.alertInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.alertType} numberOfLines={1}>
                {config.label}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isResolved ? COLORS.SUCCESS : COLORS.ERROR,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {isResolved ? "Çözüldü" : "Aktif"}
                </Text>
              </View>
            </View>

            {item.description ? (
              <Text style={styles.alertMessage} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.metaRow}>
              {item.vehicle_plate || item.device_id ? (
                <View style={styles.metaItem}>
                  <Ionicons name="car" size={12} color={COLORS.SECONDARY} />
                  <Text style={styles.metaText}>
                    {item.vehicle_plate || item.device_id}
                  </Text>
                </View>
              ) : null}

              {item.driver_name ? (
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={12} color={COLORS.SECONDARY} />
                  <Text style={styles.metaText}>{item.driver_name}</Text>
                </View>
              ) : null}

              <View style={styles.metaItem}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={COLORS.SECONDARY}
                />
                <Text style={styles.metaText}>
                  {formatDate(item.created_at)}
                </Text>
              </View>

              {item.speed ? (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="speedometer-outline"
                    size={12}
                    color={COLORS.SECONDARY}
                  />
                  <Text style={styles.metaText}>
                    {Math.round(item.speed)} km/h
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          {!isResolved ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveBtn]}
              onPress={() => handleResolveAlert(item)}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.WHITE}
              />
              <Text style={styles.actionButtonText}>Çözümle</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.SUCCESS}
              />
              <Text style={styles.resolvedText}>Çözüldü</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteBtn]}
            onPress={() => handleDeleteAlert(item)}
          >
            <Ionicons name="trash" size={16} color={COLORS.WHITE} />
            <Text style={styles.actionButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Hata
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="cloud-offline" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>Bağlantı Hatası</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAlerts}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Uyarılar yükleniyor...</Text>
      </View>
    );
  }

  const activeCount = alerts.filter((a) => !a.is_resolved).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle" size={64} color={COLORS.SUCCESS} />
      <Text style={styles.emptyTitle}>Harika! 🎉</Text>
      <Text style={styles.emptySubtitle}>Şu anda hiç uyarı yok</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.headerStatBox}>
          <Text style={styles.headerStatValue}>{alerts.length}</Text>
          <Text style={styles.headerStatLabel}>Toplam</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.ERROR }]}>
            {activeCount}
          </Text>
          <Text style={styles.headerStatLabel}>Aktif</Text>
        </View>

        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.SUCCESS }]}>
            {resolvedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Çözüldü</Text>
        </View>

        {/* Tümünü Sil */}
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={handleDeleteAll}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.WHITE} />
          <Text style={styles.deleteAllText}>Tümünü Sil</Text>
        </TouchableOpacity>
      </View>

      {/* Alerts list */}
      <FlatList
        data={alerts}
        renderItem={renderAlertCard}
        keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
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
    </View>
  );
};

export default AdminAlerts;
