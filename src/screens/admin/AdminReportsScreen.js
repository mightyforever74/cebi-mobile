// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Operasyon Özet Raporu v1.0
// PDF export: expo-print + expo-sharing

import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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

// ─── STYLES ──────────────────────────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container:      { flex: 1, backgroundColor: COLORS.BACKGROUND },
    header:         { backgroundColor: COLORS.SURFACE, padding: COLORS.SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER },
    headerTitle:    { fontSize: COLORS.TYPOGRAPHY.sizes.lg, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT },
    headerSub:      { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_MUTED, marginTop: COLORS.SPACING.xs },
    // Date range
    rangeRow:       { flexDirection: "row", backgroundColor: COLORS.SURFACE, paddingHorizontal: COLORS.SPACING.md, paddingVertical: COLORS.SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER },
    rangeBtn:       { flex: 1, alignItems: "center", paddingVertical: COLORS.SPACING.xs, borderRadius: COLORS.RADIUS.sm, marginRight: COLORS.SPACING.xs },
    rangeBtnText:   { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.medium },
    // PDF button
    pdfBtn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.PRIMARY, margin: COLORS.SPACING.md, padding: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.md },
    pdfBtnText:     { color: COLORS.WHITE, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, fontSize: COLORS.TYPOGRAPHY.sizes.sm, marginLeft: COLORS.SPACING.xs },
    // Scroll
    scroll:         { flex: 1 },
    scrollContent:  { padding: COLORS.SPACING.md, paddingBottom: COLORS.SPACING.xl },
    // Section
    sectionTitle:   { fontSize: COLORS.TYPOGRAPHY.sizes.md, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT, marginTop: COLORS.SPACING.md, marginBottom: COLORS.SPACING.sm },
    // KPI grid
    kpiGrid:        { flexDirection: "row", flexWrap: "wrap", marginRight: -COLORS.SPACING.xs },
    kpiCell:        { width: "50%", paddingRight: COLORS.SPACING.xs, marginBottom: COLORS.SPACING.xs },
    kpiCard:        { backgroundColor: COLORS.SURFACE, borderRadius: COLORS.RADIUS.card, padding: COLORS.SPACING.sm, borderLeftWidth: 3, ...COLORS.SHADOWS.card },
    kpiValue:       { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold },
    kpiLabel:       { fontSize: COLORS.TYPOGRAPHY.sizes.xs, color: COLORS.TEXT_SECONDARY, marginTop: COLORS.SPACING.xs },
    // Table
    tableHeader:    { flexDirection: "row", backgroundColor: COLORS.BACKGROUND, paddingVertical: COLORS.SPACING.xs, paddingHorizontal: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.sm, marginBottom: COLORS.SPACING.xs },
    tableHeaderText:{ fontSize: COLORS.TYPOGRAPHY.sizes.xs, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT_MUTED },
    tableRow:       { flexDirection: "row", backgroundColor: COLORS.SURFACE, paddingVertical: COLORS.SPACING.sm, paddingHorizontal: COLORS.SPACING.sm, borderRadius: COLORS.RADIUS.sm, marginBottom: COLORS.SPACING.xs, ...COLORS.SHADOWS.card },
    tableCell:      { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT },
    tableCellMuted: { fontSize: COLORS.TYPOGRAPHY.sizes.xs, color: COLORS.TEXT_MUTED },
    // Center
    centerWrap:     { alignItems: "center", paddingVertical: COLORS.SPACING.xl },
    centerText:     { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_MUTED, marginTop: COLORS.SPACING.sm },
  });

// ─── PDF HTML TEMPLATE ────────────────────────────────────────────────────────
const buildPdfHtml = (data, company, days) => {
  const s = data.summary;
  const from = new Date(data.period.from).toLocaleDateString("tr-TR");
  const to = new Date().toLocaleDateString("tr-TR");
  const completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

  const vehicleRows = data.vehicles.map(v => `
    <tr>
      <td>${v.plate_no}</td>
      <td>${v.brand} ${v.model}</td>
      <td>${v.task_count}</td>
      <td>${v.completed}</td>
      <td>${v.total_km ? `${v.total_km} km` : "—"}</td>
    </tr>
  `).join("");

  const driverRows = data.drivers.map(d => `
    <tr>
      <td>${d.first_name || ""} ${d.last_name || ""}</td>
      <td>${d.task_count}</td>
      <td>${d.completed}</td>
      <td>${d.avg_duration_min ? `${d.avg_duration_min} dk` : "—"}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }
  h1 { color: #FF6B00; font-size: 22px; margin-bottom: 4px; }
  h2 { color: #333; font-size: 14px; border-bottom: 2px solid #FF6B00; padding-bottom: 6px; margin-top: 28px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 8px; }
  .kpi-card { background: #f8f9fa; border-radius: 8px; padding: 14px; border-left: 4px solid #FF6B00; }
  .kpi-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
  .kpi-label { font-size: 10px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-size: 11px; color: #444; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 40px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .badge-success { background: #d4edda; color: #155724; }
  .badge-warning { background: #fff3cd; color: #856404; }
</style>
</head>
<body>
  <h1>🌷 TulipFleet — Operasyon Özet Raporu</h1>
  <div class="meta">
    <strong>${company}</strong> &nbsp;|&nbsp; 
    Dönem: ${from} – ${to} (Son ${days} gün) &nbsp;|&nbsp;
    Oluşturma: ${new Date().toLocaleString("tr-TR")}
  </div>

  <h2>Görev Özeti</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-value">${s.total}</div>
      <div class="kpi-label">Toplam Görev</div>
    </div>
    <div class="kpi-card" style="border-left-color: #28a745;">
      <div class="kpi-value" style="color: #28a745;">${s.completed}</div>
      <div class="kpi-label">Tamamlanan (%${completionRate})</div>
    </div>
    <div class="kpi-card" style="border-left-color: #dc3545;">
      <div class="kpi-value" style="color: #dc3545;">${s.cancelled}</div>
      <div class="kpi-label">İptal / Reddedilen</div>
    </div>
    <div class="kpi-card" style="border-left-color: #ffc107;">
      <div class="kpi-value" style="color: #ffc107;">${s.pending}</div>
      <div class="kpi-label">Devam Eden</div>
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card" style="border-left-color: #6c757d;">
      <div class="kpi-value">${s.avg_duration_min ? `${s.avg_duration_min} dk` : "—"}</div>
      <div class="kpi-label">Ort. Görev Süresi</div>
    </div>
    <div class="kpi-card" style="border-left-color: #17a2b8;">
      <div class="kpi-value">${s.total_km ? `${s.total_km} km` : "—"}</div>
      <div class="kpi-label">Toplam Mesafe</div>
    </div>
    <div class="kpi-card" style="border-left-color: #dc3545;">
      <div class="kpi-value">${s.delayed || 0}</div>
      <div class="kpi-label">Geciken Görev</div>
    </div>
    <div class="kpi-card" style="border-left-color: #28a745;">
      <div class="kpi-value">%${completionRate}</div>
      <div class="kpi-label">Tamamlama Oranı</div>
    </div>
  </div>

  <h2>Araç Performansı</h2>
  <table>
    <tr><th>Plaka</th><th>Araç</th><th>Toplam Görev</th><th>Tamamlanan</th><th>Mesafe</th></tr>
    ${vehicleRows || "<tr><td colspan='5'>Veri yok</td></tr>"}
  </table>

  <h2>Sürücü Özeti</h2>
  <table>
    <tr><th>Sürücü</th><th>Toplam Görev</th><th>Tamamlanan</th><th>Ort. Süre</th></tr>
    ${driverRows || "<tr><td colspan='4'>Veri yok</td></tr>"}
  </table>

  <div class="footer">
    TulipFleet Fleet Management Platform &nbsp;|&nbsp; 
    Bu rapor otomatik olarak oluşturulmuştur. &nbsp;|&nbsp;
    api.tulipfleet.com
  </div>
</body>
</html>`;
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  const [selectedDays, setSelectedDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const DATE_RANGES = [
    { label: "Son 7 Gün", days: 7 },
    { label: "Son 30 Gün", days: 30 },
    { label: "Son 90 Gün", days: 90 },
  ];

  const fetchData = useCallback(async (days) => {
    try {
      setError(null);
      const res = await api.get(`/api/reports/operations?days=${days}`);
      setData(res.data?.data || res.data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedDays); }, [selectedDays, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(selectedDays);
  }, [selectedDays, fetchData]);

  const handleExportPdf = async () => {
    if (!data) return;
    try {
      setExporting(true);
      const html = buildPdfHtml(data, "TulipFleet", selectedDays);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Operasyon Raporu",
          UTI: "com.adobe.pdf",
        });
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      Alert.alert("Hata", "PDF oluşturulamadı: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const KpiCard = ({ label, value, color }) => (
    <View style={styles.kpiCell}>
      <View style={[styles.kpiCard, { borderLeftColor: color }]}>
        <Text style={[styles.kpiValue, { color: COLORS.TEXT }]}>{value ?? "—"}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
    </View>
  );

  if (loading) return (
    <View style={[styles.container, styles.centerWrap]}>
      <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      <Text style={styles.centerText}>Rapor yükleniyor...</Text>
    </View>
  );

  if (error) return (
    <View style={[styles.container, styles.centerWrap]}>
      <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
      <Text style={styles.centerText}>Veri yüklenemedi</Text>
      <TouchableOpacity
        style={[styles.pdfBtn, { margin: COLORS.SPACING.md, backgroundColor: COLORS.PRIMARY }]}
        onPress={() => { setLoading(true); fetchData(selectedDays); }}
      >
        <Text style={styles.pdfBtnText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );

  const s = data?.summary;
  const completionRate = s?.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Operasyon Raporu</Text>
        <Text style={styles.headerSub}>
          {new Date(data?.period?.from).toLocaleDateString("tr-TR")} – {new Date().toLocaleDateString("tr-TR")}
        </Text>
      </View>

      {/* Date Range */}
      <View style={styles.rangeRow}>
        {DATE_RANGES.map(r => {
          const isActive = selectedDays === r.days;
          return (
            <TouchableOpacity
              key={r.days}
              style={[styles.rangeBtn, { backgroundColor: isActive ? COLORS.PRIMARY : "transparent" }]}
              onPress={() => { setSelectedDays(r.days); setLoading(true); }}
            >
              <Text style={[styles.rangeBtnText, { color: isActive ? COLORS.WHITE : COLORS.TEXT_SECONDARY }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* PDF Export */}
      <TouchableOpacity style={styles.pdfBtn} onPress={handleExportPdf} disabled={exporting}>
        {exporting
          ? <ActivityIndicator size="small" color={COLORS.WHITE} />
          : <Ionicons name="document-text-outline" size={18} color={COLORS.WHITE} />
        }
        <Text style={styles.pdfBtnText}>
          {exporting ? "PDF Oluşturuluyor..." : "PDF İndir / Paylaş"}
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.PRIMARY]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Görev KPI'ları */}
        <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Görev Özeti</Text>
        <View style={styles.kpiGrid}>
          <KpiCard label="Toplam Görev"    value={s?.total}      color={COLORS.PRIMARY} />
          <KpiCard label={`Tamamlanan (%${completionRate})`} value={s?.completed} color={COLORS.SUCCESS} />
          <KpiCard label="İptal / Red"     value={s?.cancelled}  color={COLORS.ERROR} />
          <KpiCard label="Devam Eden"      value={s?.pending}    color={COLORS.WARNING} />
        </View>
        <View style={styles.kpiGrid}>
          <KpiCard label="Ort. Süre (dk)"  value={s?.avg_duration_min} color={COLORS.INFO} />
          <KpiCard label="Toplam Mesafe"   value={s?.total_km ? `${s.total_km} km` : "—"} color={COLORS.INFO} />
          <KpiCard label="Geciken Görev"   value={s?.delayed || 0} color={COLORS.ERROR} />
          <KpiCard label="Tamamlama"       value={`%${completionRate}`} color={COLORS.SUCCESS} />
        </View>

        {/* Araç tablosu */}
        {data?.vehicles?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Araç Performansı</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Araç</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Görev</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Tamam</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Mesafe</Text>
            </View>
            {data.vehicles.filter(v => v.task_count > 0).map((v, idx) => (
              <View key={idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tableCell}>{v.plate_no}</Text>
                  <Text style={styles.tableCellMuted}>{v.brand} {v.model}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{v.task_count}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center", color: COLORS.SUCCESS }]}>{v.completed}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{v.total_km ? `${v.total_km}km` : "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* Sürücü tablosu */}
        {data?.drivers?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: COLORS.TEXT }]}>Sürücü Özeti</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Sürücü</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Görev</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>Tamam</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Ort. Süre</Text>
            </View>
            {data.drivers.filter(d => d.task_count > 0).map((d, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{d.first_name} {d.last_name}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center" }]}>{d.task_count}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "center", color: COLORS.SUCCESS }]}>{d.completed}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>{d.avg_duration_min ? `${d.avg_duration_min}dk` : "—"}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminReportsScreen;
