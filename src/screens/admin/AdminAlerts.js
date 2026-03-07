/**
 * AdminAlerts.js - v3.0
 * TulipFleet - Admin Alerts
 * Phase 0 Regeneration: Card + StatusBadge + DataState
 * withAlpha → colorUtils, styles.card → <Card>, loading/error/empty → <DataState>
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import DataState from "../../components/ui/DataState";
import StatusBadge from "../../components/ui/StatusBadge";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { alertAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

// ─────────────────────────────────────────────
// FILTER TABS
// ─────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",      i18nKey: "adminAlerts.filterAll"      },
  { key: "active",   i18nKey: "adminAlerts.filterActive"   },
  { key: "resolved", i18nKey: "adminAlerts.filterResolved" },
];

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: COLORS.BACKGROUND },
    listContent:  { padding: COLORS.SPACING.sm, paddingBottom: 40 },

    // ── Filter header ──
    statsHeader: {
      flexDirection:   "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical:   COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xs,
      alignItems:      "center",
      ...COLORS.SHADOWS.card,
    },
    statBox: {
      flex:           1,
      alignItems:     "center",
      paddingVertical: COLORS.SPACING.xs,
    },
    statBoxActive: {
      borderBottomWidth:  3,
      borderBottomColor:  COLORS.PRIMARY,
    },
    statValue: {
      fontSize:   COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color:      COLORS.TEXT,
    },
    statLabel: {
      fontSize:  COLORS.TYPOGRAPHY.sizes.xs,
      color:     COLORS.MUTED,
      marginTop: 2,
    },
    statLabelActive: {
      color:      COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    deleteAllBtn: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical:   COLORS.SPACING.xs,
      backgroundColor:   COLORS.ERROR,
      borderRadius:      COLORS.RADIUS.md,
      flexDirection:     "row",
      alignItems:        "center",
      marginRight:       COLORS.SPACING.xs,
    },
    deleteAllText: {
      color:      COLORS.WHITE,
      fontSize:   COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },

    // ── Alert card ──
    cardActive:   { borderLeftWidth: 3, borderLeftColor: COLORS.ERROR    },
    cardResolved: { borderLeftWidth: 3, borderLeftColor: COLORS.SUCCESS, opacity: 0.75 },
    cardContent:  { flexDirection: "row", padding: COLORS.SPACING.sm },
    iconContainer: {
      width:            44,
      height:           44,
      borderRadius:     COLORS.RADIUS.full,
      justifyContent:   "center",
      alignItems:       "center",
    },
    alertInfo:  { flex: 1, marginLeft: COLORS.SPACING.sm },
    headerRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    alertType:  {
      fontSize:   COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color:      COLORS.TEXT,
      flex:       1,
      marginRight: COLORS.SPACING.xs,
    },
    alertMessage: {
      fontSize:  COLORS.TYPOGRAPHY.sizes.sm,
      color:     COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    metaRow: {
      flexDirection: "row",
      flexWrap:      "wrap",
      marginTop:     COLORS.SPACING.xs,
    },
    metaItem: {
      flexDirection: "row",
      alignItems:    "center",
      marginRight:   COLORS.SPACING.md,
      marginBottom:  COLORS.SPACING.xs,
    },
    metaText: {
      fontSize:   COLORS.TYPOGRAPHY.sizes.xs,
      color:      COLORS.MUTED,
      marginLeft: 4,
    },

    // ── Action row ──
    actionRow: {
      flexDirection:   "row",
      borderTopWidth:  1,
      borderTopColor:  COLORS.DIVIDER,
    },
    actionBtn: {
      flex:           1,
      flexDirection:  "row",
      alignItems:     "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    actionBtnText: {
      fontSize:   COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    actionDivider: { width: 1, backgroundColor: COLORS.DIVIDER },
  });

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const AdminAlerts = () => {
  const styles  = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();
  const { t }   = useTranslation();

  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  // ── Alert type → icon/color/i18n ──
  const ALERT_CONFIG = useMemo(() => ({
    HARD_BRAKE:  { color: COLORS.ERROR,   icon: "warning",                i18nKey: "adminAlerts.types.hardBrake"   },
    HARD_ACCEL:  { color: COLORS.WARNING, icon: "trending-up",            i18nKey: "adminAlerts.types.hardAccel"   },
    HARD_TURN:   { color: COLORS.WARNING, icon: "return-down-forward",    i18nKey: "adminAlerts.types.hardTurn"    },
    SHARP_TURN:  { color: COLORS.WARNING, icon: "return-down-forward",    i18nKey: "adminAlerts.types.sharpTurn"   },
    IMPACT:      { color: COLORS.ERROR,   icon: "alert-circle",           i18nKey: "adminAlerts.types.impact"      },
    OVERSPEED:   { color: COLORS.ERROR,   icon: "speedometer",            i18nKey: "adminAlerts.types.overspeed"   },
    speed:       { color: COLORS.ERROR,   icon: "speedometer",            i18nKey: "adminAlerts.types.speed"       },
    geofence:    { color: COLORS.WARNING, icon: "location",               i18nKey: "adminAlerts.types.geofence"    },
    geofence_entry: { color: COLORS.SUCCESS, icon: "location",            i18nKey: "adminAlerts.types.geofence"    },
    geofence_exit:  { color: COLORS.WARNING, icon: "location-outline",    i18nKey: "adminAlerts.types.geofence"    },
    fuel:        { color: COLORS.INFO,    icon: "water",                  i18nKey: "adminAlerts.types.fuel"        },
    maintenance: { color: COLORS.WARNING, icon: "construct",              i18nKey: "adminAlerts.types.maintenance" },
    battery:     { color: COLORS.ERROR,   icon: "battery-dead",           i18nKey: "adminAlerts.types.battery"     },
    idle:        { color: COLORS.INFO,    icon: "time",                   i18nKey: "adminAlerts.types.idle"        },
    sos:         { color: COLORS.ERROR,   icon: "alert-circle",           i18nKey: "adminAlerts.types.sos"         },
    default:     { color: COLORS.MUTED,   icon: "notifications",          i18nKey: "adminAlerts.types.default"     },
  }), [COLORS]);

  // ── Severity map: alert_type → StatusBadge status ──
  const getSeverityStatus = (alertType, isResolved) => {
    if (isResolved) return "RESOLVED";
    const errorTypes = ["HARD_BRAKE", "IMPACT", "OVERSPEED", "speed", "battery", "sos"];
    const infoTypes  = ["fuel", "idle", "geofence_entry"];
    if (errorTypes.includes(alertType?.toUpperCase?.() ?? alertType)) return "CRITICAL";
    if (infoTypes.includes(alertType)) return "INFO";
    return "WARNING";
  };

  // ── Relative time ──
  const formatRelativeTime = (dateString) => {
    if (!dateString) return "-";
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins  = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days  = Math.floor(diffMs / 86400000);
    if (mins  < 1)  return t("adminAlerts.time.justNow");
    if (mins  < 60) return t("adminAlerts.time.minsAgo",  { count: mins  });
    if (hours < 24) return t("adminAlerts.time.hoursAgo", { count: hours });
    if (days  < 7)  return t("adminAlerts.time.daysAgo",  { count: days  });
    return new Date(dateString).toLocaleDateString();
  };

  // ── Data fetch ──
  const fetchAlerts = async () => {
    try {
      setError(null);
      const data = await alertAPI.getAll();
      const list = data.alerts || data || [];
      setAlerts(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || t("adminAlerts.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, []);

  // ── Counts ──
  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.is_resolved).length;
    return { all: alerts.length, active, resolved: alerts.length - active };
  }, [alerts]);

  // ── Filtered list ──
  const filteredAlerts = useMemo(() => {
    if (activeFilter === "active")   return alerts.filter((a) => !a.is_resolved);
    if (activeFilter === "resolved") return alerts.filter((a) =>  a.is_resolved);
    return alerts;
  }, [alerts, activeFilter]);

  // ── Actions ──
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
            Alert.alert(t("common.error"), e.response?.data?.error || t("adminAlerts.resolveFailed"));
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
            Alert.alert(t("common.error"), e.response?.data?.error || t("adminAlerts.deleteFailed"));
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
              Alert.alert(t("common.error"), e.response?.data?.error || t("adminAlerts.deleteAllFailed"));
            }
          },
        },
      ]
    );
  };

  // ── Render alert card ──
  const renderAlertCard = ({ item }) => {
    const alertType  = item.alert_type || item.type || "default";
    const config     = ALERT_CONFIG[alertType] || ALERT_CONFIG.default;
    const isResolved = !!item.is_resolved;
    const severity   = getSeverityStatus(alertType, isResolved);

    return (
      <Card
        variant="default"
        noMargin
        style={[
          { marginBottom: COLORS.SPACING.sm, overflow: "hidden" },
          isResolved ? styles.cardResolved : styles.cardActive,
        ]}
      >
        {/* ── Card body ── */}
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
              {/* StatusBadge — styles.statusBadge kaldırıldı */}
              <StatusBadge
                status={severity}
                label={
                  isResolved
                    ? t("adminAlerts.statusResolved")
                    : t("adminAlerts.statusActive")
                }
                size="sm"
              />
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
                  <Ionicons name="person-outline" size={12} color={COLORS.MUTED} />
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
                  <Ionicons name="speedometer-outline" size={12} color={COLORS.MUTED} />
                  <Text style={styles.metaText}>{Math.round(item.speed)} km/h</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Action row ── */}
        <View style={styles.actionRow}>
          {!isResolved ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleResolveAlert(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
              <Text style={[styles.actionBtnText, { color: COLORS.SUCCESS }]}>
                {t("adminAlerts.resolveBtn")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.actionBtn}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.SUCCESS} />
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
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Filter / stats header ── */}
      <View style={styles.statsHeader}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count    = counts[tab.key] || 0;
          const colorMap = { all: COLORS.TEXT, active: COLORS.ERROR, resolved: COLORS.SUCCESS };
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
              <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>
                {t(tab.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
          <Ionicons name="trash-outline" size={14} color={COLORS.WHITE} />
          <Text style={styles.deleteAllText}>{t("adminAlerts.deleteAllBtn")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── List — DataState loading/error/empty/data ── */}
      <DataState
        loading={loading}
        error={error}
        empty={!loading && filteredAlerts.length === 0}
        emptyIcon="checkmark-circle-outline"
        emptyTitle={t("adminAlerts.noAlerts")}
        emptyMessage={t("adminAlerts.noAlertsDesc")}
        onRetry={fetchAlerts}
        retryLabel={t("common.retry")}
      >
        <FlatList
          data={filteredAlerts}
          renderItem={renderAlertCard}
          keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </DataState>
    </View>
  );
};

export default AdminAlerts;
