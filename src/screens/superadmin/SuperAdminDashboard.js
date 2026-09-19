// src/screens/superadmin/SuperAdminDashboard.js
// Updated: UI System Guide v3 uyumlu - spacing/typography/shadow tokens

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
    },
    header: {
      backgroundColor: COLORS.ERROR,
      padding: COLORS.SPACING.lg,
      paddingBottom: COLORS.SPACING.xl,
    },
    welcomeText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.WHITE_80,
    },
    userName: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.WHITE,
      marginTop: COLORS.SPACING.xs,
    },
    badge: {
      backgroundColor: COLORS.WHITE_20,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      alignSelf: "flex-start",
      marginTop: COLORS.SPACING.sm,
    },
    badgeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    statsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      padding: COLORS.SPACING.sm,
      marginTop: -COLORS.SPACING.lg,
    },
    statCard: {
      width: "46%",
      margin: "2%",
      padding: COLORS.SPACING.lg,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      ...COLORS.SHADOWS.sm,
    },
    statNumber: { ...COLORS.TYPOGRAPHY.styles.h1, color: COLORS.WHITE },
    statLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.WHITE_80,
      marginTop: COLORS.SPACING.xs,
    },
    deviceStatsCard: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
    },
    deviceStatsInner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    deviceStatsContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      paddingRight: COLORS.SPACING.sm,
    },
    deviceStatsInfo: { marginLeft: COLORS.SPACING.sm, flex: 1 },
    deviceStatsTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    deviceStatsSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    deviceOnlineIndicator: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SUCCESS_LIGHT,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.SUCCESS_LIGHT,
    },
    onlineDot: {
      width: COLORS.SPACING.sm,
      height: COLORS.SPACING.sm,
      borderRadius: COLORS.SPACING.xs,
      backgroundColor: COLORS.SUCCESS,
      marginRight: COLORS.SPACING.xs,
    },
    onlineText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.SUCCESS,
    },
    section: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    seeAllText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    actionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: COLORS.SPACING.sm,
    },
    actionButton: {
      width: "48%",
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    actionText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      marginTop: COLORS.SPACING.sm,
    },
    companyCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.sm,
      backgroundColor: COLORS.SECONDARY,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    companyIcon: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
    },
    companyInfo: { flex: 1, marginLeft: COLORS.SPACING.sm },
    companyName: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
    },
    companyStats: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    emptyState: { alignItems: "center", padding: COLORS.SPACING.xl },
    emptyText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.md,
    },
    emptyButton: {
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
    },
    emptyButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },
    footer: { padding: COLORS.SPACING.lg, alignItems: "center" },
    footerText: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.MUTED },
  });

const SuperAdminDashboard = ({ navigation }) => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalDrivers: 0,
    totalDevices: 0,
    onlineDevices: 0,
  });
  const [companies, setCompanies] = useState([]);

  const fetchData = async () => {
    try {
      const companiesResponse = await fetch(
        `${API_URL}/api/superadmin/companies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (companiesResponse.ok) {
        const data = await companiesResponse.json();
        setCompanies(data.companies || []);
        const totalVehicles =
          data.companies?.reduce((sum, c) => sum + (c.vehicle_count || 0), 0) ||
          0;
        const totalDrivers =
          data.companies?.reduce((sum, c) => sum + (c.driver_count || 0), 0) ||
          0;
        const totalUsers =
          data.companies?.reduce((sum, c) => sum + (c.user_count || 0), 0) || 0;
        setStats((prev) => ({
          ...prev,
          totalCompanies: data.companies?.length || 0,
          totalUsers,
          totalVehicles,
          totalDrivers,
        }));
      }
      try {
        const devicesResponse = await fetch(
          `${API_URL}/api/superadmin/devices`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (devicesResponse.ok) {
          const deviceData = await devicesResponse.json();
          setStats((prev) => ({
            ...prev,
            totalDevices: deviceData.stats?.total || 0,
            onlineDevices: deviceData.stats?.online_now || 0,
          }));
        }
      } catch (deviceError) {
        console.log("Device stats not available yet");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert(t("common.error"), t("superadmin.dashboard.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const statCards = useMemo(
    () => [
      {
        key: "companies",
        value: stats.totalCompanies,
        labelKey: "superadmin.dashboard.company",
        bg: COLORS.PRIMARY,
      },
      {
        key: "users",
        value: stats.totalUsers,
        labelKey: "superadmin.dashboard.user",
        bg: COLORS.SUCCESS,
      },
      {
        key: "vehicles",
        value: stats.totalVehicles,
        labelKey: "superadmin.dashboard.vehicle",
        bg: COLORS.WARNING,
      },
      {
        key: "drivers",
        value: stats.totalDrivers,
        labelKey: "superadmin.dashboard.driver",
        bg: COLORS.INFO,
      },
    ],
    [stats, COLORS]
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.PRIMARY}
          colors={[COLORS.PRIMARY]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>{t("superadmin.dashboard.welcome")}</Text>
        <Text style={styles.userName}>{user?.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t("roles.superAdmin")}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {statCards.map((c) => (
          <View
            key={c.key}
            style={[styles.statCard, { backgroundColor: c.bg }]}
          >
            <Text style={styles.statNumber}>{c.value}</Text>
            <Text style={styles.statLabel}>{t(c.labelKey)}</Text>
          </View>
        ))}
      </View>

      {stats.totalDevices > 0 && (
        <Card
          variant="flat"
          style={styles.deviceStatsCard}
          onPress={() => navigation.navigate("Devices")}
        >
          <View style={styles.deviceStatsInner}>
            <View style={styles.deviceStatsContent}>
              <Ionicons name="hardware-chip" size={32} color={COLORS.PRIMARY} />
              <View style={styles.deviceStatsInfo}>
                <Text style={styles.deviceStatsTitle}>
                  {t("superadmin.dashboard.esp32")}
                </Text>
                <Text style={styles.deviceStatsSubtitle}>
                  {t("superadmin.dashboard.onlineOf", {
                    online: stats.onlineDevices,
                    total: stats.totalDevices,
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.deviceOnlineIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>
                {t("superadmin.dashboard.onlineCount", {
                  count: stats.onlineDevices,
                })}
              </Text>
            </View>
          </View>
        </Card>
      )}

      <Card variant="flat" style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t("superadmin.dashboard.quickActions")}
        </Text>
        <View style={styles.actionsContainer}>
          {[
            {
              screen: "Companies",
              icon: "business",
              color: COLORS.PRIMARY,
              label: t("superadmin.dashboard.companies"),
            },
            {
              screen: "CreateCompany",
              icon: "add-circle",
              color: COLORS.SUCCESS,
              label: t("superadmin.dashboard.newCompany"),
            },
            {
              screen: "Devices",
              icon: "hardware-chip",
              color: COLORS.WARNING,
              label: t("superadmin.dashboard.devices"),
            },
            {
              screen: "PlatformUsers",
              icon: "people",
              color: COLORS.INFO,
              label: t("superadmin.dashboard.users"),
            },
          ].map((a) => (
            <TouchableOpacity
              key={a.screen}
              style={styles.actionButton}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.85}
            >
              <Ionicons name={a.icon} size={28} color={a.color} />
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card variant="flat" style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t("superadmin.dashboard.recentCompanies")}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Companies")}
            activeOpacity={0.85}
          >
            <Text style={styles.seeAllText}>
              {t("superadmin.dashboard.seeAll")}
            </Text>
          </TouchableOpacity>
        </View>
        {companies.slice(0, 5).map((company, index) => (
          <TouchableOpacity
            key={company.id || index}
            style={styles.companyCard}
            onPress={() => navigation.navigate("CompanyDetail", { company })}
            activeOpacity={0.85}
          >
            <View style={styles.companyIcon}>
              <Ionicons name="business" size={20} color={COLORS.WHITE} />
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyStats}>
                {company.vehicle_count || 0} {t("superadmin.dashboard.vehicle")}{" "}
                • {company.driver_count || 0} {t("superadmin.dashboard.driver")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
          </TouchableOpacity>
        ))}
        {companies.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="business-outline"
              size={48}
              color={COLORS.DISABLED}
            />
            <Text style={styles.emptyText}>
              {t("superadmin.dashboard.emptyCompanies")}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate("CreateCompany")}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyButtonText}>
                {t("superadmin.dashboard.createFirst")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t("superadmin.dashboard.footerVersion", { version: "1.0" })}
        </Text>
      </View>
    </ScrollView>
  );
};

export default SuperAdminDashboard;
