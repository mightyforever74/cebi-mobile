// src/components/admin/fuel/FuelTrendChart.js
// TulipFleet - Monthly Fuel Trend Chart

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/config";

const { width } = Dimensions.get("window");

const FuelTrendChart = ({ data }) => {
  const { t } = useTranslation();

  if (!data || !data.months || data.months.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 {t("fuelDashboard.monthlyTrends")}</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="bar-chart-outline"
            size={48}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyText}>{t("fuelDashboard.noData")}</Text>
        </View>
      </View>
    );
  }

  const maxLiters = Math.max(...data.liters, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📈 {t("fuelDashboard.monthlyTrends")}</Text>
        <View style={styles.periodBadge}>
          <Text style={styles.periodText}>
            {t("fuelDashboard.last6Months")}
          </Text>
        </View>
      </View>

      {/* Simple Bar Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {data.months.map((month, index) => {
            const heightPercent = (data.liters[index] / maxLiters) * 100;
            return (
              <View key={index} style={styles.barWrapper}>
                <Text style={styles.barValue}>
                  {Math.round(data.liters[index])}
                </Text>
                <View style={styles.barBackground}>
                  <View style={[styles.bar, { height: `${heightPercent}%` }]} />
                </View>
                <Text style={styles.barLabel}>{month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
          />
          <Text style={styles.legendText}>{t("fuelDashboard.fuelLiters")}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  periodBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  periodText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    height: 180,
    marginBottom: 12,
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    maxWidth: 50,
  },
  barValue: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  barBackground: {
    width: 28,
    height: 120,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

export default FuelTrendChart;
