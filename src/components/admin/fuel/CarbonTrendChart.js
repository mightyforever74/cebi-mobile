// src/components/admin/fuel/CarbonTrendChart.js
// TulipFleet - Monthly Carbon Emission Trend Chart

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/config";

const CarbonTrendChart = ({ data }) => {
  const { t } = useTranslation();

  if (!data || !data.months || data.months.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          📈 {t("fuelDashboard.carbon.monthlyEmission")}
        </Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="analytics-outline"
            size={48}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyText}>{t("fuelDashboard.noData")}</Text>
        </View>
      </View>
    );
  }

  const maxEmission = Math.max(...data.emissions, ...data.euTarget, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          📈 {t("fuelDashboard.carbon.monthlyEmission")}
        </Text>
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>kg CO₂</Text>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {data.months.map((month, index) => {
            const emission = data.emissions[index] || 0;
            const target = data.euTarget[index] || 6000;
            const heightPercent = (emission / maxEmission) * 100;
            const targetHeightPercent = (target / maxEmission) * 100;
            const isAboveTarget = emission > target;

            return (
              <View key={index} style={styles.barWrapper}>
                <Text style={styles.barValue}>
                  {(emission / 1000).toFixed(1)}t
                </Text>
                <View style={styles.barBackground}>
                  {/* Target Line */}
                  <View
                    style={[
                      styles.targetLine,
                      { bottom: `${targetHeightPercent}%` },
                    ]}
                  />
                  {/* Emission Bar */}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: isAboveTarget ? "#EF4444" : "#10B981",
                      },
                    ]}
                  />
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
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>
            {t("fuelDashboard.carbon.emission")}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine]} />
          <Text style={styles.legendText}>
            {t("fuelDashboard.carbon.euTarget")}
          </Text>
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
  unitBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
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
    overflow: "visible",
    position: "relative",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
  },
  targetLine: {
    position: "absolute",
    left: -4,
    right: -4,
    height: 2,
    backgroundColor: "#F59E0B",
    zIndex: 10,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
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
  legendLine: {
    width: 16,
    height: 2,
    backgroundColor: "#F59E0B",
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

export default CarbonTrendChart;
