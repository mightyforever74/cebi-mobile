// src/components/admin/fuel/CarbonVehicleChart.js
// TulipFleet - Vehicle Carbon Emission Comparison

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
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

const getStatusLabel = (status, t) => {
  switch (status) {
    case "high":
      return t("fuelDashboard.carbon.statusHigh");
    case "medium":
      return t("fuelDashboard.carbon.statusMedium");
    case "good":
      return t("fuelDashboard.carbon.statusGood");
    default:
      return "";
  }
};

const CarbonVehicleChart = ({ data }) => {
  const { t } = useTranslation();

  if (!data || !data.vehicles || data.vehicles.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          🚗 {t("fuelDashboard.carbon.vehicleEmission")}
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

  const maxGPerKm = Math.max(
    ...data.vehicles.map((v) => v.gPerKm),
    data.euLimit * 1.5
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          🚗 {t("fuelDashboard.carbon.vehicleEmission")}
        </Text>
        <View style={styles.limitBadge}>
          <Text style={styles.limitText}>EU: {data.euLimit} g/km</Text>
        </View>
      </View>

      {/* Vehicle Bars */}
      {data.vehicles.slice(0, 5).map((vehicle, index) => {
        const barWidth = (vehicle.gPerKm / maxGPerKm) * 100;
        const statusColor = getStatusColor(vehicle.status);
        const euLimitPosition = (data.euLimit / maxGPerKm) * 100;

        return (
          <View key={vehicle.id || index} style={styles.vehicleRow}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.plate}>{vehicle.plate}</Text>
              <Text style={styles.vehicleDetail}>{vehicle.brand}</Text>
            </View>
            <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                {/* EU Limit Line */}
                <View
                  style={[styles.euLimitLine, { left: `${euLimitPosition}%` }]}
                />
                {/* Emission Bar */}
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.valueContainer}>
              <Text style={[styles.emissionValue, { color: statusColor }]}>
                {vehicle.gPerKm} g/km
              </Text>
              <Text
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor + "20", color: statusColor },
                ]}
              >
                {getStatusLabel(vehicle.status, t)}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>
            {t("fuelDashboard.fleetAverage")}:
          </Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  data.fleetAverage <= data.euLimit ? "#10B981" : "#EF4444",
              },
            ]}
          >
            {data.fleetAverage} g/km
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>
            EU {t("fuelDashboard.carbon.limit")}:
          </Text>
          <Text style={styles.summaryValue}>{data.euLimit} g/km</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================
// EU Compliance Card Component
// ============================================

export const EUComplianceCard = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const isCompliant = data.isCompliant;
  const vehiclesAbove = data.vehiclesAboveLimit || 0;

  return (
    <View
      style={[
        styles.complianceContainer,
        {
          borderLeftColor: isCompliant ? "#10B981" : "#EF4444",
          backgroundColor: isCompliant ? "#F0FDF4" : "#FEF2F2",
        },
      ]}
    >
      <View style={styles.complianceHeader}>
        <Ionicons
          name={isCompliant ? "checkmark-circle" : "alert-circle"}
          size={28}
          color={isCompliant ? "#10B981" : "#EF4444"}
        />
        <View style={styles.complianceTitle}>
          <Text
            style={[
              styles.complianceTitleText,
              { color: isCompliant ? "#10B981" : "#EF4444" },
            ]}
          >
            {t("fuelDashboard.carbon.euCompliance")}
          </Text>
          <Text style={styles.complianceStatus}>
            {isCompliant
              ? t("fuelDashboard.carbon.compliantMessage")
              : t("fuelDashboard.carbon.notCompliantMessage")}
          </Text>
        </View>
      </View>

      <View style={styles.complianceDetails}>
        <View style={styles.complianceRow}>
          <Text style={styles.complianceLabel}>
            {t("fuelDashboard.fleetAverage")}:
          </Text>
          <Text
            style={[
              styles.complianceValue,
              { color: isCompliant ? "#10B981" : "#EF4444" },
            ]}
          >
            {data.averageGPerKm} g/km
          </Text>
        </View>
        <View style={styles.complianceRow}>
          <Text style={styles.complianceLabel}>
            EU {t("fuelDashboard.carbon.limit")} (2026):
          </Text>
          <Text style={styles.complianceValue}>{data.euLimit} g/km</Text>
        </View>
        {vehiclesAbove > 0 && (
          <View style={styles.complianceRow}>
            <Text style={styles.complianceLabel}>
              {t("fuelDashboard.carbon.vehiclesAbove")}:
            </Text>
            <Text style={[styles.complianceValue, { color: "#EF4444" }]}>
              {vehiclesAbove} {t("fuelDashboard.carbon.vehicles")}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.complianceActions}>
        <View style={styles.reportReadyBadge}>
          <Ionicons name="document-text" size={16} color={COLORS.primary} />
          <Text style={styles.reportReadyText}>
            Q1 2026 {t("fuelDashboard.carbon.reportReady")}
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
  limitBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  limitText: {
    fontSize: 12,
    color: "#92400E",
    fontWeight: "500",
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  vehicleInfo: {
    width: 90,
  },
  plate: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  vehicleDetail: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  barContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  barBackground: {
    height: 16,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  euLimitLine: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    backgroundColor: "#F59E0B",
    zIndex: 10,
  },
  valueContainer: {
    width: 80,
    alignItems: "flex-end",
  },
  emissionValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: "500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
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
  // EU Compliance Card Styles
  complianceContainer: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  complianceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  complianceTitle: {
    marginLeft: 12,
  },
  complianceTitleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  complianceStatus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  complianceDetails: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  complianceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  complianceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  complianceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  complianceActions: {
    flexDirection: "row",
    gap: 12,
  },
  reportReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reportReadyText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
});

export default CarbonVehicleChart;
