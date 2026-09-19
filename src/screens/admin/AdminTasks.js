/**
 * AdminTasks.js - v3.0
 * TulipFleet - Admin Task Management
 * Phase 0 Regeneration: Card + StatusBadge + DataState + colorUtils
 *
 * Features:
 * - Full i18n support (7 languages)
 * - Status filter tabs (All / Pending / Active / Completed)
 * - Expandable FlatList cards
 * - DB-aligned statuses: pending_review, accepted, in_progress, completed, rejected
 * - Theme-aware (UI System Guide v3)
 * - Pull-to-refresh
 */

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
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
import { withAlpha } from "../../utils/colorUtils";
import { formatDateTime } from "../../utils/helpers";
import { taskAPI } from "../../services/api";

// ─────────────────────────────────────────────
// FILTER TABS
// ─────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",       i18nKey: "adminTasks.filterAll",       icon: "list"                    },
  { key: "pending",   i18nKey: "adminTasks.filterPending",   icon: "time-outline",           statuses: ["pending_review","accepted"] },
  { key: "active",    i18nKey: "adminTasks.filterActive",    icon: "play-circle-outline",    statuses: ["in_progress"]              },
  { key: "completed", i18nKey: "adminTasks.filterCompleted", icon: "checkmark-circle-outline",statuses: ["completed"]              },
];

// task status → StatusBadge severity
const STATUS_SEVERITY = {
  pending_review: "WARNING",
  accepted:       "INFO",
  in_progress:    "ON_TASK",  // INFO alias
  completed:      "SUCCESS",
  rejected:       "ERROR",
  cancelled:      "ERROR",
};

// ─────────────────────────────────────────────
// makeStyles — Phase 0 temizlenmiş
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: COLORS.BACKGROUND },
    listContainer:{ padding: COLORS.SPACING.sm, paddingBottom: 80 },

    // ── Filter / stats header ──
    statsHeader: {
      flexDirection:    "row",
      backgroundColor:  COLORS.SURFACE,
      paddingVertical:  COLORS.SPACING.sm,
      paddingHorizontal:COLORS.SPACING.xs,
      ...COLORS.SHADOWS.card,
    },
    statBox:        { flex: 1, alignItems: "center", paddingVertical: COLORS.SPACING.xs },
    statBoxActive:  { borderBottomWidth: 3, borderBottomColor: COLORS.PRIMARY },
    statValue:      { fontSize: COLORS.TYPOGRAPHY.sizes.xxl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT },
    statLabel:      { fontSize: COLORS.TYPOGRAPHY.sizes.xs, color: COLORS.MUTED, marginTop: 2 },
    statLabelActive:{ color: COLORS.PRIMARY, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },

    // ── Task card header ──
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: COLORS.SPACING.sm },
    cardLeft:   { flexDirection: "row", alignItems: "center", flex: 1 },
    priorityDot:{ width: COLORS.SPACING.sm, height: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.full, marginRight: COLORS.SPACING.sm },
    taskInfo:   { flex: 1 },
    taskCode:   { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT },
    taskTitle:  { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.MUTED, marginTop: 2 },

    // ── Compact info row ──
    compactRow: { flexDirection: "row", paddingHorizontal: COLORS.SPACING.sm, paddingBottom: COLORS.SPACING.sm, flexWrap: "wrap" },
    compactItem:{ flexDirection: "row", alignItems: "center", marginRight: COLORS.SPACING.md, marginBottom: COLORS.SPACING.xs },
    compactText:{ fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_SECONDARY || COLORS.MUTED, marginLeft: COLORS.SPACING.xs },

    // ── Expanded details ──
    expandedSection:{ borderTopWidth: 1, borderTopColor: COLORS.DIVIDER, padding: COLORS.SPACING.sm },
    detailRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: COLORS.SPACING.sm },
    detailIcon:  { width: 24, alignItems: "center", marginTop: 2 },
    detailLabel: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.MUTED, width: 80, marginLeft: COLORS.SPACING.xs },
    detailValue: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT, fontWeight: COLORS.TYPOGRAPHY.weights.medium, flex: 1 },

    // ── Priority badge (withAlpha kullanıyor — korunuyor) ──
    priorityBadge:{ flexDirection: "row", alignItems: "center", paddingHorizontal: COLORS.SPACING.sm, paddingVertical: 2, borderRadius: COLORS.RADIUS.sm },
    priorityText: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, marginLeft: 2 },

    // ── Action row ──
    actionRow:    { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.DIVIDER, marginTop: COLORS.SPACING.sm },
    actionBtn:    { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: COLORS.SPACING.sm },
    actionBtnText:{ fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, marginLeft: COLORS.SPACING.xs },
    actionDivider:{ width: 1, backgroundColor: COLORS.DIVIDER },

    // ── FAB ──
    fab: {
      position:        "absolute",
      right:           COLORS.SPACING.md,
      bottom:          COLORS.SPACING.md,
      width:           56,
      height:          56,
      borderRadius:    COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent:  "center",
      alignItems:      "center",
      ...COLORS.SHADOWS.card,
    },
  });

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const AdminTasks = ({ navigation }) => {
  const styles     = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();
  const { t } = useTranslation();

  const [tasks,        setTasks]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedId,   setExpandedId]   = useState(null);

  const PRIORITY_COLORS = useMemo(() => ({
    low:    COLORS.SUCCESS,
    normal: COLORS.INFO,
    high:   COLORS.WARNING,
    urgent: COLORS.ERROR,
  }), [COLORS]);

  const getStatusLabel   = (s) => t(`adminTasks.status.${s}`, s);
  const getPriorityLabel = (p) => t(`adminTasks.priority.${p}`, p);

  // ── Fetch ──
  const fetchTasks = async () => {
    try {
      setError(null);
      const data = await taskAPI.getList();
      const taskList = data.tasks || data || [];
      setTasks(Array.isArray(taskList) ? taskList : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || t("adminTasks.loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTasks(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); fetchTasks(); }, []);

  // ── Counts ──
  const counts = useMemo(() => {
    const c = { all: tasks.length, pending: 0, active: 0, completed: 0 };
    tasks.forEach((tk) => {
      if (["pending_review","accepted"].includes(tk.status)) c.pending++;
      else if (tk.status === "in_progress") c.active++;
      else if (tk.status === "completed")   c.completed++;
    });
    return c;
  }, [tasks]);

  // ── Filter ──
  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    const tab = FILTER_TABS.find((f) => f.key === activeFilter);
    if (!tab?.statuses) return tasks;
    return tasks.filter((tk) => tab.statuses.includes(tk.status));
  }, [tasks, activeFilter]);

  // ── Formatters ──
  const formatDate = (dateString) => formatDateTime(dateString);

  // ── Actions ──
  const handleSendOffer = async (task) => {
    if (!task.driver_id) { Alert.alert(t("common.warning"), t("adminTasks.noDriverAssigned")); return; }
    const driverName = task.driver_first_name || task.driver_email?.split("@")[0] || t("adminTasks.driver");
    Alert.alert(t("adminTasks.sendOffer"), t("adminTasks.sendOfferConfirm", { driver: driverName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("adminTasks.send"),
        onPress: async () => {
          try {
            await taskAPI.sendOffer(task.id, task.driver_id);
            Alert.alert(t("common.success"), t("adminTasks.offerSent"));
            fetchTasks();
          } catch (e) { Alert.alert(t("common.error"), e?.response?.data?.error || t("adminTasks.offerFailed")); }
        },
      },
    ]);
  };

  const handleDeleteTask = (task) => {
    const taskName = task.title || task.task_no || "-";
    Alert.alert(t("adminTasks.deleteTask"), t("adminTasks.deleteConfirm", { task: taskName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"), style: "destructive",
        onPress: async () => {
          try {
            await taskAPI.delete(task.id);
            Alert.alert(t("common.success"), t("adminTasks.taskDeleted"));
            fetchTasks();
          } catch (e) { Alert.alert(t("common.error"), e?.response?.data?.error || t("adminTasks.deleteFailed")); }
        },
      },
    ]);
  };

  // ── Render task card ──
  const renderTaskCard = ({ item }) => {
    const status        = item.status || "pending_review";
    const priority      = item.priority || "normal";
    const priorityColor = PRIORITY_COLORS[priority] || COLORS.INFO;
    const isExpanded    = expandedId === item.id;
    const canSendOffer  = ["pending_review","accepted"].includes(status);
    const taskCode      = item.task_no || item.task_code || (item.id ? `TSK-${String(item.id).slice(0,6)}` : "TSK");
    const driverName    = item.driver_first_name
      ? `${item.driver_first_name} ${item.driver_last_name || ""}`.trim()
      : item.driver_email?.split("@")[0] || t("adminTasks.noDriver");

    return (
      <Card
        variant="default"
        noMargin
        style={{ marginBottom: COLORS.SPACING.sm, overflow: "hidden" }}
      >
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)} activeOpacity={0.7}>
          {/* ── Header: task code + StatusBadge ── */}
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <View style={styles.taskInfo}>
                <Text style={styles.taskCode} numberOfLines={1}>{taskCode}</Text>
                {item.title ? <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text> : null}
              </View>
            </View>
            <StatusBadge
              status={STATUS_SEVERITY[status] || "WARNING"}
              label={getStatusLabel(status)}
              size="sm"
            />
          </View>

          {/* ── Compact info ── */}
          <View style={styles.compactRow}>
            <View style={styles.compactItem}>
              <Ionicons name="person-outline" size={14} color={COLORS.MUTED} />
              <Text style={styles.compactText} numberOfLines={1}>{driverName}</Text>
            </View>
            <View style={styles.compactItem}>
              <Ionicons name="car-outline" size={14} color={COLORS.MUTED} />
              <Text style={styles.compactText} numberOfLines={1}>{item.vehicle_plate || t("adminTasks.noVehicle")}</Text>
            </View>
            <View style={styles.compactItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.MUTED} />
              <Text style={styles.compactText}>{formatDate(item.scheduled_start || item.created_at)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Expanded details ── */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {item.description ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="document-text-outline" size={16} color={COLORS.MUTED} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.description")}</Text>
                <Text style={styles.detailValue}>{item.description}</Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}><Ionicons name="flag-outline" size={16} color={priorityColor} /></View>
              <Text style={styles.detailLabel}>{t("adminTasks.priorityLabel")}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: withAlpha(priorityColor, 0.12) }]}>
                <Ionicons name="flag" size={12} color={priorityColor} />
                <Text style={[styles.priorityText, { color: priorityColor }]}>{getPriorityLabel(priority)}</Text>
              </View>
            </View>

            {item.start_location ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="location-outline" size={16} color={COLORS.SUCCESS} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.from")}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{item.start_location}</Text>
              </View>
            ) : null}

            {item.end_location ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="flag-outline" size={16} color={COLORS.ERROR} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.to")}</Text>
                <Text style={styles.detailValue} numberOfLines={2}>{item.end_location}</Text>
              </View>
            ) : null}

            {item.total_distance_km != null ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="speedometer-outline" size={16} color={COLORS.INFO} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.distance")}</Text>
                <Text style={styles.detailValue}>{item.total_distance_km} km</Text>
              </View>
            ) : null}

            {item.scheduled_start ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="time-outline" size={16} color={COLORS.WARNING} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.scheduled")}</Text>
                <Text style={styles.detailValue}>{formatDate(item.scheduled_start)}</Text>
              </View>
            ) : null}

            {item.notes ? (
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="chatbubble-outline" size={16} color={COLORS.MUTED} /></View>
                <Text style={styles.detailLabel}>{t("adminTasks.notes")}</Text>
                <Text style={styles.detailValue}>{item.notes}</Text>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("EditTask", { task: item })}>
                <Ionicons name="pencil" size={16} color={COLORS.PRIMARY} />
                <Text style={[styles.actionBtnText, { color: COLORS.PRIMARY }]}>{t("common.edit")}</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              {canSendOffer && (
                <>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleSendOffer(item)}>
                    <Ionicons name="send" size={16} color={COLORS.SUCCESS} />
                    <Text style={[styles.actionBtnText, { color: COLORS.SUCCESS }]}>{t("adminTasks.sendOffer")}</Text>
                  </TouchableOpacity>
                  <View style={styles.actionDivider} />
                </>
              )}
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteTask(item)}>
                <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
                <Text style={[styles.actionBtnText, { color: COLORS.ERROR }]}>{t("common.delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
          const colorMap = { all: COLORS.TEXT, pending: COLORS.WARNING, active: COLORS.PRIMARY, completed: COLORS.SUCCESS };
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statBox, isActive && styles.statBoxActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.statValue, isActive && { color: colorMap[tab.key] || COLORS.TEXT }]}>{count}</Text>
              <Text style={[styles.statLabel, isActive && styles.statLabelActive]}>{t(tab.i18nKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List — DataState handles loading / error / empty ── */}
      <DataState
        loading={loading}
        error={error}
        empty={!loading && filteredTasks.length === 0}
        emptyIcon="clipboard-outline"
        emptyTitle={t("adminTasks.noTasks")}
        emptyMessage={t("adminTasks.noTasksDesc")}
        onRetry={fetchTasks}
        retryLabel={t("common.retry")}
      >
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : item?.task_no || `task-${index}`
          }
          contentContainerStyle={styles.listContainer}
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

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("CreateTask")}>
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
};

export default AdminTasks;
