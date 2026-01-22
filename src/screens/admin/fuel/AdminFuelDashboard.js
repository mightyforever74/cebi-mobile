// src/screens/admin/fuel/AdminFuelDashboard.js
// TulipFleet - Admin Fuel & Carbon Dashboard
// Created: 22 Ocak 2026

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../constants/config";
import api from "../../../services/api";

// Components
import CarbonSummaryCards from "../../../components/admin/fuel/CarbonSummaryCards";
import CarbonTrendChart from "../../../components/admin/fuel/CarbonTrendChart";
import CarbonVehicleChart, { EUComplianceCard } from "../../../components/admin/fuel/CarbonVehicleChart";
import CostAnalysisChart from "../../../components/admin/fuel/CostAnalysisChart";

import FuelSummaryCards from "../../../components/admin/fuel/FuelSummaryCards";
import FuelTrendChart from "../../../components/admin/fuel/FuelTrendChart";
import RecentFuelRecords from "../../../components/admin/fuel/RecentFuelRecords";
import VehicleComparisonChart from "../../../components/admin/fuel/VehicleComparisonChart";

const { width } = Dimensions.get("window");

const TABS = [
  { key: "fuel", icon: "speedometer-outline", label: "fuel" },
  { key: "carbon", icon: "leaf-outline", label: "carbon" },
  { key: "reports", icon: "document-text-outline", label: "reports" },
];

const AdminFuelDashboard = ({ navigation }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("fuel");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fuel Data
  const [fuelStats, setFuelStats] = useState(null);
  const [fuelTrends, setFuelTrends] = useState(null);
  const [vehicleFuel, setVehicleFuel] = useState(null);
  const [costData, setCostData] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);

  // Carbon Data
  const [carbonStats, setCarbonStats] = useState(null);
  const [carbonTrends, setCarbonTrends] = useState(null);
  const [vehicleCarbon, setVehicleCarbon] = useState(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Fuel Data
      const [statsRes, trendsRes, vehiclesRes, costsRes, recordsRes] =
        await Promise.all([
          api.get("/api/admin/fuel/stats"),
          api.get("/api/admin/fuel/trends?months=6"),
          api.get("/api/admin/fuel/vehicles"),
          api.get("/api/admin/fuel/costs"),
          api.get("/api/admin/fuel/records?limit=5"),
        ]);

      if (statsRes.data.success) setFuelStats(statsRes.data.data);
      if (trendsRes.data.success) setFuelTrends(trendsRes.data.data);
      if (vehiclesRes.data.success) setVehicleFuel(vehiclesRes.data.data);
      if (costsRes.data.success) setCostData(costsRes.data.data);
      if (recordsRes.data.success)
        setRecentRecords(recordsRes.data.data.records);

      // Carbon Data
      const [carbonStatsRes, carbonTrendsRes, carbonVehiclesRes] =
        await Promise.all([
          api.get("/api/admin/carbon/stats"),
          api.get("/api/admin/carbon/trends?months=6"),
          api.get("/api/admin/carbon/vehicles"),
        ]);

      if (carbonStatsRes.data.success) setCarbonStats(carbonStatsRes.data.data);
      if (carbonTrendsRes.data.success)
        setCarbonTrends(carbonTrendsRes.data.data);
      if (carbonVehiclesRes.data.success)
        setVehicleCarbon(carbonVehiclesRes.data.data);
    } catch (error) {
      console.error("Fetch data error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Tab Render
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={20}
            color={activeTab === tab.key ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
            ]}
          >
            {t(`fuelDashboard.tabs.${tab.label}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Fuel Tab Content
  const renderFuelTab = () => (
    <View style={styles.tabContent}>
      {/* Summary Cards */}
      <FuelSummaryCards data={fuelStats} />

      {/* Monthly Trend Chart */}
      <FuelTrendChart data={fuelTrends} />

      {/* Vehicle Comparison */}
      <VehicleComparisonChart
        data={vehicleFuel}
        onVehiclePress={(vehicle) =>
          navigation.navigate("VehicleFuelDetail", { vehicle })
        }
      />

      {/* Cost Analysis */}
      <CostAnalysisChart data={costData} />

      {/* Recent Records */}
      <RecentFuelRecords
        records={recentRecords}
        onViewAll={() => navigation.navigate("FuelRecordsList")}
      />
    </View>
  );

  // Carbon Tab Content
  const renderCarbonTab = () => (
    <View style={styles.tabContent}>
      {/* Carbon Summary Cards */}
      <CarbonSummaryCards data={carbonStats} />

      {/* Monthly Emission Trend */}
      <CarbonTrendChart data={carbonTrends} />

      {/* Vehicle Emission Comparison */}
      <CarbonVehicleChart data={vehicleCarbon} />

      {/* EU Compliance Card */}
      <EUComplianceCard data={carbonStats} />
    </View>
  );

  // Reports Tab Content
  const renderReportsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Ionicons name="document-text" size={32} color={COLORS.primary} />
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>
              {t("fuelDashboard.reports.monthlyFuel")}
            </Text>
            <Text style={styles.reportDesc}>
              {t("fuelDashboard.reports.monthlyFuelDesc")}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.downloadButton} onPress={() => Alert.alert(t("common.info"), t("fuelDashboard.reports.comingSoon"))}>
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
          <Text style={styles.downloadText}>
            PDF {t("fuelDashboard.reports.download")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Ionicons name="leaf" size={32} color="#10B981" />
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>
              {t("fuelDashboard.reports.quarterlyCarbon")}
            </Text>
            <Text style={styles.reportDesc}>
              {t("fuelDashboard.reports.quarterlyCarbonDesc")}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => Alert.alert(t("common.info"), t("fuelDashboard.reports.comingSoon"))}
          style={[styles.downloadButton, { backgroundColor: "#10B981" }]}
        >
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
          <Text style={styles.downloadText}>
            PDF {t("fuelDashboard.reports.download")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Ionicons name="car-sport" size={32} color="#F59E0B" />
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>
              {t("fuelDashboard.reports.vehicleAnalysis")}
            </Text>
            <Text style={styles.reportDesc}>
              {t("fuelDashboard.reports.vehicleAnalysisDesc")}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => Alert.alert(t("common.info"), t("fuelDashboard.reports.comingSoon"))}
          style={[styles.downloadButton, { backgroundColor: "#F59E0B" }]}
        >
          <Ionicons name="download-outline" size={20} color={COLORS.white} />
          <Text style={styles.downloadText}>
            Excel {t("fuelDashboard.reports.download")}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Ionicons name="mail" size={32} color="#8B5CF6" />
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>
              {t("fuelDashboard.reports.emailReport")}
            </Text>
            <Text style={styles.reportDesc}>
              {t("fuelDashboard.reports.emailReportDesc")}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => Alert.alert(t("common.info"), t("fuelDashboard.reports.comingSoon"))}
          style={[styles.downloadButton, { backgroundColor: "#8B5CF6" }]}
        >
          <Ionicons name="send-outline" size={20} color={COLORS.white} />
          <Text style={styles.downloadText}>
            {t("fuelDashboard.reports.send")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Ionicons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="speedometer" size={24} color={COLORS.white} />
            <Text style={styles.headerTitle}>{t("fuelDashboard.title")}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "fuel" && renderFuelTab()}
        {activeTab === "carbon" && renderCarbonTab()}
        {activeTab === "reports" && renderReportsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.white,
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderRadius: 0,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    gap: 16,
  },
  // Report Card Styles
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reportInfo: {
    marginLeft: 12,
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  reportDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  downloadButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  downloadText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AdminFuelDashboard;
