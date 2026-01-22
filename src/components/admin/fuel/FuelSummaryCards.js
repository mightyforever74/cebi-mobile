// src/components/admin/fuel/FuelSummaryCards.js
// TulipFleet - Fuel Summary Cards (4'lü Grid)

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/config";

const SummaryCard = ({ icon, value, label, change, color, bgColor }) => {
  const isPositive = change >= 0;
  const isConsumption =
    label.includes("Tüketim") || label.includes("Consumption");
  // Tüketim için azalış iyi, diğerleri için artış iyi (mesafe hariç)
  const isGood = isConsumption ? !isPositive : isPositive;

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {change !== undefined && change !== 0 && (
        <View style={styles.changeContainer}>
          <Ionicons
            name={isPositive ? "arrow-up" : "arrow-down"}
            size={12}
            color={isGood ? "#10B981" : "#EF4444"}
          />
          <Text
            style={[
              styles.changeText,
              { color: isGood ? "#10B981" : "#EF4444" },
            ]}
          >
            %{Math.abs(change)}
          </Text>
        </View>
      )}
    </View>
  );
};

const FuelSummaryCards = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const cards = [
    {
      icon: "water",
      value: `${data.totalLiters?.toLocaleString() || 0} L`,
      label: t("fuelDashboard.totalFuel"),
      change: data.percentageChange?.liters,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
    },
    {
      icon: "cash",
      value: `₺${data.totalCost?.toLocaleString() || 0}`,
      label: t("fuelDashboard.totalCost"),
      change: data.percentageChange?.cost,
      color: "#10B981",
      bgColor: "#ECFDF5",
    },
    {
      icon: "speedometer",
      value: `${data.averageConsumption || 0} L/100`,
      label: t("fuelDashboard.avgConsumption"),
      change: data.percentageChange?.consumption,
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
    },
    {
      icon: "navigate",
      value: `${data.totalDistance?.toLocaleString() || 0} km`,
      label: t("fuelDashboard.totalDistance"),
      change: data.percentageChange?.distance,
      color: "#F59E0B",
      bgColor: "#FFFBEB",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {cards.map((card, index) => (
          <SummaryCard key={index} {...card} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "500",
  },
});

export default FuelSummaryCards;
