// src/screens/superadmin/CompaniesScreen.js
// TulipFleet - Birleşik Şirket + Abonelik Yönetimi
// Updated: 21 Ocak 2026 - Subscription Management

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/config";

// Renkler
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  dark: "#172B4D",
  muted: "#8898AA",
  light: "#F7FAFC",
  white: "#FFFFFF",
};

// Status badge renkleri
const STATUS_COLORS = {
  trial: { bg: "#FFF3E0", text: "#FB6340", label: "Trial" },
  active: { bg: "#E8F5E9", text: "#2DCE89", label: "Aktif" },
  suspended: { bg: "#FFEBEE", text: "#F5365C", label: "Askıda" },
  expired: { bg: "#ECEFF1", text: "#607D8B", label: "Süresi Doldu" },
  cancelled: { bg: "#ECEFF1", text: "#607D8B", label: "İptal" },
};

// Tier badge renkleri
const TIER_COLORS = {
  starter: { bg: "#E3F2FD", text: "#2196F3", label: "Starter", price: "€15" },
  professional: {
    bg: "#E8F5E9",
    text: "#4CAF50",
    label: "Professional",
    price: "€25",
  },
  enterprise: {
    bg: "#FFF3E0",
    text: "#FF9800",
    label: "Enterprise",
    price: "€29",
  },
  custom: { bg: "#F3E5F5", text: "#9C27B0", label: "Custom", price: "-" },
};

const CompaniesScreen = ({ navigation }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState({ summary: {}, urgent: {}, companies: [] });
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUrgent, setShowUrgent] = useState(true);

  // Modal states
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Veri yükle
  const fetchCompanies = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/superadmin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result);
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
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies();
  }, [fetchCompanies]);

  // Filtrelenmiş şirketler
  const filteredCompanies = data.companies.filter((company) => {
    // Status filtresi
    if (
      activeFilter !== "all" &&
      company.subscription_status !== activeFilter
    ) {
      return false;
    }
    // Arama filtresi
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        company.name?.toLowerCase().includes(search) ||
        company.email?.toLowerCase().includes(search) ||
        company.city?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Askıya al
  const handleSuspend = async (company) => {
    Alert.alert(
      "Askıya Al",
      `${company.name} şirketini askıya almak istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Askıya Al",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("accessToken");
              const response = await fetch(
                `${API_URL}/api/superadmin/companies/${company.id}/suspend`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    reason: "payment_overdue",
                    notes: "Manuel askıya alma",
                  }),
                }
              );
              if (response.ok) {
                Alert.alert("Başarılı", "Şirket askıya alındı");
                fetchCompanies();
              } else {
                Alert.alert("Hata", "Askıya alma başarısız");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            }
          },
        },
      ]
    );
  };

  // Trial uzat
  const handleExtendTrial = async (company) => {
    Alert.alert(
      "Trial Uzat",
      `${company.name} için trial süresini 7 gün uzatmak istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Uzat",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("accessToken");
              const response = await fetch(
                `${API_URL}/api/superadmin/companies/${company.id}/extend-trial`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ days: 7 }),
                }
              );
              if (response.ok) {
                Alert.alert("Başarılı", "Trial 7 gün uzatıldı");
                fetchCompanies();
              } else {
                Alert.alert("Hata", "Trial uzatılamadı");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            }
          },
        },
      ]
    );
  };

  // Şirket sil
  const handleDeleteCompany = (company) => {
    Alert.alert(
      "Şirketi Sil",
      `"${company.name}" şirketini silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("accessToken");
              const response = await fetch(
                `${API_URL}/api/superadmin/companies/${company.id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
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

  // Özet kartlar
  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <SummaryCard
          label="Toplam"
          value={data.summary.total || 0}
          icon="business"
          color={COLORS.primary}
        />
        <SummaryCard
          label="Aktif"
          value={data.summary.by_status?.active || 0}
          icon="checkmark-circle"
          color={COLORS.success}
        />
        <SummaryCard
          label="Trial"
          value={data.summary.by_status?.trial || 0}
          icon="time"
          color={COLORS.warning}
        />
        <SummaryCard
          label="Askıda"
          value={data.summary.by_status?.suspended || 0}
          icon="pause-circle"
          color={COLORS.danger}
        />
      </View>

      <View style={styles.revenueCard}>
        <Ionicons name="wallet" size={24} color={COLORS.success} />
        <Text style={styles.revenueLabel}>Aylık Gelir</Text>
        <Text style={styles.revenueValue}>
          €{(data.summary.monthly_revenue || 0).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  // Acil aksiyonlar
  const renderUrgent = () => {
    const { payment_overdue = [], trial_ending = [] } = data.urgent || {};

    if (payment_overdue.length === 0 && trial_ending.length === 0) {
      return null;
    }

    return (
      <View style={styles.urgentContainer}>
        <TouchableOpacity
          style={styles.urgentHeader}
          onPress={() => setShowUrgent(!showUrgent)}
        >
          <View style={styles.urgentHeaderLeft}>
            <Ionicons name="warning" size={20} color={COLORS.danger} />
            <Text style={styles.urgentTitle}>
              Acil Aksiyon ({payment_overdue.length + trial_ending.length})
            </Text>
          </View>
          <Ionicons
            name={showUrgent ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {showUrgent && (
          <View style={styles.urgentContent}>
            {payment_overdue.map((company) => (
              <View key={`overdue-${company.id}`} style={styles.urgentCard}>
                <View style={styles.urgentCardHeader}>
                  <Text style={styles.urgentCompanyName}>{company.name}</Text>
                  <View style={[styles.badge, { backgroundColor: "#FFEBEE" }]}>
                    <Text style={[styles.badgeText, { color: COLORS.danger }]}>
                      {company.days_overdue} gün gecikmiş
                    </Text>
                  </View>
                </View>
                <Text style={styles.urgentInfo}>
                  Tutar: €{company.amount_due}
                </Text>
                <View style={styles.urgentActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.successBtn]}
                    onPress={() => {
                      const fullCompany = data.companies.find(
                        (c) => c.id === company.id
                      );
                      setSelectedCompany(fullCompany);
                      setShowPaymentModal(true);
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Ödeme Geldi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.dangerBtn]}
                    onPress={() => handleSuspend(company)}
                  >
                    <Ionicons name="pause" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Askıya Al</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {trial_ending.map((company) => (
              <View key={`trial-${company.id}`} style={styles.urgentCard}>
                <View style={styles.urgentCardHeader}>
                  <Text style={styles.urgentCompanyName}>{company.name}</Text>
                  <View style={[styles.badge, { backgroundColor: "#FFF3E0" }]}>
                    <Text style={[styles.badgeText, { color: COLORS.warning }]}>
                      {company.days_left} gün kaldı
                    </Text>
                  </View>
                </View>
                <Text style={styles.urgentInfo}>
                  {company.vehicle_count} araç
                </Text>
                <View style={styles.urgentActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.successBtn]}
                    onPress={() => {
                      const fullCompany = data.companies.find(
                        (c) => c.id === company.id
                      );
                      setSelectedCompany(fullCompany);
                      setShowPaymentModal(true);
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Abonelik Başlat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.warningBtn]}
                    onPress={() => handleExtendTrial(company)}
                  >
                    <Ionicons name="time" size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Süre Uzat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Filtre tabları
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          { key: "all", label: "Tümü", count: data.companies.length },
          {
            key: "active",
            label: "Aktif",
            count: data.summary.by_status?.active || 0,
          },
          {
            key: "trial",
            label: "Trial",
            count: data.summary.by_status?.trial || 0,
          },
          {
            key: "suspended",
            label: "Askıda",
            count: data.summary.by_status?.suspended || 0,
          },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.filterTabTextActive,
              ]}
            >
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Şirket kartı
  const renderCompanyCard = ({ item }) => {
    const status =
      STATUS_COLORS[item.subscription_status] || STATUS_COLORS.active;
    const tier = TIER_COLORS[item.subscription_tier] || TIER_COLORS.starter;

    return (
      <TouchableOpacity
        style={styles.companyCard}
        onPress={() => {
          setSelectedCompany(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.companyIcon}>
              <Text style={styles.companyIconText}>🏢</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{item.name}</Text>
              <Text style={styles.companySlug}>@{item.slug}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardInfoRow}>
            <View style={[styles.badge, { backgroundColor: tier.bg }]}>
              <Text style={[styles.badgeText, { color: tier.text }]}>
                {tier.label}
              </Text>
            </View>
            <Text style={styles.cardInfoText}>
              {item.vehicle_count || 0} araç • €{item.monthly_fee || 0}/ay
            </Text>
          </View>

          {item.subscription_status === "active" &&
            item.days_until_due !== null && (
              <Text style={styles.cardSubInfo}>
                Sonraki ödeme:{" "}
                {item.days_until_due > 0
                  ? `${item.days_until_due} gün`
                  : "Bugün"}
              </Text>
            )}

          {item.subscription_status === "trial" &&
            item.trial_days_left !== null && (
              <Text
                style={[
                  styles.cardSubInfo,
                  {
                    color:
                      item.trial_days_left <= 3 ? COLORS.danger : COLORS.muted,
                  },
                ]}
              >
                Trial: {item.trial_days_left} gün kaldı
              </Text>
            )}
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
            <Text style={styles.statValue}>{item.device_count || 0}</Text>
            <Text style={styles.statLabel}>Cihaz</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tier.price}</Text>
            <Text style={styles.statLabel}>/araç</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText}>
            {item.city || item.admin_email || "-"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.muted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Şirket ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.muted}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredCompanies}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanyCard}
        ListHeaderComponent={
          <>
            {renderSummary()}
            {renderUrgent()}
            {renderFilters()}
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyText}>Şirket bulunamadı</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateCompany")}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Detail Modal */}
      <CompanyDetailModal
        visible={showDetailModal}
        company={selectedCompany}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedCompany(null);
        }}
        onPayment={() => {
          setShowDetailModal(false);
          setShowPaymentModal(true);
        }}
        onSuspend={() => {
          setShowDetailModal(false);
          if (selectedCompany) handleSuspend(selectedCompany);
        }}
        onDelete={() => {
          setShowDetailModal(false);
          if (selectedCompany) handleDeleteCompany(selectedCompany);
        }}
        onRefresh={fetchCompanies}
      />

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        company={selectedCompany}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCompany(null);
        }}
        onSuccess={() => {
          setShowPaymentModal(false);
          setSelectedCompany(null);
          fetchCompanies();
        }}
      />
    </View>
  );
};

// Özet kart komponenti
const SummaryCard = ({ label, value, icon, color }) => (
  <View style={styles.summaryCard}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.summaryValue}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ============================================
// CompanyDetailModal
// ============================================
const CompanyDetailModal = ({
  visible,
  company,
  onClose,
  onPayment,
  onSuspend,
  onDelete,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && company) {
      loadDetail();
    }
  }, [visible, company]);

  const loadDetail = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const response = await fetch(
        `${API_URL}/api/superadmin/companies/${company.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDetail(data);
      }
    } catch (error) {
      console.error("Load detail error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  const status =
    STATUS_COLORS[company.subscription_status] || STATUS_COLORS.active;
  const tier = TIER_COLORS[company.subscription_tier] || TIER_COLORS.starter;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{company.name}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: "general", label: "📋 Genel" },
            { key: "subscription", label: "💰 Abonelik" },
            { key: "devices", label: "📦 Cihazlar" },
            { key: "history", label: "📜 Geçmiş" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {/* Genel Tab */}
              {activeTab === "general" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Şirket Bilgileri</Text>
                  <InfoRow label="Ad" value={company.name} />
                  <InfoRow label="E-posta" value={company.email} />
                  <InfoRow label="Telefon" value={company.phone} />
                  <InfoRow label="Şehir" value={company.city} />
                  <InfoRow label="Vergi No" value={company.tax_id} />

                  {detail?.admin && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                        Admin Bilgileri
                      </Text>
                      <InfoRow
                        label="Ad"
                        value={
                          detail.admin.first_name
                            ? `${detail.admin.first_name} ${detail.admin.last_name}`
                            : "-"
                        }
                      />
                      <InfoRow label="E-posta" value={detail.admin.email} />
                      <InfoRow label="Telefon" value={detail.admin.phone} />
                    </>
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Kullanım
                  </Text>
                  <UsageBar
                    label="Araçlar"
                    current={detail?.usage?.vehicles?.current || 0}
                    max={detail?.usage?.vehicles?.max || 10}
                  />
                  <UsageBar
                    label="Sürücüler"
                    current={detail?.usage?.drivers?.current || 0}
                    max={detail?.usage?.drivers?.max || 15}
                  />
                </View>
              )}

              {/* Abonelik Tab */}
              {activeTab === "subscription" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Paket & Durum</Text>
                  <View style={styles.infoRowWithBadge}>
                    <Text style={styles.infoLabel}>Paket</Text>
                    <View style={[styles.badge, { backgroundColor: tier.bg }]}>
                      <Text style={[styles.badgeText, { color: tier.text }]}>
                        {tier.label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.infoRowWithBadge}>
                    <Text style={styles.infoLabel}>Durum</Text>
                    <View
                      style={[styles.badge, { backgroundColor: status.bg }]}
                    >
                      <Text style={[styles.badgeText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                  <InfoRow
                    label="Araç Ücreti"
                    value={`€${company.per_vehicle_fee || 0}/araç`}
                  />
                  <InfoRow
                    label="Aylık Toplam"
                    value={`€${company.monthly_fee || 0}`}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    Tarihler
                  </Text>
                  <InfoRow
                    label="Başlangıç"
                    value={formatDate(company.subscription_starts_at)}
                  />
                  <InfoRow
                    label="Son Ödeme"
                    value={formatDate(company.last_payment_at)}
                  />
                  <InfoRow
                    label="Sonraki Ödeme"
                    value={formatDate(company.next_payment_due)}
                  />

                  {detail?.recent_payments?.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                        Son Ödemeler
                      </Text>
                      {detail.recent_payments.map((payment) => (
                        <View key={payment.id} style={styles.paymentRow}>
                          <Text style={styles.paymentDate}>
                            {formatDate(payment.payment_date)}
                          </Text>
                          <Text style={styles.paymentAmount}>
                            €{payment.amount}
                          </Text>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.success}
                          />
                        </View>
                      ))}
                    </>
                  )}
                </View>
              )}

              {/* Cihazlar Tab */}
              {activeTab === "devices" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>
                    Atanmış Cihazlar ({detail?.devices?.length || 0})
                  </Text>
                  {detail?.devices?.map((device) => (
                    <View key={device.id} style={styles.deviceRow}>
                      <View>
                        <Text style={styles.deviceCode}>
                          {device.serial || device.device_code}
                        </Text>
                        <Text style={styles.devicePlate}>
                          {device.plate_no || "Atanmamış"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              device.status === "active"
                                ? "#E8F5E9"
                                : "#FFEBEE",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                device.status === "active"
                                  ? COLORS.success
                                  : COLORS.danger,
                            },
                          ]}
                        >
                          {device.status === "active" ? "Online" : "Offline"}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {(!detail?.devices || detail.devices.length === 0) && (
                    <Text style={styles.emptyText}>Cihaz bulunamadı</Text>
                  )}
                </View>
              )}

              {/* Geçmiş Tab */}
              {activeTab === "history" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>Değişiklik Geçmişi</Text>
                  {detail?.audit_logs?.map((log) => (
                    <View key={log.id} style={styles.auditRow}>
                      <View style={styles.auditDot} />
                      <View style={styles.auditContent}>
                        <Text style={styles.auditAction}>
                          {formatAction(log.action)}
                        </Text>
                        <Text style={styles.auditMeta}>
                          {formatDate(log.created_at)} •{" "}
                          {log.changed_by_name || "Sistem"}
                        </Text>
                        {log.reason && (
                          <Text style={styles.auditReason}>{log.reason}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                  {(!detail?.audit_logs || detail.audit_logs.length === 0) && (
                    <Text style={styles.emptyText}>Geçmiş bulunamadı</Text>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.successBtn]}
            onPress={onPayment}
          >
            <Ionicons name="card" size={18} color="#FFF" />
            <Text style={styles.modalBtnText}>Ödeme</Text>
          </TouchableOpacity>

          {company.subscription_status !== "suspended" && (
            <TouchableOpacity
              style={[styles.modalBtn, styles.warningBtn]}
              onPress={onSuspend}
            >
              <Ionicons name="pause" size={18} color="#FFF" />
              <Text style={styles.modalBtnText}>Askıya Al</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.modalBtn, styles.dangerBtn]}
            onPress={onDelete}
          >
            <Ionicons name="trash" size={18} color="#FFF" />
            <Text style={styles.modalBtnText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// PaymentModal
// ============================================
const PaymentModal = ({ visible, company, onClose, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && company) {
      setAmount(String(company.monthly_fee || 0));
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setPeriodStart(formatDateISO(firstDay));
      setPeriodEnd(formatDateISO(lastDay));
    }
  }, [visible, company]);

  const handleSubmit = async () => {
    if (!amount || !periodStart || !periodEnd) {
      Alert.alert("Hata", "Tutar ve dönem bilgisi gerekli");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const response = await fetch(
        `${API_URL}/api/superadmin/companies/${company.id}/payment-received`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            payment_method: paymentMethod,
            period_start: periodStart,
            period_end: periodEnd,
            invoice_number: invoiceNumber,
            notes,
          }),
        }
      );

      if (response.ok) {
        Alert.alert("Başarılı", "Ödeme kaydedildi, abonelik aktifleştirildi");
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert("Hata", errorData.error || "Ödeme kaydedilemedi");
      }
    } catch (error) {
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  const tier = TIER_COLORS[company.subscription_tier] || TIER_COLORS.starter;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ödeme Kaydet</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.dark} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.paymentCompanyName}>{company.name}</Text>

          <View style={styles.calculatedFee}>
            <Text style={styles.calculatedFeeText}>
              {company.vehicle_count || 0} araç × €
              {company.per_vehicle_fee || 0} = €
              {(company.vehicle_count || 0) * (company.per_vehicle_fee || 0)}
            </Text>
            <Text style={styles.calculatedFeeTier}>({tier.label} paket)</Text>
          </View>

          <Text style={styles.inputLabel}>Tutar (€)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <Text style={styles.inputLabel}>Ödeme Yöntemi</Text>
          <View style={styles.methodContainer}>
            {[
              { key: "bank_transfer", label: "Havale" },
              { key: "credit_card", label: "Kart" },
              { key: "invoice", label: "Fatura" },
            ].map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.methodBtn,
                  paymentMethod === method.key && styles.methodBtnActive,
                ]}
                onPress={() => setPaymentMethod(method.key)}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    paymentMethod === method.key && styles.methodBtnTextActive,
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.periodContainer}>
            <View style={styles.periodField}>
              <Text style={styles.inputLabel}>Dönem Başlangıç</Text>
              <TextInput
                style={styles.input}
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.periodField}>
              <Text style={styles.inputLabel}>Dönem Bitiş</Text>
              <TextInput
                style={styles.input}
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Fatura No (Opsiyonel)</Text>
          <TextInput
            style={styles.input}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-2026-001"
          />

          <Text style={styles.inputLabel}>Not (Opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Ek notlar..."
            multiline
            numberOfLines={3}
          />
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.cancelBtn]}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modalBtn,
              styles.successBtn,
              loading && styles.disabledBtn,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFF" />
                <Text style={styles.modalBtnText}>Kaydet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Helper components
const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "-"}</Text>
  </View>
);

const UsageBar = ({ label, current, max }) => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color =
    percentage > 80
      ? COLORS.danger
      : percentage > 50
      ? COLORS.warning
      : COLORS.success;

  return (
    <View style={styles.usageContainer}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageValue}>
          {current} / {max}
        </Text>
      </View>
      <View style={styles.usageBarBg}>
        <View
          style={[
            styles.usageBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("tr-TR");
};

const formatDateISO = (date) => {
  return date.toISOString().split("T")[0];
};

const formatAction = (action) => {
  const actions = {
    payment_received: "Ödeme kaydedildi",
    suspended: "Askıya alındı",
    tier_changed: "Paket değiştirildi",
    trial_extended: "Trial uzatıldı",
    company_created: "Şirket oluşturuldu",
    activated: "Aktifleştirildi",
  };
  return actions[action] || action;
};

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: COLORS.muted },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    margin: 15,
    marginBottom: 0,
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 48,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.dark },

  // Summary
  summaryContainer: { padding: 15 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    elevation: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.dark,
    marginTop: 4,
  },
  summaryLabel: { fontSize: 11, color: COLORS.muted },
  revenueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    gap: 12,
    elevation: 1,
  },
  revenueLabel: { flex: 1, fontSize: 15, color: COLORS.dark },
  revenueValue: { fontSize: 22, fontWeight: "bold", color: COLORS.success },

  // Urgent
  urgentContainer: {
    marginHorizontal: 15,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    overflow: "hidden",
    elevation: 1,
  },
  urgentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  urgentHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  urgentTitle: { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  urgentContent: { padding: 15, gap: 12 },
  urgentCard: { backgroundColor: "#F8F9FA", borderRadius: 8, padding: 12 },
  urgentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  urgentCompanyName: { fontSize: 15, fontWeight: "600", color: COLORS.dark },
  urgentInfo: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  urgentActions: { flexDirection: "row", gap: 8, marginTop: 12 },

  // Action buttons
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  successBtn: { backgroundColor: COLORS.success },
  warningBtn: { backgroundColor: COLORS.warning },
  dangerBtn: { backgroundColor: COLORS.danger },
  actionBtnText: { color: COLORS.white, fontWeight: "600", fontSize: 13 },

  // Filters
  filtersContainer: { paddingHorizontal: 15, paddingVertical: 12 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { color: COLORS.dark, fontWeight: "500", fontSize: 13 },
  filterTabTextActive: { color: COLORS.white },

  // Company card
  listContent: { paddingHorizontal: 15, paddingBottom: 100 },
  companyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  companyIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  companyIconText: { fontSize: 22 },
  companyInfo: { flex: 1, marginLeft: 12 },
  companyName: { fontSize: 16, fontWeight: "bold", color: COLORS.dark },
  companySlug: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardBody: { marginTop: 12 },
  cardInfoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardInfoText: { fontSize: 13, color: COLORS.muted },
  cardSubInfo: { fontSize: 12, color: COLORS.muted, marginTop: 6 },
  statsRow: {
    flexDirection: "row",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: COLORS.dark },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  cardFooterText: { fontSize: 13, color: COLORS.muted },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: COLORS.muted, fontSize: 15 },

  // FAB
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  modalTitle: { fontSize: 18, fontWeight: "600", color: COLORS.dark },
  modalContent: { flex: 1 },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 6,
  },
  modalBtnText: { color: COLORS.white, fontWeight: "600", fontSize: 15 },
  cancelBtn: { backgroundColor: "#F0F0F0" },
  cancelBtnText: { color: COLORS.dark, fontWeight: "600", fontSize: 15 },
  disabledBtn: { opacity: 0.6 },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.muted },
  tabTextActive: { color: COLORS.primary, fontWeight: "600" },
  tabContent: { padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 12,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoRowWithBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: { fontSize: 14, color: COLORS.muted },
  infoValue: { fontSize: 14, color: COLORS.dark, fontWeight: "500" },

  // Usage bar
  usageContainer: { marginBottom: 15 },
  usageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  usageLabel: { fontSize: 14, color: COLORS.dark },
  usageValue: { fontSize: 14, color: COLORS.muted },
  usageBarBg: {
    height: 8,
    backgroundColor: "#E5E5E5",
    borderRadius: 4,
    overflow: "hidden",
  },
  usageBarFill: { height: "100%", borderRadius: 4 },

  // Payment modal
  paymentCompanyName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.dark,
    padding: 16,
    textAlign: "center",
  },
  calculatedFee: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  calculatedFeeText: { fontSize: 16, fontWeight: "600", color: COLORS.dark },
  calculatedFeeTier: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 14,
    marginHorizontal: 16,
    fontSize: 15,
    color: COLORS.dark,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  methodContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
  },
  methodBtnActive: { backgroundColor: COLORS.primary },
  methodBtnText: { fontSize: 13, color: COLORS.dark },
  methodBtnTextActive: { color: COLORS.white, fontWeight: "600" },
  periodContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
  periodField: { flex: 1 },

  // Payment & Device rows
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  paymentDate: { flex: 1, fontSize: 14, color: COLORS.dark },
  paymentAmount: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  deviceCode: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  devicePlate: { fontSize: 13, color: COLORS.muted },

  // Audit
  auditRow: { flexDirection: "row", paddingVertical: 12 },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 12,
  },
  auditContent: { flex: 1 },
  auditAction: { fontSize: 14, fontWeight: "600", color: COLORS.dark },
  auditMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  auditReason: { fontSize: 13, color: COLORS.dark, marginTop: 4 },
});

export default CompaniesScreen;
