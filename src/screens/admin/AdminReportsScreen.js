// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Rapor Ekranı v2.2
// Sprint B + D4 — Operations + Driving Quality sekmeleri aktif

import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useState } from "react";
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
import StatusBadge from "../../components/ui/StatusBadge";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import api from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";
import { formatDate as formatDateHelper } from "../../utils/helpers";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DATE_RANGE_KEYS = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
];

const TAB_KEYS = ["operations", "fuel", "driving", "fleet", "sustainability"];
const TAB_ICONS = {
  operations: "stats-chart-outline",
  fuel: "flame-outline",
  driving: "shield-checkmark-outline",
  fleet: "car-outline",
  sustainability: "leaf-outline",
};

// ─── PDF HTML GENERATOR ───────────────────────────────────────────────────────

const trimName = (first, last) =>
  `${(first || "").trim()} ${(last || "").trim()}`.trim() || "—";

const formatDate = (isoString) => {
  try {
    return formatDateHelper(isoString);
  } catch {
    return isoString;
  }
};

const buildOpsHtml = (data, days, t, language) => {
  if (!data) return "";
  const s = data.summary || {};
  const companyName = data.company_name || "";
  const periodFrom = data.period?.from;
  const vehicles = (data.vehicles || []).filter((v) => v.task_count > 0);
  const drivers = (data.drivers || []).filter((d) => d.task_count > 0);
  const now = formatDate(new Date().toISOString(), language);
  const dateFrom = periodFrom ? formatDate(periodFrom, language) : "";
  const completionRate =
    s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  const totalAlerts = drivers.reduce((sum, d) => sum + (d.alert_count || 0), 0);
  const currentYear = new Date().getFullYear();
  const minLabel = t("reports.minAbbr");

  const vehicleRows = vehicles
    .map(
      (v) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:#F45B35">${v.plate_no}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666">${v.brand || ""} ${v.model || ""}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${v.task_count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:#10B981;font-weight:600">${v.completed}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${v.total_km ? v.total_km + " km" : "—"}</td>
    </tr>`
    )
    .join("");

  const driverRows = drivers
    .map(
      (d) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500">${trimName(d.first_name, d.last_name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${d.task_count}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:#10B981;font-weight:600">${d.completed}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:${d.alert_count > 0 ? "#F59E0B" : "#9CA3AF"};font-weight:${d.alert_count > 0 ? "700" : "400"}">${d.alert_count ?? 0}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${d.avg_duration_min ? d.avg_duration_min + " " + minLabel : "—"}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="${language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 24px; color: #1F2937; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F45B35; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #F45B35; }
    .company { font-size: 16px; font-weight: 600; color: #1F2937; margin-top: 2px; }
    .subtitle { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6B7280; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { background: #F9FAFB; border-radius: 8px; padding: 16px; border-left: 4px solid #F45B35; }
    .kpi-value { font-size: 28px; font-weight: 700; color: #F45B35; }
    .kpi-label { font-size: 12px; color: #6B7280; margin-top: 4px; }
    .kpi.success { border-left-color: #10B981; } .kpi.success .kpi-value { color: #10B981; }
    .kpi.warning { border-left-color: #F59E0B; } .kpi.warning .kpi-value { color: #F59E0B; }
    .kpi.error   { border-left-color: #EF4444; } .kpi.error   .kpi-value { color: #EF4444; }
    .kpi.info    { border-left-color: #3B82F6; } .kpi.info    .kpi-value { color: #3B82F6; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 15px; font-weight: 700; color: #1F2937; margin-bottom: 12px; display: flex; align-items: center; }
    .section-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #F3F4F6; }
    th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; }
    th:last-child { text-align: right; }
    td { font-size: 13px; color: #374151; }
    .footer { margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 11px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🌷 TulipFleet</div>
      ${companyName ? `<div class="company">${companyName}</div>` : ""}
      <div class="subtitle">${t("reports.opsTitle")} — ${t("reports.lastNDays", { days })}</div>
      ${dateFrom ? `<div class="subtitle">${dateFrom} – ${now}</div>` : ""}
    </div>
    <div class="meta">
      <div>${now}</div>
      <div style="margin-top:4px">${t("reports.generatedBy")}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title"><span class="section-dot" style="background:#F45B35"></span>${t("reports.taskSummary")}</div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-value">${s.total ?? "—"}</div><div class="kpi-label">${t("reports.totalTasks")}</div></div>
      <div class="kpi success"><div class="kpi-value">${s.completed ?? "—"}</div><div class="kpi-label">${t("reports.completed")} (${completionRate}%)</div></div>
      <div class="kpi error"><div class="kpi-value">${s.cancelled ?? "—"}</div><div class="kpi-label">${t("reports.cancelled")}</div></div>
      <div class="kpi warning"><div class="kpi-value">${s.pending ?? "—"}</div><div class="kpi-label">${t("reports.pending")}</div></div>
      <div class="kpi info"><div class="kpi-value">${s.avg_duration_min ?? "—"}</div><div class="kpi-label">${t("reports.avgDuration")} (${minLabel})</div></div>
      <div class="kpi warning"><div class="kpi-value">${totalAlerts}</div><div class="kpi-label">${t("reports.totalAlerts")}</div></div>
      ${s.total_km !== undefined ? `<div class="kpi info"><div class="kpi-value">${s.total_km}</div><div class="kpi-label">${t("reports.totalKm")} (km)</div></div>` : ""}
      ${s.on_time_start_rate !== undefined && s.on_time_start_rate !== null ? `<div class="kpi success"><div class="kpi-value">${s.on_time_start_rate}%</div><div class="kpi-label">${t("reports.onTimeRate")}</div></div>` : ""}
      ${s.delayed !== undefined ? `<div class="kpi error"><div class="kpi-value">${s.delayed}</div><div class="kpi-label">${t("reports.delayed")}</div></div>` : ""}
    </div>
  </div>

  ${
    vehicles.length > 0
      ? `
  <div class="section">
    <div class="section-title"><span class="section-dot" style="background:#3B82F6"></span>${t("reports.vehiclePerformance")}</div>
    <table>
      <thead><tr>
        <th>${t("reports.plate")}</th><th>${t("reports.vehicle")}</th><th style="text-align:center">${t("reports.tasks")}</th><th style="text-align:center">${t("reports.completed")}</th><th style="text-align:right">${t("reports.distance")}</th>
      </tr></thead>
      <tbody>${vehicleRows}</tbody>
    </table>
  </div>`
      : ""
  }

  ${
    drivers.length > 0
      ? `
  <div class="section">
    <div class="section-title"><span class="section-dot" style="background:#10B981"></span>${t("reports.driverSummary")}</div>
    <table>
      <thead><tr>
        <th>${t("reports.driver")}</th><th style="text-align:center">${t("reports.tasks")}</th><th style="text-align:center">${t("reports.completed")}</th><th style="text-align:center">${t("reports.alerts")}</th><th style="text-align:right">${t("reports.avgDuration")}</th>
      </tr></thead>
      <tbody>${driverRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <div class="footer">TulipFleet Fleet Management · tulipfleet.com · © ${currentYear}</div>
</body>
</html>`;
};

// ─── DRIVING QUALITY HTML GENERATOR ─────────────────────────────────────────

const buildDrivingHtml = (data, days, t, language) => {
  if (!data) return "";
  const drivers = (data.drivers || []).filter((d) => d.total_tasks > 0);
  const companyName = data.company_name || "";
  const periodFrom = data.period?.from;
  const now = formatDate(new Date().toISOString(), language);
  const dateFrom = periodFrom ? formatDate(periodFrom, language) : "";
  const currentYear = new Date().getFullYear();
  const minLabel = t("reports.minAbbr");

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "#9CA3AF";
    if (score >= 90) return "#10B981";
    if (score >= 75) return "#3B82F6";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score, scoreNote) => {
    if (score === null || score === undefined) {
      if (scoreNote === "insufficient_distance")
        return t("reports.scoreInsufficientDist");
      return t("reports.scoreNA");
    }
    if (score >= 90) return t("reports.scoreExcellent");
    if (score >= 75) return t("reports.scoreGood");
    if (score >= 60) return t("reports.scoreNeedsReview");
    return t("reports.scoreRisk");
  };

  const driverRows = drivers
    .map((d) => {
      const color = getScoreColor(d.driving_score);
      const initials =
        `${d.first_name?.[0] || ""}${d.last_name?.[0] || ""}`.toUpperCase() ||
        "?";
      const events = [];
      if (d.hard_brake_count > 0)
        events.push(`${d.hard_brake_count} ${t("reports.hardBrake")}`);
      if (d.hard_turn_count > 0)
        events.push(`${d.hard_turn_count} ${t("reports.hardTurn")}`);
      if (d.hard_accel_count > 0)
        events.push(`${d.hard_accel_count} ${t("reports.hardAccel")}`);
      if (d.overspeed_count > 0)
        events.push(`${d.overspeed_count} ${t("reports.overspeed")}`);
      if (d.impact_count > 0)
        events.push(`${d.impact_count} ${t("reports.impact")}`);
      const eventsText =
        events.length > 0 ? events.join(" · ") : t("reports.noIncidents");
      const scoreDisplay =
        d.driving_score !== null && d.driving_score !== undefined
          ? d.driving_score
          : "—";

      return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <div style="display:flex;align-items:center">
          <div style="width:36px;height:36px;border-radius:18px;background:${color}22;display:flex;align-items:center;justify-content:center;margin-right:10px;flex-shrink:0">
            <span style="font-size:13px;font-weight:700;color:${color}">${initials}</span>
          </div>
          <div>
            <div style="font-weight:600;color:#1F2937">${trimName(d.first_name, d.last_name)}</div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:2px">${d.total_km ? d.total_km + " km" : "—"} · ${d.completed_tasks}/${d.total_tasks} ${t("reports.tasks").toLowerCase()}</div>
          </div>
        </div>
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:center">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:22px;border:3px solid ${color}">
          <span style="font-size:15px;font-weight:700;color:${color}">${scoreDisplay}</span>
        </div>
        <div style="font-size:10px;color:${color};margin-top:4px;font-weight:600">${getScoreLabel(d.driving_score, d.score_note)}</div>
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;font-size:12px;color:#6B7280">${eventsText}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;font-size:13px;color:${d.total_alerts > 0 ? "#F59E0B" : "#9CA3AF"};font-weight:${d.total_alerts > 0 ? "700" : "400"}">${d.total_alerts}</td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-size:13px;color:#374151">${d.avg_duration_min ? d.avg_duration_min + " " + minLabel : "—"}</td>
    </tr>`;
    })
    .join("");

  // Backend hala TR string olarak gönderiyor (bu sprint scope dışı).
  // Sprint 2'de backend key'e çevrilecek, frontend t() ile çevirecek.
  const limitations = (data.limitations || [])
    .map((l) => `<li style="margin:4px 0">${l}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="${language || "en"}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 24px; color: #1F2937; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F45B35; padding-bottom: 16px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 700; color: #F45B35; }
    .company { font-size: 16px; font-weight: 600; color: #1F2937; margin-top: 2px; }
    .subtitle { font-size: 13px; color: #6B7280; margin-top: 4px; }
    .meta { text-align: right; font-size: 12px; color: #6B7280; }
    .section-title { font-size: 15px; font-weight: 700; color: #1F2937; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #F3F4F6; }
    th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6B7280; }
    .warning { background:#FEF3C7; border-radius:8px; padding:12px 16px; margin-top:24px; font-size:12px; color:#92400E; }
    .warning ul { margin: 8px 0 0 0; padding-left: 16px; }
    .footer { margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 11px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🌷 TulipFleet</div>
      ${companyName ? `<div class="company">${companyName}</div>` : ""}
      <div class="subtitle">${t("reports.driverPerfTitle")} — ${t("reports.lastNDays", { days })}</div>
      ${dateFrom ? `<div class="subtitle">${dateFrom} – ${now}</div>` : ""}
    </div>
    <div class="meta">
      <div>${now}</div>
      <div style="margin-top:4px">${t("reports.driverCount", { count: drivers.length })}</div>
    </div>
  </div>

  <div class="section-title">${t("reports.driverPerformance")}</div>
  <table>
    <thead><tr>
      <th>${t("reports.driver")}</th>
      <th style="text-align:center">${t("reports.score")}</th>
      <th>${t("reports.events")}</th>
      <th style="text-align:center">${t("reports.alerts")}</th>
      <th style="text-align:right">${t("reports.avgDuration")}</th>
    </tr></thead>
    <tbody>${driverRows || `<tr><td colspan='5' style='padding:24px;text-align:center;color:#9CA3AF'>${t("reports.noData")}</td></tr>`}</tbody>
  </table>

  ${
    limitations
      ? `
  <div class="warning">
    ⚠️ <strong>${t("reports.limitationsTitle")}</strong>
    <ul>${limitations}</ul>
  </div>`
      : ""
  }

  <div class="footer">TulipFleet Fleet Management · tulipfleet.com · © ${currentYear}</div>
</body>
</html>`;
};

// ─── STYLES ───────────────────────────────────────────────────────────────────

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    filterBar: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    rangeBtn: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.xs,
    },
    rangeBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    tabBtn: {
      flex: 1,
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xs,
    },
    tabBtnText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      marginTop: COLORS.SPACING.xs,
    },
    tabIndicator: {
      position: "absolute",
      bottom: 0,
      left: COLORS.SPACING.sm,
      right: COLORS.SPACING.sm,
      height: 2,
      borderRadius: COLORS.RADIUS.xs,
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.xl,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    sectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: COLORS.SPACING.xs,
    },
    sectionTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
      flex: 1,
    },
    kpiRow: { flexDirection: "row", marginBottom: COLORS.SPACING.xs },
    kpiCell: { flex: 1, marginRight: COLORS.SPACING.xs },
    kpiCellLast: { flex: 1 },
    kpiCardInner: { borderLeftWidth: 3, overflow: "hidden" },
    kpiTop: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.xs,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    kpiTextBlock: { flex: 1 },
    kpiValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    kpiLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.xs,
    },
    kpiBadgeRow: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
    },
    tableHeader: {
      flexDirection: "row",
      paddingVertical: COLORS.SPACING.xs,
      paddingHorizontal: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    tableHeaderText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_MUTED,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    tableCell: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT },
    tableCellSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs,
    },

    // Driving Quality
    driverCard: {
      borderLeftWidth: 3,
      overflow: "hidden",
      marginBottom: COLORS.SPACING.xs,
    },
    driverCardTop: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
    },
    driverAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    driverAvatarText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    driverInfo: { flex: 1 },
    driverName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
    },
    driverMeta: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    driverContext: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      marginTop: COLORS.SPACING.xs,
    },
    scoreCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 3,
    },
    scoreValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    scoreLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
    },
    alertRow: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingBottom: COLORS.SPACING.sm,
    },
    alertChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      marginRight: COLORS.SPACING.xs,
    },
    alertChipText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },

    // Limitations banner
    limitBanner: {
      backgroundColor: withAlpha(COLORS.BLACK, 0.04),
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.md,
    },
    limitTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_MUTED,
      marginBottom: COLORS.SPACING.xs,
    },
    limitItem: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs,
    },

    // Placeholder
    placeholderWrap: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xl,
    },
    placeholderTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      marginBottom: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.md,
    },
    placeholderText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      textAlign: "center",
      paddingHorizontal: COLORS.SPACING.lg,
    },
    centerWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.xl,
    },
    centerText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.sm,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.md,
    },
    retryBtnText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

const KpiCard = ({
  label,
  value,
  color,
  icon,
  qualityLabel,
  qualityStatus,
  isLast,
  styles,
  COLORS,
}) => (
  <View style={isLast ? styles.kpiCellLast : styles.kpiCell}>
    <Card
      noMarginBottom
      style={[styles.kpiCardInner, { borderLeftColor: color }]}
    >
      <View style={styles.kpiTop}>
        <View
          style={[styles.iconBox, { backgroundColor: withAlpha(color, 0.12) }]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.kpiTextBlock}>
          <Text style={[styles.kpiValue, { color }]}>{value ?? "—"}</Text>
          <Text style={styles.kpiLabel}>{label}</Text>
        </View>
      </View>
      {qualityLabel ? (
        <View style={styles.kpiBadgeRow}>
          <StatusBadge
            status={qualityStatus || "INFO"}
            label={qualityLabel}
            size="sm"
          />
        </View>
      ) : null}
    </Card>
  </View>
);

// ─── OPERATIONS TAB ───────────────────────────────────────────────────────────

const OperationsTab = ({ data, styles, COLORS, t }) => {
  if (!data) return null;
  const s = data.summary;
  const completionRate =
    s?.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  const totalAlerts = (data.drivers || []).reduce(
    (sum, d) => sum + (d.alert_count || 0),
    0
  );
  const reliableLabel = t("reports.quality.reliable");
  const partialLabel = t("reports.quality.partial");
  const partial30Label = t("reports.quality.partialTolerance30m");

  return (
    <>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionDot, { backgroundColor: COLORS.PRIMARY }]}
        />
        <Text style={styles.sectionTitle}>
          {t("reports.sections.taskSummary")}
        </Text>
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("reports.kpi.totalTasks")}
          value={s?.total}
          color={COLORS.PRIMARY}
          icon="checkmark-circle-outline"
          qualityLabel={reliableLabel}
          qualityStatus="SUCCESS"
          styles={styles}
          COLORS={COLORS}
        />
        <KpiCard
          label={`${t("reports.kpi.completedTasks")} (%${completionRate})`}
          value={s?.completed}
          color={COLORS.SUCCESS}
          icon="checkmark-done-outline"
          qualityLabel={reliableLabel}
          qualityStatus="SUCCESS"
          isLast
          styles={styles}
          COLORS={COLORS}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("reports.kpi.cancelledTasks")}
          value={s?.cancelled}
          color={COLORS.ERROR}
          icon="close-circle-outline"
          qualityLabel={reliableLabel}
          qualityStatus="SUCCESS"
          styles={styles}
          COLORS={COLORS}
        />
        <KpiCard
          label={t("reports.kpi.pending")}
          value={s?.pending}
          color={COLORS.WARNING}
          icon="time-outline"
          qualityLabel={reliableLabel}
          qualityStatus="SUCCESS"
          isLast
          styles={styles}
          COLORS={COLORS}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("reports.kpi.avgDuration")}
          value={s?.avg_duration_min}
          color={COLORS.INFO}
          icon="timer-outline"
          qualityLabel={partialLabel}
          qualityStatus="WARNING"
          styles={styles}
          COLORS={COLORS}
        />
        <KpiCard
          label={t("reports.kpi.delayedTasks")}
          value={s?.delayed ?? 0}
          color={COLORS.ERROR}
          icon="alert-circle-outline"
          qualityLabel={partialLabel}
          qualityStatus="WARNING"
          isLast
          styles={styles}
          COLORS={COLORS}
        />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard
          label={t("reports.kpi.onTimeStartRate")}
          value={
            s?.on_time_start_rate != null ? `%${s.on_time_start_rate}` : "—"
          }
          color={COLORS.SUCCESS}
          icon="trending-up-outline"
          qualityLabel={partial30Label}
          qualityStatus="WARNING"
          styles={styles}
          COLORS={COLORS}
        />
        <KpiCard
          label={t("reports.kpi.totalAlerts")}
          value={totalAlerts}
          color={COLORS.WARNING}
          icon="warning-outline"
          qualityLabel={reliableLabel}
          qualityStatus="SUCCESS"
          isLast
          styles={styles}
          COLORS={COLORS}
        />
      </View>

      {s?.completed > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionDot, { backgroundColor: COLORS.INFO }]}
            />
            <Text style={styles.sectionTitle}>
              {t("reports.distSource.title")}
            </Text>
          </View>
          <Card noMarginBottom>
            {[
              {
                key: "gps",
                label: t("reports.distSource.gps"),
                count: s.dist_gps ?? 0,
                color: COLORS.SUCCESS,
              },
              {
                key: "route",
                label: t("reports.distSource.route"),
                count: s.dist_route ?? 0,
                color: COLORS.INFO,
              },
              {
                key: "manual",
                label: t("reports.distSource.manual"),
                count: s.dist_manual ?? 0,
                color: COLORS.WARNING,
              },
              {
                key: "unknown",
                label: t("reports.distSource.unknown"),
                count: s.dist_unknown ?? 0,
                color: COLORS.TEXT_MUTED,
              },
            ].map((item) => (
              <View key={item.key} style={styles.tableRow}>
                <View
                  style={[
                    styles.sectionDot,
                    {
                      backgroundColor: item.color,
                      marginRight: COLORS.SPACING.sm,
                    },
                  ]}
                />
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      color: item.count > 0 ? item.color : COLORS.TEXT_MUTED,
                      fontWeight:
                        item.count > 0
                          ? COLORS.TYPOGRAPHY.weights.semibold
                          : COLORS.TYPOGRAPHY.weights.regular,
                    },
                  ]}
                >
                  {item.count} {t("reports.distSource.tasks")}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {data.vehicles?.filter((v) => v.task_count > 0).length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionDot, { backgroundColor: COLORS.INFO }]}
            />
            <Text style={styles.sectionTitle}>
              {t("reports.sections.vehiclePerformance")}
            </Text>
          </View>
          <Card noMarginBottom>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                {t("reports.table.vehicle")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                {t("reports.table.tasks")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                {t("reports.table.completed")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "right" },
                ]}
              >
                {t("reports.table.distance")}
              </Text>
            </View>
            {data.vehicles
              .filter((v) => v.task_count > 0)
              .map((v, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ flex: 2 }}>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          color: COLORS.PRIMARY,
                          fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
                        },
                      ]}
                    >
                      {v.plate_no}
                    </Text>
                    <Text style={styles.tableCellSub}>
                      {v.brand} {v.model}
                    </Text>
                  </View>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "center" }]}
                  >
                    {v.task_count}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        textAlign: "center",
                        color: COLORS.SUCCESS,
                        fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
                      },
                    ]}
                  >
                    {v.completed}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
                  >
                    {v.total_km ? `${v.total_km}km` : "—"}
                  </Text>
                </View>
              ))}
          </Card>
        </>
      )}

      {data.drivers?.filter((d) => d.task_count > 0).length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionDot, { backgroundColor: COLORS.SUCCESS }]}
            />
            <Text style={styles.sectionTitle}>
              {t("reports.sections.driverSummary")}
            </Text>
          </View>
          <Card noMarginBottom>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                {t("reports.table.driver")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                {t("reports.table.tasks")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                {t("reports.table.completed")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "center" },
                ]}
              >
                {t("reports.table.alerts")}
              </Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: "right" },
                ]}
              >
                {t("reports.table.avgDuration")}
              </Text>
            </View>
            {data.drivers
              .filter((d) => d.task_count > 0)
              .map((d, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      { flex: 2, fontWeight: COLORS.TYPOGRAPHY.weights.medium },
                    ]}
                  >
                    {d.first_name} {d.last_name}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "center" }]}
                  >
                    {d.task_count}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        textAlign: "center",
                        color: COLORS.SUCCESS,
                        fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
                      },
                    ]}
                  >
                    {d.completed}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      {
                        flex: 1,
                        textAlign: "center",
                        color:
                          d.alert_count > 0
                            ? COLORS.WARNING
                            : COLORS.TEXT_MUTED,
                        fontWeight:
                          d.alert_count > 0
                            ? COLORS.TYPOGRAPHY.weights.bold
                            : COLORS.TYPOGRAPHY.weights.regular,
                      },
                    ]}
                  >
                    {d.alert_count ?? 0}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: "right" }]}
                  >
                    {d.avg_duration_min ? `${d.avg_duration_min}dk` : "—"}
                  </Text>
                </View>
              ))}
          </Card>
        </>
      )}
    </>
  );
};

// ─── DRIVING QUALITY TAB ──────────────────────────────────────────────────────

const getScoreColor = (score, COLORS) => {
  if (score === null) return COLORS.TEXT_MUTED;
  if (score >= 90) return COLORS.SUCCESS; // Excellent
  if (score >= 75) return COLORS.INFO; // Good
  if (score >= 60) return COLORS.WARNING; // Needs review
  return COLORS.ERROR; // Risk
};

// Bağlam satırı oluşturur — sabit formatlı
// Olaylıysa: "2 ani fren · 1 sert viraj → -28 puan"
// Temizse:   "0 olay · tam puan"
// N/Aysa:    "Skor hesaplanamadı · mesafe yetersiz"
const buildScoreContext = (d, t) => {
  if (d.driving_score === null) {
    const reason =
      d.score_note === "insufficient_distance"
        ? t("reports.driving.reasonInsufficient")
        : t("reports.driving.reasonNoData");
    return `${t("reports.driving.scoreNA")} · ${reason}`;
  }

  const events = [];
  if (d.hard_brake_count > 0)
    events.push(`${d.hard_brake_count} ${t("reports.driving.hardBrake")}`);
  if (d.hard_turn_count > 0)
    events.push(`${d.hard_turn_count} ${t("reports.driving.hardTurn")}`);
  if (d.hard_accel_count > 0)
    events.push(`${d.hard_accel_count} ${t("reports.driving.hardAccel")}`);
  if (d.overspeed_count > 0)
    events.push(`${d.overspeed_count} ${t("reports.driving.overspeed")}`);
  if (d.impact_count > 0)
    events.push(`${d.impact_count} ${t("reports.driving.impact")}`);

  if (events.length === 0) {
    return t("reports.driving.contextClean"); // "0 olay · tam puan"
  }

  // Sadece olaylari listele — penalty hesabi backend'e ait, frontend tekrar hesaplamaz
  return events.join(" · ");
};

const AlertChip = ({ icon, count, color, label, styles, COLORS }) => {
  if (count === 0) return null;
  return (
    <View
      style={[styles.alertChip, { backgroundColor: withAlpha(color, 0.1) }]}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.alertChipText, { color }]}>
        {count} {label}
      </Text>
    </View>
  );
};

const DrivingQualityTab = ({
  data,
  loading,
  error,
  onRetry,
  styles,
  COLORS,
  t,
}) => {
  if (loading)
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.centerText}>{t("reports.loading")}</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.centerWrap}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
        <Text style={styles.centerText}>{t("reports.error")}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>{t("reports.retry")}</Text>
        </TouchableOpacity>
      </View>
    );

  if (!data) return null;

  const drivers = data.drivers || [];
  const activeDrivers = drivers.filter((d) => d.total_tasks > 0);

  return (
    <>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionDot, { backgroundColor: COLORS.PRIMARY }]}
        />
        <Text style={styles.sectionTitle}>
          {t("reports.driving.driverScores")}
        </Text>
      </View>

      {activeDrivers.length === 0 ? (
        <View style={styles.placeholderWrap}>
          <Ionicons
            name="shield-checkmark-outline"
            size={48}
            color={COLORS.TEXT_MUTED}
          />
          <Text style={styles.placeholderTitle}>
            {t("reports.driving.noData")}
          </Text>
          <Text style={styles.placeholderText}>
            {t("reports.driving.noDataDesc")}
          </Text>
        </View>
      ) : (
        activeDrivers.map((d, idx) => {
          const scoreColor = getScoreColor(d.driving_score, COLORS);
          const initials =
            `${d.first_name?.[0] || ""}${d.last_name?.[0] || ""}`.toUpperCase() ||
            "?";
          const hasAlerts = d.total_alerts > 0;

          return (
            <Card
              key={idx}
              noMarginBottom
              style={[styles.driverCard, { borderLeftColor: scoreColor }]}
            >
              <View style={styles.driverCardTop}>
                <View
                  style={[
                    styles.driverAvatar,
                    { backgroundColor: withAlpha(COLORS.PRIMARY, 0.15) },
                  ]}
                >
                  <Text
                    style={[styles.driverAvatarText, { color: COLORS.PRIMARY }]}
                  >
                    {initials}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>
                    {d.first_name} {d.last_name}
                  </Text>
                  <Text style={styles.driverMeta}>
                    {d.completed_tasks}/{d.total_tasks}{" "}
                    {t("reports.driving.tasks")} ·{" "}
                    {d.total_km ? `${d.total_km}km` : "—"}
                  </Text>
                  <Text style={[styles.driverContext, { color: scoreColor }]}>
                    {buildScoreContext(d, t)}
                  </Text>
                </View>
                <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                  {d.driving_score !== null ? (
                    <Text style={[styles.scoreValue, { color: scoreColor }]}>
                      {d.driving_score}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.scoreValue,
                        {
                          color: COLORS.TEXT_MUTED,
                          fontSize: COLORS.TYPOGRAPHY.sizes.xs,
                        },
                      ]}
                    >
                      N/A
                    </Text>
                  )}
                </View>
              </View>

              {hasAlerts && (
                <View style={styles.alertRow}>
                  <AlertChip
                    icon="alert-circle-outline"
                    count={d.hard_brake_count}
                    color={COLORS.ERROR}
                    label={t("reports.driving.hardBrake")}
                    styles={styles}
                    COLORS={COLORS}
                  />
                  <AlertChip
                    icon="refresh-outline"
                    count={d.hard_turn_count}
                    color={COLORS.WARNING}
                    label={t("reports.driving.hardTurn")}
                    styles={styles}
                    COLORS={COLORS}
                  />
                  <AlertChip
                    icon="flash-outline"
                    count={d.hard_accel_count}
                    color={COLORS.WARNING}
                    label={t("reports.driving.hardAccel")}
                    styles={styles}
                    COLORS={COLORS}
                  />
                  <AlertChip
                    icon="speedometer-outline"
                    count={d.overspeed_count}
                    color={COLORS.ERROR}
                    label={t("reports.driving.overspeed")}
                    styles={styles}
                    COLORS={COLORS}
                  />
                  <AlertChip
                    icon="warning-outline"
                    count={d.impact_count}
                    color={COLORS.ERROR}
                    label={t("reports.driving.impact")}
                    styles={styles}
                    COLORS={COLORS}
                  />
                </View>
              )}
            </Card>
          );
        })
      )}

      {/* Limitations Banner */}
      <View style={styles.limitBanner}>
        <Text style={styles.limitTitle}>
          ⚠️ {t("reports.driving.limitationsTitle")}
        </Text>
        {(data.limitations || []).map((l, idx) => (
          <Text key={idx} style={styles.limitItem}>
            · {l}
          </Text>
        ))}
      </View>
    </>
  );
};

// ─── PLACEHOLDER TAB ──────────────────────────────────────────────────────────

const PlaceholderTab = ({ tabKey, styles, COLORS, t }) => (
  <View style={styles.placeholderWrap}>
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: withAlpha(COLORS.TEXT_MUTED, 0.1),
        justifyContent: "center",
        alignItems: "center",
        marginBottom: COLORS.SPACING.md,
      }}
    >
      <Ionicons name={TAB_ICONS[tabKey]} size={32} color={COLORS.TEXT_MUTED} />
    </View>
    <Text style={styles.placeholderTitle}>
      {t(`reports.placeholder.${tabKey}.title`)}
    </Text>
    <Text style={styles.placeholderText}>
      {t(`reports.placeholder.${tabKey}.desc`)}
    </Text>
  </View>
);

// ─── ANA EKRAN ────────────────────────────────────────────────────────────────

const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, i18n } = useTranslation();

  const [selectedDays, setSelectedDays] = useState(30);
  const [activeTab, setActiveTab] = useState("operations");

  // Operations data
  const [opsData, setOpsData] = useState(null);
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsError, setOpsError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Driving quality data (lazy)
  const [drvData, setDrvData] = useState(null);
  const [drvLoading, setDrvLoading] = useState(false);
  const [drvError, setDrvError] = useState(null);

  const fetchOps = useCallback(async (days) => {
    try {
      setOpsError(null);
      const res = await api.get(`/api/reports/operations?days=${days}`);
      setOpsData(res.data?.data || res.data);
    } catch (e) {
      setOpsError(e);
    } finally {
      setOpsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDriving = useCallback(async (days) => {
    try {
      setDrvLoading(true);
      setDrvError(null);
      const res = await api.get(
        `/api/reports/drivers/performance?days=${days}`
      );
      setDrvData(res.data?.data || res.data);
    } catch (e) {
      setDrvError(e);
    } finally {
      setDrvLoading(false);
    }
  }, []);

  const handleExportPDF = async () => {
    if (!opsData || pdfLoading) return;
    setPdfLoading(true);
    try {
      const html = buildOpsHtml(opsData, selectedDays, t, i18n.language);
      const filename = `tulipfleet_operations_${new Date().toISOString().slice(0, 10)}.html`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/html",
          dialogTitle: "Operations Summary",
          UTI: "public.html",
        });
      }
    } catch (e) {
      console.error("[Reports] Export error:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportDrivingPDF = async () => {
    if (!drvData || pdfLoading) return;
    setPdfLoading(true);
    try {
      const html = buildDrivingHtml(drvData, selectedDays, t, i18n.language);
      const filename = `tulipfleet_driver_performance_${new Date().toISOString().slice(0, 10)}.html`;
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/html",
          dialogTitle: "Driver Performance Report",
          UTI: "public.html",
        });
      }
    } catch (e) {
      console.error("[Reports] Driving export error:", e);
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    setDrvData(null);
    fetchOps(selectedDays);
  }, [selectedDays, fetchOps]);

  // Driving tab'a geçilince lazy fetch
  useEffect(() => {
    if (activeTab === "driving" && !drvData && !drvLoading) {
      fetchDriving(selectedDays);
    }
  }, [activeTab, drvData, drvLoading, selectedDays, fetchDriving]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === "driving") {
      setDrvData(null);
      fetchDriving(selectedDays);
    }
    fetchOps(selectedDays);
  }, [selectedDays, activeTab, fetchOps, fetchDriving]);

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  if (opsLoading && activeTab === "operations")
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.centerText}>{t("reports.loading")}</Text>
      </View>
    );

  if (opsError && activeTab === "operations")
    return (
      <View style={[styles.container, styles.centerWrap]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.ERROR} />
        <Text style={styles.centerText}>{t("reports.error")}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setOpsLoading(true);
            fetchOps(selectedDays);
          }}
        >
          <Text style={styles.retryBtnText}>{t("reports.retry")}</Text>
        </TouchableOpacity>
      </View>
    );

  const renderTabContent = () => {
    switch (activeTab) {
      case "operations":
        return (
          <OperationsTab data={opsData} styles={styles} COLORS={COLORS} t={t} />
        );
      case "driving":
        return (
          <DrivingQualityTab
            data={drvData}
            loading={drvLoading}
            error={drvError}
            onRetry={() => fetchDriving(selectedDays)}
            styles={styles}
            COLORS={COLORS}
            t={t}
          />
        );
      default:
        return (
          <PlaceholderTab
            tabKey={activeTab}
            styles={styles}
            COLORS={COLORS}
            t={t}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {DATE_RANGE_KEYS.map((r) => {
          const isActive = selectedDays === r.days;
          return (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.rangeBtn,
                {
                  backgroundColor: isActive
                    ? COLORS.PRIMARY
                    : withAlpha(COLORS.PRIMARY, 0.08),
                },
              ]}
              onPress={() => setSelectedDays(r.days)}
            >
              <Text
                style={[
                  styles.rangeBtnText,
                  { color: isActive ? COLORS.WHITE : COLORS.TEXT_SECONDARY },
                ]}
              >
                {t(`reports.filter.${r.key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {activeTab === "operations" && opsData && (
          <TouchableOpacity
            style={[
              styles.rangeBtn,
              {
                backgroundColor: pdfLoading
                  ? withAlpha(COLORS.ERROR, 0.15)
                  : withAlpha(COLORS.ERROR, 0.1),
                marginLeft: "auto",
              },
            ]}
            onPress={handleExportPDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={COLORS.ERROR} />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={16}
                color={COLORS.ERROR}
              />
            )}
          </TouchableOpacity>
        )}

        {activeTab === "driving" && drvData && (
          <TouchableOpacity
            style={[
              styles.rangeBtn,
              {
                backgroundColor: pdfLoading
                  ? withAlpha(COLORS.ERROR, 0.15)
                  : withAlpha(COLORS.ERROR, 0.1),
                marginLeft: "auto",
              },
            ]}
            onPress={handleExportDrivingPDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={COLORS.ERROR} />
            ) : (
              <Ionicons
                name="document-text-outline"
                size={16}
                color={COLORS.ERROR}
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {TAB_KEYS.map((key) => {
          const isActive = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tabBtn}
              onPress={() => handleTabChange(key)}
            >
              <Ionicons
                name={TAB_ICONS[key]}
                size={18}
                color={isActive ? COLORS.PRIMARY : COLORS.TEXT_MUTED}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  {
                    color: isActive ? COLORS.PRIMARY : COLORS.TEXT_MUTED,
                    fontWeight: isActive
                      ? COLORS.TYPOGRAPHY.weights.semibold
                      : COLORS.TYPOGRAPHY.weights.regular,
                  },
                ]}
              >
                {t(`reports.tabs.${key}`)}
              </Text>
              {isActive && (
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: COLORS.PRIMARY },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
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
        {renderTabContent()}
      </ScrollView>
    </View>
  );
};

export default AdminReportsScreen;
