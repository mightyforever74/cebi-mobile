/**
 * AdminAlerts.js - v4.0
 * TulipFleet - Admin Alerts
 * Operasyon odaklı yeniden tasarım:
 *   - Severity bazlı gruplama (Critical / Warning / Info / Resolved)
 *   - Araç + sürücü bağlamı öne çıkarıldı
 *   - Map, Vehicle, Resolve aksiyonları
 *   - Resolved collapsed by default
 *   - UI System Guide v3 compliant
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
// CONSTANTS
// ─────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all", i18nKey: "adminAlerts.filterAll" },
  { key: "critical", i18nKey: "adminAlerts.filterCritical" },
  { key: "vehicle", i18nKey: "adminAlerts.filterVehicle" },
];

const ALERT_CONFIG_MAP = {
  HARD_BRAKE: {
    severity: "critical",
    icon: "warning",
    i18nKey: "adminAlerts.types.hardBrake",
  },
  HARD_ACCEL: {
    severity: "warning",
    icon: "trending-up",
    i18nKey: "adminAlerts.types.hardAccel",
  },
  HARD_TURN: {
    severity: "warning",
    icon: "return-down-forward",
    i18nKey: "adminAlerts.types.hardTurn",
  },
  SHARP_TURN: {
    severity: "warning",
    icon: "return-down-forward",
    i18nKey: "adminAlerts.types.sharpTurn",
  },
  IMPACT: {
    severity: "critical",
    icon: "alert-circle",
    i18nKey: "adminAlerts.types.impact",
  },
  OVERSPEED: {
    severity: "critical",
    icon: "speedometer",
    i18nKey: "adminAlerts.types.overspeed",
  },
  speed: {
    severity: "critical",
    icon: "speedometer",
    i18nKey: "adminAlerts.types.speed",
  },
  geofence: {
    severity: "warning",
    icon: "location",
    i18nKey: "adminAlerts.types.geofence",
  },
  geofence_entry: {
    severity: "info",
    icon: "location",
    i18nKey: "adminAlerts.types.geofenceEntry",
  },
  geofence_exit: {
    severity: "warning",
    icon: "location-outline",
    i18nKey: "adminAlerts.types.geofenceExit",
  },
  fuel: { severity: "info", icon: "water", i18nKey: "adminAlerts.types.fuel" },
  maintenance: {
    severity: "warning",
    icon: "construct",
    i18nKey: "adminAlerts.types.maintenance",
  },
  battery: {
    severity: "critical",
    icon: "battery-dead",
    i18nKey: "adminAlerts.types.battery",
  },
  idle: { severity: "info", icon: "time", i18nKey: "adminAlerts.types.idle" },
  sos: {
    severity: "critical",
    icon: "alert-circle",
    i18nKey: "adminAlerts.types.sos",
  },
  default: {
    severity: "info",
    icon: "notifications",
    i18nKey: "adminAlerts.types.default",
  },
};

const SEVERITY_ORDER = ["critical", "warning", "info"];

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    listContent: { padding: COLORS.SPACING.sm, paddingBottom: 40 },

    // ── Summary header ──
    summaryRow: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
      ...COLORS.SHADOWS.card,
    },
    summaryTab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.xs,
    },

    summaryCount: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    summaryLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    summaryLabelActive: {
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    deleteAllBtn: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      backgroundColor: withAlpha(COLORS.ERROR, 0.1),
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.ERROR, 0.3),
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Section header ──
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    sectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: COLORS.SPACING.xs,
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
    },
    sectionCount: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },

    // ── Alert card ──
    cardActive: {
      marginBottom: COLORS.SPACING.xs,
      borderLeftWidth: 3,
      overflow: "hidden",
    },
    cardResolved: {
      marginBottom: COLORS.SPACING.xs,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.SUCCESS,
      overflow: "hidden",
      opacity: 0.7,
    },

    // Card top row: icon + title + badge
    cardTop: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.xs,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    titleBlock: {
      flex: 1,
    },
    alertTypeText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.PRIMARY,
      marginTop: 2,
    },

    // Context row: driver + speed + time
    contextRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.xs,
    },
    contextItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xs,
    },
    contextText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginLeft: 4,
    },
    contextTextBold: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },

    // Description
    descText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
      lineHeight: 18,
    },

    // ── Action row ──
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
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },
    actionDivider: {
      width: 1,
      backgroundColor: COLORS.DIVIDER,
    },

    // ── Resolved collapse toggle ──
    resolvedToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    resolvedToggleLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    resolvedToggleText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.MUTED,
      marginLeft: COLORS.SPACING.xs,
    },
    resolvedCount: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
    },
  });

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const getAlertConfig = (alertType) =>
  ALERT_CONFIG_MAP[alertType] ||
  ALERT_CONFIG_MAP[alertType?.toUpperCase?.()] ||
  ALERT_CONFIG_MAP.default;

const formatRelativeTime = (dateString, t) => {
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

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

/** Severity section başlığı */
const SectionHeader = ({ severity, count, COLORS, styles }) => {
  const colorMap = {
    critical: COLORS.ERROR,
    warning: COLORS.WARNING,
    info: COLORS.INFO,
  };
  const labelMap = {
    critical: "Critical",
    warning: "Warning",
    info: "Info",
  };
  const color = colorMap[severity] || COLORS.MUTED;

  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={[styles.sectionTitle, { color }]}>{labelMap[severity]}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
};

/** Tek alert kartı */
const AlertCard = ({ item, COLORS, styles, t, onResolve, onDelete, onMap }) => {
  const alertType = item.alert_type || item.type || "default";
  const config = getAlertConfig(alertType);
  const isResolved = !!item.is_resolved;

  const severityColorMap = {
    critical: COLORS.ERROR,
    warning: COLORS.WARNING,
    info: COLORS.INFO,
  };
  const accentColor = isResolved
    ? COLORS.SUCCESS
    : severityColorMap[config.severity] || COLORS.MUTED;

  const badgeStatusMap = {
    critical: "CRITICAL",
    warning: "WARNING",
    info: "INFO",
  };
  const badgeStatus = isResolved
    ? "RESOLVED"
    : badgeStatusMap[config.severity] || "INFO";

  return (
    <Card
      variant="default"
      noMargin
      style={[
        isResolved ? styles.cardResolved : styles.cardActive,
        { borderLeftColor: accentColor },
      ]}
    >
      {/* ── Top: icon + type + plate + badge ── */}
      <View style={styles.cardTop}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: withAlpha(accentColor, 0.12) },
          ]}
        >
          <Ionicons name={config.icon} size={22} color={accentColor} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.alertTypeText} numberOfLines={1}>
            {t(config.i18nKey)}
          </Text>
          {item.vehicle_plate ? (
            <Text style={styles.vehiclePlate} numberOfLines={1}>
              {item.vehicle_plate}
            </Text>
          ) : null}
        </View>

        <StatusBadge
          status={badgeStatus}
          size="sm"
          label={
            isResolved
              ? t("adminAlerts.statusResolved")
              : config.severity === "critical"
                ? t("adminAlerts.filterCritical")
                : config.severity === "warning"
                  ? "Warning"
                  : "Info"
          }
        />
      </View>

      {/* ── Context: driver / speed / time ── */}
      <View style={styles.contextRow}>
        {item.driver_name ? (
          <View style={styles.contextItem}>
            <Ionicons name="person-outline" size={12} color={COLORS.MUTED} />
            <Text style={styles.contextTextBold}>{item.driver_name}</Text>
          </View>
        ) : null}
        {item.speed != null ? (
          <View style={styles.contextItem}>
            <Ionicons
              name="speedometer-outline"
              size={12}
              color={COLORS.ERROR}
            />
            <Text style={[styles.contextTextBold, { color: COLORS.ERROR }]}>
              {Math.round(item.speed)} km/h
            </Text>
          </View>
        ) : null}
        <View style={styles.contextItem}>
          <Ionicons name="time-outline" size={12} color={COLORS.MUTED} />
          <Text style={styles.contextText}>
            {formatRelativeTime(item.created_at, t)}
          </Text>
        </View>
        {item.device_id && !item.vehicle_plate ? (
          <View style={styles.contextItem}>
            <Ionicons
              name="hardware-chip-outline"
              size={12}
              color={COLORS.MUTED}
            />
            <Text style={styles.contextText}>{item.device_id}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Description ── */}
      {item.description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      {/* ── Actions ── */}
      <View style={styles.actionRow}>
        {!isResolved ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onResolve(item)}
          >
            <Ionicons
              name="checkmark-circle-outline"
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

        {item.vehicle_plate ? (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onMap(item)}
            >
              <Ionicons name="map-outline" size={16} color={COLORS.PRIMARY} />
              <Text style={[styles.actionBtnText, { color: COLORS.PRIMARY }]}>
                {t("adminAlerts.mapButton")}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
          </>
        ) : null}

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDelete(item)}
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

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AdminAlerts = ({ navigation }) => {
  const styles = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [resolvedOpen, setResolvedOpen] = useState(false);

  // ── Fetch ──
  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      const res = await alertAPI.getAll();
      setAlerts(res.alerts || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.message || t("adminAlerts.loadError")
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ── Counts ──
  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.is_resolved);
    const resolved = alerts.filter((a) => a.is_resolved);
    const critical = active.filter(
      (a) => getAlertConfig(a.alert_type || a.type).severity === "critical"
    );
    return {
      all: alerts.length,
      active: active.length,
      resolved: resolved.length,
      critical: critical.length,
      vehicle: active.filter((a) => !!a.vehicle_plate).length,
    };
  }, [alerts]);

  // ── Active alerts grouped by severity ──
  const groupedActive = useMemo(() => {
    let active = alerts.filter((a) => !a.is_resolved);

    if (activeFilter === "critical") {
      active = active.filter(
        (a) => getAlertConfig(a.alert_type || a.type).severity === "critical"
      );
    } else if (activeFilter === "vehicle") {
      active = active.filter((a) => !!a.vehicle_plate);
    }

    const groups = {};
    active.forEach((a) => {
      const sev = getAlertConfig(a.alert_type || a.type).severity;
      if (!groups[sev]) groups[sev] = [];
      groups[sev].push(a);
    });
    return groups;
  }, [alerts, activeFilter]);

  const resolvedAlerts = useMemo(
    () => alerts.filter((a) => a.is_resolved),
    [alerts]
  );

  // ── Resolved collapse toggle ──
  const toggleResolved = () => {
    setResolvedOpen(!resolvedOpen);
  };

  // ── Actions ──
  const handleResolve = (item) => {
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

  const handleDelete = (item) => {
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

  const handleMap = (item) => {
    if (navigation && item.vehicle_plate) {
      navigation.navigate("FleetMap", {
        screen: "FleetMapMain",
        params: { filterPlate: item.vehicle_plate },
      });
    }
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

  // ── List data builder (flat for FlatList) ──
  const listData = useMemo(() => {
    const items = [];

    SEVERITY_ORDER.forEach((sev) => {
      const group = groupedActive[sev];
      if (!group || group.length === 0) return;
      items.push({ _type: "section", severity: sev, count: group.length });
      group.forEach((a) => items.push({ _type: "alert", ...a }));
    });

    // Resolved section
    if (resolvedAlerts.length > 0) {
      items.push({ _type: "resolved_toggle", count: resolvedAlerts.length });
      if (resolvedOpen) {
        resolvedAlerts.forEach((a) => items.push({ _type: "alert", ...a }));
      }
    }

    return items;
  }, [groupedActive, activeFilter, resolvedAlerts, resolvedOpen]);

  // ── Render ──
  const renderItem = ({ item }) => {
    if (item._type === "section") {
      return (
        <SectionHeader
          severity={item.severity}
          count={item.count}
          COLORS={COLORS}
          styles={styles}
        />
      );
    }
    if (item._type === "resolved_toggle") {
      return (
        <TouchableOpacity
          style={styles.resolvedToggle}
          onPress={toggleResolved}
          activeOpacity={0.7}
        >
          <View style={styles.resolvedToggleLeft}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={COLORS.SUCCESS}
            />
            <Text style={styles.resolvedToggleText}>
              {t("adminAlerts.statusResolved")}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.resolvedCount}>{item.count}</Text>
            <Ionicons
              name={resolvedOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.MUTED}
              style={{ marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <AlertCard
        item={item}
        COLORS={COLORS}
        styles={styles}
        t={t}
        onResolve={handleResolve}
        onDelete={handleDelete}
        onMap={handleMap}
      />
    );
  };

  const summaryColorMap = {
    all: COLORS.TEXT,
    critical: COLORS.ERROR,
    vehicle: COLORS.PRIMARY,
  };

  return (
    <View style={styles.container}>
      {/* ── Summary / Filter ── */}
      <View style={styles.summaryRow}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          const color = summaryColorMap[tab.key] || COLORS.TEXT;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.summaryTab,
                isActive && {
                  backgroundColor: withAlpha(color, 0.08),
                  borderRadius: COLORS.RADIUS.sm,
                },
              ]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.summaryCount, isActive && { color }]}>
                {counts[tab.key] ?? 0}
              </Text>
              <Text
                style={[
                  styles.summaryLabel,
                  isActive && styles.summaryLabelActive,
                ]}
              >
                {t(tab.i18nKey)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
          <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <DataState
        loading={loading}
        error={error}
        empty={!loading && listData.length === 0 && resolvedAlerts.length === 0}
        emptyIcon="checkmark-circle-outline"
        emptyTitle={t("adminAlerts.noAlerts")}
        emptyMessage={t("adminAlerts.noAlertsDesc")}
        onRetry={fetchAlerts}
        retryLabel={t("common.retry")}
      >
        <FlatList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item, idx) =>
            item._type === "section"
              ? `section-${item.severity}`
              : item.id?.toString?.() || String(idx)
          }
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
