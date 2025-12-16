// src/screens/admin/AdminAlerts.js
// TulipFleet - Admin Uyarılar Ekranı

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
  speed: { color: COLORS.danger, icon: "speedometer", label: "Hız İhlali" },
  geofence: { color: COLORS.warning, icon: "location", label: "Bölge İhlali" },
  fuel: { color: COLORS.info, icon: "water", label: "Yakıt Uyarısı" },
  maintenance: {
    color: COLORS.warning,
    icon: "construct",
    label: "Bakım Uyarısı",
  },
  battery: { color: COLORS.danger, icon: "battery-dead", label: "Akü Uyarısı" },
  harsh_braking: { color: COLORS.danger, icon: "warning", label: "Sert Fren" },
  harsh_acceleration: {
    color: COLORS.warning,
    icon: "trending-up",
    label: "Sert Hızlanma",
  },
  idle: { color: COLORS.info, icon: "time", label: "Rölanti" },
  sos: { color: COLORS.danger, icon: "alert-circle", label: "SOS" },
  default: { color: COLORS.secondary, icon: "notifications", label: "Uyarı" },
};

// Uyarı durumu
const STATUS_CONFIG = {
  active: { color: COLORS.danger, label: "Aktif" },
  acknowledged: { color: COLORS.warning, label: "Görüldü" },
  resolved: { color: COLORS.success, label: "Çözüldü" },
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

      // API response format'ına göre ayarla
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

  // İlk yükleme
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Pull-to-refresh
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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Uyarıyı çözümle
  const handleResolve = async (alertId) => {
    Alert.alert(
      "Uyarıyı Çözümle",
      "Bu uyarıyı çözümlendi olarak işaretlemek istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çözümle",
          onPress: async () => {
            try {
              await alertAPI.resolve(alertId);
              fetchAlerts(); // Listeyi yenile
              Alert.alert("Başarılı", "Uyarı çözümlendi");
            } catch (err) {
              Alert.alert("Hata", "Uyarı çözümlenemedi");
            }
          },
        },
      ]
    );
  };

  // Fonksiyonları ekle (fetchAlerts'tan sonra):
  const handleResolveAlert = (alert) => {
    if (alert.is_resolved) {
      Alert.alert("Bilgi", "Bu uyarı zaten çözümlenmiş");
      return;
    }

    Alert.alert(
      "✅ Uyarıyı Çözümle",
      `"${alert.title}" uyarısını çözümlenmiş olarak işaretlemek istiyor musunuz?`,
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

  const handleDeleteAlert = (alert) => {
    Alert.alert(
      "🗑️ Uyarıyı Sil",
      `"${alert.title}" uyarısını silmek istediğinize emin misiniz?`,
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

  // Uyarı kartı
  const renderAlertCard = ({ item }) => {
    const alertType = item.alert_type || item.type || "default";
    const config = ALERT_CONFIG[alertType] || ALERT_CONFIG.default;
    const status = item.status || "active";
    const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;

    return (
      <TouchableOpacity
        style={[styles.card, status === "active" && styles.cardActive]}
        onPress={() => {
          Alert.alert(
            `${config.label}`,
            `Araç: ${item.vehicle_plate || "-"}\n` +
              `Mesaj: ${item.message || item.description || "-"}\n` +
              `Tarih: ${formatDate(item.created_at)}\n` +
              `Durum: ${statusConfig.label}`,
            status !== "resolved"
              ? [
                  { text: "Kapat" },
                  { text: "Çözümle", onPress: () => handleResolve(item.id) },
                ]
              : [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
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
                  { backgroundColor: statusConfig.color },
                ]}
              >
                <Text style={styles.statusText}>{statusConfig.label}</Text>
              </View>
            </View>

            {item.message && (
              <Text style={styles.alertMessage} numberOfLines={2}>
                {item.message}
              </Text>
            )}

            <View style={styles.metaRow}>
              {item.vehicle_plate && (
                <View style={styles.metaItem}>
                  <Ionicons name="car" size={12} color={COLORS.secondary} />
                  <Text style={styles.metaText}>{item.vehicle_plate}</Text>
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
            </View>
          </View>

          {/* Çözümle Butonu */}
          {status !== "resolved" && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => handleResolve(item.id)}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.success}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {!item.is_resolved && (
            <TouchableOpacity
              style={[styles.actionButton, styles.resolveButton]}
              onPress={() => handleResolveAlert(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Çözümle</Text>
            </TouchableOpacity>
          )}

          {item.is_resolved && (
            <View style={styles.resolvedBadge}>
              <Ionicons name="checkmark" size={14} color="#2DCE89" />
              <Text style={styles.resolvedText}>Çözümlendi</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteAlert(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="notifications-off-outline"
        size={64}
        color={COLORS.muted}
      />
      <Text style={styles.emptyTitle}>Uyarı Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Şu anda aktif uyarı bulunmuyor. Harika! 🎉
      </Text>
    </View>
  );

  // Hata durumu
  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata Oluştu</Text>
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

  // İstatistikleri hesapla
  const activeCount = alerts.filter((a) => a.status === "active").length;
  const acknowledgedCount = alerts.filter(
    (a) => a.status === "acknowledged"
  ).length;
  const resolvedCount = alerts.filter((a) => a.status === "resolved").length;

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
          <Text style={[styles.headerStatValue, { color: COLORS.warning }]}>
            {acknowledgedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Görüldü</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.success }]}>
            {resolvedCount}
          </Text>
          <Text style={styles.headerStatLabel}>Çözüldü</Text>
        </View>
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
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
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
  },
  cardActive: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  // Icon
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    paddingVertical: 2,
    borderRadius: 8,
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
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.muted,
    marginLeft: 4,
  },

  // Resolve Button
  resolveButton: {
    // mevcut hızlı çözümle ikon butonu
    padding: 8,
    // action button için arka plan ekleyelim
    backgroundColor: "#2DCE89",
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Action Buttons (eklenen stiller)
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: "#F5365C",
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
  },
  resolvedText: {
    color: "#2DCE89",
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
    paddingHorizontal: 40,
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
