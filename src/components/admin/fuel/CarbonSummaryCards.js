// src/components/admin/fuel/CarbonSummaryCards.js
// TulipFleet - Carbon Summary Cards (3'lü Grid)

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../../constants/config";

const CarbonSummaryCards = ({ data }) => {
  const { t } = useTranslation();

  if (!data) return null;

  const cards = [
    {
      icon: "globe",
      value: `${data.totalCO2ton || 0} ton`,
      label: t("fuelDashboard.carbon.totalEmission"),
      subLabel: `${data.totalCO2kg?.toLocaleString() || 0} kg`,
      change: data.percentChange,
      color: "#3B82F6",
      bgColor: "#EFF6FF",
    },
    {
      icon: "leaf",
      value: `${data.treesNeeded || 0}`,
      label: t("fuelDashboard.carbon.treesNeeded"),
      subLabel: t("fuelDashboard.carbon.forOffset"),
      color: "#10B981",
      bgColor: "#ECFDF5",
    },
    {
      icon: "speedometer",
      value: `${data.averageGPerKm || 0} g/km`,
      label: t("fuelDashboard.carbon.avgEmission"),
      subLabel: `EU: ${data.euLimit || 225} g/km`,
      isCompliant: data.isCompliant,
      color: "#8B5CF6",
      bgColor: "#F5F3FF",
    },
  ];

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <View key={index} style={styles.card}>
          <View
            style={[styles.iconContainer, { backgroundColor: card.bgColor }]}
          >
            <Ionicons name={card.icon} size={24} color={card.color} />
          </View>
          <Text style={styles.value}>{card.value}</Text>
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.subLabel}>{card.subLabel}</Text>
          {card.change !== undefined && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={card.change >= 0 ? "arrow-up" : "arrow-down"}
                size={12}
                color={card.change >= 0 ? "#EF4444" : "#10B981"}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: card.change >= 0 ? "#EF4444" : "#10B981" },
                ]}
              >
                %{Math.abs(card.change)}
              </Text>
            </View>
          )}
          {card.isCompliant !== undefined && (
            <View
              style={[
                styles.complianceBadge,
                { backgroundColor: card.isCompliant ? "#ECFDF5" : "#FEF2F2" },
              ]}
            >
              <Ionicons
                name={card.isCompliant ? "checkmark-circle" : "alert-circle"}
                size={14}
                color={card.isCompliant ? "#10B981" : "#EF4444"}
              />
              <Text
                style={[
                  styles.complianceText,
                  { color: card.isCompliant ? "#10B981" : "#EF4444" },
                ]}
              >
                {card.isCompliant
                  ? t("fuelDashboard.carbon.compliant")
                  : t("fuelDashboard.carbon.notCompliant")}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: "30%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  subLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  complianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  complianceText: {
    fontSize: 11,
    fontWeight: "500",
  },
});

export default CarbonSummaryCards;
