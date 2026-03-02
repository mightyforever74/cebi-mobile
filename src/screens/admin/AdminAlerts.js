/**
 * AdminAlerts.js - v2.0
 * TulipFleet - Admin Alerts
 * i18n, filter tabs, categorized types, relative time
 * Created: 01 Mart 2026
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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

const withAlpha = (hex, a) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  return `${hex}${Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()}`;
};

const FILTER_TABS = [
  { key: "all", i18nKey: "adminAlerts.filterAll" },
  { key: "active", i18nKey: "adminAlerts.filterActive" },
  { key: "resolved", i18nKey: "adminAlerts.filterResolved" },
];

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: COLORS.SPACING.lg,
    },
    statsHeader: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xs,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    statBox: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
    },
    statBoxActive: { borderBottomWidth: 3, borderBottomColor: COLORS.PRIMARY },
    statValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    statLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    statLabelActive: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    deleteAllBtn: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      backgroundColor: COLORS.ERROR,
      borderRadius: COLORS.RADIUS.md,
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.xs,
    },
    deleteAllText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },
    listContainer: { padding: COLORS.SPACING.sm, paddingBottom: 40 },
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardActive: { borderLeftWidth: 3, borderLeftColor: COLORS.ERROR },
    cardResolved: {
      borderLeftWidth: 3,
      borderLeftColor: COLORS.SUCCESS,
      opacity: 0.75,
    },
    cardContent: { flexDirection: "row", padding: COLORS.SPACING.sm },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
    },
    alertInfo: { flex: 1, marginLeft: COLORS.SPACING.sm },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    alertType: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.sm,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    alertMessage: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: COLORS.SPACING.xs,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xs,
    },
    metaText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginLeft: 4,
    },
    actionRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    actionBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    actionDivider: { width: 1, backgroundColor: COLORS.DIVIDER },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.xxxl,
    },
    emptyTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
    },
    emptySubtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
    },
    loadingText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.md,
    },
    errorTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.ERROR,
      marginTop: COLORS.SPACING.md,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
    },
    retryButton: {
      marginTop: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
    },
    retryButtonText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

const AdminAlerts = () => {
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const ALERT_CONFIG = useMemo(
    () => ({
      HARD_BRAKE: {
        color: COLORS.ERROR,
        icon: "warning",
        i18nKey: "adminAlerts.types.hardBrake",
      },
      HARD_ACCEL: {
        color: COLORS.WARNING,
        icon: "trending-up",
        i18nKey: "adminAlerts.types.hardAccel",
      },
      HARD_TURN: {
        color: COLORS.WARNING,
        icon: "return-down-forward",
        i18nKey: "adminAlerts.types.hardTurn",
      },
      SHARP_TURN: {
        color: COLORS.WARNING,
        icon: "return-down-forward",
        i18nKey: "adminAlerts.types.sharpTurn",
      },
      IMPACT: {
        color: COLORS.ERROR,
        icon: "alert-circle",
        i18nKey: "adminAlerts.types.impact",
      },
      OVERSPEED: {
        color: COLORS.ERROR,
        icon: "speedometer",
        i18nKey: "adminAlerts.types.overspeed",
      },
      speed: {
        color: COLORS.ERROR,
        icon: "speedometer",
        i18nKey: "adminAlerts.types.speed",
      },
      geofence: {
        color: COLORS.WARNING,
        icon: "location",
        i18nKey: "adminAlerts.types.geofence",
      },
      fuel: {
        color: COLORS.INFO,
        icon: "water",
        i18nKey: "adminAlerts.types.fuel",
      },
      maintenance: {
        color: COLORS.WARNING,
        icon: "construct",
        i18nKey: "adminAlerts.types.maintenance",
      },
      battery: {
        color: COLORS.ERROR,
        icon: "battery-dead",
        i18nKey: "adminAlerts.types.battery",
      },
      idle: {
        color: COLORS.INFO,
        icon: "time",
        i18nKey: "adminAlerts.types.idle",
      },
      sos: {
        color: COLORS.ERROR,
        icon: "alert-circle",
        i18nKey: "adminAlerts.types.sos",
      },
      default: {
        color: COLORS.MUTED,
        icon: "notifications",
        i18nKey: "adminAlerts.types.default",
      },
    }),
    [COLORS]
  );

  const formatRelativeTime = (dateString) => {
    if (!dateString) return "-";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return t("adminAlerts.time.justNow");
    if (mins < 60) return t("adminAlerts.time.minsAgo", { count: mins });
    if (hours < 24) return t("adminAlerts.time.hoursAgo", { count: hours });
    if (days < 7) return t("adminAlerts.time.daysAgo", { count: days });
    return new Date(dateString).toLocaleDateString();
  };

  const fetchAlerts = async () => {
    try {
      setError(null);
      const data = await alertAPI.getAll();
      const list = data.alerts || data || [];
      setAlerts(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || t("adminAlerts.loadError"));
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

  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.is_resolved).length;
    return { all: alerts.length, active, resolved: alerts.length - active };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (activeFilter === "active") return alerts.filter((a) => !a.is_resolved);
    if (activeFilter === "resolved") return alerts.filter((a) => a.is_resolved);
    return alerts;
  }, [alerts, activeFilter]);

  const handleResolveAlert = (item) => {
    if (item.is_resolved) {
      Alert.alert(t("common.info"), t("adminAlerts.alreadyResolved"));
      return;
    }
    Alert.alert(t("adminAlerts.resolve"), t("adminAlerts.resolveConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("adminAlerts.resolveBtn"),
        onPress: async () => {
          try {
            await alertAPI.resolve(item.id);
            Alert.alert(t("common.success"), t("adminAlerts.resolved"));
            fetchAlerts();
          } catch (e) {
            Alert.alert(
              t("common.error"),
              e.response?.data?.error || t("adminAlerts.resolveFailed")
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAlert = (item) => {
    Alert.alert(t("adminAlerts.deleteAlert"), t("adminAlerts.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await alertAPI.delete(item.id);
            Alert.alert(t("common.success"), t("adminAlerts.alertDeleted"));
            fetchAlerts();
          } catch (e) {
            Alert.alert(
              t("common.error"),
              e.response?.data?.error || t("adminAlerts.deleteFailed")
            );
          }
        },
      },
    ]);
  };

  const handleDeleteAll = () => {
    if (alerts.length === 0) {
      Alert.alert(t("common.info"), t("adminAlerts.noAlertsToDelete"));
      return;
    }
    Alert.alert(
      t("adminAlerts.deleteAll"),
      t("adminAlerts.deleteAllConfirm", { count: alerts.length }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("adminAlerts.deleteAllBtn"),
          style: "destructive",
          onPress: async () => {
            try {
              await alertAPI.deleteAll();
              Alert.alert(t("common.success"), t("adminAlerts.allDeleted"));
              fetchAlerts();
            } catch (e) {
              Alert.alert(
                t("common.error"),
                e.response?.data?.error || t("adminAlerts.deleteAllFailed")
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
      <View
        style={[
          styles.card,
          isResolved ? styles.cardResolved : styles.cardActive,
        ]}
      >
        <View style={styles.cardContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: withAlpha(config.color, 0.12) },
            ]}
          >
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.alertInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.alertType} numberOfLines={1}>
                {t(config.i18nKey)}
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
                  {isResolved
                    ? t("adminAlerts.statusResolved")
                    : t("adminAlerts.statusActive")}
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
                  <Ionicons name="car-outline" size={12} color={COLORS.MUTED} />
                  <Text style={styles.metaText}>
                    {item.vehicle_plate || item.device_id}
                  </Text>
                </View>
              ) : null}
              {item.driver_name ? (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="person-outline"
                    size={12}
                    color={COLORS.MUTED}
                  />
                  <Text style={styles.metaText}>{item.driver_name}</Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={COLORS.MUTED} />
                <Text style={styles.metaText}>
                  {formatRelativeTime(item.created_at)}
                </Text>
              </View>
              {item.speed ? (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="speedometer-outline"
                    size={12}
                    color={COLORS.MUTED}
                  />
                  <Text style={styles.metaText}>
                    {Math.round(item.speed)} km/h
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.actionRow}>
          {!isResolved ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleResolveAlert(item)}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.SUCCESS}
              />
              <Text style={[styles.actionBtnText, { color: COLORS.SUCCESS }]}>
                {t("adminAlerts.resolveBtn")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionBtn}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.SUCCESS}
              />
              <Text style={[styles.actionBtnText, { color: COLORS.SUCCESS }]}>
                {t("adminAlerts.statusResolved")}
              </Text>
            </View>
          )}
          <View style={styles.actionDivider} />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteAlert(item)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
            <Text style={[styles.actionBtnText, { color: COLORS.ERROR }]}>
              {t("common.delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle" size={64} color={COLORS.SUCCESS} />
      <Text style={styles.emptyTitle}>{t("adminAlerts.noAlerts")}</Text>
      <Text style={styles.emptySubtitle}>{t("adminAlerts.noAlertsDesc")}</Text>
    </View>
  );

  if (loading)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("adminAlerts.loading")}</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="cloud-offline" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>{t("common.error")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAlerts}>
          <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.statsHeader}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key] || 0;
          const colorMap = {
            all: COLORS.TEXT,
            active: COLORS.ERROR,
            resolved: COLORS.SUCCESS,
          };
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statBox, isActive && styles.statBoxActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.6}
            >
              <Text
                style={[
                  styles.statValue,
                  isActive && { color: colorMap[tab.key] || COLORS.TEXT },
                ]}
              >
                {count}
              </Text>
              <Text
                style={[styles.statLabel, isActive && styles.statLabelActive]}
              >
                {t(tab.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
          <Ionicons name="trash-outline" size={14} color={COLORS.WHITE} />
          <Text style={styles.deleteAllText}>
            {t("adminAlerts.deleteAllBtn")}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredAlerts}
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
