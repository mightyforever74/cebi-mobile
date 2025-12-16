// src/screens/superadmin/CompaniesScreen.js
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
import { useAuth } from "../../context/AuthContext";

const CompaniesScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState([]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/superadmin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
        setFilteredCompanies(data.companies || []);
      } else {
        Alert.alert("Hata", "Şirketler yüklenemedi");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCompanies(companies);
    } else {
      const filtered = companies.filter(
        (company) =>
          company.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          company.slug?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCompanies(filtered);
    }
  }, [searchQuery, companies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies();
  }, []);

  const handleDeleteCompany = (company) => {
    Alert.alert(
      "Şirketi Sil",
      `"${company.name}" şirketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/api/superadmin/companies/${company.id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                Alert.alert("Başarılı", "Şirket silindi");
                fetchCompanies();
              } else {
                Alert.alert("Hata", "Şirket silinemedi");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            }
          },
        },
      ]
    );
  };

  const renderCompanyItem = ({ item }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => navigation.navigate("CompanyDetail", { company: item })}
    >
      <View style={styles.companyHeader}>
        <View style={styles.companyIcon}>
          <Text style={styles.companyIconText}>🏢</Text>
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{item.name}</Text>
          <Text style={styles.companySlug}>@{item.slug}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            item.active !== false ? styles.activeBadge : styles.inactiveBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {item.active !== false ? "Aktif" : "Pasif"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.vehicle_count || 0}</Text>
          <Text style={styles.statLabel}>Araç</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.driver_count || 0}</Text>
          <Text style={styles.statLabel}>Sürücü</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.user_count || 0}</Text>
          <Text style={styles.statLabel}>Kullanıcı</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.task_count || 0}</Text>
          <Text style={styles.statLabel}>Görev</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => navigation.navigate("EditCompany", { company: item })}
        >
          <Text style={styles.actionBtnText}>✏️ Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() => handleDeleteCompany(item)}
        >
          <Text style={[styles.actionBtnText, styles.deleteBtnText]}>
            🗑️ Sil
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E72E4" />
        <Text style={styles.loadingText}>Şirketler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#8898AA"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Summary */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Toplam {filteredCompanies.length} şirket
        </Text>
      </View>

      {/* Company List */}
      <FlatList
        data={filteredCompanies}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanyItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyTitle}>Şirket Bulunamadı</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? "Arama kriterlerine uygun şirket yok"
                : "Henüz şirket eklenmemiş"}
            </Text>
          </View>
        }
      />

      {/* FAB - Add Company */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateCompany")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    margin: 15,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#32325D",
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    color: "#8898AA",
    fontSize: 16,
  },
  summaryBar: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  summaryText: {
    color: "#8898AA",
    fontSize: 13,
  },
  listContainer: {
    padding: 15,
    paddingTop: 5,
  },
  companyCard: {
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
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  companyIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#5E72E4",
    justifyContent: "center",
    alignItems: "center",
  },
  companyIconText: {
    fontSize: 24,
  },
  companyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325D",
  },
  companySlug: {
    fontSize: 12,
    color: "#8898AA",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#E8FFF3",
  },
  inactiveBadge: {
    backgroundColor: "#FFE8E8",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
  },
  statLabel: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#F6F9FC",
  },
  deleteBtn: {
    backgroundColor: "#FFF0F0",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#32325D",
  },
  deleteBtnText: {
    color: "#F5365C",
  },
  emptyState: {
    alignItems: "center",
    padding: 50,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 8,
  },
  emptyText: {
    color: "#8898AA",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5E72E4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#5E72E4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: {
    fontSize: 28,
    color: "#FFF",
    fontWeight: "300",
  },
});

export default CompaniesScreen;
