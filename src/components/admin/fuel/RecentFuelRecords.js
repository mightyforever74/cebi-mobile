// src/components/admin/fuel/RecentFuelRecords.js
// TulipFleet - Recent Fuel Records List

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../../constants/config";
import { formatDate, formatNumber, formatTime } from "../../../utils/helpers";

const RecentFuelRecords = ({ records, onViewAll }) => {
  const { t } = useTranslation();

  if (!records || records.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📋 {t("fuelDashboard.recentRecords")}</Text>
        <View style={styles.emptyState}>
          <Ionicons
            name="document-text-outline"
            size={48}
            color={COLORS.textSecondary}
          />
          <Text style={styles.emptyText}>{t("fuelDashboard.noRecords")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 {t("fuelDashboard.recentRecords")}</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>{t("fuelDashboard.viewAll")}</Text>
          <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {records.map((record, index) => (
        <View key={record.id || index} style={styles.recordCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="water" size={24} color={COLORS.primary} />
          </View>

          <View style={styles.recordContent}>
            <View style={styles.recordHeader}>
              <Text style={styles.plate}>{record.plate}</Text>
              <Text style={styles.cost}>
                {record.currency === "EUR"
                  ? "€"
                  : record.currency === "BGN"
                    ? "лв"
                    : "₺"}
                {record.cost != null ? formatNumber(record.cost) : ""}
              </Text>
            </View>
            <Text style={styles.recordDetail}>
              {record.driver} • {record.station} • {record.liters} L
            </Text>
            <Text style={styles.recordMeta}>
              {formatDate(record.date)} {formatTime(record.date)} • 🛣️{" "}
              {record.odometer != null ? formatNumber(record.odometer) : "0"} km
            </Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.loadMoreButton} onPress={onViewAll}>
        <Text style={styles.loadMoreText}>+ {t("fuelDashboard.showMore")}</Text>
      </TouchableOpacity>
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
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
  },
  recordCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  plate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  cost: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  recordDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  recordMeta: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  loadMoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "500",
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

export default RecentFuelRecords;
