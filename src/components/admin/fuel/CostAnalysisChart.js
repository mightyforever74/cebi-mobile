// src/components/admin/fuel/CostAnalysisChart.js
// TulipFleet - Cost Analysis Pie Chart

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/config";
import { formatNumber } from "../../../utils/helpers";

const FUEL_COLORS = {
  diesel: "#3B82F6",
  gasoline: "#10B981",
  petrol: "#10B981",
  lpg: "#F59E0B",
  electric: "#8B5CF6",
};

const CostAnalysisChart = ({ data }) => {
  const { t } = useTranslation();

  if (!data || !data.byFuelType || data.byFuelType.length === 0) {
    return null;
  }

  const total = data.total || 0;
  const prevMonth = data.previousMonth || 0;
  const change =
    prevMonth > 0 ? (((total - prevMonth) / prevMonth) * 100).toFixed(1) : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💰 {t("fuelDashboard.costAnalysis")}</Text>

      <View style={styles.content}>
        {/* Fake Pie Chart Visualization */}
        <View style={styles.pieContainer}>
          <View style={styles.pieChart}>
            <View style={styles.pieInner}>
              <Text style={styles.pieTotal}>₺{(total / 1000).toFixed(1)}K</Text>
              <Text style={styles.pieTotalLabel}>
                {t("fuelDashboard.total")}
              </Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          {data.byFuelType.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: FUEL_COLORS[item.type] || "#6B7280" },
                  ]}
                />
                <Text style={styles.legendLabel}>
                  {t(`adminVehicles.fuelTypes.${item.type === "petrol" ? "gasoline" : item.type}`, item.type)}
                </Text>
              </View>
              <View style={styles.legendValues}>
                <Text style={styles.legendAmount}>
                  ₺{formatNumber(item.amount)}
                </Text>
                <Text style={styles.legendPercent}>{item.percentage}%</Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("fuelDashboard.total")}:</Text>
            <Text style={styles.summaryValue}>₺{formatNumber(total)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("fuelDashboard.previousMonth")}:
            </Text>
            <Text style={styles.summaryValue}>
              ₺{formatNumber(prevMonth)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {t("fuelDashboard.change")}:
            </Text>
            <View style={styles.changeContainer}>
              <Ionicons
                name={change >= 0 ? "arrow-up" : "arrow-down"}
                size={14}
                color={change >= 0 ? "#EF4444" : "#10B981"}
              />
              <Text
                style={[
                  styles.changeValue,
                  { color: change >= 0 ? "#EF4444" : "#10B981" },
                ]}
              >
                %{Math.abs(change)}
              </Text>
            </View>
          </View>
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
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  pieContainer: {
    width: 120,
    height: 120,
    marginRight: 20,
  },
  pieChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    // Simple gradient effect with border
    borderWidth: 20,
    borderColor: "#10B981",
    borderTopColor: "#3B82F6",
    borderRightColor: "#3B82F6",
    borderBottomColor: "#F59E0B",
  },
  pieInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  pieTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  pieTotalLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  legendContainer: {
    flex: 1,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 13,
    color: COLORS.text,
  },
  legendValues: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  legendPercent: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  changeValue: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export default CostAnalysisChart;
