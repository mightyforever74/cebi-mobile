// src/screens/admin/AdminDrivers.js
// TulipFleet - Admin Sürücü Listesi Ekranı

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
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
import { driverAPI } from "../../services/api";

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

// Sürücü durumu renkleri
const STATUS_COLORS = {
  active: COLORS.success,
  available: COLORS.success,
  on_duty: COLORS.info,
  off_duty: COLORS.secondary,
  inactive: COLORS.muted,
  suspended: COLORS.danger,
};

// Sürücü durumu Türkçe karşılıkları
const STATUS_LABELS = {
  active: "Aktif",
  available: "Müsait",
  on_duty: "Görevde",
  off_duty: "İzinli",
  inactive: "Pasif",
  suspended: "Askıda",
};

const AdminDrivers = ({ navigation }) => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // API'den sürücüleri çek
  const fetchDrivers = async () => {
    try {
      setError(null);
      console.log("👥 Fetching drivers...");

      const data = await driverAPI.getList();
      console.log("✅ Drivers loaded:", data);

      // API response format'ına göre ayarla
      const driverList = data.drivers || data || [];
      setDrivers(Array.isArray(driverList) ? driverList : []);
    } catch (err) {
      console.error("❌ Fetch drivers error:", err);
      setError(err.message || "Sürücüler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useFocusEffect(
    React.useCallback(() => {
      fetchDrivers();
    }, [])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrivers();
  }, []);

  // Avatar rengi oluştur
  const getAvatarColor = (name) => {
    const colors = [
      "#5E72E4",
      "#2DCE89",
      "#FB6340",
      "#11CDEF",
      "#F5365C",
      "#8965E0",
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  // Sürücü kartı
  const renderDriverCard = ({ item }) => {
    const status = item.status || "inactive";
    const statusColor = STATUS_COLORS[status] || COLORS.secondary;
    const statusLabel = STATUS_LABELS[status] || status;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          Alert.alert(
            "👤 " +
              (item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.first_name ||
                  item.email?.split("@")[0] ||
                  "İsimsiz Sürücü"),
            `Email: ${item.email || "-"}\nTelefon: ${
              item.phone || "-"
            }\nEhliyet: ${item.license_number || "-"}\nDurum: ${statusLabel}`,
            [{ text: "Tamam" }]
          );
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              { backgroundColor: getAvatarColor(item.first_name) },
            ]}
          >
            <Text style={styles.avatarText}>
              {`${item.first_name?.[0] || ""}${
                item.last_name?.[0] || ""
              }`.toUpperCase() || "?"}
            </Text>
          </View>

          {/* Sürücü Bilgileri */}
          <View style={styles.driverInfo}>
            {/* Güncellenen isim gösterimi + edit */}
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>
                {item.first_name && item.last_name
                  ? `${item.first_name} ${item.last_name}`
                  : item.first_name ||
                    item.email?.split("@")[0] ||
                    "İsimsiz Sürücü"}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  navigation.navigate("EditDriver", { driver: item })
                }
              >
                <Ionicons name="pencil" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteDriver(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#F5365C" />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
            >
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="mail-outline"
                size={14}
                color={COLORS.secondary}
              />
              <Text style={styles.detailText}>{item.email || "Email yok"}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="call-outline"
                size={14}
                color={COLORS.secondary}
              />
              <Text style={styles.detailText}>
                {item.phone || "Telefon yok"}
              </Text>
            </View>

            {item.license_number && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="card-outline"
                  size={14}
                  color={COLORS.secondary}
                />
                <Text style={styles.detailText}>
                  Ehliyet: {item.license_number}
                </Text>
              </View>
            )}

            {item.vehicle_plate && (
              <View style={styles.detailRow}>
                <Ionicons name="car" size={14} color={COLORS.primary} />
                <Text
                  style={[
                    styles.detailText,
                    { color: COLORS.primary, fontWeight: "600" },
                  ]}
                >
                  {item.vehicle_plate}
                </Text>
              </View>
            )}
          </View>

          {/* Sağ Ok */}
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>

        {/* Alt Kısım - İstatistikler */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons
              name="speedometer-outline"
              size={16}
              color={COLORS.secondary}
            />
            <Text style={styles.statValue}>{item.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Görev</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.statValue}>
              {item.rating?.toFixed(1) || "-"}
            </Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Ionicons name="navigate-outline" size={16} color={COLORS.info} />
            <Text style={styles.statValue}>
              {item.total_km?.toLocaleString() || 0}
            </Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>Sürücü Bulunamadı</Text>
      <Text style={styles.emptySubtitle}>
        Henüz kayıtlı sürücü yok veya yetkiniz dahilinde sürücü bulunmuyor.
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
        <TouchableOpacity style={styles.retryButton} onPress={fetchDrivers}>
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
        <Text style={styles.loadingText}>Sürücüler yükleniyor...</Text>
      </View>
    );
  }

  const handleAddDriver = () => {
    navigation.navigate("CreateDriver");
  };

  // Silme işlemi
  const handleDeleteDriver = (driver) => {
    const driverName = driver.first_name
      ? `${driver.first_name} ${driver.last_name || ""}`.trim()
      : driver.email?.split("@")[0];

    Alert.alert(
      "🗑️ Sürücüyü Sil",
      `"${driverName}" sürücüsünü silmek istediğinize emin misiniz?\n\nDikkat: Kullanıcı hesabı da silinecek!`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await driverAPI.delete(driver.id);
              Alert.alert("✅ Başarılı", "Sürücü silindi");
              fetchDrivers();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.error || "Sürücü silinemedi"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsHeader}>
        <View style={styles.headerStatBox}>
          <Text style={styles.headerStatValue}>{drivers.length}</Text>
          <Text style={styles.headerStatLabel}>Toplam Sürücü</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.success }]}>
            {
              drivers.filter(
                (d) =>
                  d.status === "active" ||
                  d.status === "available" ||
                  d.status === "on_duty"
              ).length
            }
          </Text>
          <Text style={styles.headerStatLabel}>Aktif</Text>
        </View>
        <View style={styles.headerStatBox}>
          <Text style={[styles.headerStatValue, { color: COLORS.info }]}>
            {drivers.filter((d) => d.status === "on_duty").length}
          </Text>
          <Text style={styles.headerStatLabel}>Görevde</Text>
        </View>
      </View>

      {/* Sürücü Listesi */}
      <FlatList
        data={drivers}
        renderItem={renderDriverCard}
        keyExtractor={(item) => item.id?.toString() || item.email}
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

      {/* FAB - Yeni Sürücü Ekle */}
      <TouchableOpacity style={styles.fab} onPress={handleAddDriver}>
        <Ionicons name="person-add" size={24} color={COLORS.white} />
      </TouchableOpacity>
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
    paddingVertical: 16,
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
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.dark,
  },
  headerStatLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
  },

  // List
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },

  // Avatar
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },

  // Driver Info
  driverInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.dark,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.secondary,
    marginLeft: 6,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight || "#E8F4FD",
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEECEC",
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
    marginLeft: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginLeft: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.muted,
    marginHorizontal: 8,
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
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 8,
    color: COLORS.secondary,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});

export default AdminDrivers;
