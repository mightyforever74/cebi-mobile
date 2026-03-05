// src/screens/admin/AdminReportsScreen.js
// TulipFleet - Admin Raporlar Ekrani
// Updated: i18n full migration

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { reportAPI } from "../../services/api";

const AdminReportsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);
  const [activeTab, setActiveTab] = useState("summary");

  const [summary, setSummary] = useState(null);
  const [vehicleReport, setVehicleReport] = useState([]);
  const [driverReport, setDriverReport] = useState([]);
  const [alertReport, setAlertReport] = useState(null);
  const [taskReport, setTaskReport] = useState(null);

  const DATE_RANGES = [
    { label: t("reports.last7Days", "Son 7 Gün"), days: 7 },
    { label: t("reports.last30Days", "Son 30 Gün"), days: 30 },
    { label: t("reports.last90Days", "Son 90 Gün"), days: 90 },
  ];

  const ALERT_TYPE_LABELS = {
    HARD_BRAKE: t("reports.alertTypes.hardBrake", "Ani Fren"),
    HARD_ACCEL: t("reports.alertTypes.hardAccel", "Sert Hızlanma"),
    HARD_TURN: t("reports.alertTypes.hardTurn", "Sert Viraj"),
    IMPACT: t("reports.alertTypes.impact", "Çarpma"),
    OVERSPEED: t("reports.alertTypes.overspeed", "Hız Aşımı"),
  };

  const TASK_STATUS_LABELS = {
    pending: t("task.statuses.pending", "Bekliyor"),
    assigned: t("task.statuses.assigned", "Atandı"),
    in_progress: t("task.statuses.in_progress", "Devam Ediyor"),
    completed: t("task.statuses.completed", "Tamamlandı"),
    cancelled: t("task.statuses.cancelled", "İptal"),
    pending_review: t("task.statuses.pending_review", "İnceleme Bekliyor"),
  };

  const getDateRange = () => {
    const to = new Date().toISOString();
    const from = new Date(
      Date.now() - selectedRange * 24 * 60 * 60 * 1000
    ).toISOString();
    return { from, to };
  };

  const fetchData = async () => {
    try {
      const { from, to } = getDateRange();

      const [summaryData, vehicleData, driverData, alertData, taskData] =
        await Promise.all([
          reportAPI.getSummary(from, to).catch(() => null),
          reportAPI.getVehicles().catch(() => ({ vehicles: [] })),
          reportAPI.getDrivers().catch(() => ({ drivers: [] })),
          reportAPI.getAlerts(from, to).catch(() => null),
          reportAPI.getTasks(from, to).catch(() => null),
        ]);

      setSummary(summaryData);
      setVehicleReport(vehicleData?.vehicles || []);
      setDriverReport(driverData?.drivers || []);
      setAlertReport(alertData);
      setTaskReport(taskData);
    } catch (error) {
      console.error("Reports error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRange]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedRange]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderSummaryCard = (icon, title, value, subtitle, color) => (
    <View
      style={[
        styles.summaryCard,
        { borderLeftColor: color, minWidth: (width - 44) / 2 },
      ]}
    >
      <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.summaryContent}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryTitle}>{title}</Text>
        {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const renderSummaryTab = () => {
    if (!summary) {
      return (
        <Text style={styles.noData}>
          {t("reports.noData", "Veri yüklenemedi")}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          {t("reports.fleetStatus", "Filo Durumu")}
        </Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "car",
            t("reports.totalVehicles", "Toplam Araç"),
            summary.vehicles?.total_vehicles || 0,
            `${summary.vehicles?.active_vehicles || 0} ${t("reports.active", "aktif")}`,
            COLORS.PRIMARY
          )}
          {renderSummaryCard(
            "people",
            t("reports.totalDrivers", "Toplam Sürücü"),
            summary.drivers?.total_drivers || 0,
            `${summary.drivers?.active_drivers || 0} ${t("reports.active", "aktif")}`,
            COLORS.INFO
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {t("reports.taskSummary", "Görev Özeti")}
        </Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "clipboard",
            t("reports.totalTasks", "Toplam Görev"),
            summary.tasks?.total_tasks || 0,
            null,
            COLORS.WARNING
          )}
          {renderSummaryCard(
            "checkmark-circle",
            t("reports.completed", "Tamamlanan"),
            summary.tasks?.completed_tasks || 0,
            null,
            COLORS.SUCCESS
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {t("reports.alertSummary", "Uyarı Özeti")}
        </Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "warning",
            t("reports.totalAlerts", "Toplam Uyarı"),
            summary.alerts?.total_alerts || 0,
            `${summary.alerts?.resolved_alerts || 0} ${t("reports.resolved", "çözüldü")}`,
            COLORS.ERROR
          )}
          {renderSummaryCard(
            "alert-circle",
            t("reports.criticalAlerts", "Kritik Uyarı"),
            summary.alerts?.critical_alerts || 0,
            null,
            COLORS.ERROR
          )}
        </View>
      </View>
    );
  };

  const renderVehiclesTab = () => {
    if (vehicleReport.length === 0) {
      return (
        <Text style={styles.noData}>
          {t("reports.noVehicleData", "Araç verisi yok")}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          {t("reports.vehiclePerformance", "Araç Performansı")}
        </Text>
        {vehicleReport.map((vehicle) => (
          <Card key={vehicle.id} variant="flat" style={styles.reportCardMargin}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>{vehicle.plate_no}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      vehicle.status === "in_use"
                        ? COLORS.SUCCESS
                        : COLORS.MUTED,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {vehicle.status === "in_use"
                    ? t("reports.statusActive", "Aktif")
                    : t("reports.statusAvailable", "Müsait")}
                </Text>
              </View>
            </View>
            <Text style={styles.reportSubtitle}>
              {vehicle.brand} {vehicle.model}
            </Text>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatValue}>
                  {vehicle.total_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.tasks", "Görev")}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.SUCCESS }]}
                >
                  {vehicle.completed_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.completed", "Tamamlanan")}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatValue, { color: COLORS.ERROR }]}>
                  {vehicle.total_alerts || 0}
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.alerts", "Uyarı")}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderDriversTab = () => {
    if (driverReport.length === 0) {
      return (
        <Text style={styles.noData}>
          {t("reports.noDriverData", "Sürücü verisi yok")}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          {t("reports.driverPerformance", "Sürücü Performansı")}
        </Text>
        {driverReport.map((driver) => (
          <Card key={driver.id} variant="flat" style={styles.reportCardMargin}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>
                {driver.first_name || driver.email?.split("@")[0]}{" "}
                {driver.last_name || ""}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      driver.status === "active"
                        ? COLORS.SUCCESS
                        : COLORS.MUTED,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {driver.status === "active"
                    ? t("reports.statusActive", "Aktif")
                    : t("reports.statusInactive", "Pasif")}
                </Text>
              </View>
            </View>
            <Text style={styles.reportSubtitle}>{driver.email}</Text>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatValue}>
                  {driver.total_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.tasks", "Görev")}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.SUCCESS }]}
                >
                  {driver.completed_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.completed", "Tamamlanan")}
                </Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.PRIMARY }]}
                >
                  {driver.total_tasks > 0
                    ? Math.round(
                        (driver.completed_tasks / driver.total_tasks) * 100
                      )
                    : 0}
                  %
                </Text>
                <Text style={styles.reportStatLabel}>
                  {t("reports.success", "Başarı")}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  };

  const renderAlertsTab = () => {
    if (!alertReport) {
      return (
        <Text style={styles.noData}>
          {t("reports.noAlertData", "Uyarı verisi yok")}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          {t("reports.alertDistribution", "Uyarı Dağılımı")}
        </Text>
        {alertReport.by_type?.length > 0 ? (
          <Card variant="flat">
            {alertReport.by_type.map((item) => {
              const maxCount = Math.max(
                ...alertReport.by_type.map((i) => parseInt(i.count))
              );
              const percentage =
                maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;

              return (
                <View key={item.alert_type} style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {ALERT_TYPE_LABELS[item.alert_type] || item.alert_type}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          width: `${percentage}%`,
                          backgroundColor: COLORS.ERROR,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.count}</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <Text style={styles.noData}>
            {t("reports.noAlertsInPeriod", "Bu dönemde uyarı yok")}
          </Text>
        )}
      </View>
    );
  };

  const renderTasksTab = () => {
    if (!taskReport) {
      return (
        <Text style={styles.noData}>
          {t("reports.noTaskData", "Görev verisi yok")}
        </Text>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>
          {t("reports.taskDistribution", "Görev Dağılımı")}
        </Text>
        {taskReport.by_status?.length > 0 ? (
          <Card variant="flat">
            {taskReport.by_status.map((item) => {
              const maxCount = Math.max(
                ...taskReport.by_status.map((i) => parseInt(i.count))
              );
              const percentage =
                maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
              const color =
                item.status === "completed"
                  ? COLORS.SUCCESS
                  : item.status === "cancelled"
                    ? COLORS.ERROR
                    : COLORS.WARNING;

              return (
                <View key={item.status} style={styles.barRow}>
                  <Text style={styles.barLabel}>
                    {TASK_STATUS_LABELS[item.status] || item.status}
                  </Text>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        { width: `${percentage}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.count}</Text>
                </View>
              );
            })}
          </Card>
        ) : (
          <Text style={styles.noData}>
            {t("reports.noTasksInPeriod", "Bu dönemde görev yok")}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("reports.loading", "Raporlar yükleniyor...")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tarih Secici */}
      <View style={styles.dateSelector}>
        {DATE_RANGES.map((range) => (
          <TouchableOpacity
            key={range.days}
            style={[
              styles.dateButton,
              selectedRange === range.days && styles.dateButtonActive,
            ]}
            onPress={() => setSelectedRange(range.days)}
          >
            <Text
              style={[
                styles.dateButtonText,
                selectedRange === range.days && styles.dateButtonTextActive,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {[
          {
            key: "summary",
            label: t("reports.tabs.summary", "Özet"),
            icon: "stats-chart",
          },
          {
            key: "vehicles",
            label: t("reports.tabs.vehicles", "Araçlar"),
            icon: "car",
          },
          {
            key: "drivers",
            label: t("reports.tabs.drivers", "Sürücüler"),
            icon: "people",
          },
          {
            key: "alerts",
            label: t("reports.tabs.alerts", "Uyarılar"),
            icon: "warning",
          },
          {
            key: "tasks",
            label: t("reports.tabs.tasks", "Görevler"),
            icon: "clipboard",
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={
                activeTab === tab.key ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Icerik */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
          />
        }
      >
        {activeTab === "summary" && renderSummaryTab()}
        {activeTab === "vehicles" && renderVehiclesTab()}
        {activeTab === "drivers" && renderDriversTab()}
        {activeTab === "alerts" && renderAlertsTab()}
        {activeTab === "tasks" && renderTasksTab()}

        <View style={{ height: COLORS.SPACING.lg }} />
      </ScrollView>
    </View>
  );
};

// ============================================
// STYLES
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
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },

    // Date Selector
    dateSelector: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      padding: COLORS.SPACING.sm,
      justifyContent: "space-between",
    },
    dateButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.button,
      backgroundColor: COLORS.BACKGROUND,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    dateButtonActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    dateButtonText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
    },
    dateButtonTextActive: {
      color: COLORS.WHITE,
    },

    // Tab Bar
    tabBar: {
      backgroundColor: COLORS.SURFACE,
      maxHeight: COLORS.SPACING.buttonHeight,
    },
    tabBarContent: {
      paddingHorizontal: COLORS.SPACING.sm,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      marginRight: COLORS.SPACING.sm,
    },
    tabActive: {
      borderBottomColor: COLORS.PRIMARY,
    },
    tabText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
    },
    tabTextActive: {
      color: COLORS.PRIMARY,
    },

    // Content
    content: {
      flex: 1,
      padding: COLORS.SPACING.md,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
    },
    noData: {
      textAlign: "center",
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      paddingVertical: COLORS.SPACING.xxl,
    },

    // Summary Cards
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      borderLeftWidth: COLORS.SPACING.xs,
      marginRight: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    summaryContent: {
      flex: 1,
    },
    summaryValue: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT_PRIMARY,
    },
    summaryTitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    summarySubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginTop: 2,
    },

    // Report Cards
    reportCardMargin: {
      marginBottom: COLORS.SPACING.sm,
    },
    reportHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    reportTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    reportSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.badge,
    },
    statusText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    reportStats: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      paddingTop: COLORS.SPACING.sm,
    },
    reportStat: {
      flex: 1,
      alignItems: "center",
    },
    reportStatValue: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    reportStatLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },

    // Bar Charts
    barRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    barLabel: {
      width: 96,
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
    },
    barContainer: {
      flex: 1,
      height: COLORS.SPACING.lg,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.badge,
      marginHorizontal: COLORS.SPACING.sm,
      overflow: "hidden",
    },
    bar: {
      height: "100%",
      borderRadius: COLORS.RADIUS.badge,
    },
    barValue: {
      width: COLORS.SPACING.xxl,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      textAlign: "right",
    },
  });

export default AdminReportsScreen;
