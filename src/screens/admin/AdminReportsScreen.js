// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Raporlar Modülü v2.0
// UI Guide v3: Card, StatCard, COLORS token, withAlpha

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
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { withAlpha } from "../../utils/colorUtils";
import api from "../../services/api";

const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("operations");
  const [selectedRange, setSelectedRange] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const [opsLoading, setOpsLoading] = useState(true);
  const [opsData, setOpsData] = useState(null);
  const [opsError, setOpsError] = useState(null);

  const [fuelLoading, setFuelLoading] = useState(true);
  const [fuelData, setFuelData] = useState(null);
  const [fuelSavings, setFuelSavings] = useState(null);
  const [fuelError, setFuelError] = useState(null);

  const DATE_RANGES = useMemo(() => [
    { label: t("reports.last7Days", "Son 7 Gün"), days: 7 },
    { label: t("reports.last30Days", "Son 30 Gün"), days: 30 },
    { label: t("reports.last90Days", "Son 90 Gün"), days: 90 },
  ], [t]);

  const TABS = useMemo(() => [
    { key: "operations", label: t("reports.tabs.operations", "Operasyon"), icon: "clipboard-outline" },
    { key: "fuel", label: t("reports.tabs.fuel", "Yakıt"), icon: "speedometer-outline" },
    { key: "driverQuality", label: t("reports.tabs.driverQuality", "Sürücü"), icon: "person-outline", soon: true },
    { key: "fleetEfficiency", label: t("reports.tabs.fleetEfficiency", "Filo"), icon: "car-outline", soon: true },
    { key: "sustainability", label: t("reports.tabs.sustainability", "Çevre"), icon: "leaf-outline", soon: true },
  ], [t]);

  const fetchOperations = useCallback(async () => {
    try {
      setOpsLoading(true);
      setOpsError(null);
      await api.get("/api/reports/operations", { params: { days: selectedRange } });
    } catch {
      try {
        const r = await api.get("/api/tasks");
        const all = r.data?.tasks || r.data || [];
        const cutoff = new Date(Date.now() - selectedRange * 86400000);
        const tasks = all.filter(t => new Date(t.created_at) >= cutoff);
        setOpsData({
          total: tasks.length,
          completed: tasks.filter(t => t.status === "completed").length,
          cancelled: tasks.filter(t => t.status === "cancelled").length,
          rejected: tasks.filter(t => t.status === "rejected").length,
          pending: tasks.filter(t => ["pending_review","accepted","in_progress"].includes(t.status)).length,
          onTimeStart: null, onTimeDelivery: null, avgDuration: null, delayedCount: null,
        });
      } catch (e) { setOpsError(e); }
    } finally { setOpsLoading(false); }
  }, [selectedRange]);

  const fetchFuel = useCallback(async () => {
    try {
      setFuelLoading(true);
      setFuelError(null);
      const [a, s] = await Promise.allSettled([
        api.get("/api/fuel/company/analytics"),
        api.get("/api/fuel/company/savings"),
      ]);
      if (a.status === "fulfilled") setFuelData(a.value?.data?.data || a.value?.data);
      if (s.status === "fulfilled") setFuelSavings(s.value?.data?.data || s.value?.data);
    } catch (e) { setFuelError(e); }
    finally { setFuelLoading(false); }
  }, []);

  useEffect(() => { fetchOperations(); fetchFuel(); }, [fetchOperations, fetchFuel]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchOperations(), fetchFuel()]);
    setRefreshing(false);
  }, [fetchOperations, fetchFuel]);

  const renderLoading = (msg) => (
    <View style={styles.centerWrap}>
      <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      <Text style={[styles.centerText, { color: COLORS.TEXT_MUTED }]}>{msg}</Text>
    </View>
  );

  const renderError = (retry) => (
    <View style={styles.centerWrap}>
      <Ionicons name="alert-circle-outline" size={40} color={COLORS.ERROR} />
      <Text style={[styles.centerText, { color: COLORS.TEXT_SECONDARY }]}>Veri yüklenemedi</Text>
      <TouchableOpacity style={[styles.retryBtn, { backgroundColor: COLORS.PRIMARY }]} onPress={retry}>
        <Text style={[styles.retryBtnText, { color: COLORS.WHITE }]}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOperations = () => {
    if (opsLoading) return renderLoading("Operasyon verileri yükleniyor...");
    if (opsError) return renderError(fetchOperations);
    if (!opsData) return null;
    const rate = opsData.total > 0 ? `%${Math.round((opsData.completed / opsData.total) * 100)}` : "%0";
    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Görev Özeti</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCell}><StatCard icon="list-outline" label="Toplam Görev" value={opsData.total} colorToken="PRIMARY" /></View>
          <View style={styles.statCell}><StatCard icon="checkmark-circle-outline" label="Tamamlanan" value={opsData.completed} sub={rate} colorToken="SUCCESS" /></View>
          <View style={styles.statCell}><StatCard icon="close-circle-outline" label="İptal / Red" value={(opsData.cancelled||0)+(opsData.rejected||0)} colorToken="ERROR" /></View>
          <View style={styles.statCell}><StatCard icon="time-outline" label="Bekleyen" value={opsData.pending||0} colorToken="WARNING" /></View>
        </View>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Performans</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCell}><StatCard icon="rocket-outline" label="Zamanında Başlama" value={opsData.onTimeStart != null ? `%${opsData.onTimeStart}` : "—"} sub="±15 dk" colorToken="INFO" /></View>
          <View style={styles.statCell}><StatCard icon="flag-outline" label="Zamanında Teslim" value={opsData.onTimeDelivery != null ? `%${opsData.onTimeDelivery}` : "—"} sub="±15 dk" colorToken="INFO" /></View>
          <View style={styles.statCell}><StatCard icon="timer-outline" label="Ort. Görev Süresi" value={opsData.avgDuration != null ? `${Math.round(opsData.avgDuration)} dk` : "—"} colorToken="PRIMARY" /></View>
          <View style={styles.statCell}><StatCard icon="warning-outline" label="Geciken Görev" value={opsData.delayedCount ?? "—"} colorToken="WARNING" /></View>
        </View>
        <Card>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.INFO} />
            <Text style={[styles.infoText, { color: COLORS.TEXT_SECONDARY }]}>
              Zamanında başlama/teslim için{" "}
              <Text style={{ fontWeight: "700", color: COLORS.PRIMARY }}>/api/reports/operations</Text>
              {" "}endpoint'i tamamlandığında aktif olacak.
            </Text>
          </View>
        </Card>
      </>
    );
  };

  const renderFuel = () => {
    if (fuelLoading) return renderLoading("Yakıt verileri yükleniyor...");
    if (fuelError) return renderError(fetchFuel);
    const summary = fuelData?.summary;
    const vehicles = fuelData?.vehicles || [];
    const savings = fuelSavings?.savings;
    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Yakıt Özeti</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCell}><StatCard icon="water-outline" label="Toplam Tüketim" value={summary ? `${parseFloat(summary.total_liters||0).toFixed(0)} L` : "—"} colorToken="PRIMARY" /></View>
          <View style={styles.statCell}><StatCard icon="card-outline" label="Toplam Maliyet" value={summary ? `€${parseFloat(summary.total_cost||0).toFixed(0)}` : "—"} colorToken="WARNING" /></View>
          <View style={styles.statCell}><StatCard icon="speedometer-outline" label="Ort. Tüketim" value={summary ? `${parseFloat(summary.avg_consumption||0).toFixed(1)} L/100` : "—"} colorToken="INFO" /></View>
          <View style={styles.statCell}><StatCard icon="navigate-outline" label="Toplam KM" value={summary ? parseInt(summary.total_km||0).toLocaleString("tr-TR") : "—"} colorToken="SUCCESS" /></View>
        </View>
        {fuelSavings?.has_baseline && savings && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Tasarruf Analizi</Text>
            <Card>
              <View style={styles.savingsHeader}>
                <Ionicons name="trending-down" size={24} color={COLORS.SUCCESS} />
                <Text style={[styles.savingsBig, { color: COLORS.SUCCESS }]}>%{parseFloat(savings.consumption_improvement_percent||0).toFixed(1)}</Text>
                <Text style={[styles.savingsLabel, { color: COLORS.TEXT_SECONDARY }]}>Verimlilik Artışı</Text>
              </View>
              <View style={styles.savingsRow}>
                {[
                  { val: `${parseFloat(savings.liters_saved||0).toFixed(1)} L`, key: "Tasarruf" },
                  { val: `€${parseFloat(savings.money_saved||0).toFixed(0)}`, key: "Maliyet" },
                  { val: `${parseFloat(savings.co2_saved_kg||0).toFixed(0)} kg`, key: "CO₂" },
                  { val: `€${parseFloat(savings.yearly_projection||0).toFixed(0)}`, key: "Yıllık" },
                ].map((item) => (
                  <View key={item.key} style={styles.savingsItem}>
                    <Text style={[styles.savingsVal, { color: COLORS.TEXT }]}>{item.val}</Text>
                    <Text style={[styles.savingsKey, { color: COLORS.TEXT_MUTED }]}>{item.key}</Text>
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
              const pc = v.performance === "good" || v.performance === "excellent" ? COLORS.SUCCESS : v.performance === "poor" ? COLORS.ERROR : COLORS.WARNING;
              return (
                <Card key={v.vehicle_id}>
                  <View style={styles.vehicleRow}>
                    <View style={[styles.rankBadge, { backgroundColor: withAlpha(pc, 0.12) }]}>
                      <Text style={[styles.rankText, { color: pc }]}>{idx + 1}</Text>
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={[styles.vehiclePlate, { color: COLORS.TEXT }]}>{v.plate_no}</Text>
                      <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_MUTED }]}>{v.driver_name || "Atanmamış"}</Text>
                    </View>
                    <View style={styles.vehicleRight}>
                      <Text style={[styles.vehicleConsumption, { color: pc }]}>{avg > 0 ? `${avg.toFixed(1)} L/100` : "— L/100"}</Text>
                      {v.is_anomaly && (
                        <View style={[styles.anomalyBadge, { backgroundColor: withAlpha(COLORS.ERROR, 0.12) }]}>
                          <Text style={[styles.anomalyText, { color: COLORS.ERROR }]}>Anormal</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </>
    );
  };

  const renderSustainability = () => {
    const CO2_FACTORS = { diesel: 2.68, gasoline: 2.31, lpg: 1.51, electric: 0 };
    const summary = fuelData?.summary;
    const vehicles = fuelData?.vehicles || [];
    const vehicleEmissions = vehicles.map((v) => {
      const liters = parseFloat(v.total_liters || 0);
      const factor = CO2_FACTORS[v.fuel_type] || CO2_FACTORS.diesel;
      return { ...v, co2e_kg: liters * factor };
    });
    const totalCo2kg = vehicleEmissions.reduce((s, v) => s + v.co2e_kg, 0);
    const totalLiters = parseFloat(summary?.total_liters || 0);
    const totalKm = parseInt(summary?.total_km || 0);

    return (
      <>
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Emisyon Özeti</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCell}><StatCard icon="leaf-outline" label="Toplam CO₂e" value={totalCo2kg > 0 ? `${(totalCo2kg/1000).toFixed(2)} ton` : "—"} sub="DEFRA 2023" colorToken="SUCCESS" /></View>
          <View style={styles.statCell}><StatCard icon="water-outline" label="Toplam Yakıt" value={totalLiters > 0 ? `${totalLiters.toFixed(0)} L` : "—"} colorToken="INFO" /></View>
          <View style={styles.statCell}><StatCard icon="navigate-outline" label="kg CO₂e / km" value={totalKm > 0 ? `${(totalCo2kg/totalKm).toFixed(3)}` : "—"} colorToken="WARNING" /></View>
          <View style={styles.statCell}><StatCard icon="car-outline" label="Kapsam" value="Scope 1" sub="Yakıt bazlı" colorToken="PRIMARY" /></View>
        </View>

        {vehicleEmissions.filter(v => v.co2e_kg > 0).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Araç Bazlı Emisyon</Text>
            {vehicleEmissions.filter(v => v.co2e_kg > 0).sort((a,b) => b.co2e_kg - a.co2e_kg).map((v, idx) => {
              const pct = totalCo2kg > 0 ? (v.co2e_kg / totalCo2kg) * 100 : 0;
              return (
                <Card key={v.vehicle_id}>
                  <View style={styles.vehicleRow}>
                    <View style={[styles.rankBadge, { backgroundColor: withAlpha(COLORS.SUCCESS, 0.12) }]}>
                      <Text style={[styles.rankText, { color: COLORS.SUCCESS }]}>{idx + 1}</Text>
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={[styles.vehiclePlate, { color: COLORS.TEXT }]}>{v.plate_no}</Text>
                      <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_MUTED }]}>{(v.fuel_type||"diesel").toUpperCase()}</Text>
                    </View>
                    <View style={styles.vehicleRight}>
                      <Text style={[styles.vehicleConsumption, { color: COLORS.TEXT }]}>{v.co2e_kg.toFixed(0)} kg</Text>
                      <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_MUTED }]}>%{pct.toFixed(0)} pay</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Kapsam Durumu</Text>
        <Card>
          {[
            { scope: "Scope 1", label: "Doğrudan Emisyon", status: "partial", desc: "Yakıt tüketiminden tahmini — boundary tanımı eksik" },
            { scope: "Scope 2", label: "Elektrik / Enerji", status: "missing", desc: "EV şarj ve satın alınan enerji verisi yok" },
            { scope: "Scope 3", label: "Değer Zinciri", status: "missing", desc: "Tedarik zinciri ve taşeron emisyonları yok" },
          ].map((item, idx) => {
            const sc = item.status === "partial" ? COLORS.WARNING : COLORS.ERROR;
            const sl = item.status === "partial" ? "Kısmi" : "Eksik";
            return (
              <View key={item.scope} style={[styles.scopeRow, idx > 0 && { borderTopWidth: 1, borderTopColor: COLORS.DIVIDER, marginTop: COLORS.SPACING.sm, paddingTop: COLORS.SPACING.sm }]}>
                <View style={[styles.scopeBadge, { backgroundColor: withAlpha(sc, 0.12) }]}>
                  <Text style={[styles.scopeBadgeText, { color: sc }]}>{sl}</Text>
                </View>
                <View style={styles.scopeInfo}>
                  <Text style={[styles.scopeTitle, { color: COLORS.TEXT }]}>{item.scope} — {item.label}</Text>
                  <Text style={[styles.scopeDesc, { color: COLORS.TEXT_MUTED }]}>{item.desc}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Metodoloji</Text>
        <Card>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.INFO} />
            <View style={styles.methodContent}>
              <Text style={[styles.vehiclePlate, { color: COLORS.TEXT }]}>DEFRA 2023 GHG Conversion Factors</Text>
              <Text style={[styles.vehicleDriver, { color: COLORS.TEXT_SECONDARY }]}>Diesel: 2.68 · Benzin: 2.31 · LPG: 1.51 kg CO₂e/L</Text>
              <Text style={[styles.scopeDesc, { color: COLORS.TEXT_MUTED, marginTop: COLORS.SPACING.xs }]}>
                Tank dolum kayıtlarına dayalı Scope 1 tahmini. Tam CSRD/ESRS beyanının yerine geçmez; CSRD hazırlık sürecini destekler.
              </Text>
            </View>
          </View>
        </Card>
      </>
    );
  };

  const renderComingSoon = (title) => (
    <View style={styles.comingSoonWrap}>
      <Ionicons name="construct-outline" size={48} color={COLORS.TEXT_MUTED} />
      <Text style={[styles.comingSoonTitle, { color: COLORS.TEXT }]}>{title}</Text>
      <View style={[styles.comingSoonBadge, { backgroundColor: COLORS.WARNING }]}>
        <Text style={[styles.comingSoonBadgeText, { color: COLORS.WHITE }]}>Yakında</Text>
      </View>
      <Text style={[styles.comingSoonDesc, { color: COLORS.TEXT_MUTED }]}>Bu sekme Faz 2 kapsamında geliştirilecek.</Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "operations": return renderOperations();
      case "fuel": return renderFuel();
      case "driverQuality": return renderComingSoon("Sürücü Kalitesi");
      case "fleetEfficiency": return renderComingSoon("Filo Verimliliği");
      case "sustainability": return renderSustainability();
      default: return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.BACKGROUND }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { backgroundColor: COLORS.SURFACE, borderBottomColor: COLORS.DIVIDER }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab) => {
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

      {(activeTab === "operations" || activeTab === "fuel") && (
        <View style={[styles.dateRow, { backgroundColor: COLORS.SURFACE, borderBottomColor: COLORS.DIVIDER }]}>
          {DATE_RANGES.map((r) => {
            const isActive = selectedRange === r.days;
            return (
              <TouchableOpacity key={r.days} style={[styles.dateBtn, isActive && { backgroundColor: COLORS.PRIMARY }]} onPress={() => setSelectedRange(r.days)}>
                <Text style={[styles.dateBtnText, { color: isActive ? COLORS.WHITE : COLORS.TEXT_SECONDARY }]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1 },
  tabBar: { borderBottomWidth: 1, maxHeight: 48 },
  tabBarContent: { paddingHorizontal: COLORS.SPACING.sm, paddingVertical: COLORS.SPACING.xs },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: COLORS.SPACING.sm, paddingVertical: COLORS.SPACING.xs, marginRight: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.pill, borderWidth: 1, borderColor: "transparent" },
  tabText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginLeft: COLORS.SPACING.xs },
  soonDot: { borderRadius: COLORS.RADIUS.pill, width: 16, height: 16, alignItems: "center", justifyContent: "center", marginLeft: COLORS.SPACING.xs },
  soonText: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: "700" },
  dateRow: { flexDirection: "row", paddingHorizontal: COLORS.SPACING.md, paddingVertical: COLORS.SPACING.sm, borderBottomWidth: 1 },
  dateBtn: { flex: 1, alignItems: "center", paddingVertical: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.sm, marginRight: COLORS.SPACING.xs },
  dateBtnText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "500" },
  scroll: { flex: 1 },
  scrollContent: { padding: COLORS.SPACING.md },
  bottomPad: { height: COLORS.SPACING.xl },
  sectionTitle: { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: "600", marginTop: COLORS.SPACING.md, marginBottom: COLORS.SPACING.sm },
  statGrid: { flexDirection: "row", flexWrap: "wrap", marginRight: -COLORS.SPACING.xs },
  statCell: { width: "50%", paddingRight: COLORS.SPACING.xs, marginBottom: COLORS.SPACING.xs },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoText: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginLeft: COLORS.SPACING.xs, flex: 1 },
  savingsHeader: { flexDirection: "row", alignItems: "center", marginBottom: COLORS.SPACING.sm },
  savingsBig: { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: "700", marginLeft: COLORS.SPACING.sm },
  savingsLabel: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginLeft: COLORS.SPACING.xs },
  savingsRow: { flexDirection: "row", justifyContent: "space-between" },
  savingsItem: { alignItems: "center" },
  savingsVal: { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: "600" },
  savingsKey: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
  vehicleRow: { flexDirection: "row", alignItems: "center" },
  rankBadge: { width: 32, height: 32, borderRadius: COLORS.RADIUS.md, alignItems: "center", justifyContent: "center", marginRight: COLORS.SPACING.sm },
  rankText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "700" },
  vehicleInfo: { flex: 1 },
  vehiclePlate: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "600" },
  vehicleDriver: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, marginTop: COLORS.SPACING.xs },
  vehicleRight: { alignItems: "flex-end" },
  vehicleConsumption: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "600" },
  anomalyBadge: { borderRadius: COLORS.RADIUS.pill, paddingHorizontal: COLORS.SPACING.xs, paddingVertical: COLORS.SPACING.xs, marginTop: COLORS.SPACING.xs },
  anomalyText: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: "600" },
  centerWrap: { alignItems: "center", paddingVertical: COLORS.SPACING.xl },
  centerText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginTop: COLORS.SPACING.sm },
  retryBtn: { marginTop: COLORS.SPACING.md, paddingHorizontal: COLORS.SPACING.lg, paddingVertical: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.pill },
  retryBtnText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "600" },
  scopeRow: { flexDirection: "row", alignItems: "flex-start" },
  scopeBadge: { borderRadius: COLORS.RADIUS.sm, paddingHorizontal: COLORS.SPACING.xs, paddingVertical: COLORS.SPACING.xs, marginRight: COLORS.SPACING.sm, minWidth: 48, alignItems: "center" },
  scopeBadgeText: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: "600" },
  scopeInfo: { flex: 1 },
  scopeTitle: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "600" },
  scopeDesc: { fontSize: COLORS.TYPOGRAPHY.sizes.xs },
  methodContent: { flex: 1, marginLeft: COLORS.SPACING.xs },
  comingSoonWrap: { alignItems: "center", paddingVertical: COLORS.SPACING.xxxl },
  comingSoonTitle: { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: "600", marginTop: COLORS.SPACING.md },
  comingSoonBadge: { borderRadius: COLORS.RADIUS.pill, paddingHorizontal: COLORS.SPACING.md, paddingVertical: COLORS.SPACING.xs, marginTop: COLORS.SPACING.sm },
  comingSoonBadgeText: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: "600" },
  comingSoonDesc: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginTop: COLORS.SPACING.sm, textAlign: "center", paddingHorizontal: COLORS.SPACING.xl },
});

export default AdminReportsScreen;
