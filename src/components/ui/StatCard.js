// src/components/ui/StatCard.js
// TulipFleet - Stat Card Component
// Phase 0 - Component Library
// UI Guide v3 compliant: COLORS token, 8px grid, sifir hardcoded hex

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Card from "./Card";
import { useTheme } from "../../context/ThemeContext";
import { withAlpha } from "../../utils/colorUtils";

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
}) {
  const { COLORS } = useTheme();

  const color = COLORS[colorToken] || COLORS.PRIMARY;

  const trendPositive =
    trend && !trend.startsWith("-") && !trend.startsWith("\u2212");

  return (
    <Card variant="default" noMargin style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: withAlpha(color, 0.12) },
          ]}
        >
          <Ionicons name={icon} size={22} color={color} />
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
    padding: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
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
});
