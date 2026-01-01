// src/screens/admin/AdminReportsScreen.js
// TulipFleet - Admin Raporlar Ekranı

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { reportAPI } from "../../services/api";

const { width } = Dimensions.get("window");

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
};

// Tarih seçenekleri
const DATE_RANGES = [
  { label: "Son 7 Gün", days: 7 },
  { label: "Son 30 Gün", days: 30 },
  { label: "Son 90 Gün", days: 90 },
];

// Alert tip çevirileri
const ALERT_TYPE_LABELS = {
  HARD_BRAKE: "Ani Fren",
  HARD_ACCEL: "Sert Hızlanma",
  HARD_TURN: "Sert Viraj",
  IMPACT: "Çarpma",
  OVERSPEED: "Hız Aşımı",
};

// Görev durum çevirileri
const TASK_STATUS_LABELS = {
  pending: "Bekliyor",
  assigned: "Atandı",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal",
  pending_review: "İnceleme Bekliyor",
};

const AdminReportsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState(30);
  const [activeTab, setActiveTab] = useState("summary");

  // Data states
  const [summary, setSummary] = useState(null);
  const [vehicleReport, setVehicleReport] = useState([]);
  const [driverReport, setDriverReport] = useState([]);
  const [alertReport, setAlertReport] = useState(null);
  const [taskReport, setTaskReport] = useState(null);

  // Tarih hesapla
  const getDateRange = () => {
    const to = new Date().toISOString();
    const from = new Date(
      Date.now() - selectedRange * 24 * 60 * 60 * 1000
    ).toISOString();
    return { from, to };
  };

  // Veri çek
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

      console.log("✅ Reports loaded");
    } catch (error) {
      console.error("❌ Reports error:", error);
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

  // Özet kartı
  const renderSummaryCard = (icon, title, value, subtitle, color) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
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

  // Özet Tab
  const renderSummaryTab = () => {
    if (!summary) {
      return <Text style={styles.noData}>Veri yüklenemedi</Text>;
    }

    return (
      <View>
        {/* Araç & Sürücü */}
        <Text style={styles.sectionTitle}>🚗 Filo Durumu</Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "car",
            "Toplam Araç",
            summary.vehicles?.total_vehicles || 0,
            `${summary.vehicles?.active_vehicles || 0} aktif`,
            COLORS.primary
          )}
          {renderSummaryCard(
            "people",
            "Toplam Sürücü",
            summary.drivers?.total_drivers || 0,
            `${summary.drivers?.active_drivers || 0} aktif`,
            COLORS.info
          )}
        </View>

        {/* Görevler */}
        <Text style={styles.sectionTitle}>📋 Görev Özeti</Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "clipboard",
            "Toplam Görev",
            summary.tasks?.total_tasks || 0,
            null,
            COLORS.warning
          )}
          {renderSummaryCard(
            "checkmark-circle",
            "Tamamlanan",
            summary.tasks?.completed_tasks || 0,
            null,
            COLORS.success
          )}
        </View>

        {/* Uyarılar */}
        <Text style={styles.sectionTitle}>⚠️ Uyarı Özeti</Text>
        <View style={styles.summaryGrid}>
          {renderSummaryCard(
            "warning",
            "Toplam Uyarı",
            summary.alerts?.total_alerts || 0,
            `${summary.alerts?.resolved_alerts || 0} çözüldü`,
            COLORS.danger
          )}
          {renderSummaryCard(
            "alert-circle",
            "Kritik Uyarı",
            summary.alerts?.critical_alerts || 0,
            null,
            COLORS.danger
          )}
        </View>
      </View>
    );
  };

  // Araç Tab
  const renderVehiclesTab = () => {
    if (vehicleReport.length === 0) {
      return <Text style={styles.noData}>Araç verisi yok</Text>;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>🚗 Araç Performansı</Text>
        {vehicleReport.map((vehicle) => (
          <View key={vehicle.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>{vehicle.plate_no}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      vehicle.status === "in_use"
                        ? COLORS.success
                        : COLORS.muted,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {vehicle.status === "in_use" ? "Aktif" : "Müsait"}
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
                <Text style={styles.reportStatLabel}>Görev</Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.success }]}
                >
                  {vehicle.completed_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>Tamamlanan</Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.danger }]}
                >
                  {vehicle.total_alerts || 0}
                </Text>
                <Text style={styles.reportStatLabel}>Uyarı</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Sürücü Tab
  const renderDriversTab = () => {
    if (driverReport.length === 0) {
      return <Text style={styles.noData}>Sürücü verisi yok</Text>;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>👤 Sürücü Performansı</Text>
        {driverReport.map((driver) => (
          <View key={driver.id} style={styles.reportCard}>
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
                        ? COLORS.success
                        : COLORS.muted,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {driver.status === "active" ? "Aktif" : "Pasif"}
                </Text>
              </View>
            </View>
            <Text style={styles.reportSubtitle}>{driver.email}</Text>
            <View style={styles.reportStats}>
              <View style={styles.reportStat}>
                <Text style={styles.reportStatValue}>
                  {driver.total_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>Görev</Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.success }]}
                >
                  {driver.completed_tasks || 0}
                </Text>
                <Text style={styles.reportStatLabel}>Tamamlanan</Text>
              </View>
              <View style={styles.reportStat}>
                <Text
                  style={[styles.reportStatValue, { color: COLORS.primary }]}
                >
                  {driver.total_tasks > 0
                    ? Math.round(
                        (driver.completed_tasks / driver.total_tasks) * 100
                      )
                    : 0}
                  %
                </Text>
                <Text style={styles.reportStatLabel}>Başarı</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Alert Tab
  const renderAlertsTab = () => {
    if (!alertReport) {
      return <Text style={styles.noData}>Uyarı verisi yok</Text>;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>⚠️ Uyarı Dağılımı</Text>

        {/* Tip bazlı */}
        {alertReport.by_type?.length > 0 ? (
          <View style={styles.chartCard}>
            {alertReport.by_type.map((item, index) => {
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
                          backgroundColor: COLORS.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noData}>Bu dönemde uyarı yok 🎉</Text>
        )}
      </View>
    );
  };

  // Task Tab
  const renderTasksTab = () => {
    if (!taskReport) {
      return <Text style={styles.noData}>Görev verisi yok</Text>;
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>📋 Görev Dağılımı</Text>

        {/* Durum bazlı */}
        {taskReport.by_status?.length > 0 ? (
          <View style={styles.chartCard}>
            {taskReport.by_status.map((item) => {
              const maxCount = Math.max(
                ...taskReport.by_status.map((i) => parseInt(i.count))
              );
              const percentage =
                maxCount > 0 ? (parseInt(item.count) / maxCount) * 100 : 0;
              const color =
                item.status === "completed"
                  ? COLORS.success
                  : item.status === "cancelled"
                  ? COLORS.danger
                  : COLORS.warning;

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
          </View>
        ) : (
          <Text style={styles.noData}>Bu dönemde görev yok</Text>
        )}
      </View>
    );
  };

  // Loading
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tarih Seçici */}
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
          { key: "summary", label: "Özet", icon: "stats-chart" },
          { key: "vehicles", label: "Araçlar", icon: "car" },
          { key: "drivers", label: "Sürücüler", icon: "people" },
          { key: "alerts", label: "Uyarılar", icon: "warning" },
          { key: "tasks", label: "Görevler", icon: "clipboard" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? COLORS.primary : COLORS.secondary}
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

      {/* İçerik */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {activeTab === "summary" && renderSummaryTab()}
        {activeTab === "vehicles" && renderVehiclesTab()}
        {activeTab === "drivers" && renderDriversTab()}
        {activeTab === "alerts" && renderAlertsTab()}
        {activeTab === "tasks" && renderTasksTab()}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
  },

  // Date Selector
  dateSelector: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    padding: 12,
    gap: 8,
  },
  dateButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  dateButtonActive: {
    backgroundColor: COLORS.primary,
  },
  dateButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  dateButtonTextActive: {
    color: COLORS.white,
  },

  // Tab Bar
  tabBar: {
    backgroundColor: COLORS.white,
    maxHeight: 50,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.dark,
    marginBottom: 12,
    marginTop: 8,
  },
  noData: {
    textAlign: "center",
    color: COLORS.secondary,
    paddingVertical: 40,
    fontSize: 14,
  },

  // Summary Cards
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: (width - 44) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  summaryTitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  summarySubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Report Cards
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  reportSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  reportStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 12,
  },
  reportStat: {
    flex: 1,
    alignItems: "center",
  },
  reportStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  reportStatLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
  },

  // Chart Card
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  barLabel: {
    width: 100,
    fontSize: 12,
    color: COLORS.dark,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 10,
  },
  barValue: {
    width: 40,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
    textAlign: "right",
  },
});

export default AdminReportsScreen;
