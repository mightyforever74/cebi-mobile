// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Raporlar Modülü v2.0
// 5-tab mimari: Operasyon / Yakıt & Maliyet / Sürücü Kalitesi / Filo Verimliliği / Sürdürülebilirlik
// Faz 1: Operasyon + Yakıt & Maliyet KPI'ları aktif
// Faz 2+: Sürücü Kalitesi / Filo / Sürdürülebilirlik — "Yakında"

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { withAlpha } from "../../utils/colorUtils";
import api from "../../services/api";

// ─── KPI CARD ─────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color, COLORS, styles }) => (
  <View style={[styles.kpiCard, { borderLeftColor: color || COLORS.PRIMARY }]}>
    <View style={styles.kpiIconWrap}>
      <Ionicons name={icon} size={22} color={color || COLORS.PRIMARY} />
    </View>
    <View style={styles.kpiContent}>
      <Text style={styles.kpiValue}>{value ?? "—"}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  </View>
);

// ─── COMING SOON ──────────────────────────────────────────────────────────────
const ComingSoon = ({ title, COLORS, styles }) => (
  <View style={styles.comingSoonWrap}>
    <Ionicons name="construct-outline" size={48} color={COLORS.TEXT_MUTED} />
    <Text style={styles.comingSoonTitle}>{title}</Text>
    <View style={styles.comingSoonBadge}>
      <Text style={styles.comingSoonBadgeText}>Yakında</Text>
    </View>
    <Text style={styles.comingSoonDesc}>
      Bu sekme Faz 2 kapsamında geliştirilecek.
    </Text>
  </View>
);

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, styles }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("operations");
  const [selectedRange, setSelectedRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  // Operasyon state
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsData, setOpsData] = useState(null);
  const [opsError, setOpsError] = useState(null);

  // Yakıt state
  const [fuelLoading, setFuelLoading] = useState(true);
  const [fuelData, setFuelData] = useState(null);
  const [fuelSavings, setFuelSavings] = useState(null);
  const [fuelError, setFuelError] = useState(null);

  // ─── DATE RANGES ────────────────────────────────────────────────────────────
  const DATE_RANGES = useMemo(() => [
    { label: t("reports.last7Days", "Son 7 Gün"), days: 7 },
    { label: t("reports.last30Days", "Son 30 Gün"), days: 30 },
    { label: t("reports.last90Days", "Son 90 Gün"), days: 90 },
  ], [t]);

  // ─── TABS ───────────────────────────────────────────────────────────────────
  const TABS = useMemo(() => [
    { key: "operations", label: t("reports.tabs.operations", "Operasyon"), icon: "clipboard-outline" },
    { key: "fuel", label: t("reports.tabs.fuel", "Yakıt"), icon: "speedometer-outline" },
    { key: "driverQuality", label: t("reports.tabs.driverQuality", "Sürücü"), icon: "person-outline", soon: true },
    { key: "fleetEfficiency", label: t("reports.tabs.fleetEfficiency", "Filo"), icon: "car-outline", soon: true },
    { key: "sustainability", label: t("reports.tabs.sustainability", "Çevre"), icon: "leaf-outline", soon: true },
  ], [t]);

  // ─── FETCH OPERASYON ─────────────────────────────────────────────────────────
  const fetchOperations = useCallback(async () => {
    try {
      setOpsLoading(true);
      setOpsError(null);
      const from = new Date();
      from.setDate(from.getDate() - selectedRange);
      const res = await api.get("/api/reports/operations", {
        params: { from: from.toISOString(), days: selectedRange },
      });
      setOpsData(res.data?.data || res.data);
    } catch (e) {
      // Endpoint henüz yok — mevcut tasks API'si ile fallback
      try {
        const tasksRes = await api.get("/api/tasks");
        const tasks = tasksRes.data?.tasks || tasksRes.data || [];
        const now = new Date();
        const cutoff = new Date(now.getTime() - selectedRange * 24 * 60 * 60 * 1000);
        const filtered = tasks.filter(t => new Date(t.created_at) >= cutoff);
        const completed = filtered.filter(t => t.status === "completed").length;
        const cancelled = filtered.filter(t => t.status === "cancelled").length;
        const rejected = filtered.filter(t => t.status === "rejected").length;
        setOpsData({
          total: filtered.length,
          completed,
          cancelled,
          rejected,
          pending: filtered.length - completed - cancelled - rejected,
          onTimeStart: null,
          onTimeDelivery: null,
          avgDuration: null,
          delayedCount: null,
        });
      } catch {
        setOpsError(e);
      }
    } finally {
      setOpsLoading(false);
    }
  }, [selectedRange]);

  // ─── FETCH YAKIT ────────────────────────────────────────────────────────────
  const fetchFuel = useCallback(async () => {
    try {
      setFuelLoading(true);
      setFuelError(null);
      const [analyticsRes, savingsRes] = await Promise.allSettled([
        api.get("/api/fuel/company/analytics"),
        api.get("/api/fuel/company/savings"),
      ]);
      if (analyticsRes.status === "fulfilled") {
        const d = analyticsRes.value?.data?.data || analyticsRes.value?.data;
        setFuelData(d);
      }
      if (savingsRes.status === "fulfilled") {
        const d = savingsRes.value?.data?.data || savingsRes.value?.data;
        setFuelSavings(d);
      }
    } catch (e) {
      setFuelError(e);
    } finally {
      setFuelLoading(false);
    }
  }, []);

  // ─── INIT ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOperations();
    fetchFuel();
  }, [fetchOperations, fetchFuel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchOperations(), fetchFuel()]);
    setRefreshing(false);
  }, [fetchOperations, fetchFuel]);

  // ─── RENDER: DATE RANGE ──────────────────────────────────────────────────────
  const renderDateRange = () => (
    <View style={styles.dateRangeRow}>
      {DATE_RANGES.map((r) => (
        <TouchableOpacity
          key={r.days}
          style={[styles.dateBtn, selectedRange === r.days && styles.dateBtnActive]}
          onPress={() => setSelectedRange(r.days)}
        >
          <Text style={[styles.dateBtnText, selectedRange === r.days && styles.dateBtnTextActive]}>
            {r.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ─── RENDER: OPERASYON ───────────────────────────────────────────────────────
  const renderOperations = () => {
    if (opsLoading) return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Operasyon verileri yükleniyor...</Text>
      </View>
    );
    if (opsError) return (
      <View style={styles.errorWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.ERROR} />
        <Text style={styles.errorText}>Veri yüklenemedi</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchOperations}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
    if (!opsData) return null;

    const completionRate = opsData.total > 0
      ? Math.round((opsData.completed / opsData.total) * 100)
      : 0;

    return (
      <View>
        <SectionHeader title="Görev Özeti" styles={styles} />
        <View style={styles.kpiGrid}>
          <KpiCard
            icon="list-outline"
            label="Toplam Görev"
            value={opsData.total}
            color={COLORS.PRIMARY}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="checkmark-circle-outline"
            label="Tamamlanan"
            value={opsData.completed}
            sub={`%${completionRate}`}
            color={COLORS.SUCCESS}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="close-circle-outline"
            label="İptal / Red"
            value={(opsData.cancelled || 0) + (opsData.rejected || 0)}
            color={COLORS.ERROR}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="time-outline"
            label="Bekleyen"
            value={opsData.pending || 0}
            color={COLORS.WARNING}
            COLORS={COLORS}
            styles={styles}
          />
        </View>

        <SectionHeader title="Performans" styles={styles} />
        <View style={styles.kpiGrid}>
          <KpiCard
            icon="rocket-outline"
            label="Zamanında Başlama"
            value={opsData.onTimeStart != null ? `%${opsData.onTimeStart}` : "—"}
            sub="±15 dk tolerans"
            color={COLORS.INFO}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="flag-outline"
            label="Zamanında Teslim"
            value={opsData.onTimeDelivery != null ? `%${opsData.onTimeDelivery}` : "—"}
            sub="±15 dk tolerans"
            color={COLORS.INFO}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="timer-outline"
            label="Ort. Görev Süresi"
            value={opsData.avgDuration != null ? `${Math.round(opsData.avgDuration)} dk` : "—"}
            color={COLORS.PRIMARY}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="warning-outline"
            label="Geciken Görev"
            value={opsData.delayedCount ?? "—"}
            color={COLORS.WARNING}
            COLORS={COLORS}
            styles={styles}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.INFO} />
          <Text style={styles.infoText}>
            Zamanında başlama/teslim ve ortalama süre için{" "}
            <Text style={{ fontWeight: "700" }}>/api/reports/operations</Text>{" "}
            endpoint'i tamamlandığında aktif olacak.
          </Text>
        </View>
      </View>
    );
  };

  // ─── RENDER: YAKIT ───────────────────────────────────────────────────────────
  const renderFuel = () => {
    if (fuelLoading) return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Yakıt verileri yükleniyor...</Text>
      </View>
    );
    if (fuelError) return (
      <View style={styles.errorWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.ERROR} />
        <Text style={styles.errorText}>Veri yüklenemedi</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchFuel}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );

    const summary = fuelData?.summary;
    const vehicles = fuelData?.vehicles || [];

    return (
      <View>
        <SectionHeader title="Yakıt Özeti" styles={styles} />
        <View style={styles.kpiGrid}>
          <KpiCard
            icon="water-outline"
            label="Toplam Tüketim"
            value={summary ? `${parseFloat(summary.total_liters || 0).toFixed(0)} L` : "—"}
            color={COLORS.PRIMARY}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="card-outline"
            label="Toplam Maliyet"
            value={summary ? `€${parseFloat(summary.total_cost || 0).toFixed(0)}` : "—"}
            color={COLORS.WARNING}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="speedometer-outline"
            label="Ort. Tüketim"
            value={summary ? `${parseFloat(summary.avg_consumption || 0).toFixed(1)} L/100` : "—"}
            color={COLORS.INFO}
            COLORS={COLORS}
            styles={styles}
          />
          <KpiCard
            icon="navigate-outline"
            label="Toplam KM"
            value={summary ? parseInt(summary.total_km || 0).toLocaleString("tr-TR") : "—"}
            color={COLORS.SUCCESS}
            COLORS={COLORS}
            styles={styles}
          />
        </View>

        {fuelSavings?.has_baseline && (
          <>
            <SectionHeader title="Tasarruf Analizi" styles={styles} />
            <View style={[styles.savingsCard, { backgroundColor: withAlpha(COLORS.SUCCESS, 0.08) }]}>
              <View style={styles.savingsRow}>
                <Ionicons name="trending-down" size={24} color={COLORS.SUCCESS} />
                <Text style={styles.savingsBig}>
                  %{parseFloat(fuelSavings.savings?.consumption_improvement_percent || 0).toFixed(1)}
                </Text>
                <Text style={styles.savingsLabel}>Verimlilik Artışı</Text>
              </View>
              <View style={styles.savingsDetails}>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsItemValue}>
                    {parseFloat(fuelSavings.savings?.liters_saved || 0).toFixed(1)} L
                  </Text>
                  <Text style={styles.savingsItemLabel}>Tasarruf</Text>
                </View>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsItemValue}>
                    €{parseFloat(fuelSavings.savings?.money_saved || 0).toFixed(0)}
                  </Text>
                  <Text style={styles.savingsItemLabel}>Maliyet</Text>
                </View>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsItemValue}>
                    {parseFloat(fuelSavings.savings?.co2_saved_kg || 0).toFixed(0)} kg
                  </Text>
                  <Text style={styles.savingsItemLabel}>CO₂</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {vehicles.length > 0 && (
          <>
            <SectionHeader title="Araç Bazlı Tüketim" styles={styles} />
            {vehicles.map((v, idx) => {
              const avg = parseFloat(v.avg_consumption) || 0;
              const isAnomaly = v.is_anomaly;
              return (
                <View key={v.vehicle_id} style={styles.vehicleRow}>
                  <View style={[styles.vehicleRank, { backgroundColor: withAlpha(COLORS.PRIMARY, 0.1) }]}>
                    <Text style={[styles.vehicleRankText, { color: COLORS.PRIMARY }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={styles.vehiclePlate}>{v.plate_no}</Text>
                    <Text style={styles.vehicleDriver}>{v.driver_name || "Atanmamış"}</Text>
                  </View>
                  <View style={styles.vehicleStats}>
                    <Text style={[styles.vehicleConsumption, { color: isAnomaly ? COLORS.ERROR : COLORS.SUCCESS }]}>
                      {avg.toFixed(1)} L/100
                    </Text>
                    {isAnomaly && (
                      <View style={[styles.anomalyBadge, { backgroundColor: withAlpha(COLORS.ERROR, 0.12) }]}>
                        <Text style={[styles.anomalyText, { color: COLORS.ERROR }]}>Anormal</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    );
  };

  // ─── RENDER: TAB CONTENT ─────────────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case "operations": return renderOperations();
      case "fuel": return renderFuel();
      case "driverQuality":
        return <ComingSoon title="Sürücü Kalitesi" COLORS={COLORS} styles={styles} />;
      case "fleetEfficiency":
        return <ComingSoon title="Filo Verimliliği" COLORS={COLORS} styles={styles} />;
      case "sustainability":
        return <ComingSoon title="Sürdürülebilirlik" COLORS={COLORS} styles={styles} />;
      default: return null;
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? COLORS.PRIMARY : COLORS.TEXT_MUTED}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.soon && (
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>2</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date Range */}
      {(activeTab === "operations" || activeTab === "fuel") && renderDateRange()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
        <View style={{ height: COLORS.SPACING.xl }} />
      </ScrollView>
    </View>
  );
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },

    // Tab bar
    tabBar: {
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
      flexGrow: 0,
    },
    tabBarContent: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      marginRight: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.pill,
      borderWidth: 1,
      borderColor: "transparent",
    },
    tabActive: {
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
      borderColor: COLORS.PRIMARY,
    },
    tabText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginLeft: COLORS.SPACING.xs / 2,
    },
    tabTextActive: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    soonBadge: {
      backgroundColor: COLORS.WARNING,
      borderRadius: COLORS.RADIUS.pill,
      width: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: COLORS.SPACING.xs / 2,
    },
    soonText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },

    // Date range
    dateRangeRow: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    dateBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.xs,
    },
    dateBtnActive: { backgroundColor: COLORS.PRIMARY },
    dateBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
    },
    dateBtnTextActive: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Content
    content: { flex: 1 },
    contentContainer: { padding: COLORS.SPACING.md },

    // Section
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
    },

    // KPI Grid
    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -COLORS.SPACING.xs / 2,
    },
    kpiCard: {
      width: "50%",
      paddingHorizontal: COLORS.SPACING.xs / 2,
      marginBottom: COLORS.SPACING.sm,
    },
    kpiCardInner: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.sm,
      borderLeftWidth: 3,
      ...COLORS.SHADOWS?.card,
    },
    kpiIconWrap: {
      width: 36,
      height: 36,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: COLORS.BACKGROUND,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    kpiValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    kpiLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs / 2,
    },
    kpiSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
    },

    // Savings
    savingsCard: {
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
    },
    savingsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    savingsBig: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.SUCCESS,
      marginLeft: COLORS.SPACING.sm,
    },
    savingsLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
    },
    savingsDetails: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    savingsItem: { alignItems: "center" },
    savingsItemValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    savingsItemLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
    },

    // Vehicle rows
    vehicleRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    vehicleRank: {
      width: 32,
      height: 32,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    vehicleRankText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    vehicleInfo: { flex: 1 },
    vehiclePlate: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    vehicleDriver: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
    },
    vehicleStats: { alignItems: "flex-end" },
    vehicleConsumption: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    anomalyBadge: {
      borderRadius: COLORS.RADIUS.pill,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: COLORS.SPACING.xs / 2,
      marginTop: COLORS.SPACING.xs / 2,
    },
    anomalyText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Loading / Error
    loadingWrap: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl,
    },
    loadingText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.sm,
    },
    errorWrap: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl,
    },
    errorText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.sm,
    },
    retryBtn: {
      marginTop: COLORS.SPACING.md,
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.pill,
    },
    retryText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Info box
    infoBox: {
      flexDirection: "row",
      backgroundColor: withAlpha(COLORS.INFO, 0.08),
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
    },
    infoText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
      flex: 1,
    },

    // Coming soon
    comingSoonWrap: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl * 2,
    },
    comingSoonTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginTop: COLORS.SPACING.md,
    },
    comingSoonBadge: {
      backgroundColor: COLORS.WARNING,
      borderRadius: COLORS.RADIUS.pill,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs / 2,
      marginTop: COLORS.SPACING.sm,
    },
    comingSoonBadgeText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
    },
    comingSoonDesc: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.sm,
      textAlign: "center",
      paddingHorizontal: COLORS.SPACING.xl,
    },
  });

export default AdminReportsScreen;
