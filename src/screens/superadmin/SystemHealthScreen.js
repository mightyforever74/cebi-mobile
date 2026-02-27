// src/screens/superadmin/SystemHealthScreen.js
// TulipFleet - Sistem Sağlık Durumu Ekranı
// Updated: UI System Guide v3 uyumlu

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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

const SystemHealthScreen = () => {
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
            message: "API sunucusu çalışıyor",
          },
          database: {
            status: data.database === "connected" ? "online" : "offline",
            message:
              data.database === "connected"
                ? "PostgreSQL bağlantısı aktif"
                : "Veritabanı bağlantı sorunu",
          },
          mqtt: {
            status: data.mqtt === "connected" ? "online" : "offline",
            message:
              data.mqtt === "connected"
                ? "EMQX broker bağlantısı aktif"
                : "MQTT bağlantı sorunu",
          },
          redis: {
            status: data.redis === "connected" ? "online" : "offline",
            message:
              data.redis === "connected"
                ? "Redis cache aktif"
                : "Redis bağlantı sorunu",
          },
          uptime: data.uptime || null,
          version: data.version || "3.0.0",
        });
      } else {
        setHealth({
          api: {
            status: "offline",
            responseTime,
            message: "API yanıt vermiyor",
          },
          database: { status: "unknown", message: "Kontrol edilemedi" },
          mqtt: { status: "unknown", message: "Kontrol edilemedi" },
          redis: { status: "unknown", message: "Kontrol edilemedi" },
        });
      }
      setLastCheck(new Date());
    } catch (error) {
      console.error("Health check error:", error);
      setHealth({
        api: {
          status: "offline",
          responseTime: null,
          message: "Bağlantı hatası: " + error.message,
        },
        database: { status: "unknown", message: "Kontrol edilemedi" },
        mqtt: { status: "unknown", message: "Kontrol edilemedi" },
        redis: { status: "unknown", message: "Kontrol edilemedi" },
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
    if (!seconds) return "Bilinmiyor";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days} gün ${hours} saat`;
    if (hours > 0) return `${hours} saat ${minutes} dk`;
    return `${minutes} dakika`;
  };

  const ServiceCard = ({ title, icon, status, message, extra }) => {
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
                ? "Aktif"
                : status === "offline"
                  ? "Kapalı"
                  : "?"}
            </Text>
          </View>
        </View>
        <Text style={styles.serviceMessage}>{message}</Text>
        {extra && <View style={styles.extraInfo}>{extra}</View>}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          Sistem durumu kontrol ediliyor...
        </Text>
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
            ? "Tüm Sistemler Çalışıyor"
            : "Sistem Sorunu Tespit Edildi"}
        </Text>
        <Text style={styles.overallSubtitle}>
          Son kontrol: {lastCheck?.toLocaleTimeString("tr-TR") || "-"}
        </Text>
      </View>

      {/* Servis Kartları */}
      <View style={styles.servicesContainer}>
        <ServiceCard
          title="API Sunucusu"
          icon="server-outline"
          status={health?.api?.status}
          message={health?.api?.message}
          extra={
            health?.api?.responseTime && (
              <Text style={styles.responseTime}>
                Yanıt süresi: {health.api.responseTime}ms
              </Text>
            )
          }
        />
        <ServiceCard
          title="PostgreSQL Veritabanı"
          icon="server-outline"
          status={health?.database?.status}
          message={health?.database?.message}
        />
        <ServiceCard
          title="MQTT Broker (EMQX)"
          icon="git-network-outline"
          status={health?.mqtt?.status}
          message={health?.mqtt?.message}
        />
        <ServiceCard
          title="Redis Cache"
          icon="flash-outline"
          status={health?.redis?.status}
          message={health?.redis?.message}
        />
      </View>

      {/* Sistem Bilgileri */}
      <Card variant="flat" style={styles.systemInfo}>
        <Text style={styles.sectionTitle}>Sistem Bilgileri</Text>
        {[
          { label: "API Versiyonu", value: `v${health?.version || "3.0.0"}` },
          { label: "Uptime", value: formatUptime(health?.uptime) },
          { label: "API URL", value: API_URL },
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
        <Text style={styles.sectionTitle}>IoT Cihazları</Text>
        <View style={styles.deviceCard}>
          <Ionicons name="hardware-chip" size={24} color={COLORS.SUCCESS} />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceTitle}>ESP32 Cihazları</Text>
            <Text style={styles.deviceSubtitle}>MQTT üzerinden bağlı</Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: COLORS.SUCCESS }]}
          >
            <Text style={styles.statusText}>1 Online</Text>
          </View>
        </View>
      </Card>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sayfa her 30 saniyede otomatik güncellenir
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
