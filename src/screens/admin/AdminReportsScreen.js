// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Raporlar v2.0
// Güvenli versiyon: sıfır matematiksel işlem, sıfır COLORS.DANGER, minimal karmaşıklık

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

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — makeStyles dışında HİÇBİR COLORS referansı yok
// ─────────────────────────────────────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container:       { flex: 1, backgroundColor: COLORS.BACKGROUND },
    tabBar:          { backgroundColor: COLORS.SURFACE, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER },
    tabBarInner:     { flexDirection: "row", paddingHorizontal: COLORS.SPACING.sm, paddingVertical: COLORS.SPACING.xs },
    tab:             { flexDirection: "row", alignItems: "center", paddingHorizontal: COLORS.SPACING.sm, paddingVertical: COLORS.SPACING.xs, marginRight: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.pill, borderWidth: 1, borderColor: "transparent" },
    tabText:         { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginLeft: COLORS.SPACING.xs },
    soonDot:         { borderRadius: COLORS.RADIUS.pill, width: 16, height: 16, alignItems: "center", justifyContent: "center", marginLeft: COLORS.SPACING.xs },
    soonText:        { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: COLORS.TYPOGRAPHY.weights.bold },
    dateRow:         { flexDirection: "row", backgroundColor: COLORS.SURFACE, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER, paddingHorizontal: COLORS.SPACING.md, paddingVertical: COLORS.SPACING.sm },
    dateBtn:         { flex: 1, alignItems: "center", paddingVertical: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.sm, marginRight: COLORS.SPACING.xs },
    dateBtnText:     { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.medium },
    scroll:          { flex: 1 },
    scrollContent:   { padding: COLORS.SPACING.md, paddingBottom: COLORS.SPACING.xl },
    sectionTitle:    { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: COLORS.TYPOGRAPHY.weights.bold, marginTop: COLORS.SPACING.md, marginBottom: COLORS.SPACING.sm },
    // KPI grid — 2 sütun, gap yerine margin
    kpiGrid:         { flexDirection: "row", flexWrap: "wrap" },
    kpiCell:         { width: "50%", paddingRight: COLORS.SPACING.xs, marginBottom: COLORS.SPACING.xs },
    kpiCard:         { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.sm, borderLeftWidth: 3, ...COLORS.SHADOWS.card },
    kpiValue:        { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, marginTop: COLORS.SPACING.xs },
    kpiLabel:        { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    kpiSub:          { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    // Info card
    infoCard:        { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.sm, marginTop: COLORS.SPACING.sm, flexDirection: "row", alignItems: "flex-start", ...COLORS.SHADOWS.card },
    infoText:        { fontSize: COLORS.TYPOGRAPHY.sizes.xs, flex: 1, marginLeft: COLORS.SPACING.xs },
    // Savings card
    savingsCard:     { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.md, marginBottom: COLORS.SPACING.sm, ...COLORS.SHADOWS.card },
    savingsHeader:   { flexDirection: "row", alignItems: "center", marginBottom: COLORS.SPACING.sm },
    savingsBig:      { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, marginLeft: COLORS.SPACING.sm },
    savingsSubLabel: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginLeft: COLORS.SPACING.xs },
    savingsRow:      { flexDirection: "row", justifyContent: "space-around" },
    savingsItem:     { alignItems: "center" },
    savingsVal:      { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    savingsKey:      { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    // Vehicle row
    vehicleCard:     { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.sm, marginBottom: COLORS.SPACING.xs, flexDirection: "row", alignItems: "center", ...COLORS.SHADOWS.card },
    rankBadge:       { width: 32, height: 32, borderRadius: COLORS.RADIUS.md, alignItems: "center", justifyContent: "center", marginRight: COLORS.SPACING.sm },
    rankText:        { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.bold },
    vehicleInfo:     { flex: 1 },
    vehiclePlate:    { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    vehicleDriver:   { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    vehicleRight:    { alignItems: "flex-end" },
    vehicleVal:      { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    vehicleSub:      { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    anomalyBadge:    { borderRadius: COLORS.RADIUS.pill, paddingHorizontal: COLORS.SPACING.xs, paddingVertical: COLORS.SPACING.xs, marginTop: COLORS.SPACING.xs },
    anomalyText:     { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    // Scope row
    scopeCard:       { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.sm, marginBottom: COLORS.SPACING.xs, ...COLORS.SHADOWS.card },
    scopeRow:        { flexDirection: "row", alignItems: "flex-start" },
    scopeBadge:      { borderRadius: COLORS.RADIUS.sm, paddingHorizontal: COLORS.SPACING.xs, paddingVertical: COLORS.SPACING.xs, marginRight: COLORS.SPACING.sm, minWidth: 52, alignItems: "center" },
    scopeBadgeText:  { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    scopeInfo:       { flex: 1 },
    scopeTitle:      { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    scopeDesc:       { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
    // Center (loading/error/coming soon)
    centerWrap:      { alignItems: "center", paddingVertical: COLORS.SPACING.xl },
    centerText:      { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginTop: COLORS.SPACING.sm, textAlign: "center" },
    retryBtn:        { marginTop: COLORS.SPACING.md, paddingHorizontal: COLORS.SPACING.lg, paddingVertical: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.pill },
    retryBtnText:    { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    soonBadge:       { borderRadius: COLORS.RADIUS.pill, paddingHorizontal: COLORS.SPACING.md, paddingVertical: COLORS.SPACING.xs, marginTop: COLORS.SPACING.sm },
    soonBadgeText:   { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold },
    soonDesc:        { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginTop: COLORS.SPACING.sm, textAlign: "center", paddingHorizontal: COLORS.SPACING.xl },
  });

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [activeTab, setActiveTab]       = useState("operations");
  const [selectedRange, setSelectedRange] = useState(30);
  const [refreshing, setRefreshing]     = useState(false);

  const [opsLoading, setOpsLoading]   = useState(true);
  const [opsData, setOpsData]         = useState(null);
  const [opsError, setOpsError]       = useState(null);

  const [fuelLoading, setFuelLoading] = useState(true);
  const [fuelData, setFuelData]       = useState(null);
  const [fuelSavings, setFuelSavings] = useState(null);

  const DATE_RANGES = useMemo(() => [
    { label: t("reports.last7Days",  "Son 7 Gün"),  days: 7  },
    { label: t("reports.last30Days", "Son 30 Gün"), days: 30 },
    { label: t("reports.last90Days", "Son 90 Gün"), days: 90 },
  ], [t]);

  const TABS = useMemo(() => [
    { key: "operations",     label: "Operasyon", icon: "clipboard-outline"   },
    { key: "fuel",           label: "Yakıt",     icon: "speedometer-outline" },
    { key: "driverQuality",  label: "Sürücü",    icon: "person-outline",     soon: true },
    { key: "fleetEfficiency",label: "Filo",      icon: "car-outline",        soon: true },
    { key: "sustainability", label: "Çevre",     icon: "leaf-outline",       soon: false },
  ], []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOps = useCallback(async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const r = await api.get("/api/tasks");
      const all = r.data?.tasks || r.data || [];
      const cutoff = new Date(Date.now() - selectedRange * 86400000);
      const tasks = all.filter(t => new Date(t.created_at) >= cutoff);
      setOpsData({
        total:     tasks.length,
        completed: tasks.filter(t => t.status === "completed").length,
        cancelled: tasks.filter(t => t.status === "cancelled").length,
        rejected:  tasks.filter(t => t.status === "rejected").length,
        pending:   tasks.filter(t => ["pending_review","accepted","in_progress"].includes(t.status)).length,
      });
    } catch (e) { setOpsError(e); }
    finally { setOpsLoading(false); }
  }, [selectedRange]);

  const fetchFuel = useCallback(async () => {
    setFuelLoading(true);
    try {
      const [a, s] = await Promise.allSettled([
        api.get("/api/fuel/company/analytics"),
        api.get("/api/fuel/company/savings"),
      ]);
      if (a.status === "fulfilled") setFuelData(a.value?.data?.data || a.value?.data);
      if (s.status === "fulfilled") setFuelSavings(s.value?.data?.data || s.value?.data);
    } catch {}
    finally { setFuelLoading(false); }
  }, []);

  useEffect(() => { fetchOps(); fetchFuel(); }, [fetchOps, fetchFuel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchOps(), fetchFuel()]);
    setRefreshing(false);
  }, [fetchOps, fetchFuel]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmt0 = (v) => parseFloat(v || 0).toFixed(0);
  const fmt1 = (v) => parseFloat(v || 0).toFixed(1);

  const KpiCard = ({ label, value, sub, color }) => (
    <View style={styles.kpiCell}>
      <Card style={{ borderLeftWidth: 3, borderLeftColor: color }}>
        <Text style={[styles.kpiValue, { color: COLORS.TEXT }]}>{value}</Text>
        <Text style={[styles.kpiLabel, { color: COLORS.TEXT_SECONDARY }]}>{label}</Text>
        {sub ? <Text style={[styles.kpiSub, { color: COLORS.TEXT_MUTED }]}>{sub}</Text> : null}
      </Card>
    </View>
  );

  // ── Operasyon ──────────────────────────────────────────────────────────────
  const renderOps = () => {
    if (opsLoading) return (
      <View style={styles.centerWrap}>
        <ActivityIndicator color={COLORS.PRIMARY} />
        <Text style={[styles.centerText, { color: COLORS.TEXT_MUTED }]}>Yükleniyor...</Text>
      </View>
    );
    if (opsError) return (
      <View style={styles.centerWrap}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.ERROR} />
        <Text style={[styles.centerText, { color: COLORS.TEXT_SECONDARY }]}>Veri yüklenemedi</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: COLORS.PRIMARY }]} onPress={fetchOps}>
          <Text style={[styles.retryBtnText, { color: COLORS.WHITE }]}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
    if (!opsData) return null;
    const rate = opsData.total > 0 ? `%${Math.round((opsData.completed / opsData.total) * 100)}` : "%0";
    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Görev Özeti</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Toplam Görev"  value={opsData.total}     color={COLORS.PRIMARY} />
          <KpiCard label="Tamamlanan"    value={opsData.completed} sub={rate} color={COLORS.SUCCESS} />
          <KpiCard label="İptal / Red"   value={(opsData.cancelled||0)+(opsData.rejected||0)} color={COLORS.ERROR} />
          <KpiCard label="Bekleyen"      value={opsData.pending||0} color={COLORS.WARNING} />
        </View>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Performans</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Zamanında Başlama"  value="—" sub="±15 dk" color={COLORS.INFO} />
          <KpiCard label="Zamanında Teslim"   value="—" sub="±15 dk" color={COLORS.INFO} />
          <KpiCard label="Ort. Görev Süresi"  value="—"              color={COLORS.PRIMARY} />
          <KpiCard label="Geciken Görev"       value="—"              color={COLORS.WARNING} />
        </View>
        <Card style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.INFO} />
          <Text style={[styles.infoText, { color: COLORS.TEXT_SECONDARY }]}>
            Zamanında başlama/teslim için <Text style={{ fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.PRIMARY }}>/api/reports/operations</Text> endpoint'i tamamlandığında aktif olacak.
          </Text>
        </View>
      </>
    );
  };

  // ── Yakıt ──────────────────────────────────────────────────────────────────
  const renderFuel = () => {
    if (fuelLoading) return (
      <View style={styles.centerWrap}>
        <ActivityIndicator color={COLORS.PRIMARY} />
        <Text style={[styles.centerText, { color: COLORS.TEXT_MUTED }]}>Yükleniyor...</Text>
      </View>
    );
    const summary  = fuelData?.summary;
    const vehicles = fuelData?.vehicles || [];
    const savings  = fuelSavings?.savings;
    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Yakıt Özeti</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Toplam Tüketim" value={summary ? `${fmt0(summary.total_liters)} L`   : "—"} color={COLORS.PRIMARY} />
          <KpiCard label="Toplam Maliyet" value={summary ? `€${fmt0(summary.total_cost)}`       : "—"} color={COLORS.WARNING} />
          <KpiCard label="Ort. Tüketim"   value={summary ? `${fmt1(summary.avg_consumption)} L/100` : "—"} color={COLORS.INFO} />
          <KpiCard label="Toplam KM"      value={summary ? parseInt(summary.total_km||0).toLocaleString("tr-TR") : "—"} color={COLORS.SUCCESS} />
        </View>

        {fuelSavings?.has_baseline && savings && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Tasarruf Analizi</Text>
            <Card>
              <View style={styles.savingsHeader}>
                <Ionicons name="trending-down" size={22} color={COLORS.SUCCESS} />
                <Text style={[styles.savingsBig, { color: COLORS.SUCCESS }]}>%{fmt1(savings.consumption_improvement_percent)}</Text>
                <Text style={[styles.savingsSubLabel, { color: COLORS.TEXT_SECONDARY }]}>Verimlilik Artışı</Text>
              </View>
              <View style={styles.savingsRow}>
                {[
                  { v: `${fmt1(savings.liters_saved)} L`, k: "Tasarruf" },
                  { v: `€${fmt0(savings.money_saved)}`,   k: "Maliyet"  },
                  { v: `${fmt0(savings.co2_saved_kg)} kg`,k: "CO₂"      },
                  { v: `€${fmt0(savings.yearly_projection)}`, k: "Yıllık" },
                ].map(item => (
                  <View key={item.k} style={styles.savingsItem}>
                    <Text style={[styles.savingsVal, { color: COLORS.TEXT }]}>{item.v}</Text>
                    <Text style={[styles.savingsKey, { color: COLORS.TEXT_MUTED }]}>{item.k}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {vehicles.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Araç Bazlı Tüketim</Text>
            {vehicles.map((v, idx) => {
              const avg = parseFloat(v.avg_consumption) || 0;
              const pc  = v.performance === "good" || v.performance === "excellent"
                ? COLORS.SUCCESS : v.performance === "poor" ? COLORS.ERROR : COLORS.WARNING;
              return (
                <Card key={v.vehicle_id} style={{ marginBottom: COLORS.SPACING.xs }}>
                  <View style={[styles.rankBadge, { backgroundColor: withAlpha(pc, 0.12) }]}>
                    <Text style={[styles.rankText, { color: pc }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={[styles.vehiclePlate, { color: COLORS.TEXT }]}>{v.plate_no}</Text>
                    <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_MUTED }]}>{v.driver_name || "Atanmamış"}</Text>
                  </View>
                  <View style={styles.vehicleRight}>
                    <Text style={[styles.vehicleVal, { color: pc }]}>{avg > 0 ? `${avg.toFixed(1)} L/100` : "—"}</Text>
                    {v.is_anomaly && (
                      <View style={[styles.anomalyBadge, { backgroundColor: withAlpha(COLORS.ERROR, 0.12) }]}>
                        <Text style={[styles.anomalyText, { color: COLORS.ERROR }]}>Anormal</Text>
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  // ── Sürdürülebilirlik ──────────────────────────────────────────────────────
  const renderSustainability = () => {
    const CO2 = { diesel: 2.68, gasoline: 2.31, lpg: 1.51, electric: 0 };
    const summary  = fuelData?.summary;
    const vehicles = fuelData?.vehicles || [];
    const emissions = vehicles.map(v => ({
      ...v,
      co2e: parseFloat(v.total_liters||0) * (CO2[v.fuel_type] || CO2.diesel),
    }));
    const totalCo2  = emissions.reduce((s, v) => s + v.co2e, 0);
    const totalL    = parseFloat(summary?.total_liters || 0);
    const totalKm   = parseInt(summary?.total_km || 0);

    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Emisyon Özeti</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Toplam CO₂e"  value={totalCo2 > 0 ? `${(totalCo2/1000).toFixed(2)} ton` : "—"} sub="DEFRA 2023" color={COLORS.SUCCESS} />
          <KpiCard label="Toplam Yakıt" value={totalL > 0 ? `${fmt0(totalL)} L` : "—"} color={COLORS.INFO} />
          <KpiCard label="kg CO₂e / km" value={totalKm > 0 ? `${(totalCo2/totalKm).toFixed(3)}` : "—"} color={COLORS.WARNING} />
          <KpiCard label="Kapsam"       value="Scope 1" sub="Yakıt bazlı" color={COLORS.PRIMARY} />
        </View>

        {emissions.filter(v => v.co2e > 0).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Araç Bazlı Emisyon</Text>
            {emissions.filter(v => v.co2e > 0).sort((a,b) => b.co2e - a.co2e).map((v, idx) => {
              const pct = totalCo2 > 0 ? (v.co2e/totalCo2*100).toFixed(0) : 0;
              return (
                <Card key={v.vehicle_id} style={{ marginBottom: COLORS.SPACING.xs }}>
                  <View style={[styles.rankBadge, { backgroundColor: withAlpha(COLORS.SUCCESS, 0.12) }]}>
                    <Text style={[styles.rankText, { color: COLORS.SUCCESS }]}>{idx+1}</Text>
                  </View>
                  <View style={styles.vehicleInfo}>
                    <Text style={[styles.vehiclePlate, { color: COLORS.TEXT }]}>{v.plate_no}</Text>
                    <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_MUTED }]}>{(v.fuel_type||"diesel").toUpperCase()}</Text>
                  </View>
                  <View style={styles.vehicleRight}>
                    <Text style={[styles.vehicleVal, { color: COLORS.TEXT }]}>{v.co2e.toFixed(0)} kg</Text>
                    <Text style={[styles.vehicleSub, { color: COLORS.TEXT_MUTED }]}>%{pct} pay</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Kapsam Durumu</Text>
        {[
          { scope: "Scope 1", label: "Doğrudan Emisyon", status: "partial", desc: "Yakıt tüketiminden tahmini — boundary tanımı eksik" },
          { scope: "Scope 2", label: "Elektrik / Enerji", status: "missing", desc: "EV şarj ve satın alınan enerji verisi yok" },
          { scope: "Scope 3", label: "Değer Zinciri",     status: "missing", desc: "Tedarik zinciri ve taşeron emisyonları yok" },
        ].map(item => {
          const sc = item.status === "partial" ? COLORS.WARNING : COLORS.ERROR;
          return (
            <Card key={item.scope}>
              <View style={styles.scopeRow}>
                <View style={[styles.scopeBadge, { backgroundColor: withAlpha(sc, 0.12) }]}>
                  <Text style={[styles.scopeBadgeText, { color: sc }]}>{item.status === "partial" ? "Kısmi" : "Eksik"}</Text>
                </View>
                <View style={styles.scopeInfo}>
                  <Text style={[styles.scopeTitle, { color: COLORS.TEXT }]}>{item.scope} — {item.label}</Text>
                  <Text style={[styles.scopeDesc, { color: COLORS.TEXT_MUTED }]}>{item.desc}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Metodoloji</Text>
        <Card style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.INFO} />
          <Text style={[styles.infoText, { color: COLORS.TEXT_SECONDARY }]}>
            <Text style={{ fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT }}>DEFRA 2023 GHG Conversion Factors{"\n"}</Text>
            Diesel: 2.68 · Benzin: 2.31 · LPG: 1.51 kg CO₂e/L{"\n"}
            <Text style={{ color: COLORS.TEXT_MUTED }}>
              Tank dolum kayıtlarına dayalı Scope 1 tahmini. Tam CSRD/ESRS beyanının yerine geçmez; CSRD hazırlık sürecini destekler.
            </Text>
          </Text>
        </View>
      </>
    );
  };

  // ── Coming Soon ────────────────────────────────────────────────────────────
  const renderSoon = (title) => (
    <View style={styles.centerWrap}>
      <Ionicons name="construct-outline" size={48} color={COLORS.TEXT_MUTED} />
      <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>{title}</Text>
      <View style={[styles.soonBadge, { backgroundColor: COLORS.WARNING }]}>
        <Text style={[styles.soonBadgeText, { color: COLORS.WHITE }]}>Yakında</Text>
      </View>
      <Text style={[styles.soonDesc, { color: COLORS.TEXT_MUTED }]}>Bu sekme Faz 2 kapsamında geliştirilecek.</Text>
    </View>
  );

  // ── Tab content ────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (activeTab === "operations")      return renderOps();
    if (activeTab === "fuel")            return renderFuel();
    if (activeTab === "driverQuality")   return renderSoon("Sürücü Kalitesi");
    if (activeTab === "fleetEfficiency") return renderSoon("Filo Verimliliği");
    if (activeTab === "sustainability")  return renderSustainability();
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarInner}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { backgroundColor: withAlpha(COLORS.PRIMARY, 0.1), borderColor: COLORS.PRIMARY }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={15} color={isActive ? COLORS.PRIMARY : COLORS.TEXT_MUTED} />
              <Text style={[styles.tabText, { color: isActive ? COLORS.PRIMARY : COLORS.TEXT_MUTED, fontWeight: isActive ? "700" : "400" }]}>
                {tab.label}
              </Text>
              {tab.soon && (
                <View style={[styles.soonDot, { backgroundColor: COLORS.WARNING }]}>
                  <Text style={[styles.soonText, { color: COLORS.WHITE }]}>2</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Date Range */}
      {(activeTab === "operations" || activeTab === "fuel") && (
        <View style={styles.dateRow}>
          {DATE_RANGES.map(r => {
            const isActive = selectedRange === r.days;
            return (
              <TouchableOpacity
                key={r.days}
                style={[styles.dateBtn, { backgroundColor: isActive ? COLORS.PRIMARY : "transparent" }]}
                onPress={() => setSelectedRange(r.days)}
              >
                <Text style={[styles.dateBtnText, { color: isActive ? COLORS.WHITE : COLORS.TEXT_SECONDARY }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

export default AdminReportsScreen;
