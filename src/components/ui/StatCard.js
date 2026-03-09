// src/components/ui/StatCard.js
// TulipFleet - Stat Card Component
// Phase 0 - Component Library
// UI Guide v3 compliant: COLORS token, 8px grid, sifir hardcoded hex

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { withAlpha } from "../../utils/colorUtils";
import Card from "./Card";

/**
 * StatCard - Dashboard KPI karti
 *
 * @param {string} icon          - Ionicons icon adi (default: "stats-chart-outline")
 * @param {string} label         - Kart basligi (i18n string)
 * @param {string|number} value  - Gosterilecek deger
 * @param {string} trend         - Trend metni ("+3 bugun", "-2%") -- opsiyonel
 * @param {string} colorToken    - COLORS token adi: "PRIMARY" | "SUCCESS" | "WARNING" | "ERROR" | "INFO"
 * @param {string} subtitle      - Ikinci satir aciklama -- opsiyonel
 *
 * @example
 * <StatCard
 *   icon="car-sport-outline"
 *   label={t("dashboard.activeVehicles")}
 *   value={12}
 *   trend="+2 bugun"
 *   colorToken="PRIMARY"
 * />
 */
export default function StatCard({
  icon = "stats-chart-outline",
  label,
  value,
  trend,
  subtitle,
  colorToken = "PRIMARY",
  compact = false,
}) {
  const { COLORS } = useTheme();

  const color = COLORS[colorToken] || COLORS.PRIMARY;

  const trendPositive =
    trend && !trend.startsWith("-") && !trend.startsWith("\u2212");

  // ── Compact: dikey layout (3'lü grid için) ──────────────────
  if (compact) {
    return (
      <Card variant="default" noMargin style={styles.compactCard}>
        <View
          style={[
            styles.compactIconBox,
            { backgroundColor: withAlpha(color, 0.12) },
          ]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text
          style={[styles.compactValue, { color: COLORS.TEXT }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value ?? "\u2014"}
        </Text>
        <Text
          style={[styles.compactLabel, { color: COLORS.MUTED }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </Text>
        <View
          style={[styles.accent, { backgroundColor: withAlpha(color, 0.6) }]}
        />
      </Card>
    );
  }

  // ── Normal: yatay layout ────────────────────────────────────
  return (
    <Card variant="default" noMargin style={styles.card}>
      <View style={styles.row}>
        <View
          style={[styles.iconBox, { backgroundColor: withAlpha(color, 0.12) }]}
        >
          <Ionicons name={icon} size={18} color={color} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.value, { color: COLORS.TEXT }]}>
            {value ?? "\u2014"}
          </Text>

          <Text
            style={[styles.label, { color: COLORS.MUTED }]}
            numberOfLines={1}
          >
            {label}
          </Text>

          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: COLORS.MUTED }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {trend ? (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: withAlpha(
                  trendPositive ? COLORS.SUCCESS : COLORS.ERROR,
                  0.12
                ),
              },
            ]}
          >
            <Ionicons
              name={trendPositive ? "trending-up" : "trending-down"}
              size={12}
              color={trendPositive ? COLORS.SUCCESS : COLORS.ERROR}
            />
            <Text
              style={[
                styles.trendText,
                { color: trendPositive ? COLORS.SUCCESS : COLORS.ERROR },
              ]}
            >
              {trend}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[styles.accent, { backgroundColor: withAlpha(color, 0.6) }]}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 0,
    padding: 10,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  label: {
    marginTop: 2,
    fontSize: 13,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 8,
    gap: 3,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  accent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },

  // ── Compact (dikey) layout ──────────────────────────────────
  compactCard: {
    flex: 1,
    margin: 0,
    padding: 10,
    overflow: "hidden",
    alignItems: "center",
    minHeight: 96,
  },
  compactIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  compactValue: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  compactLabel: {
    marginTop: 3,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
});
