/**
 * AdminFuelDashboard.js - v4.2
 * Phase 0: DataState loading + import cleanup
 * TulipFleet - Akilli Yakit & Verimlilik Dashboard
 *
 * Phase 0 foundation: DataState (loading), kendi iç state yapıları korundu.
 * Backend: /api/fuel/company/analytics + /api/fuel/company/savings + /api/fuel/alerts
 *
 * Ozellikler:
 *  1. Patrona Rapor ROI Karti
 *  2. Ozet Kartlar (Tuketim, Arac, KM, Maliyet)
 *  3. Tasarruf Analizi + Aylik Trend
 *  4. Arac Verimliligi + Surucu Liderlik (Gamification)
 *  5. EU CSRD Uyumluluk Skoru
 *  6. Sektor Benchmarking
 *  7. CO2 Ayak Izi
 *  8. Uyarilar
 *
 * Konum: src/screens/admin/fuel/AdminFuelDashboard.js
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DataState from "../../../components/ui/DataState";
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
  if (n >= 1000000) return `${symbol}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(1)}k`;
  return `${symbol}${n.toFixed(0)}`;
};

const fmtKm = (val) => {
  const n = parseInt(val);
  if (isNaN(n) || n === 0) return "0";
  return n.toLocaleString("tr-TR");
};

// Performance helpers - use COLORS tokens passed at render time
const PERF_COLORS = {
  excellent: "#10B981",
  good: "#3B82F6",
  average: "#F59E0B",
  poor: "#EF4444",
  default: "#9CA3AF",
};

const getPerformanceColor = (perf) => PERF_COLORS[perf] || PERF_COLORS.default;

const getPerformanceLabel = (perf, t) => {
  switch (perf) {
    case "excellent":
      return t("fuelDash.excellent");
    case "good":
      return t("fuelDash.good");
    case "average":
      return t("fuelDash.average");
    case "poor":
      return t("fuelDash.poor");
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
// SECTOR BENCHMARKS (L/100km)
// ============================================
const SECTOR_BENCHMARKS = {
  heavy_truck: {
    i18nKey: "fuelDash.bmHeavyTruck",
    avg: 30,
    good: 27,
    excellent: 24,
  },
  medium_truck: {
    i18nKey: "fuelDash.bmMediumTruck",
    avg: 22,
    good: 19,
    excellent: 16,
  },
  light_commercial: {
    i18nKey: "fuelDash.bmLightCommercial",
    avg: 10,
    good: 8.5,
    excellent: 7,
  },
  van: { i18nKey: "fuelDash.bmVan", avg: 9, good: 7.5, excellent: 6.5 },
  car: { i18nKey: "fuelDash.bmCar", avg: 7, good: 6, excellent: 5 },
};

// EU 2026 CO2 limit (g/km) - commercial vehicles
const EU_2026_LIMIT = 225;
const CO2_PER_LITER = { diesel: 2.68, gasoline: 2.31, lpg: 1.51 };

// ============================================
// DRIVER SCORE CALCULATOR
// ============================================
const calculateDriverScore = (vehicle, fleetAvg) => {
  let score = 50;
  const avg = parseFloat(vehicle.avg_consumption) || 0;
  const records = parseInt(vehicle.record_count) || 0;
  const deviation = parseFloat(vehicle.deviation_percent) || 0;

  if (records >= 10) score += 15;
  else if (records >= 5) score += 8;
  else if (records >= 3) score += 3;

  if (avg > 0 && fleetAvg > 0) {
    const ratio = avg / fleetAvg;
    if (ratio < 0.85) score += 25;
    else if (ratio < 0.95) score += 15;
    else if (ratio < 1.05) score += 5;
    else if (ratio > 1.15) score -= 10;
  }

  const absDev = Math.abs(deviation);
  if (absDev < 5) score += 10;
  else if (absDev < 10) score += 5;
  else if (absDev > 20) score -= 5;

  return Math.max(0, Math.min(100, score));
};

const getDriverBadges = (score, vehicle, fleetAvg) => {
  const badges = [];
  const avg = parseFloat(vehicle.avg_consumption) || 0;
  const records = parseInt(vehicle.record_count) || 0;
  const deviation = Math.abs(parseFloat(vehicle.deviation_percent) || 0);

  if (avg > 0 && fleetAvg > 0 && avg < fleetAvg * 0.9) {
    badges.push({
      icon: "leaf",
      color: PERF_COLORS.excellent,
      label: "Eko Sürüş",
    });
  }
  if (records >= 10) {
    badges.push({
      icon: "calendar",
      color: PERF_COLORS.good,
      label: "Düzenli",
    });
  }
  if (deviation < 5 && records >= 5) {
    badges.push({ icon: "analytics", color: "#8B5CF6", label: "Tutarlı" });
  }
  if (score >= 85) {
    badges.push({ icon: "star", color: PERF_COLORS.average, label: "Yıldız" });
  }
  return badges;
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
    currentLang === "tr" ? "₺" : currentLang === "bg" ? "лв" : "€";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [savings, setSavings] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [selectedBenchmark, setSelectedBenchmark] =
    useState("light_commercial");

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
  // 1. ROI CARD (Patrona Rapor)
  // ============================================

  const renderROICard = () => {
    if (!savings || !savings.has_baseline || !analytics?.summary) return null;

    const s = savings.savings;
    const moneySaved = parseFloat(s.money_saved) || 0;
    const yearlyProj = parseFloat(s.yearly_projection) || 0;
    const vehicleCount = parseInt(analytics.summary.total_vehicles) || 1;
    const monthlySubCost = vehicleCount * 15;
    const roi =
      monthlySubCost > 0
        ? Math.round(Math.abs(moneySaved) / monthlySubCost)
        : 0;
    const improvement = parseFloat(s.consumption_improvement_percent) || 0;
    const isPositive = improvement > 0;

    if (Math.abs(moneySaved) < 1) return null;

    return (
      <View
        style={[
          styles.roiCard,
          isPositive ? styles.roiPositive : styles.roiNegative,
        ]}
      >
        <View style={styles.roiHeader}>
          <View
            style={[
              styles.roiBadge,
              {
                backgroundColor: isPositive
                  ? PERF_COLORS.excellent
                  : PERF_COLORS.poor,
              },
            ]}
          >
            <Ionicons
              name={isPositive ? "trending-down" : "trending-up"}
              size={20}
              color="#FFF"
            />
          </View>
          <Text style={styles.roiTitle}>
            {isPositive ? t("fuelDash.roiTitle") : t("fuelDash.roiTitleNeg")}
          </Text>
        </View>

        {isPositive ? (
          <View>
            <Text style={styles.roiMainText}>
              {t("fuelDash.roiThisPeriod")}{" "}
              <Text style={styles.roiHighlight}>
                {fmtMoney(Math.abs(moneySaved), currencySymbol)}
              </Text>{" "}
              {t("fuelDash.roiSaved")}.
            </Text>
            <Text style={styles.roiSubText}>
              {t("fuelDash.roiYearly")}:{" "}
              <Text style={styles.roiBold}>
                {fmtMoney(yearlyProj, currencySymbol)}
              </Text>
            </Text>
            {roi >= 2 && (
              <View style={styles.roiBadgeRow}>
                <View style={styles.roiMultiplier}>
                  <Text style={styles.roiMultiplierText}>{roi}x</Text>
                </View>
                <Text style={styles.roiMultiplierLabel}>
                  {t("fuelDash.roiMultiplier")}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.roiMainText}>
              {t("fuelDash.roiFleetVs")}{" "}
              <Text style={[styles.roiHighlight, { color: PERF_COLORS.poor }]}>
                %{Math.abs(improvement).toFixed(1)}
              </Text>{" "}
              {t("fuelDash.roiMoreFuel")}.
            </Text>
            <Text style={styles.roiSubText}>
              {t("fuelDash.roiExtra")}:{" "}
              {fmtMoney(Math.abs(moneySaved), currencySymbol)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // 2. SUMMARY CARDS
  // ============================================

  const renderSummaryCards = () => {
    const summary = analytics?.summary;
    if (!summary) return null;

    const cards = [
      {
        icon: "speedometer",
        iconColor: PERF_COLORS.good,
        value: `${fmt(summary.avg_consumption)} L/100`,
        label: t("fuelDash.avgConsumption"),
      },
      {
        icon: "car",
        iconColor: PERF_COLORS.excellent,
        value: `${summary.total_vehicles}`,
        label: t("fuelDash.vehicles"),
        sub: `${summary.total_records} ${t("fuelDash.records")}`,
      },
      {
        icon: "navigate",
        iconColor: PERF_COLORS.average,
        value: fmtKm(summary.total_km),
        label: t("fuelDash.totalKm"),
        sub: "km",
      },
      {
        icon: "card",
        iconColor: "#8B5CF6",
        value: fmtMoney(summary.total_cost, currencySymbol),
        label: t("fuelDash.totalCost"),
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
  // 3. SAVINGS / ROI
  // ============================================

  const renderSavings = () => {
    if (!savings || !savings.has_baseline) {
      const recordCount = analytics?.summary?.total_records || 0;
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="trending-down" size={16} color={COLORS.PRIMARY} />{" "}
            {t("fuelDash.savingsTitle")}
          </Text>
          <View style={styles.emptyCard}>
            <Ionicons
              name="hourglass-outline"
              size={32}
              color={COLORS.TEXT_MUTED}
            />
            <Text style={styles.emptyText}>{t("fuelDash.needMoreData")}</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min((recordCount / 10) * 100, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.emptySubText}>
              {recordCount}/10 {t("fuelDash.records")}
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
          {t("fuelDash.savingsTitle")}
        </Text>

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
                {isImproved ? t("fuelDash.improved") : t("fuelDash.worsened")}
              </Text>
            </View>
            <View style={styles.savingsRight}>
              <Text style={styles.savingsMoneyLabel}>
                {t("fuelDash.totalSavings")}
              </Text>
              <Text
                style={[
                  styles.savingsMoney,
                  !isImproved && { color: PERF_COLORS.poor },
                ]}
              >
                {isImproved ? "+" : "-"}
                {fmtMoney(Math.abs(parseFloat(s.money_saved)), currencySymbol)}
              </Text>
            </View>
          </View>

          <View style={styles.savingsDetails}>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>{t("fuelDash.baseline")}</Text>
              <Text style={styles.detailValue}>
                {fmt(savings.baseline.consumption)} L/100
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>{t("fuelDash.current")}</Text>
              <Text style={styles.detailValue}>
                {fmt(savings.current.consumption)} L/100
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>{"CO\u2082"}</Text>
              <Text style={styles.detailValue}>
                {fmt(s.co2_saved_kg, 0)} kg
              </Text>
            </View>
            <View style={styles.savingsDetailItem}>
              <Text style={styles.detailLabel}>{t("fuelDash.yearly")}</Text>
              <Text style={styles.detailValue}>
                {fmtMoney(s.yearly_projection, currencySymbol)}
              </Text>
            </View>
          </View>
        </View>

        {savings.trend && savings.trend.length > 0 && (
          <View style={styles.trendContainer}>
            <Text style={styles.trendTitle}>{t("fuelDash.monthlyTrend")}</Text>
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
                const barColor =
                  val <= baseVal ? PERF_COLORS.excellent : PERF_COLORS.poor;
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
              {"\u2014"} {t("fuelDash.baselineLine")}:{" "}
              {fmt(savings.baseline.consumption)} L/100
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ============================================
  // 4. VEHICLE RANKING + DRIVER LEADERBOARD
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
            {t("fuelDash.vehicleRanking")}
          </Text>
          <Text style={styles.fleetAvgBadge}>
            {t("fuelDash.fleetAvg")} {fmt(fleetAvg)} L/100
          </Text>
        </View>

        {vehicles.map((v, idx) => {
          const avg = parseFloat(v.avg_consumption) || 0;
          const deviation = parseFloat(v.deviation_percent) || 0;
          const perfColor = getPerformanceColor(v.performance);
          const isExpanded = expandedVehicle === v.vehicle_id;
          const totalKm = parseInt(v.total_km) || 0;
          const driverScore = calculateDriverScore(v, fleetAvg);
          const badges = getDriverBadges(driverScore, v, fleetAvg);

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
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehiclePlate}>{v.plate_no}</Text>
                  <Text style={styles.vehicleDriver}>
                    {v.driver_name || t("fuelDash.unassigned")}
                  </Text>
                </View>
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
                <View
                  style={[styles.perfBadge, { backgroundColor: perfColor }]}
                >
                  <Text style={styles.perfBadgeText}>
                    {getPerformanceLabel(v.performance, t)}
                  </Text>
                </View>
              </View>

              {/* Expanded */}
              {isExpanded && (
                <View style={styles.vehicleExpanded}>
                  {/* Driver Score */}
                  {v.driver_name && (
                    <View style={styles.driverScoreSection}>
                      <View style={styles.driverScoreRow}>
                        <View style={styles.scoreCircle}>
                          <Text
                            style={[
                              styles.scoreCircleText,
                              {
                                color:
                                  driverScore >= 70
                                    ? PERF_COLORS.excellent
                                    : driverScore >= 50
                                      ? PERF_COLORS.average
                                      : PERF_COLORS.poor,
                              },
                            ]}
                          >
                            {driverScore}
                          </Text>
                          <Text style={styles.scoreCircleLabel}>
                            {t("fuelDash.driverScore")}
                          </Text>
                        </View>
                        <View style={styles.badgesContainer}>
                          {badges.length > 0 ? (
                            badges.map((b, bi) => (
                              <View
                                key={bi}
                                style={[
                                  styles.badge,
                                  { backgroundColor: b.color + "15" },
                                ]}
                              >
                                <Ionicons
                                  name={b.icon}
                                  size={12}
                                  color={b.color}
                                />
                                <Text
                                  style={[styles.badgeText, { color: b.color }]}
                                >
                                  {b.label}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noBadgeText}>
                              {t("fuelDash.noBadge")}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Stats */}
                  <View style={styles.expandedRow}>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.records")}
                      </Text>
                      <Text style={styles.expandedValue}>{v.record_count}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>KM</Text>
                      <Text style={styles.expandedValue}>{fmtKm(totalKm)}</Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.liters")}
                      </Text>
                      <Text style={styles.expandedValue}>
                        {fmt(v.total_liters, 0)} L
                      </Text>
                    </View>
                    <View style={styles.expandedItem}>
                      <Text style={styles.expandedLabel}>
                        {t("fuelDash.cost")}
                      </Text>
                      <Text style={styles.expandedValue}>
                        {fmtMoney(v.total_cost, currencySymbol)}
                      </Text>
                    </View>
                  </View>

                  {/* Comparison bar */}
                  <View style={styles.comparisonBar}>
                    <Text style={styles.comparisonLabel}>
                      {t("fuelDash.vsFleet")}:
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
                      {t("fuelDash.viewDetail")}
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
  // 5. EU CSRD COMPLIANCE
  // ============================================

  const renderEUCompliance = () => {
    const vehicles = analytics?.vehicles;
    const summary = analytics?.summary;
    if (!vehicles || vehicles.length === 0) return null;

    const fleetAvg = parseFloat(summary?.avg_consumption) || 0;
    const fleetGKm = (fleetAvg / 100) * CO2_PER_LITER.diesel * 1000;

    const compliantCount = vehicles.filter((v) => {
      const avg = parseFloat(v.avg_consumption) || 0;
      const gkm = (avg / 100) * CO2_PER_LITER.diesel * 1000;
      return gkm <= EU_2026_LIMIT;
    }).length;

    const overLimitCount = vehicles.length - compliantCount;
    const compliancePercent =
      vehicles.length > 0
        ? Math.round((compliantCount / vehicles.length) * 100)
        : 0;
    const improvementNeeded =
      fleetGKm > EU_2026_LIMIT
        ? (((fleetGKm - EU_2026_LIMIT) / fleetGKm) * 100).toFixed(1)
        : 0;

    const compColor =
      compliancePercent >= 80
        ? PERF_COLORS.excellent
        : compliancePercent >= 50
          ? PERF_COLORS.average
          : PERF_COLORS.poor;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons
            name="shield-checkmark"
            size={16}
            color={PERF_COLORS.excellent}
          />{" "}
          {t("fuelDash.euTitle")}
        </Text>

        <View style={styles.euCard}>
          <View style={styles.euScoreRow}>
            <View style={[styles.euScoreCircle, { borderColor: compColor }]}>
              <Text style={[styles.euScoreText, { color: compColor }]}>
                %{compliancePercent}
              </Text>
              <Text style={styles.euScoreLabel}>
                {t("fuelDash.euCompliant")}
              </Text>
            </View>
            <View style={styles.euDetails}>
              <View style={styles.euDetailRow}>
                <Text style={styles.euDetailLabel}>
                  {t("fuelDash.euFleetAvg")}
                </Text>
                <Text
                  style={[
                    styles.euDetailValue,
                    {
                      color:
                        fleetGKm <= EU_2026_LIMIT
                          ? PERF_COLORS.excellent
                          : PERF_COLORS.poor,
                    },
                  ]}
                >
                  {fmt(fleetGKm, 0)} g/km
                </Text>
              </View>
              <View style={styles.euDetailRow}>
                <Text style={styles.euDetailLabel}>
                  {t("fuelDash.euLimit")}
                </Text>
                <Text style={styles.euDetailValue}>{EU_2026_LIMIT} g/km</Text>
              </View>
              <View style={styles.euDetailRow}>
                <Text style={styles.euDetailLabel}>
                  {"\uD83D\uDFE2"} {t("fuelDash.euCompliantCount")}
                </Text>
                <Text style={styles.euDetailValue}>
                  {compliantCount} {t("fuelDash.euVehicle")}
                </Text>
              </View>
              {overLimitCount > 0 && (
                <View style={styles.euDetailRow}>
                  <Text style={styles.euDetailLabel}>
                    {"\uD83D\uDD34"} {t("fuelDash.euOverLimit")}
                  </Text>
                  <Text
                    style={[styles.euDetailValue, { color: PERF_COLORS.poor }]}
                  >
                    {overLimitCount} {t("fuelDash.euVehicle")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Vehicle traffic lights */}
          <View style={styles.euTrafficLights}>
            {vehicles.map((v, i) => {
              const avg = parseFloat(v.avg_consumption) || 0;
              const gkm = (avg / 100) * CO2_PER_LITER.diesel * 1000;
              const color =
                gkm <= EU_2026_LIMIT * 0.8
                  ? PERF_COLORS.excellent
                  : gkm <= EU_2026_LIMIT
                    ? PERF_COLORS.average
                    : PERF_COLORS.poor;
              return (
                <View key={i} style={styles.trafficItem}>
                  <View
                    style={[styles.trafficDot, { backgroundColor: color }]}
                  />
                  <Text style={styles.trafficPlate} numberOfLines={1}>
                    {v.plate_no}
                  </Text>
                  <Text style={[styles.trafficValue, { color }]}>
                    {fmt(gkm, 0)}
                  </Text>
                </View>
              );
            })}
          </View>

          {improvementNeeded > 0 && (
            <View style={styles.euImprovement}>
              <Ionicons
                name="information-circle"
                size={16}
                color={PERF_COLORS.good}
              />
              <Text style={styles.euImprovementText}>
                {t("fuelDash.euImprovement", { percent: improvementNeeded })}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ============================================
  // 6. SECTOR BENCHMARKING
  // ============================================

  const renderBenchmarking = () => {
    const fleetAvg = parseFloat(analytics?.summary?.avg_consumption) || 0;
    if (fleetAvg === 0) return null;

    const benchmarkKeys = Object.keys(SECTOR_BENCHMARKS);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="bar-chart" size={16} color={COLORS.PRIMARY} />{" "}
          {t("fuelDash.benchmark")}
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.benchmarkScroll}
        >
          {benchmarkKeys.map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.benchmarkTab,
                selectedBenchmark === key && styles.benchmarkTabActive,
              ]}
              onPress={() => setSelectedBenchmark(key)}
            >
              <Text
                style={[
                  styles.benchmarkTabText,
                  selectedBenchmark === key && styles.benchmarkTabTextActive,
                ]}
              >
                {t(SECTOR_BENCHMARKS[key].i18nKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {(() => {
          const bm = SECTOR_BENCHMARKS[selectedBenchmark];
          const ratio = ((bm.avg - fleetAvg) / bm.avg) * 100;
          const isBetter = fleetAvg < bm.avg;
          const grade =
            fleetAvg <= bm.excellent
              ? "A+"
              : fleetAvg <= bm.good
                ? "A"
                : fleetAvg <= bm.avg
                  ? "B"
                  : fleetAvg <= bm.avg * 1.15
                    ? "C"
                    : "D";
          const gradeColor =
            grade === "A+"
              ? PERF_COLORS.excellent
              : grade === "A"
                ? PERF_COLORS.good
                : grade === "B"
                  ? PERF_COLORS.average
                  : PERF_COLORS.poor;

          return (
            <View style={styles.benchmarkCard}>
              <View style={styles.benchmarkMain}>
                <View style={[styles.gradeCircle, { borderColor: gradeColor }]}>
                  <Text style={[styles.gradeText, { color: gradeColor }]}>
                    {grade}
                  </Text>
                </View>
                <View style={styles.benchmarkInfo}>
                  <Text style={styles.benchmarkFleetValue}>
                    {t("fuelDash.bmFleet")}:{" "}
                    <Text style={{ fontWeight: "700" }}>
                      {fmt(fleetAvg)} L/100
                    </Text>
                  </Text>
                  <Text style={styles.benchmarkSectorValue}>
                    {t("fuelDash.bmSectorAvg")}:{" "}
                    <Text style={{ fontWeight: "600" }}>
                      {fmt(bm.avg)} L/100
                    </Text>
                  </Text>
                  {isBetter ? (
                    <Text
                      style={[
                        styles.benchmarkResult,
                        { color: PERF_COLORS.excellent },
                      ]}
                    >
                      {"\u2705"}{" "}
                      {t("fuelDash.bmBelow", {
                        percent: Math.abs(ratio).toFixed(0),
                      })}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.benchmarkResult,
                        { color: PERF_COLORS.poor },
                      ]}
                    >
                      {"\u26A0\uFE0F"}{" "}
                      {t("fuelDash.bmAbove", {
                        percent: Math.abs(ratio).toFixed(0),
                      })}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.benchmarkScale}>
                <View style={styles.scaleBar}>
                  <View
                    style={[
                      styles.scaleZone,
                      {
                        flex: 1,
                        backgroundColor: PERF_COLORS.excellent + "30",
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.scaleZone,
                      { flex: 1, backgroundColor: PERF_COLORS.good + "30" },
                    ]}
                  />
                  <View
                    style={[
                      styles.scaleZone,
                      { flex: 1, backgroundColor: PERF_COLORS.average + "30" },
                    ]}
                  />
                  <View
                    style={[
                      styles.scaleZone,
                      { flex: 1, backgroundColor: PERF_COLORS.poor + "30" },
                    ]}
                  />
                  <View
                    style={[
                      styles.scaleMarker,
                      {
                        left: `${Math.min(Math.max((fleetAvg / (bm.avg * 1.4)) * 100, 5), 95)}%`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.scaleMarkerDot,
                        { backgroundColor: gradeColor },
                      ]}
                    />
                    <Text style={styles.scaleMarkerLabel}>
                      {t("fuelDash.bmYou")}
                    </Text>
                  </View>
                </View>
                <View style={styles.scaleLabels}>
                  <Text style={styles.scaleLabelText}>{fmt(bm.excellent)}</Text>
                  <Text style={styles.scaleLabelText}>{fmt(bm.good)}</Text>
                  <Text style={styles.scaleLabelText}>{fmt(bm.avg)}</Text>
                  <Text style={styles.scaleLabelText}>{fmt(bm.avg * 1.3)}</Text>
                </View>
              </View>
            </View>
          );
        })()}
      </View>
    );
  };

  // ============================================
  // 7. CO2
  // ============================================

  const renderCO2 = () => {
    const co2 = parseFloat(analytics?.summary?.co2_emissions_kg) || 0;
    if (co2 === 0) return null;
    const co2Tons = co2 / 1000;
    const trees = Math.ceil(co2 / 21);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="leaf" size={16} color={PERF_COLORS.excellent} />{" "}
          {t("fuelDash.co2Title")}
        </Text>
        <View style={styles.co2Card}>
          <View style={styles.co2Item}>
            <Ionicons name="globe-outline" size={28} color={PERF_COLORS.good} />
            <Text style={styles.co2Value}>{fmt(co2Tons, 2)} ton</Text>
            <Text style={styles.co2Label}>
              {"CO\u2082"} {t("fuelDash.emission")}
            </Text>
          </View>
          <View style={styles.co2Divider} />
          <View style={styles.co2Item}>
            <Ionicons
              name="leaf-outline"
              size={28}
              color={PERF_COLORS.excellent}
            />
            <Text style={styles.co2Value}>{trees}</Text>
            <Text style={styles.co2Label}>{t("fuelDash.treesNeeded")}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // 8. ALERTS
  // ============================================

  const renderAlerts = () => {
    if (!alerts || alerts.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="warning" size={16} color={PERF_COLORS.average} />{" "}
          {t("fuelDash.alerts")} ({alerts.length})
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
                color={
                  a.severity === "warning"
                    ? PERF_COLORS.average
                    : PERF_COLORS.good
                }
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
  // LOADING
  // ============================================

  return (
    <DataState loading={loading} onRetry={fetchData}>
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
          {renderROICard()}
          {renderSummaryCards()}
          {renderAlerts()}
          {renderSavings()}
          {renderVehicleRanking()}
          {renderEUCompliance()}
          {renderBenchmarking()}
          {renderCO2()}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </DataState>
  );
};

// ============================================
// STYLES
// ============================================

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    scrollContent: { padding: COLORS.SPACING.md },

    // ROI Card
    roiCard: {
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    roiPositive: {
      backgroundColor: "#ECFDF5",
      borderLeftWidth: 5,
      borderLeftColor: PERF_COLORS.excellent,
    },
    roiNegative: {
      backgroundColor: "#FEF2F2",
      borderLeftWidth: 5,
      borderLeftColor: PERF_COLORS.poor,
    },
    roiHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    roiBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    roiTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    roiMainText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT,
      lineHeight: 22,
      marginBottom: COLORS.SPACING.xs,
    },
    roiSubText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    roiHighlight: {
      fontWeight: "800",
      color: PERF_COLORS.excellent,
      fontSize: 18,
    },
    roiBold: { fontWeight: "700" },
    roiBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    roiMultiplier: {
      backgroundColor: PERF_COLORS.excellent,
      borderRadius: COLORS.RADIUS.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      marginRight: COLORS.SPACING.sm,
    },
    roiMultiplierText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
    roiMultiplierLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },

    // Summary Cards
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
    section: { marginBottom: COLORS.SPACING.lg },
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

    // Savings
    savingsCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      borderLeftWidth: COLORS.SPACING.xs,
      ...COLORS.SHADOWS.card,
    },
    savingsPositive: { borderLeftColor: PERF_COLORS.excellent },
    savingsNegative: { borderLeftColor: PERF_COLORS.poor },
    savingsTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    savingsBigNumber: { fontSize: 28, fontWeight: "800", color: COLORS.TEXT },
    savingsLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginTop: 2,
    },
    savingsRight: { alignItems: "flex-end" },
    savingsMoneyLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
    },
    savingsMoney: {
      fontSize: 20,
      fontWeight: "700",
      color: PERF_COLORS.excellent,
    },
    savingsDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    savingsDetailItem: { alignItems: "center", flex: 1 },
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
    trendBarCol: { alignItems: "center", flex: 1 },
    trendBarValue: { fontSize: 9, color: COLORS.TEXT_MUTED, marginBottom: 2 },
    trendBar: {
      width: 20,
      borderRadius: COLORS.RADIUS.xs || 4,
      minHeight: COLORS.SPACING.xs,
    },
    trendBarMonth: {
      fontSize: 10,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    baselineLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      fontSize: 10,
    },

    // Vehicle cards
    vehicleCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.card,
    },
    vehicleMainRow: { flexDirection: "row", alignItems: "center" },
    rankBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    rankText: { fontWeight: "800", fontSize: 13 },
    vehicleInfo: { flex: 1 },
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
    vehicleStats: { alignItems: "flex-end", marginRight: COLORS.SPACING.sm },
    vehicleConsumption: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    deviationRow: { flexDirection: "row", alignItems: "center" },
    deviationText: { fontSize: 11, fontWeight: "600", marginLeft: 2 },
    perfBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 3,
      borderRadius: 10,
    },
    perfBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },

    // Vehicle expanded
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
    expandedItem: { alignItems: "center", flex: 1 },
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
    comparisonBar: { marginBottom: COLORS.SPACING.sm },
    comparisonLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginBottom: COLORS.SPACING.xs,
      fontSize: 10,
    },
    barBg: {
      height: COLORS.SPACING.sm,
      backgroundColor: COLORS.DIVIDER,
      borderRadius: COLORS.SPACING.xs,
      overflow: "hidden",
      position: "relative",
    },
    barFill: { height: COLORS.SPACING.sm, borderRadius: COLORS.SPACING.xs },
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

    // Driver Score
    driverScoreSection: {
      marginBottom: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    driverScoreRow: { flexDirection: "row", alignItems: "center" },
    scoreCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 3,
      borderColor: COLORS.DIVIDER,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    scoreCircleText: { fontSize: 18, fontWeight: "800" },
    scoreCircleLabel: { fontSize: 8, color: COLORS.TEXT_MUTED },
    badgesContainer: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 3,
      borderRadius: 12,
      marginRight: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
    },
    badgeText: { fontSize: 10, fontWeight: "600", marginLeft: 3 },
    noBadgeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontStyle: "italic",
      fontSize: 11,
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
    alertWarning: { borderLeftColor: PERF_COLORS.average },
    alertInfo: { borderLeftColor: PERF_COLORS.good },
    alertLeft: { marginRight: COLORS.SPACING.sm, paddingTop: 2 },
    alertContent: { flex: 1 },
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

    // EU CSRD
    euCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    euScoreRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    euScoreCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: COLORS.SPACING.xs,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    euScoreText: { fontSize: 20, fontWeight: "800" },
    euScoreLabel: { fontSize: 9, color: COLORS.TEXT_MUTED },
    euDetails: { flex: 1 },
    euDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.xs,
    },
    euDetailLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 11,
    },
    euDetailValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: "600",
      color: COLORS.TEXT,
      fontSize: 11,
    },
    euTrafficLights: {
      flexDirection: "row",
      flexWrap: "wrap",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      paddingTop: COLORS.SPACING.sm,
    },
    trafficItem: {
      flexDirection: "row",
      alignItems: "center",
      width: "50%",
      marginBottom: COLORS.SPACING.xs,
    },
    trafficDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: COLORS.SPACING.xs,
    },
    trafficPlate: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT,
      flex: 1,
      fontSize: 11,
    },
    trafficValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: "600",
      fontSize: 11,
    },
    euImprovement: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: PERF_COLORS.good + "15",
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
    },
    euImprovementText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: PERF_COLORS.good,
      marginLeft: COLORS.SPACING.xs,
      flex: 1,
      fontSize: 11,
    },

    // Benchmarking
    benchmarkScroll: { marginBottom: COLORS.SPACING.sm },
    benchmarkTab: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.SPACING.md,
      backgroundColor: COLORS.DIVIDER,
      marginRight: COLORS.SPACING.sm,
    },
    benchmarkTabActive: { backgroundColor: COLORS.PRIMARY },
    benchmarkTabText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      fontSize: 11,
    },
    benchmarkTabTextActive: { color: "#FFF", fontWeight: "600" },
    benchmarkCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      ...COLORS.SHADOWS.card,
    },
    benchmarkMain: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    gradeCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: COLORS.SPACING.xs,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    gradeText: { fontSize: 22, fontWeight: "900" },
    benchmarkInfo: { flex: 1 },
    benchmarkFleetValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT,
      marginBottom: 2,
    },
    benchmarkSectorValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginBottom: COLORS.SPACING.xs,
    },
    benchmarkResult: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: "600",
    },
    benchmarkScale: { marginTop: COLORS.SPACING.xs },
    scaleBar: {
      flexDirection: "row",
      height: 12,
      borderRadius: COLORS.SPACING.xs,
      overflow: "hidden",
      position: "relative",
    },
    scaleZone: { height: 12 },
    scaleMarker: { position: "absolute", top: -4, alignItems: "center" },
    scaleMarkerDot: {
      width: COLORS.SPACING.sm,
      height: 20,
      borderRadius: COLORS.SPACING.xs,
    },
    scaleMarkerLabel: {
      fontSize: 8,
      fontWeight: "700",
      color: COLORS.TEXT,
      marginTop: 1,
    },
    scaleLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: COLORS.SPACING.xs,
    },
    scaleLabelText: { fontSize: 9, color: COLORS.TEXT_MUTED },

    // CO2
    co2Card: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.lg,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    co2Item: { flex: 1, alignItems: "center" },
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
