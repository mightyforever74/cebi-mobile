/**
 * AdminDrivers.js - v2.0
 * TulipFleet - Admin Driver Management
 * DB statuses: available, on_task, task_pending, on_leave, offline
 * Created: 01 Mart 2026
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
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
import { driverAPI } from "../../services/api";

const FILTER_TABS = [
  { key: "all", i18nKey: "adminDrivers.filterAll" },
  {
    key: "available",
    i18nKey: "adminDrivers.filterAvailable",
    statuses: ["available"],
  },
  {
    key: "on_task",
    i18nKey: "adminDrivers.filterOnTask",
    statuses: ["on_task", "task_pending"],
  },
  {
    key: "offline",
    i18nKey: "adminDrivers.filterOffline",
    statuses: ["on_leave", "offline"],
  },
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
    listContainer: { padding: COLORS.SPACING.sm, paddingBottom: 80 },
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    driverInfo: { flex: 1, marginLeft: COLORS.SPACING.sm },
    driverName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    driverEmail: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.md,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    compactRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    metric: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    metricValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    metricLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    metricDivider: {
      width: 1,
      backgroundColor: COLORS.DIVIDER,
      marginVertical: COLORS.SPACING.xs,
    },
    expandedSection: {
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      padding: COLORS.SPACING.sm,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.sm,
    },
    detailIcon: { width: 24, alignItems: "center", marginTop: 2 },
    detailLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      width: 90,
      marginLeft: COLORS.SPACING.xs,
    },
    detailValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      flex: 1,
    },
    actionRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      marginTop: COLORS.SPACING.sm,
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
      paddingHorizontal: COLORS.SPACING.xl,
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
    fab: {
      position: "absolute",
      right: COLORS.SPACING.md,
      bottom: COLORS.SPACING.md,
      width: 56,
      height: 56,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
  });

const AdminDrivers = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const STATUS_COLORS = useMemo(
    () => ({
      available: COLORS.SUCCESS,
      on_task: COLORS.INFO,
      task_pending: COLORS.WARNING,
      on_leave: COLORS.MUTED,
      offline: COLORS.ERROR,
    }),
    [COLORS]
  );

  const getStatusLabel = (s) => t(`adminDrivers.status.${s}`, s);
  const getAvatarColor = (name) => {
    const p = [
      COLORS.PRIMARY,
      COLORS.SUCCESS,
      COLORS.WARNING,
      COLORS.INFO,
      COLORS.ERROR,
    ];
    return p[(name?.charCodeAt(0) || 0) % p.length];
  };

  const fetchDrivers = async () => {
    try {
      setError(null);
      const data = await driverAPI.getList();
      const list = data.drivers || data || [];
      setDrivers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || t("adminDrivers.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDrivers();
    }, [])
  );
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrivers();
  }, []);

  const counts = useMemo(() => {
    const c = { all: drivers.length, available: 0, on_task: 0, offline: 0 };
    drivers.forEach((d) => {
      if (d.status === "available") c.available++;
      else if (d.status === "on_task" || d.status === "task_pending")
        c.on_task++;
      else c.offline++;
    });
    return c;
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    if (activeFilter === "all") return drivers;
    const tab = FILTER_TABS.find((f) => f.key === activeFilter);
    if (!tab?.statuses) return drivers;
    return drivers.filter((d) => tab.statuses.includes(d.status));
  }, [drivers, activeFilter]);

  const handleDeleteDriver = (driver) => {
    const name = driver.first_name
      ? `${driver.first_name} ${driver.last_name || ""}`.trim()
      : driver.email?.split("@")[0];
    Alert.alert(
      t("adminDrivers.deleteDriver"),
      t("adminDrivers.deleteConfirm", { name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await driverAPI.delete(driver.id);
              Alert.alert(t("common.success"), t("adminDrivers.driverDeleted"));
              fetchDrivers();
            } catch (e) {
              Alert.alert(
                t("common.error"),
                e?.response?.data?.error || t("adminDrivers.deleteFailed")
              );
            }
          },
        },
      ]
    );
  };

  const renderDriverCard = ({ item }) => {
    const status = item.status || "offline";
    const statusColor = STATUS_COLORS[status] || COLORS.MUTED;
    const isExpanded = expandedId === item.id;
    const displayName =
      item.first_name && item.last_name
        ? `${item.first_name} ${item.last_name}`
        : item.first_name ||
          item.email?.split("@")[0] ||
          t("adminDrivers.unnamed");
    const initials =
      `${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`.toUpperCase() ||
      "?";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: getAvatarColor(item.first_name || item.email),
              },
            ]}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.driverEmail} numberOfLines={1}>
              {item.email || "-"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>
        </View>

        <View style={styles.compactRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {item.assigned_vehicle_plate || "-"}
            </Text>
            <Text style={styles.metricLabel}>{t("adminDrivers.vehicle")}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.completed_tasks ?? 0}</Text>
            <Text style={styles.metricLabel}>{t("adminDrivers.tasks")}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.safety_score ?? "-"}</Text>
            <Text style={styles.metricLabel}>{t("adminDrivers.score")}</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {item.phone ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={COLORS.SUCCESS}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminDrivers.phone")}
                </Text>
                <Text style={styles.detailValue}>{item.phone}</Text>
              </View>
            ) : null}
            {item.license_number ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="card-outline" size={16} color={COLORS.INFO} />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminDrivers.license")}
                </Text>
                <Text style={styles.detailValue}>{item.license_number}</Text>
              </View>
            ) : null}
            {item.emergency_contact ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="warning-outline"
                    size={16}
                    color={COLORS.ERROR}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminDrivers.emergency")}
                </Text>
                <Text style={styles.detailValue}>{item.emergency_contact}</Text>
              </View>
            ) : null}
            {item.total_km_driven ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="speedometer-outline"
                    size={16}
                    color={COLORS.PRIMARY}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminDrivers.totalKm")}
                </Text>
                <Text style={styles.detailValue}>
                  {Number(item.total_km_driven).toLocaleString()} km
                </Text>
              </View>
            ) : null}
            {item.assigned_vehicle_plate ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="car-outline"
                    size={16}
                    color={COLORS.WARNING}
                  />
                </View>
                <Text style={styles.detailLabel}>
                  {t("adminDrivers.assignedVehicle")}
                </Text>
                <Text style={styles.detailValue}>
                  {item.assigned_vehicle_plate}
                </Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() =>
                  navigation.navigate("EditDriver", { driver: item })
                }
              >
                <Ionicons name="pencil" size={16} color={COLORS.PRIMARY} />
                <Text style={[styles.actionBtnText, { color: COLORS.PRIMARY }]}>
                  {t("common.edit")}
                </Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteDriver(item)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
                <Text style={[styles.actionBtnText, { color: COLORS.ERROR }]}>
                  {t("common.delete")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={COLORS.MUTED} />
      <Text style={styles.emptyTitle}>{t("adminDrivers.noDrivers")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("adminDrivers.noDriversDesc")}
      </Text>
    </View>
  );

  if (loading)
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("adminDrivers.loading")}</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.ERROR} />
        <Text style={styles.errorTitle}>{t("common.error")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
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
            available: COLORS.SUCCESS,
            on_task: COLORS.INFO,
            offline: COLORS.ERROR,
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
      </View>

      <FlatList
        data={filteredDrivers}
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateDriver")}
      >
        <Ionicons name="person-add" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminDrivers;
