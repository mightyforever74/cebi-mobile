// src/screens/superadmin/SuperAdminCompaniesScreen.js
// TulipFleet - Super Admin Şirket Yönetimi
// Version: 2.1 - Scroll Fix - CreateModal ayrı component
// Date: 15.12.2025

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
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ============================================
// PAKET TİPLERİ
// ============================================
const PACKAGE_TYPES = [
  {
    id: "basic",
    name: "Basic",
    maxVehicles: 10,
    maxDrivers: 15,
    color: "#8898aa",
  },
  { id: "pro", name: "Pro", maxVehicles: 50, maxDrivers: 75, color: "#5e72e4" },
  {
    id: "enterprise",
    name: "Enterprise",
    maxVehicles: 500,
    maxDrivers: 750,
    color: "#2dce89",
  },
];

// ============================================
// CREATE COMPANY MODAL - AYRI COMPONENT
// ============================================
const CreateCompanyModal = ({ visible, onClose, onSuccess }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    package_type: "basic",
    max_vehicles: "10",
    max_drivers: "15",
    admin_email: "",
    admin_password: "",
    admin_first_name: "",
    admin_last_name: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFormData({
        name: "",
        slug: "",
        package_type: "basic",
        max_vehicles: "10",
        max_drivers: "15",
        admin_email: "",
        admin_password: "",
        admin_first_name: "",
        admin_last_name: "",
      });
      setFormErrors({});
    }
  }, [visible]);

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleNameChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  const handlePackageChange = (packageType) => {
    const pkg = PACKAGE_TYPES.find((p) => p.id === packageType);
    setFormData((prev) => ({
      ...prev,
      package_type: packageType,
      max_vehicles: pkg?.maxVehicles.toString() || "10",
      max_drivers: pkg?.maxDrivers.toString() || "15",
    }));
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = "Şirket adı gerekli";
    }

    if (!formData.slug.trim()) {
      errors.slug = "Slug gerekli";
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = "Slug sadece küçük harf, rakam ve tire içerebilir";
    }

    if (!formData.admin_email.trim()) {
      errors.admin_email = "Admin email gerekli";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
      errors.admin_email = "Geçerli bir email adresi girin";
    }

    if (!formData.admin_password.trim()) {
      errors.admin_password = "Admin şifre gerekli";
    } else if (formData.admin_password.length < 6) {
      errors.admin_password = "Şifre en az 6 karakter olmalı";
    }

    if (!formData.admin_first_name.trim()) {
      errors.admin_first_name = "Admin adı gerekli";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        package_type: formData.package_type,
        max_vehicles: parseInt(formData.max_vehicles) || 10,
        max_drivers: parseInt(formData.max_drivers) || 15,
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_password: formData.admin_password,
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
      };

      await api.post("/api/superadmin/companies", payload);

      Alert.alert(
        "🎉 Başarılı!",
        `"${formData.name}" şirketi oluşturuldu.\n\nAdmin: ${formData.admin_email}`,
        [
          {
            text: "Tamam",
            onPress: () => {
              onClose();
              onSuccess();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Şirket oluşturulamadı:", error);
      const message =
        error.response?.data?.message ||
        "Şirket oluşturulurken bir hata oluştu";
      Alert.alert("Hata", message);
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createModalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            bounces={false}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏢 Yeni Şirket Oluştur</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Şirket Bilgileri */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>📋 Şirket Bilgileri</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şirket Adı *</Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  placeholder="Örn: ABC Lojistik"
                  value={formData.name}
                  onChangeText={handleNameChange}
                  autoCapitalize="words"
                />
                {formErrors.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Slug *</Text>
                <TextInput
                  style={[styles.input, formErrors.slug && styles.inputError]}
                  placeholder="abc-lojistik"
                  value={formData.slug}
                  onChangeText={(text) =>
                    updateField("slug", text.toLowerCase())
                  }
                  autoCapitalize="none"
                />
                {formErrors.slug && (
                  <Text style={styles.errorText}>{formErrors.slug}</Text>
                )}
                <Text style={styles.inputHint}>
                  URL'de kullanılacak: @{formData.slug || "slug"}
                </Text>
              </View>
            </View>

            {/* Paket Seçimi */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>📦 Paket Seçimi</Text>

              <View style={styles.packageOptions}>
                {PACKAGE_TYPES.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageOption,
                      formData.package_type === pkg.id &&
                        styles.packageOptionSelected,
                      formData.package_type === pkg.id && {
                        borderColor: pkg.color,
                      },
                    ]}
                    onPress={() => handlePackageChange(pkg.id)}
                  >
                    <Text
                      style={[
                        styles.packageName,
                        formData.package_type === pkg.id && {
                          color: pkg.color,
                        },
                      ]}
                    >
                      {pkg.name}
                    </Text>
                    <Text style={styles.packageLimit}>
                      {pkg.maxVehicles} araç
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.limitInputs}>
                <View style={styles.limitInputGroup}>
                  <Text style={styles.inputLabel}>Max Araç</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={formData.max_vehicles}
                    onChangeText={(text) => updateField("max_vehicles", text)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.limitInputGroup}>
                  <Text style={styles.inputLabel}>Max Sürücü</Text>
                  <TextInput
                    style={styles.limitInput}
                    value={formData.max_drivers}
                    onChangeText={(text) => updateField("max_drivers", text)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Admin Bilgileri */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                👤 İlk Admin Kullanıcı
              </Text>

              <View style={styles.nameInputs}>
                <View style={styles.nameInputGroup}>
                  <Text style={styles.inputLabel}>Ad *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.admin_first_name && styles.inputError,
                    ]}
                    placeholder="Ad"
                    value={formData.admin_first_name}
                    onChangeText={(text) =>
                      updateField("admin_first_name", text)
                    }
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.nameInputGroup}>
                  <Text style={styles.inputLabel}>Soyad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Soyad"
                    value={formData.admin_last_name}
                    onChangeText={(text) =>
                      updateField("admin_last_name", text)
                    }
                    autoCapitalize="words"
                  />
                </View>
              </View>
              {formErrors.admin_first_name && (
                <Text style={styles.errorText}>
                  {formErrors.admin_first_name}
                </Text>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.admin_email && styles.inputError,
                  ]}
                  placeholder="admin@sirket.com"
                  value={formData.admin_email}
                  onChangeText={(text) => updateField("admin_email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {formErrors.admin_email && (
                  <Text style={styles.errorText}>{formErrors.admin_email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şifre *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.admin_password && styles.inputError,
                  ]}
                  placeholder="Min 6 karakter"
                  value={formData.admin_password}
                  onChangeText={(text) => updateField("admin_password", text)}
                  secureTextEntry
                />
                {formErrors.admin_password && (
                  <Text style={styles.errorText}>
                    {formErrors.admin_password}
                  </Text>
                )}
              </View>
            </View>

            {/* Butonlar */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  creating && styles.createButtonDisabled,
                ]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>🏢 Oluştur</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const SuperAdminCompaniesScreen = ({ navigation }) => {
  const { user } = useAuth();

  // Liste state'leri
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detay modal state'leri
  const [companyDetails, setCompanyDetails] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Oluşturma modal
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // ============================================
  // ŞİRKET LİSTESİ
  // ============================================
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get("/api/superadmin/companies");
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error("Şirketler yüklenemedi:", error);
      Alert.alert("Hata", "Şirketler yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  // ============================================
  // ŞİRKET DETAYLARI
  // ============================================
  const fetchCompanyDetails = async (companyId) => {
    setLoadingDetails(true);
    setDetailsModalVisible(true);
    try {
      const response = await api.get(`/api/superadmin/companies/${companyId}`);
      setCompanyDetails(response.data);
    } catch (error) {
      console.error("Şirket detayları yüklenemedi:", error);
      Alert.alert("Hata", "Şirket detayları yüklenirken bir hata oluştu");
      setDetailsModalVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ============================================
  // ŞİRKET SİLME
  // ============================================
  const handleDeleteCompany = (company) => {
    Alert.alert(
      "Şirketi Sil",
      `"${company.name}" şirketini silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/superadmin/companies/${company.id}`);
              Alert.alert("Başarılı", "Şirket silindi");
              fetchCompanies();
            } catch (error) {
              Alert.alert(
                "Hata",
                error.response?.data?.message ||
                  "Şirket silinirken bir hata oluştu"
              );
            }
          },
        },
      ]
    );
  };

  // ============================================
  // YARDIMCI FONKSİYONLAR
  // ============================================
  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "#8b5cf6";
      case "company_admin":
        return "#5e72e4";
      case "admin":
        return "#11cdef";
      case "driver":
        return "#2dce89";
      default:
        return "#8898aa";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "super_admin":
        return "Süper Admin";
      case "company_admin":
        return "Şirket Admin";
      case "admin":
        return "Admin";
      case "driver":
        return "Sürücü";
      default:
        return role;
    }
  };

  // ============================================
  // COMPONENTS
  // ============================================
  const StatCard = ({ label, value, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const CompanyCard = ({ company }) => (
    <TouchableOpacity
      style={styles.companyCard}
      onPress={() => fetchCompanyDetails(company.id)}
      onLongPress={() => handleDeleteCompany(company)}
    >
      <View style={styles.companyHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companySlug}>@{company.slug}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                company.status === "active" ? "#2dce89" : "#fb6340",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {company.status === "active" ? "Aktif" : "Pasif"}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Araç"
          value={company.vehicle_count || 0}
          color="#5e72e4"
        />
        <StatCard
          label="Sürücü"
          value={company.driver_count || 0}
          color="#2dce89"
        />
        <StatCard
          label="Kullanıcı"
          value={company.user_count || 0}
          color="#fb6340"
        />
        <StatCard
          label="Görev"
          value={company.task_count || 0}
          color="#11cdef"
        />
      </View>

      <View style={styles.companyMeta}>
        <Text style={styles.metaText}>
          📦 {company.package_type?.toUpperCase() || "BASIC"}
        </Text>
        <Text style={styles.metaText}>
          📅 {new Date(company.created_at).toLocaleDateString("tr-TR")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ============================================
  // DETAY MODAL
  // ============================================
  const DetailsModal = () => (
    <Modal
      visible={detailsModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loadingDetails ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#5e72e4" />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          ) : companyDetails ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  🏢 {companyDetails.company?.name}
                </Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.detailStatCard}>
                    <Text style={styles.detailStatValue}>
                      {companyDetails.company?.vehicle_count || 0}
                    </Text>
                    <Text style={styles.detailStatLabel}>Araç</Text>
                  </View>
                  <View style={styles.detailStatCard}>
                    <Text style={styles.detailStatValue}>
                      {companyDetails.company?.driver_count || 0}
                    </Text>
                    <Text style={styles.detailStatLabel}>Sürücü</Text>
                  </View>
                  <View style={styles.detailStatCard}>
                    <Text style={styles.detailStatValue}>
                      {companyDetails.company?.user_count || 0}
                    </Text>
                    <Text style={styles.detailStatLabel}>Kullanıcı</Text>
                  </View>
                  <View style={styles.detailStatCard}>
                    <Text style={styles.detailStatValue}>
                      {companyDetails.company?.task_count || 0}
                    </Text>
                    <Text style={styles.detailStatLabel}>Görev</Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>🏢 Şirket Bilgileri</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Slug:</Text>
                  <Text style={styles.infoValue}>
                    @{companyDetails.company?.slug}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Paket:</Text>
                  <Text style={styles.infoValue}>
                    {companyDetails.company?.package_type?.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Max Araç:</Text>
                  <Text style={styles.infoValue}>
                    {companyDetails.company?.max_vehicles}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Max Sürücü:</Text>
                  <Text style={styles.infoValue}>
                    {companyDetails.company?.max_drivers}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Durum:</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color:
                          companyDetails.company?.status === "active"
                            ? "#2dce89"
                            : "#fb6340",
                      },
                    ]}
                  >
                    {companyDetails.company?.status === "active"
                      ? "✅ Aktif"
                      : "❌ Pasif"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>
                  👥 Kullanıcılar ({companyDetails.users?.length || 0})
                </Text>
                {companyDetails.users?.length > 0 ? (
                  companyDetails.users.map((u, index) => (
                    <View key={u.id || index} style={styles.userCard}>
                      <View style={styles.userInfo}>
                        <Text style={styles.userEmail}>{u.email}</Text>
                        <Text style={styles.userName}>
                          {u.first_name || ""} {u.last_name || ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.roleBadge,
                          { backgroundColor: getRoleColor(u.role) },
                        ]}
                      >
                        <Text style={styles.roleText}>
                          {getRoleLabel(u.role)}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Henüz kullanıcı yok</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Kapat</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  // ============================================
  // ÖZET HEADER
  // ============================================
  const SummaryHeader = () => {
    const totalVehicles = companies.reduce(
      (sum, c) => sum + (c.vehicle_count || 0),
      0
    );
    const totalDrivers = companies.reduce(
      (sum, c) => sum + (c.driver_count || 0),
      0
    );
    const activeCompanies = companies.filter(
      (c) => c.status === "active"
    ).length;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📊 Şirket Yönetimi</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{companies.length}</Text>
            <Text style={styles.summaryLabel}>Toplam</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeCompanies}</Text>
            <Text style={styles.summaryLabel}>Aktif</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalVehicles}</Text>
            <Text style={styles.summaryLabel}>Araç</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalDrivers}</Text>
            <Text style={styles.summaryLabel}>Sürücü</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5e72e4" />
        <Text style={styles.loadingText}>Şirketler yükleniyor...</Text>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <View style={styles.container}>
      <SummaryHeader />

      <FlatList
        data={companies}
        renderItem={({ item }) => <CompanyCard company={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#5e72e4"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyText}>Henüz şirket yok</Text>
            <Text style={styles.emptySubtext}>
              + butonuna basarak yeni şirket oluşturun
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      <DetailsModal />
      <CreateCompanyModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={fetchCompanies}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f5f7" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f4f5f7",
  },
  loadingText: { marginTop: 10, color: "#8898aa" },

  // Summary
  summaryContainer: { backgroundColor: "#5e72e4", padding: 20, paddingTop: 10 },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  summaryStats: { flexDirection: "row", justifyContent: "space-around" },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  summaryLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },

  // List
  listContent: { padding: 15, paddingBottom: 80 },

  // Company Card
  companyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  companyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  companyInfo: { flex: 1 },
  companyName: { fontSize: 18, fontWeight: "bold", color: "#32325d" },
  companySlug: { fontSize: 14, color: "#8898aa", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f6f9fc",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 3,
    borderLeftWidth: 3,
    alignItems: "center",
  },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#32325d" },
  statLabel: { fontSize: 11, color: "#8898aa", marginTop: 2 },
  companyMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  metaText: { fontSize: 12, color: "#8898aa" },

  // Empty
  emptyContainer: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyText: { color: "#8898aa", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#adb5bd", fontSize: 14, marginTop: 5 },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#5e72e4",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "bold" },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    padding: 20,
  },
  createModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#32325d" },
  closeButton: { fontSize: 24, color: "#8898aa", padding: 5 },
  modalLoading: { padding: 40, alignItems: "center" },

  // Details Modal
  detailSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325d",
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  detailStatCard: {
    width: "48%",
    backgroundColor: "#f6f9fc",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  detailStatValue: { fontSize: 28, fontWeight: "bold", color: "#5e72e4" },
  detailStatLabel: { fontSize: 12, color: "#8898aa", marginTop: 5 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  infoLabel: { fontSize: 14, color: "#8898aa" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#32325d" },
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f6f9fc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 14, fontWeight: "600", color: "#32325d" },
  userName: { fontSize: 12, color: "#8898aa", marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  closeModalButton: {
    backgroundColor: "#5e72e4",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  closeModalButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // Create Modal Form
  formSection: {
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#32325d",
    marginBottom: 15,
  },
  inputGroup: { marginBottom: 15 },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#525f7f",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#32325d",
  },
  inputError: { borderColor: "#fb6340" },
  inputHint: { fontSize: 11, color: "#8898aa", marginTop: 4 },
  errorText: { fontSize: 12, color: "#fb6340", marginTop: 4 },

  // Package Options
  packageOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  packageOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#dee2e6",
    marginHorizontal: 4,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  packageOptionSelected: { backgroundColor: "#f0f4ff" },
  packageName: { fontSize: 14, fontWeight: "bold", color: "#32325d" },
  packageLimit: {
    fontSize: 10,
    color: "#8898aa",
    marginTop: 4,
    textAlign: "center",
  },

  // Limit Inputs
  limitInputs: { flexDirection: "row", justifyContent: "space-between" },
  limitInputGroup: { flex: 1, marginHorizontal: 4 },
  limitInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#32325d",
    textAlign: "center",
  },

  // Name Inputs
  nameInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  nameInputGroup: { flex: 1, marginHorizontal: 4 },

  // Form Buttons
  formButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dee2e6",
    alignItems: "center",
    marginRight: 10,
  },
  cancelButtonText: { color: "#8898aa", fontSize: 16, fontWeight: "600" },
  createButton: {
    flex: 2,
    backgroundColor: "#2dce89",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  createButtonDisabled: { backgroundColor: "#94d3a2" },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default SuperAdminCompaniesScreen;
