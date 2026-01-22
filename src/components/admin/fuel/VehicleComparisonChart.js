// src/components/admin/fuel/VehicleComparisonChart.js
// TulipFleet - Vehicle Fuel Comparison Chart

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../../constants/config";

const getStatusColor = (status) => {
  switch (status) {
    case "high":
      return "#EF4444";
    case "medium":
      return "#F59E0B";
    case "good":
      return "#10B981";
    default:
      return COLORS.textSecondary;
  }
};

const VehicleComparisonChart = ({ data, onVehiclePress }) => {
  const { t } = useTranslation();

  if (!data || !data.vehicles || data.vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          🚗 {t("fuelDashboard.vehicleComparison")}
        </Text>
        <View style={styles.emptyState}>
          <Ionicons name="car-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>
            {t("fuelDashboard.noVehicleData")}
          </Text>
        </View>
      </View>
    );
  }

  const maxConsumption = Math.max(
    ...data.vehicles.map((v) => parseFloat(v.consumption)),
    15
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          🚗 {t("fuelDashboard.vehicleComparison")}
        </Text>
        <View style={styles.avgBadge}>
          <Text style={styles.avgText}>
            {t("fuelDashboard.fleetAverage")}:{" "}
            <Text style={styles.avgValue}>{data.fleetAverage} L/100</Text>
          </Text>
        </View>
      </View>

      {/* Vehicle Bars */}
      {data.vehicles.slice(0, 5).map((vehicle, index) => {
        const barWidth =
          (parseFloat(vehicle.consumption) / maxConsumption) * 100;
        const statusColor = getStatusColor(vehicle.status);

        return (
          <TouchableOpacity
            key={vehicle.id || index}
            style={styles.vehicleRow}
            onPress={() => onVehiclePress && onVehiclePress(vehicle)}
          >
            <View style={styles.vehicleInfo}>
              <Text style={styles.plate}>{vehicle.plate}</Text>
              <Text style={styles.vehicleDetail}>
                {vehicle.brand} • {vehicle.driver}
              </Text>
            </View>
            <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
                {/* Average Line */}
                <View
                  style={[
                    styles.averageLine,
                    {
                      left: `${(parseFloat(data.fleetAverage) / maxConsumption) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <Text style={[styles.consumptionValue, { color: statusColor }]}>
                {vehicle.consumption}
              </Text>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>{t("fuelDashboard.high")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>{t("fuelDashboard.medium")}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>{t("fuelDashboard.good")}</Text>
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
  avgBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avgText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  avgValue: {
    fontWeight: "600",
    color: COLORS.text,
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  vehicleInfo: {
    width: 100,
  },
  plate: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  vehicleDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  barBackground: {
    height: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  averageLine: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    backgroundColor: COLORS.text,
    opacity: 0.3,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 70,
    justifyContent: "flex-end",
  },
  consumptionValue: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
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

export default VehicleComparisonChart;
