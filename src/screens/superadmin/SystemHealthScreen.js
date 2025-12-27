// src/screens/superadmin/SystemHealthScreen.js
// TulipFleet - Sistem Sağlık Durumu Ekranı
// Created: 27 Aralık 2025

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { API_URL } from "../../constants/config";

const SystemHealthScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const fetchHealth = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");

      // Basit health check - /health endpoint'i genelde public
      const startTime = Date.now();
      const response = await fetch(`${API_URL}/health`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        setHealth({
          api: {
            status: "online",
            responseTime: responseTime,
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
            responseTime: responseTime,
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
    // Her 30 saniyede bir otomatik kontrol
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHealth();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case "online":
        return { name: "checkmark-circle", color: "#2DCE89" };
      case "offline":
        return { name: "close-circle", color: "#F5365C" };
      default:
        return { name: "help-circle", color: "#FB6340" };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "#2DCE89";
      case "offline":
        return "#F5365C";
      default:
        return "#FB6340";
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
    const statusIcon = getStatusIcon(status);
    const statusColor = getStatusColor(status);

    return (
      <View style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceTitle}>
            <Ionicons name={icon} size={24} color="#5E72E4" />
            <Text style={styles.serviceName}>{title}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon.name} size={14} color="#FFF" />
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
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Genel Durum */}
      <View
        style={[
          styles.overallStatus,
          { backgroundColor: allOnline ? "#2DCE89" : "#F5365C" },
        ]}
      >
        <Ionicons
          name={allOnline ? "shield-checkmark" : "warning"}
          size={48}
          color="#FFF"
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
      <View style={styles.systemInfo}>
        <Text style={styles.sectionTitle}>Sistem Bilgileri</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API Versiyonu</Text>
          <Text style={styles.infoValue}>v{health?.version || "3.0.0"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Uptime</Text>
          <Text style={styles.infoValue}>{formatUptime(health?.uptime)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API URL</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {API_URL}
          </Text>
        </View>
      </View>

      {/* ESP32 Bağlantı Durumu */}
      <View style={styles.deviceStatus}>
        <Text style={styles.sectionTitle}>IoT Cihazları</Text>
        <View style={styles.deviceCard}>
          <Ionicons name="hardware-chip" size={24} color="#2DCE89" />
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceTitle}>ESP32 Cihazları</Text>
            <Text style={styles.deviceSubtitle}>MQTT üzerinden bağlı</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: "#2DCE89" }]}>
            <Text style={styles.statusText}>1 Online</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sayfa her 30 saniyede otomatik güncellenir
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#8898AA",
  },

  // Overall Status
  overallStatus: {
    padding: 30,
    alignItems: "center",
    margin: 15,
    borderRadius: 15,
  },
  overallTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
  },
  overallSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 5,
  },

  // Services
  servicesContainer: {
    paddingHorizontal: 15,
  },
  serviceCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#32325D",
    marginLeft: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  serviceMessage: {
    color: "#8898AA",
    fontSize: 13,
  },
  extraInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  responseTime: {
    color: "#5E72E4",
    fontSize: 12,
    fontWeight: "500",
  },

  // System Info
  systemInfo: {
    backgroundColor: "#FFF",
    margin: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    color: "#8898AA",
    fontSize: 14,
  },
  infoValue: {
    color: "#32325D",
    fontSize: 14,
    fontWeight: "500",
    maxWidth: "60%",
  },

  // Device Status
  deviceStatus: {
    backgroundColor: "#FFF",
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#32325D",
  },
  deviceSubtitle: {
    fontSize: 12,
    color: "#8898AA",
  },

  // Footer
  footer: {
    padding: 20,
    alignItems: "center",
  },
  footerText: {
    color: "#ADB5BD",
    fontSize: 12,
  },
});

export default SystemHealthScreen;
