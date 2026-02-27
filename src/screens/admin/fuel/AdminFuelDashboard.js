/**
 * AdminFuelDashboard.js - v3.0
 * TulipFleet - Yakit Analiz & Verimlilik Dashboard
 *
 * Tek dosya, harici component bagimlilik yok.
 * Backend: /api/fuel/company/analytics + /api/fuel/company/savings + /api/fuel/alerts
 *
 * Konum: src/screens/admin/fuel/AdminFuelDashboard.js
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useTheme } from "../../../context/ThemeContext";
import { useThemedStyles } from "../../../hooks/useThemedStyles";
import api from "../../../services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// HELPERS
// ============================================

const fmt = (val, decimals = 1) => {
  const n = parseFloat(val);
  if (isNaN(n)) return "\u2014";
  return n.toFixed(decimals);
};

const fmtMoney = (val, symbol = "\u20BA") => {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return `${symbol}0`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}k`;
  return `${symbol}${n.toFixed(0)}`;
};

const fmtKm = (val) => {
  const n = parseInt(val);
  if (isNaN(n) || n === 0) return "0";
  return n.toLocaleString("tr-TR");
};

const getPerformanceColor = (perf) => {
  switch (perf) {
    case "excellent":
      return "#10B981";
    case "good":
      return "#3B82F6";
    case "average":
      return "#F59E0B";
    case "poor":
      return "#EF4444";
    default:
      return "#9CA3AF";
  }
};

const getPerformanceLabel = (perf, t) => {
  switch (perf) {
    case "excellent":
      return t("fuelDash.excellent", "M\u00FCkemmel");
    case "good":
      return t("fuelDash.good", "\u0130yi");
    case "average":
      return t("fuelDash.average", "Normal");
    case "poor":
      return t("fuelDash.poor", "K\u00F6t\u00FC");
    default:
      return "\u2014";
  }
};

const getPerformanceIcon = (perf) => {
  switch (perf) {
    case "excellent":
      return "trending-down";
    case "good":
      return "checkmark-circle";
    case "average":
      return "remove-circle";
    case "poor":
      return "trending-up";
    default:
      return "help-circle";
  }
};

// ============================================
// COMPONENT
// ============================================

const AdminFuelDashboard = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || "tr";
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const currencySymbol =
    currentLang === "tr"
      ? "\u20BA"
      : currentLang === "bg"
        ? "\u043B\u0432"
        : "\u20AC";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [savings, setSavings] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [expandedVehicle, setExpandedVehicle] = useState(null);

  // ============================================
  // DATA FETCH
  // ============================================

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, savingsRes, alertsRes] = await Promise.allSettled([
        api.get("/api/fuel/company/analytics"),
        api.get("/api/fuel/company/savings"),
        api.get("/api/fuel/alerts"),
      ]);

      // fuel.js returns { data: { summary, vehicles, alerts } }
      // savings returns { data: { has_baseline, baseline, savings, trend } }
      // alerts returns { data: [...] }
      if (analyticsRes.status === "fulfilled") {
        const d = analyticsRes.value?.data?.data || analyticsRes.value?.data;
        if (d?.summary) setAnalytics(d);
      }
      if (savingsRes.status === "fulfilled") {
        const d = savingsRes.value?.data?.data || savingsRes.value?.data;
        if (d) setSavings(d);
      }
      if (alertsRes.status === "fulfilled") {
        const d = alertsRes.value?.data?.data || alertsRes.value?.data;
        if (Array.isArray(d)) setAlerts(d);
      }
    } catch (err) {
      console.error("[FuelDash] Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ============================================
  // RENDER: SUMMARY CARDS
  // ============================================

  const renderSummaryCards = () => {
    const summary = analytics?.summary;
    if (!summary) return null;

    const cards = [
      {
        icon: "speedometer",
        iconColor: "#3B82F6",
        value: `${fmt(summary.avg_consumption)} L/100`,
        label: t("fuelDash.avgConsumption", "Ort. T\u00FCketim"),
      },
      {
        icon: "car",
        iconColor: "#10B981",
        value: `${summary.total_vehicles}`,
        label: t("fuelDash.vehicles", "Ara\u00E7"),
        sub: `${summary.total_records} ${t("fuelDash.records", "kay\u0131t")}`,
      },
      {
        icon: "navigate",
        iconColor: "#F59E0B",
        value: fmtKm(summary.total_km),
        label: t("fuelDash.totalKm", "Toplam KM"),
        sub: "km",
      },
      {
        icon: "card",
        iconColor: "#8B5CF6",
        value: fmtMoney(summary.total_cost, currencySymbol),
        label: t("fuelDash.totalCost", "Toplam Maliyet"),
      },
    ];

    return (
      <View style={styles.cardsRow}>
        {cards.map((c, i) => (
          <View key={i} style={styles.summaryCard}>
            <View
              style={[
                styles.cardIconBg,
                { backgroundColor: c.iconColor + "18" },
              ]}
            >
              <Ionicons name={c.icon} size={20} color={c.iconColor} />
            </View>
            <Text style={styles.cardValue}>{c.value}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
            {c.sub && <Text style={styles.cardSub}>{c.sub}</Text>}
          </View>
        ))}
      </View>
    );
  };

  // ============================================
  // RENDER: SAVINGS / ROI
  // ============================================

  const renderSavings = () => {
    if (!savings || !savings.has_baseline) {
      const recordCount = analytics?.summary?.total_records || 0;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="trending-down" size={16} color={COLORS.PRIMARY} />{" "}
            {t("fuelDash.savingsTitle", "Tasarruf Analizi")}
          </Text>
          <View style={styles.emptyCard}>
            <Ionicons
              name="hourglass-outline"
              size={32}
              color={COLORS.TEXT_MUTED}
            />
            <Text style={styles.emptyText}>
              {t(
                "fuelDash.needMoreData",
                "Analiz i\u00E7in en az 10 kay\u0131t gerekli"
              )}
            </Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((recordCount / 10) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.emptySubText}>
              {recordCount}/10 {t("fuelDash.records", "kay\u0131t")}
            </Text>
          </View>
        </View>
      );
    }

    const s = savings.savings;
    const improvement = parseFloat(s.consumption_improvement_percent);
    const isImproved = improvement > 0;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="trending-down" size={16} color={COLORS.PRIMARY} />{" "}
          {t("fuelDash.savingsTitle", "Tasarruf Analizi")}
        </Text>

        {/* Main savings card */}
        <View
          style={[
            styles.savingsCard,
            isImproved ? styles.savingsPositive : styles.savingsNegative,
          ]}
        >
          <View style={styles.savingsTop}>
            <View>
              <Text style={styles.savingsBigNumber}>
                {isImproved ? "\u2193" : "\u2191"} %
                {Math.abs(improvement).toFixed(1)}
              </Text>
              <Text style={styles.savingsLabel}>
                {isImproved
                  ? t("fuelDash.improved", "Verimlilik Art\u0131\u015F\u0131")
                  : t(
                      "fuelDash.worsened",
                      "Verimlilik D\u00FC\u015F\u00FC\u015F\u00FC"
                    )}
              </Text>
            </View>
            <View style={styles.savingsRight}>
              <Text style={styles.savingsMoneyLabel}>
                {t("fuelDash.totalSavings", "Toplam Tasarruf")}
              </Text>
              <Text
                style={[
                  styles.savingsMoney,
                  !isImproved && { color: "#EF4444" },
                ]}
              >
                {isImproved ? "+" : "-"}
                {fmtMoney(Math.abs(parseFloat(s.money_saved)), currencySymbol)}
              </Text>
            </View>
          </View>

          <View style={styles.savingsDetails}>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>
                {t("fuelDash.baseline", "Ba\u015Flang\u0131\u00E7")}
              </Text>
              <Text style={styles.detailValue}>
                {fmt(savings.baseline.consumption)} L/100
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>
                {t("fuelDash.current", "G\u00FCncel")}
              </Text>
              <Text style={styles.detailValue}>
                {fmt(savings.current.consumption)} L/100
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>CO\u2082</Text>
              <Text style={styles.detailValue}>
                {fmt(s.co2_saved_kg, 0)} kg
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>
                {t("fuelDash.yearly", "Y\u0131ll\u0131k Proj.")}
              </Text>
              <Text style={styles.detailValue}>
                {fmtMoney(s.yearly_projection, currencySymbol)}
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly trend mini bars */}
        {savings.trend && savings.trend.length > 0 && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendTitle}>
              {t("fuelDash.monthlyTrend", "Ayl\u0131k T\u00FCketim Trendi")}
            </Text>
            <View style={styles.trendBars}>
              {savings.trend.map((m, i) => {
                const val = parseFloat(m.avg_consumption) || 0;
                const maxVal = Math.max(
                  ...savings.trend.map(
                    (x) => parseFloat(x.avg_consumption) || 0
                  ),
                  1
                );
                const height = (val / maxVal) * 60;
                const baseVal = parseFloat(savings.baseline.consumption) || 0;
                const barColor = val <= baseVal ? "#10B981" : "#EF4444";

                return (
                  <View key={i} style={styles.trendBarCol}>
                    <Text style={styles.trendBarValue}>{fmt(val)}</Text>
                    <View
                      style={[
                        styles.trendBar,
                        { height, backgroundColor: barColor },
                      ]}
                    />
                    <Text style={styles.trendBarMonth}>
                      {m.month.substring(5)}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.baselineLabel}>
              \u2014 {t("fuelDash.baselineLine", "Ba\u015Flang\u0131\u00E7")}:{" "}
              {fmt(savings.baseline.consumption)} L/100
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // RENDER: VEHICLE RANKING
  // ============================================

  const renderVehicleRanking = () => {
    const vehicles = analytics?.vehicles;
    if (!vehicles || vehicles.length === 0) return null;

    const fleetAvg = parseFloat(analytics.summary.avg_consumption) || 0;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="podium" size={16} color={COLORS.PRIMARY} />{" "}
            {t("fuelDash.vehicleRanking", "Ara\u00E7 Verimlili\u011Fi")}
          </Text>
          <Text style={styles.fleetAvgBadge}>
            {t("fuelDash.fleetAvg", "Filo Ort.")} {fmt(fleetAvg)} L/100
          </Text>
        </View>

        {vehicles.map((v, idx) => {
          const avg = parseFloat(v.avg_consumption) || 0;
          const deviation = parseFloat(v.deviation_percent) || 0;
          const perfColor = getPerformanceColor(v.performance);
          const isExpanded = expandedVehicle === v.vehicle_id;
          const totalKm = parseInt(v.total_km) || 0;

          return (
            <TouchableOpacity
              key={v.vehicle_id}
              style={styles.vehicleCard}
              onPress={() =>
                setExpandedVehicle(isExpanded ? null : v.vehicle_id)
              }
              activeOpacity={0.7}
            >
              {/* Main Row */}
              <View style={styles.vehicleMainRow}>
                {/* Rank */}
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: perfColor + "18" },
                  ]}
                >
                  <Text style={[styles.rankText, { color: perfColor }]}>
                    {idx + 1}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehiclePlate}>{v.plate_no}</Text>
                  <Text style={styles.vehicleDriver}>{v.driver_name}</Text>
                </View>

                {/* Consumption */}
                <View style={styles.vehicleStats}>
                  <Text
                    style={[styles.vehicleConsumption, { color: perfColor }]}
                  >
                    {avg > 0 ? fmt(avg) : "\u2014"} L/100
                  </Text>
                  <View style={styles.deviationRow}>
                    <Ionicons
                      name={getPerformanceIcon(v.performance)}
                      size={14}
                      color={perfColor}
                    />
                    <Text style={[styles.deviationText, { color: perfColor }]}>
                      {deviation > 0 ? "+" : ""}
                      {fmt(deviation, 0)}%
                    </Text>
                  </View>
                </View>

                {/* Performance badge */}
                <View
                  style={[styles.perfBadge, { backgroundColor: perfColor }]}
                >
                  <Text style={styles.perfBadgeText}>
                    {getPerformanceLabel(v.performance, t)}
                  </Text>
                </View>
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View style={styles.vehicleExpanded}>
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.records", "Kay\u0131t")}
                      </Text>
                      <Text style={styles.expandedValue}>{v.record_count}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>KM</Text>
                      <Text style={styles.expandedValue}>{fmtKm(totalKm)}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.liters", "Litre")}
                      </Text>
                      <Text style={styles.expandedValue}>
                        {fmt(v.total_liters, 0)} L
                      </Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.cost", "Maliyet")}
                      </Text>
                      <Text style={styles.expandedValue}>
                        {fmtMoney(v.total_cost, currencySymbol)}
                      </Text>
                    </View>
                  </View>

                  {/* Consumption bar vs fleet avg */}
                  <View style={styles.comparisonBar}>
                    <Text style={styles.comparisonLabel}>
                      {t("fuelDash.vsFleet", "Filoya g\u00F6re")}:
                    </Text>
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${Math.min((avg / (fleetAvg * 1.5)) * 100, 100)}%`,
                            backgroundColor: perfColor,
                          },
                        ]}
                      />
                      {/* Fleet avg marker */}
                      <View
                        style={[
                          styles.barMarker,
                          {
                            left: `${Math.min((fleetAvg / (fleetAvg * 1.5)) * 100, 100)}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Detail button */}
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() =>
                      navigation.navigate("VehicleFuelDetail", {
                        vehicleId: v.vehicle_id,
                        vehiclePlate: v.plate_no,
                      })
                    }
                  >
                    <Text style={styles.detailButtonText}>
                      {t(
                        "fuelDash.viewDetail",
                        "Detay G\u00F6r\u00FCnt\u00FCle"
                      )}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ============================================
  // RENDER: ALERTS
  // ============================================

  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="warning" size={16} color="#F59E0B" />{" "}
          {t("fuelDash.alerts", "Uyar\u0131lar")} ({alerts.length})
        </Text>
        {alerts.slice(0, 5).map((a, i) => (
          <View
            key={i}
            style={[
              styles.alertCard,
              a.severity === "warning" ? styles.alertWarning : styles.alertInfo,
            ]}
          >
            <View style={styles.alertLeft}>
              <Ionicons
                name={a.type === "high_consumption" ? "flame" : "alert-circle"}
                size={20}
                color={a.severity === "warning" ? "#F59E0B" : "#3B82F6"}
              />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertPlate}>{a.plate_no}</Text>
              <Text style={styles.alertMessage}>{a.message}</Text>
              {a.driver_name && (
                <Text style={styles.alertDriver}>{a.driver_name}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // ============================================
  // RENDER: CO2 SUMMARY
  // ============================================

  const renderCO2 = () => {
    const co2 = parseFloat(analytics?.summary?.co2_emissions_kg) || 0;
    if (co2 === 0) return null;

    const co2Tons = co2 / 1000;
    const trees = Math.ceil(co2 / 21);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="leaf" size={16} color="#10B981" />{" "}
          {t("fuelDash.co2Title", "Karbon Ayak \u0130zi")}
        </Text>
        <View style={styles.co2Card}>
          <View style={styles.co2Item}>
            <Ionicons name="globe-outline" size={28} color="#3B82F6" />
            <Text style={styles.co2Value}>{fmt(co2Tons, 2)} ton</Text>
            <Text style={styles.co2Label}>
              CO\u2082 {t("fuelDash.emission", "Emisyon")}
            </Text>
          </View>
          <View style={styles.co2Divider} />
          <View style={styles.co2Item}>
            <Ionicons name="leaf-outline" size={28} color="#10B981" />
            <Text style={styles.co2Value}>{trees}</Text>
            <Text style={styles.co2Label}>
              {t("fuelDash.treesNeeded", "A\u011Fa\u00E7 Gerekli")}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("common.loading", "Y\u00FCkleniyor...")}
        </Text>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        {renderSummaryCards()}

        {/* Alerts */}
        {renderAlerts()}

        {/* Savings / ROI */}
        {renderSavings()}

        {/* Vehicle Ranking */}
        {renderVehicleRanking()}

        {/* CO2 */}
        {renderCO2()}

        <View style={{ height: 32 }} />
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
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.md,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_MUTED,
    },
    scrollContent: {
      padding: COLORS.SPACING.md,
    },

    // Summary Cards (2x2 grid)
    cardsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.md,
    },
    summaryCard: {
      width: (SCREEN_WIDTH - COLORS.SPACING.md * 3) / 2,
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    cardIconBg: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    cardValue: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    cardLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginTop: 2,
    },
    cardSub: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      fontSize: 10,
    },

    // Section
    section: {
      marginBottom: COLORS.SPACING.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    fleetAvgBadge: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      backgroundColor: COLORS.PRIMARY + "15",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 3,
      borderRadius: COLORS.RADIUS.sm,
    },

    // Empty state
    emptyCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    emptyText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.sm,
      textAlign: "center",
    },
    emptySubText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    progressBarBg: {
      width: "80%",
      height: 6,
      backgroundColor: COLORS.DIVIDER,
      borderRadius: 3,
      marginTop: COLORS.SPACING.sm,
      overflow: "hidden",
    },
    progressBarFill: {
      height: 6,
      backgroundColor: COLORS.PRIMARY,
      borderRadius: 3,
    },

    // Savings Card
    savingsCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      borderLeftWidth: 4,
      ...COLORS.SHADOWS.card,
    },
    savingsPositive: {
      borderLeftColor: "#10B981",
    },
    savingsNegative: {
      borderLeftColor: "#EF4444",
    },
    savingsTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    savingsBigNumber: {
      fontSize: 28,
      fontWeight: "800",
      color: COLORS.TEXT,
    },
    savingsLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginTop: 2,
    },
    savingsRight: {
      alignItems: "flex-end",
    },
    savingsMoneyLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },
    savingsMoney: {
      fontSize: 20,
      fontWeight: "700",
      color: "#10B981",
    },
    savingsDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    savingsDetailItem: {
      alignItems: "center",
      flex: 1,
    },
    detailLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 10,
    },
    detailValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: 2,
    },

    // Trend bars
    trendContainer: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    trendTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.sm,
    },
    trendBars: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "flex-end",
      height: 90,
    },
    trendBarCol: {
      alignItems: "center",
      flex: 1,
    },
    trendBarValue: {
      fontSize: 9,
      color: COLORS.TEXT_MUTED,
      marginBottom: 2,
    },
    trendBar: {
      width: 20,
      borderRadius: 4,
      minHeight: 4,
    },
    trendBarMonth: {
      fontSize: 10,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 4,
    },
    baselineLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      fontSize: 10,
    },

    // Vehicle Ranking
    vehicleCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    vehicleMainRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    rankText: {
      fontWeight: "800",
      fontSize: 13,
    },
    vehicleInfo: {
      flex: 1,
    },
    vehiclePlate: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    vehicleDriver: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 11,
    },
    vehicleStats: {
      alignItems: "flex-end",
      marginRight: COLORS.SPACING.sm,
    },
    vehicleConsumption: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    deviationRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    deviationText: {
      fontSize: 11,
      fontWeight: "600",
      marginLeft: 2,
    },
    perfBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    perfBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },

    // Vehicle Expanded
    vehicleExpanded: {
      marginTop: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    expandedRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    expandedItem: {
      alignItems: "center",
      flex: 1,
    },
    expandedLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 10,
    },
    expandedValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: 2,
    },
    comparisonBar: {
      marginBottom: COLORS.SPACING.sm,
    },
    comparisonLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginBottom: 4,
      fontSize: 10,
    },
    barBg: {
      height: 8,
      backgroundColor: COLORS.DIVIDER,
      borderRadius: 4,
      overflow: "hidden",
      position: "relative",
    },
    barFill: {
      height: 8,
      borderRadius: 4,
    },
    barMarker: {
      position: "absolute",
      top: -2,
      width: 2,
      height: 12,
      backgroundColor: COLORS.TEXT,
      borderRadius: 1,
    },
    detailButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
    },
    detailButtonText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Alerts
    alertCard: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
      borderLeftWidth: 3,
    },
    alertWarning: {
      borderLeftColor: "#F59E0B",
    },
    alertInfo: {
      borderLeftColor: "#3B82F6",
    },
    alertLeft: {
      marginRight: COLORS.SPACING.sm,
      paddingTop: 2,
    },
    alertContent: {
      flex: 1,
    },
    alertPlate: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    alertMessage: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 1,
    },
    alertDriver: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 10,
      marginTop: 1,
    },

    // CO2
    co2Card: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    co2Item: {
      flex: 1,
      alignItems: "center",
    },
    co2Divider: {
      width: 1,
      height: 48,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.md,
    },
    co2Value: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.xs,
    },
    co2Label: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginTop: 2,
    },
  });

export default AdminFuelDashboard;
