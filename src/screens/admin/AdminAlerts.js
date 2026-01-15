// src/screens/admin/AdminAlerts.js
// TulipFleet - Admin Uyarılar Ekranı
// v1.1.0 - Düzeltilmiş tasarım + Tümünü Sil

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { alertAPI } from "../../services/api";

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
};

// Uyarı tipi renkleri ve ikonları
const ALERT_CONFIG = {
  HARD_BRAKE: { color: COLORS.danger, icon: "warning", label: "Ani Fren" },
  HARD_ACCEL: {
    color: COLORS.warning,
    icon: "trending-up",
    label: "Sert Hızlanma",
  },
  HARD_TURN: {
    color: COLORS.warning,
    icon: "return-down-forward",
    label: "Sert Viraj",
  },
  SHARP_TURN: {
    color: COLORS.warning,
    icon: "return-down-forward",
    label: "Keskin Viraj",
  },
  IMPACT: { color: COLORS.danger, icon: "alert-circle", label: "Çarpma/Kaza" },
  OVERSPEED: { color: COLORS.danger, icon: "speedometer", label: "Hız Aşımı" },
  speed: { color: COLORS.danger, icon: "speedometer", label: "Hız İhlali" },
  geofence: { color: COLORS.warning, icon: "location", label: "Bölge İhlali" },
  fuel: { color: COLORS.info, icon: "water", label: "Yakıt Uyarısı" },
  maintenance: {
    color: COLORS.warning,
    icon: "construct",
    label: "Bakım Uyarısı",
  },
  battery: { color: COLORS.danger, icon: "battery-dead", label: "Akü Uyarısı" },
  idle: { color: COLORS.info, icon: "time", label: "Rölanti" },
  sos: { color: COLORS.danger, icon: "alert-circle", label: "SOS" },
  default: { color: COLORS.secondary, icon: "notifications", label: "Uyarı" },
};

const AdminAlerts = ({ navigation }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API'den uyarıları çek
  const fetchAlerts = async () => {
    try {
      setError(null);
      console.log("🔔 Fetching alerts...");

      const data = await alertAPI.getAll();
      console.log("✅ Alerts loaded:", data);

      const alertList = data.alerts || data || [];
      setAlerts(Array.isArray(alertList) ? alertList : []);
    } catch (err) {
      console.error("❌ Fetch alerts error:", err);
      setError(err.message || "Uyarılar yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts();
  }, []);

  // Tarih formatla
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Az önce";
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Uyarıyı çözümle
  const handleResolveAlert = (alert) => {
    if (alert.is_resolved) {
      Alert.alert("Bilgi", "Bu uyarı zaten çözümlenmiş");
      return;
    }

    Alert.alert(
      "✅ Uyarıyı Çözümle",
      `Bu uyarıyı çözümlenmiş olarak işaretlemek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çözümle",
          onPress: async () => {
            try {
              await alertAPI.resolve(alert.id);
              Alert.alert("✅ Başarılı", "Uyarı çözümlendi");
              fetchAlerts();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Uyarı çözümlenemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Uyarıyı sil
  const handleDeleteAlert = (alert) => {
    Alert.alert(
      "🗑️ Uyarıyı Sil",
      `Bu uyarıyı silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await alertAPI.delete(alert.id);
              Alert.alert("✅ Başarılı", "Uyarı silindi");
              fetchAlerts();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Uyarı silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Tümünü Sil
  const handleDeleteAll = () => {
    if (alerts.length === 0) {
      Alert.alert("Bilgi", "Silinecek uyarı yok");
      return;
    }

    Alert.alert(
      "🗑️ Tüm Uyarıları Sil",
      `${alerts.length} uyarının tamamını silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tümünü Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await alertAPI.deleteAll();
              Alert.alert("✅ Başarılı", "Tüm uyarılar silindi");
              fetchAlerts();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Uyarılar silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  // Uyarı kartı
  const renderAlertCard = ({ item }) => {
    const alertType = item.alert_type || item.type || "default";
    const config = ALERT_CONFIG[alertType] || ALERT_CONFIG.default;
    const isResolved = item.is_resolved;

    return (
      <View style={[styles.card, !isResolved && styles.cardActive]}>
        <View style={styles.cardContent}>
          {/* İkon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${config.color}20` },
            ]}
          >
            <Ionicons name={config.icon} size={24} color={config.color} />
          </View>

          {/* Uyarı Bilgileri */}
          <View style={styles.alertInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.alertType}>{config.label}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: isResolved
                      ? COLORS.success
                      : COLORS.danger,
                  },
                ]}
              >
                <Text style={styles.statusText}>
                  {isResolved ? "Çözüldü" : "Aktif"}
                </Text>
              </View>
            </View>

            {item.description && (
              <Text style={styles.alertMessage} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            <View style={styles.metaRow}>
              {(item.vehicle_plate || item.device_id) && (
                <View style={styles.metaItem}>
                  <Ionicons name="car" size={12} color={COLORS.secondary} />
                  <Text style={styles.metaText}>
                    {item.vehicle_plate || item.device_id}
                  </Text>
                </View>
              )}
              {item.driver_name && (
                <View style={styles.metaItem}>
                  <Ionicons name="person" size={12} color={COLORS.secondary} />
                  <Text style={styles.metaText}>{item.driver_name}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={COLORS.secondary}
                />
                <Text style={styles.metaText}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
              {item.speed && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="speedometer-outline"
                    size={12}
                    color={COLORS.secondary}
                  />
                  <Text style={styles.metaText}>
                    {Math.round(item.speed)} km/h
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons - TEK SATIR */}
        <View style={styles.actionButtons}>
          {!isResolved ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveBtn]}
              onPress={() => handleResolveAlert(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Çözümle</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.resolvedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={COLORS.success}
              />
              <Text style={styles.resolvedText}>Çözüldü</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteBtn]}
            onPress={() => handleDeleteAlert(item)}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
      <Text style={styles.emptyTitle}>Harika! 🎉</Text>
      <Text style={styles.emptySubtitle}>Şu anda hiç uyarı yok</Text>
    </View>
  );

  // Hata durumu
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="cloud-offline" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Bağlantı Hatası</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAlerts}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Yükleniyor
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Uyarılar yükleniyor...</Text>
      </View>
    );
  }

  // İstatistikler
  const activeCount = alerts.filter((a) => !a.is_resolved).length;
  const resolvedCount = alerts.filter((a) => a.is_resolved).length;

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.headerStatBox}>
          <Text style={styles.headerStatValue}>{alerts.length}</Text>
          <Text style={styles.headerStatLabel}>Toplam</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.danger }]}>
            {activeCount}
          </Text>
          <Text style={styles.headerStatLabel}>Aktif</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.success }]}>
            {resolvedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Çözüldü</Text>
        </View>

        {/* Tümünü Sil Butonu */}
        <TouchableOpacity
          style={styles.deleteAllButton}
          onPress={handleDeleteAll}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <Text style={styles.deleteAllText}>Tümünü Sil</Text>
        </TouchableOpacity>
      </View>

      {/* Uyarı Listesi */}
      <FlatList
        data={alerts}
        renderItem={renderAlertCard}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },

  // Header Stats
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerStatBox: {
    flex: 1,
    alignItems: "center",
  },
  headerStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  headerStatLabel: {
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 2,
  },
  deleteAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  deleteAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // List
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
  },

  // Icon
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  // Alert Info
  alertInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  alertType: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "600",
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.secondary,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 4,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  resolveBtn: {
    backgroundColor: COLORS.success,
  },
  deleteBtn: {
    backgroundColor: COLORS.danger,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 6,
  },
  resolvedText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 8,
  },

  // Error State
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },

  // Loading
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 14,
  },
});

export default AdminAlerts;
