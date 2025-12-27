// src/screens/superadmin/PlatformUsersScreen.js
// TulipFleet - Platform Kullanıcıları Ekranı
// Created: 27 Aralık 2025

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
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

const PlatformUsersScreen = ({ navigation }) => {
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

  // Rol rengi
  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "#F5365C";
      case "company_admin":
        return "#5E72E4";
      case "driver":
        return "#2DCE89";
      default:
        return "#8898AA";
    }
  };

  // Rol etiketi
  const getRoleLabel = (role) => {
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
  };

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter((user) => {
    // Rol filtresi
    if (filter !== "all" && user.role !== filter) return false;

    // Arama filtresi
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.first_name?.toLowerCase().includes(query) ||
      user.last_name?.toLowerCase().includes(query) ||
      user.company_name?.toLowerCase().includes(query)
    );
  });

  // İstatistikler
  const stats = {
    total: users.length,
    super_admin: users.filter((u) => u.role === "super_admin").length,
    company_admin: users.filter((u) => u.role === "company_admin").length,
    driver: users.filter((u) => u.role === "driver").length,
  };

  // Kullanıcı kartı
  const renderUserItem = ({ item }) => {
    const roleColor = getRoleColor(item.role);
    const initials =
      item.first_name && item.last_name
        ? `${item.first_name[0]}${item.last_name[0]}`.toUpperCase()
        : item.email[0].toUpperCase();

    return (
      <TouchableOpacity style={styles.userCard}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: roleColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Bilgiler */}
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>
              {item.first_name && item.last_name
                ? `${item.first_name} ${item.last_name}`
                : item.email.split("@")[0]}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={styles.roleText}>{getRoleLabel(item.role)}</Text>
            </View>
          </View>

          <Text style={styles.userEmail}>{item.email}</Text>

          {item.company_name && (
            <View style={styles.companyRow}>
              <Ionicons name="business-outline" size={12} color="#8898AA" />
              <Text style={styles.companyName}>{item.company_name}</Text>
            </View>
          )}

          <Text style={styles.createdAt}>
            Kayıt: {new Date(item.created_at).toLocaleDateString("tr-TR")}
          </Text>
        </View>

        {/* Ok */}
        <Ionicons name="chevron-forward" size={20} color="#DEE2E6" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
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
        >
          <Text style={[styles.statValue, { color: "#5E72E4" }]}>
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
        >
          <Text style={[styles.statValue, { color: "#F5365C" }]}>
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
        >
          <Text style={[styles.statValue, { color: "#5E72E4" }]}>
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
        >
          <Text style={[styles.statValue, { color: "#2DCE89" }]}>
            {stats.driver}
          </Text>
          <Text style={styles.statLabel}>Sürücü</Text>
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#8898AA" />
        <TextInput
          style={styles.searchInput}
          placeholder="İsim, email veya şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8898AA"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#8898AA" />
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
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#DEE2E6" />
            <Text style={styles.emptyTitle}>Kullanıcı Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Arama kriterlerine uygun kullanıcı yok"
                : "Henüz kullanıcı eklenmemiş"}
            </Text>
          </View>
        }
      />
    </View>
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

  // Stats
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 5,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: "#5E72E4",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    color: "#8898AA",
    marginTop: 2,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 14,
    color: "#32325D",
  },

  // Summary
  summaryBar: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  summaryText: {
    color: "#8898AA",
    fontSize: 13,
  },

  // User Card
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: "#FFF",
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
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#32325D",
    marginRight: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 13,
    color: "#8898AA",
    marginBottom: 4,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  companyName: {
    fontSize: 12,
    color: "#5E72E4",
    marginLeft: 4,
  },
  createdAt: {
    fontSize: 11,
    color: "#ADB5BD",
  },

  // Empty
  emptyState: {
    alignItems: "center",
    padding: 50,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    color: "#8898AA",
    textAlign: "center",
  },
});

export default PlatformUsersScreen;
