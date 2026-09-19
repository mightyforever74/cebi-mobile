// src/screens/superadmin/SystemHealthScreen.js
// TulipFleet - Sistem Sağlık Durumu Ekranı
// Updated: UI System Guide v3 uyumlu

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { API_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { formatTime } from "../../utils/helpers";

const SystemHealthScreen = () => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const fetchHealth = async () => {
    try {
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/health`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        setHealth({
          api: {
            status: "online",
            responseTime,
            messageKey: "superadmin.health.apiOnline",
          },
          database: {
            status: data.database === "connected" ? "online" : "offline",
            messageKey:
              data.database === "connected"
                ? "superadmin.health.dbConnected"
                : "superadmin.health.dbError",
          },
          mqtt: {
            status: data.mqtt === "connected" ? "online" : "offline",
            messageKey:
              data.mqtt === "connected"
                ? "superadmin.health.mqttConnected"
                : "superadmin.health.mqttError",
          },
          redis: {
            status: data.redis === "connected" ? "online" : "offline",
            messageKey:
              data.redis === "connected"
                ? "superadmin.health.redisOnline"
                : "superadmin.health.redisError",
          },
          uptime: data.uptime || null,
          version: data.version || "3.0.0",
        });
      } else {
        setHealth({
          api: {
            status: "offline",
            responseTime,
            messageKey: "superadmin.health.apiOffline",
          },
          database: {
            status: "unknown",
            messageKey: "superadmin.health.unchecked",
          },
          mqtt: { status: "unknown", messageKey: "superadmin.health.unchecked" },
          redis: {
            status: "unknown",
            messageKey: "superadmin.health.unchecked",
          },
        });
      }
      setLastCheck(new Date());
    } catch (error) {
      console.error("Health check error:", error);
      setHealth({
        api: {
          status: "offline",
          responseTime: null,
          messageKey: "superadmin.health.connectionError",
          messageParams: { detail: error.message },
        },
        database: { status: "unknown", messageKey: "superadmin.health.unchecked" },
        mqtt: { status: "unknown", messageKey: "superadmin.health.unchecked" },
        redis: { status: "unknown", messageKey: "superadmin.health.unchecked" },
      });
      setLastCheck(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHealth();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return COLORS.SUCCESS;
      case "offline":
        return COLORS.ERROR;
      default:
        return COLORS.WARNING;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "online":
        return "checkmark-circle";
      case "offline":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const formatUptime = (seconds) => {
    if (!seconds) return t("common.unknown");
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return t("superadmin.health.uptimeDays", { days, hours });
    if (hours > 0)
      return t("superadmin.health.uptimeHours", { hours, minutes });
    return t("superadmin.health.uptimeMinutes", { minutes });
  };

  const ServiceCard = ({
    title,
    icon,
    status,
    messageKey,
    messageParams,
    extra,
  }) => {
    const statusColor = getStatusColor(status);
    const statusIconName = getStatusIcon(status);
    return (
      <Card variant="flat" style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceTitle}>
            <Ionicons name={icon} size={24} color={COLORS.PRIMARY} />
            <Text style={styles.serviceName}>{title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIconName} size={14} color={COLORS.WHITE} />
            <Text style={styles.statusText}>
              {status === "online"
                ? t("superadmin.health.statusActive")
                : status === "offline"
                  ? t("superadmin.health.statusOffline")
                  : t("superadmin.health.statusUnknown")}
            </Text>
          </View>
        </View>
        <Text style={styles.serviceMessage}>
          {messageKey ? t(messageKey, messageParams) : ""}
        </Text>
        {extra && <View style={styles.extraInfo}>{extra}</View>}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("superadmin.health.checking")}</Text>
      </View>
    );
  }

  const allOnline =
    health?.api?.status === "online" &&
    health?.database?.status === "online" &&
    health?.mqtt?.status === "online";

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
    >
      {/* Genel Durum */}
      <View
        style={[
          styles.overallStatus,
          { backgroundColor: allOnline ? COLORS.SUCCESS : COLORS.ERROR },
        ]}
      >
        <Ionicons
          name={allOnline ? "shield-checkmark" : "warning"}
          size={48}
          color={COLORS.WHITE}
        />
        <Text style={styles.overallTitle}>
          {allOnline
            ? t("superadmin.health.allOk")
            : t("superadmin.health.systemIssue")}
        </Text>
        <Text style={styles.overallSubtitle}>
          {t("superadmin.health.lastCheck", { time: formatTime(lastCheck) })}
        </Text>
      </View>

      {/* Servis Kartları */}
      <View style={styles.servicesContainer}>
        <ServiceCard
          title={t("superadmin.health.apiServer")}
          icon="server-outline"
          status={health?.api?.status}
          messageKey={health?.api?.messageKey}
          messageParams={health?.api?.messageParams}
          extra={
            health?.api?.responseTime && (
              <Text style={styles.responseTime}>
                {t("superadmin.health.responseTime", {
                  ms: health.api.responseTime,
                })}
              </Text>
            )
          }
        />
        <ServiceCard
          title={t("superadmin.health.postgres")}
          icon="server-outline"
          status={health?.database?.status}
          messageKey={health?.database?.messageKey}
        />
        <ServiceCard
          title={t("superadmin.health.mqttBroker")}
          icon="git-network-outline"
          status={health?.mqtt?.status}
          messageKey={health?.mqtt?.messageKey}
        />
        <ServiceCard
          title={t("superadmin.health.redis")}
          icon="flash-outline"
          status={health?.redis?.status}
          messageKey={health?.redis?.messageKey}
        />
      </View>

      {/* Sistem Bilgileri */}
      <Card variant="flat" style={styles.systemInfo}>
        <Text style={styles.sectionTitle}>
          {t("superadmin.health.systemInfo")}
        </Text>
        {[
          {
            label: t("superadmin.health.apiVersion"),
            value: `v${health?.version || "3.0.0"}`,
          },
          {
            label: t("superadmin.health.uptime"),
            value: formatUptime(health?.uptime),
          },
          { label: t("superadmin.health.apiUrl"), value: API_URL },
        ].map((row, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </Card>

      {/* IoT Cihazları */}
      <Card variant="flat" style={styles.deviceStatus}>
        <Text style={styles.sectionTitle}>{t("superadmin.health.iot")}</Text>
        <View style={styles.deviceCard}>
          <Ionicons name="hardware-chip" size={24} color={COLORS.SUCCESS} />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceTitle}>
              {t("superadmin.health.esp32")}
            </Text>
            <Text style={styles.deviceSubtitle}>
              {t("superadmin.health.mqtt")}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.SUCCESS }]}
          >
            <Text style={styles.statusText}>
              {t("superadmin.health.onlineCount", { count: 1 })}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t("superadmin.health.autoRefresh")}
        </Text>
      </View>
    </ScrollView>
  );
};

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
    overallStatus: {
      padding: COLORS.SPACING.xl,
      alignItems: "center",
      margin: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.lg,
    },
    overallTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.WHITE,
      marginTop: COLORS.SPACING.md,
    },
    overallSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE_80,
      marginTop: COLORS.SPACING.xs,
    },
    servicesContainer: { paddingHorizontal: COLORS.SPACING.md },
    serviceCard: { marginBottom: COLORS.SPACING.sm },
    serviceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    serviceTitle: { flexDirection: "row", alignItems: "center" },
    serviceName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
    },
    statusText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    serviceMessage: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
    },
    extraInfo: {
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    responseTime: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    systemInfo: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.md,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    infoLabel: { ...COLORS.TYPOGRAPHY.styles.bodySmall, color: COLORS.MUTED },
    infoValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
      maxWidth: "60%",
    },
    deviceStatus: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
    },
    deviceCard: { flexDirection: "row", alignItems: "center" },
    deviceInfo: { flex: 1, marginLeft: COLORS.SPACING.sm },
    deviceTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    deviceSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
    },
    footer: { padding: COLORS.SPACING.lg, alignItems: "center" },
    footerText: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.DISABLED },
  });

export default SystemHealthScreen;
