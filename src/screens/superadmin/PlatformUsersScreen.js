// src/screens/superadmin/PlatformUsersScreen.js
// TulipFleet - Platform Kullanıcıları Ekranı
// Created: 27 Aralık 2025
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// --- helper: #RRGGBB => #RRGGBBAA ---
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: 10,
      color: COLORS.MUTED,
      fontWeight: "500",
    },

    // Stats
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: 10,
      paddingVertical: 15,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    statCardActive: {
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
    },
    statLabel: {
      fontSize: 10,
      color: COLORS.MUTED,
      marginTop: 2,
      fontWeight: "600",
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginHorizontal: 15,
      marginBottom: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    searchInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 10,
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    // Summary
    summaryBar: {
      paddingHorizontal: 15,
      paddingBottom: 10,
    },
    summaryText: {
      color: COLORS.MUTED,
      fontSize: 13,
      fontWeight: "600",
    },

    // List
    listContainer: {
      paddingHorizontal: 15,
      paddingBottom: 20,
    },

    // User Card
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    avatarText: {
      color: COLORS.WHITE,
      fontSize: 18,
      fontWeight: "bold",
    },
    userInfo: {
      flex: 1,
    },
    userHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
      gap: 8,
    },
    userName: {
      fontSize: 16,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
    },
    roleBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    roleText: {
      color: COLORS.WHITE,
      fontSize: 10,
      fontWeight: "700",
    },
    userEmail: {
      fontSize: 13,
      color: COLORS.MUTED,
      marginBottom: 4,
    },
    companyRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
      gap: 4,
    },
    companyName: {
      fontSize: 12,
      color: COLORS.PRIMARY,
      fontWeight: "600",
    },
    createdAt: {
      fontSize: 11,
      color: COLORS.MUTED,
      fontWeight: "600",
    },

    // Empty
    emptyState: {
      alignItems: "center",
      padding: 50,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 15,
      marginBottom: 8,
    },
    emptyText: {
      color: COLORS.MUTED,
      textAlign: "center",
      fontWeight: "500",
    },
  });

const PlatformUsersScreen = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      console.log("🔑 Token exists:", !!token);

      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");
        setLoading(false);
        return;
      }

      console.log("📡 Fetching users...");

      const response = await fetch(`${API_URL}/api/superadmin/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📦 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Users loaded:", data.users?.length || 0);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, errorData);
        Alert.alert("Hata", errorData.error || "Kullanıcılar yüklenemedi");
      }
    } catch (error) {
      console.error("❌ Fetch users error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  // Rol rengi (token tabanlı)
  const getRoleColor = useCallback(
    (role) => {
      switch (role) {
        case "super_admin":
          return COLORS.ERROR;
        case "company_admin":
          return COLORS.PRIMARY;
        case "driver":
          return COLORS.SUCCESS;
        default:
          return COLORS.MUTED;
      }
    },
    [COLORS]
  );

  // Rol etiketi
  const getRoleLabel = useCallback((role) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "company_admin":
        return "Şirket Admin";
      case "driver":
        return "Sürücü";
      default:
        return role;
    }
  }, []);

  // Filtrelenmiş kullanıcılar
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filter !== "all" && user.role !== filter) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        user.email?.toLowerCase().includes(query) ||
        user.first_name?.toLowerCase().includes(query) ||
        user.last_name?.toLowerCase().includes(query) ||
        user.company_name?.toLowerCase().includes(query)
      );
    });
  }, [users, filter, searchQuery]);

  // İstatistikler
  const stats = useMemo(
    () => ({
      total: users.length,
      super_admin: users.filter((u) => u.role === "super_admin").length,
      company_admin: users.filter((u) => u.role === "company_admin").length,
      driver: users.filter((u) => u.role === "driver").length,
    }),
    [users]
  );

  // Kullanıcı kartı
  const renderUserItem = ({ item }) => {
    const roleColor = getRoleColor(item.role);
    const initials =
      item.first_name && item.last_name
        ? `${item.first_name[0]}${item.last_name[0]}`.toUpperCase()
        : item.email?.[0]?.toUpperCase() || "U";

    return (
      <TouchableOpacity style={styles.userCard} activeOpacity={0.85}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: roleColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Bilgiler */}
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.email?.split?.("@")?.[0] || "-"}
            </Text>

            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={styles.roleText}>{getRoleLabel(item.role)}</Text>
            </View>
          </View>

          <Text style={styles.userEmail} numberOfLines={1}>
            {item.email}
          </Text>

          {item.company_name && (
            <View style={styles.companyRow}>
              <Ionicons
                name="business-outline"
                size={12}
                color={COLORS.MUTED}
              />
              <Text style={styles.companyName} numberOfLines={1}>
                {item.company_name}
              </Text>
            </View>
          )}

          <Text style={styles.createdAt}>
            Kayıt: {new Date(item.created_at).toLocaleDateString("tr-TR")}
          </Text>
        </View>

        {/* Ok */}
        <Ionicons
          name="chevron-forward"
          size={20}
          color={withAlpha(COLORS.MUTED, 0.35) || COLORS.MUTED}
        />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Kullanıcılar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, filter === "all" && styles.statCardActive]}
          onPress={() => setFilter("all")}
          activeOpacity={0.85}
        >
          <Text style={[styles.statValue, { color: COLORS.PRIMARY }]}>
            {stats.total}
          </Text>
          <Text style={styles.statLabel}>Toplam</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            filter === "super_admin" && styles.statCardActive,
          ]}
          onPress={() => setFilter("super_admin")}
          activeOpacity={0.85}
        >
          <Text style={[styles.statValue, { color: COLORS.ERROR }]}>
            {stats.super_admin}
          </Text>
          <Text style={styles.statLabel}>Super</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            filter === "company_admin" && styles.statCardActive,
          ]}
          onPress={() => setFilter("company_admin")}
          activeOpacity={0.85}
        >
          <Text style={[styles.statValue, { color: COLORS.PRIMARY }]}>
            {stats.company_admin}
          </Text>
          <Text style={styles.statLabel}>Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.statCard,
            filter === "driver" && styles.statCardActive,
          ]}
          onPress={() => setFilter("driver")}
          activeOpacity={0.85}
        >
          <Text style={[styles.statValue, { color: COLORS.SUCCESS }]}>
            {stats.driver}
          </Text>
          <Text style={styles.statLabel}>Sürücü</Text>
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="İsim, email veya şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.MUTED}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Özet */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {filteredUsers.length} kullanıcı
          {filter !== "all" && ` (${getRoleLabel(filter)})`}
        </Text>
      </View>

      {/* Kullanıcı Listesi */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="people-outline"
              size={64}
              color={withAlpha(COLORS.MUTED, 0.35) || COLORS.MUTED}
            />
            <Text style={styles.emptyTitle}>Kullanıcı Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Arama kriterlerine uygun kullanıcı yok"
                : "Henüz kullanıcı eklenmemiş"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default PlatformUsersScreen;
