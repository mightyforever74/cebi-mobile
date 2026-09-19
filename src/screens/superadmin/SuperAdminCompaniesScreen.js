// src/screens/superadmin/SuperAdminCompaniesScreen.js
// TulipFleet - Super Admin Şirket Yönetimi
// Updated: UI System Guide v3 uyumlu

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
import Card from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import api from "../../services/api";
import { formatDate } from "../../utils/helpers";

// ============================================
// PAKET TİPLERİ - runtime COLORS ile
// ============================================
const getPackageTypes = (COLORS) => [
  {
    id: "basic",
    name: "Basic",
    maxVehicles: 10,
    maxDrivers: 15,
    color: COLORS.MUTED,
  },
  {
    id: "pro",
    name: "Pro",
    maxVehicles: 50,
    maxDrivers: 75,
    color: COLORS.PRIMARY,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    maxVehicles: 500,
    maxDrivers: 750,
    color: COLORS.SUCCESS,
  },
];

// ============================================
// CREATE COMPANY MODAL
// ============================================
const CreateCompanyModal = ({
  visible,
  onClose,
  onSuccess,
  COLORS,
  styles,
}) => {
  const { t } = useTranslation();
  const PACKAGE_TYPES = getPackageTypes(COLORS);
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

  const generateSlug = (name) =>
    name
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
  const handleNameChange = (name) =>
    setFormData((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  const handlePackageChange = (packageType) => {
    const pkg = PACKAGE_TYPES.find((p) => p.id === packageType);
    setFormData((prev) => ({
      ...prev,
      package_type: packageType,
      max_vehicles: pkg?.maxVehicles.toString() || "10",
      max_drivers: pkg?.maxDrivers.toString() || "15",
    }));
  };
  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = t("superadmin.create.nameRequired");
    if (!formData.slug.trim())
      errors.slug = t("superadmin.companies.slugRequired");
    else if (!/^[a-z0-9-]+$/.test(formData.slug))
      errors.slug = t("superadmin.companies.slugInvalid");
    if (!formData.admin_email.trim())
      errors.admin_email = t("superadmin.create.adminEmailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email))
      errors.admin_email = t("superadmin.create.emailInvalid");
    if (!formData.admin_password.trim())
      errors.admin_password = t("superadmin.companies.adminPasswordRequired");
    else if (formData.admin_password.length < 6)
      errors.admin_password = t("superadmin.create.passwordShort");
    if (!formData.admin_first_name.trim())
      errors.admin_first_name = t("superadmin.companies.adminNameRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setCreating(true);
    try {
      await api.post("/api/superadmin/companies", {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        package_type: formData.package_type,
        max_vehicles: parseInt(formData.max_vehicles) || 10,
        max_drivers: parseInt(formData.max_drivers) || 15,
        admin_email: formData.admin_email.trim().toLowerCase(),
        admin_password: formData.admin_password,
        admin_first_name: formData.admin_first_name.trim(),
        admin_last_name: formData.admin_last_name.trim(),
      });
      Alert.alert(
        t("common.success"),
        t("superadmin.companies.created", {
          name: formData.name,
          email: formData.admin_email,
        }),
        [
          {
            text: t("common.ok"),
            onPress: () => {
              onClose();
              onSuccess();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error.response?.data?.message || t("superadmin.companies.createFailed")
      );
    } finally {
      setCreating(false);
    }
  };

  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createModalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            bounces={false}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("superadmin.companies.createNew")}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                {t("superadmin.companies.companyInfo")}
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("superadmin.companies.companyName")}
                </Text>
                <TextInput
                  style={[styles.input, formErrors.name && styles.inputError]}
                  placeholder={t("superadmin.create.namePlaceholder")}
                  placeholderTextColor={COLORS.PLACEHOLDER}
                  value={formData.name}
                  onChangeText={handleNameChange}
                  autoCapitalize="words"
                />
                {formErrors.name && (
                  <Text style={styles.errorText}>{formErrors.name}</Text>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("superadmin.companies.slug")}
                </Text>
                <TextInput
                  style={[styles.input, formErrors.slug && styles.inputError]}
                  placeholder="abc-lojistik"
                  placeholderTextColor={COLORS.PLACEHOLDER}
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
                  {t("superadmin.companies.slugUrl", {
                    slug: formData.slug || "slug",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                {t("superadmin.companies.planSelect")}
              </Text>
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
                      {pkg.maxVehicles} {t("superadmin.companies.vehicle")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.limitInputs}>
                <View style={styles.limitInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("superadmin.companies.maxVehicles")}
                  </Text>
                  <TextInput
                    style={styles.limitInput}
                    value={formData.max_vehicles}
                    onChangeText={(text) => updateField("max_vehicles", text)}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.PLACEHOLDER}
                  />
                </View>
                <View style={styles.limitInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("superadmin.companies.maxDrivers")}
                  </Text>
                  <TextInput
                    style={styles.limitInput}
                    value={formData.max_drivers}
                    onChangeText={(text) => updateField("max_drivers", text)}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.PLACEHOLDER}
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                {t("superadmin.companies.firstAdmin")}
              </Text>
              <View style={styles.nameInputs}>
                <View style={styles.nameInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("superadmin.companies.firstName")}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.admin_first_name && styles.inputError,
                    ]}
                    placeholder={t("createDriver.firstName")}
                    placeholderTextColor={COLORS.PLACEHOLDER}
                    value={formData.admin_first_name}
                    onChangeText={(text) =>
                      updateField("admin_first_name", text)
                    }
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.nameInputGroup}>
                  <Text style={styles.inputLabel}>
                    {t("superadmin.companies.lastName")}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t("createDriver.lastName")}
                    placeholderTextColor={COLORS.PLACEHOLDER}
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
                <Text style={styles.inputLabel}>
                  {t("superadmin.companies.emailRequired")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.admin_email && styles.inputError,
                  ]}
                  placeholder="admin@sirket.com"
                  placeholderTextColor={COLORS.PLACEHOLDER}
                  value={formData.admin_email}
                  onChangeText={(text) => updateField("admin_email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {formErrors.admin_email && (
                  <Text style={styles.errorText}>{formErrors.admin_email}</Text>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {t("superadmin.companies.passwordRequired")}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.admin_password && styles.inputError,
                  ]}
                  placeholder={t("createDriver.passwordPlaceholder")}
                  placeholderTextColor={COLORS.PLACEHOLDER}
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

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, creating && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.createBtnText}>
                    {t("superadmin.companies.create")}
                  </Text>
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await api.get("/api/superadmin/companies");
      setCompanies(response.data.companies || []);
    } catch (error) {
      Alert.alert(t("common.error"), t("superadmin.companies.listLoadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanies();
  };

  const fetchCompanyDetails = async (companyId) => {
    setLoadingDetails(true);
    setDetailsModalVisible(true);
    try {
      const response = await api.get(`/api/superadmin/companies/${companyId}`);
      setCompanyDetails(response.data);
    } catch (error) {
      Alert.alert(t("common.error"), t("superadmin.companies.loadDetailsFailed"));
      setDetailsModalVisible(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteCompany = (company) => {
    Alert.alert(
      t("superadmin.companies.deleteTitle"),
      t("superadmin.companies.deleteConfirm", { name: company.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/api/superadmin/companies/${company.id}`);
              Alert.alert(t("common.success"), t("superadmin.companies.deleted"));
              fetchCompanies();
            } catch (error) {
              Alert.alert(
                t("common.error"),
                t("superadmin.companies.deleteFailed")
              );
            }
          },
        },
      ]
    );
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "company_admin":
        return COLORS.PRIMARY;
      case "driver":
        return COLORS.SUCCESS;
      default:
        return COLORS.MUTED;
    }
  };
  const getRoleLabel = (role) => {
    switch (role) {
      case "company_admin":
        return t("superadmin.users.admin");
      case "driver":
        return t("superadmin.users.driver");
      default:
        return role;
    }
  };

  const getStatusBadgeColor = (status) =>
    status === "active" ? COLORS.SUCCESS : COLORS.WARNING;

  // Company Card
  const CompanyCard = ({ company }) => (
    <Card variant="flat" style={styles.companyCard}>
      <TouchableOpacity
        onPress={() => fetchCompanyDetails(company.id)}
        activeOpacity={0.7}
      >
        <View style={styles.companyHeader}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySlug}>@{company.slug}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBadgeColor(company.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {company.status === "active"
                ? t("superadmin.companies.active")
                : t("superadmin.companies.inactive")}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            {
              value: company.vehicle_count || 0,
              label: t("superadmin.companies.vehicle"),
              color: COLORS.PRIMARY,
            },
            {
              value: company.driver_count || 0,
              label: t("superadmin.companies.driver"),
              color: COLORS.SUCCESS,
            },
            {
              value: company.user_count || 0,
              label: t("superadmin.dashboard.user"),
              color: COLORS.INFO,
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[styles.statCard, { borderLeftColor: s.color }]}
            >
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.companyMeta}>
          <Text style={styles.metaText}>
            {company.package_type?.toUpperCase() || "BASIC"}
          </Text>
          <Text style={styles.metaText}>
            {company.created_at ? formatDate(company.created_at) : ""}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("CompanyEdit", { companyId: company.id })
          }
          style={styles.cardActionBtn}
        >
          <Text style={[styles.cardActionText, { color: COLORS.PRIMARY }]}>
            {t("common.edit")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteCompany(company)}
          style={styles.cardActionBtn}
        >
          <Text style={[styles.cardActionText, { color: COLORS.ERROR }]}>
            {t("common.delete")}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // Details Modal
  const DetailsModal = () => (
    <Modal
      visible={detailsModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setDetailsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loadingDetails ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
          ) : companyDetails ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {companyDetails.company?.name}
                </Text>
                <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>
                  {t("superadmin.companies.stats")}
                </Text>
                <View style={styles.statsGrid}>
                  {[
                    {
                      value: companyDetails.company?.vehicle_count || 0,
                      label: t("superadmin.companies.vehicle"),
                    },
                    {
                      value: companyDetails.company?.driver_count || 0,
                      label: t("superadmin.companies.driver"),
                    },
                    {
                      value: companyDetails.company?.user_count || 0,
                      label: t("superadmin.dashboard.user"),
                    },
                    {
                      value: companyDetails.company?.task_count || 0,
                      label: t("superadmin.companies.task"),
                    },
                  ].map((s, i) => (
                    <View key={i} style={styles.detailStatCard}>
                      <Text style={styles.detailStatValue}>{s.value}</Text>
                      <Text style={styles.detailStatLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>
                  {t("superadmin.companies.companyInfo")}
                </Text>
                {[
                  {
                    label: t("superadmin.companies.slugLabel"),
                    value: `@${companyDetails.company?.slug}`,
                  },
                  {
                    label: t("superadmin.companies.packageLabel"),
                    value: companyDetails.company?.package_type?.toUpperCase(),
                  },
                  {
                    label: t("superadmin.companies.maxVehiclesLabel"),
                    value: companyDetails.company?.max_vehicles,
                  },
                  {
                    label: t("superadmin.companies.maxDriversLabel"),
                    value: companyDetails.company?.max_drivers,
                  },
                  {
                    label: t("superadmin.companies.statusLabel"),
                    value:
                      companyDetails.company?.status === "active"
                        ? t("superadmin.companies.active")
                        : t("superadmin.companies.inactive"),
                    color:
                      companyDetails.company?.status === "active"
                        ? COLORS.SUCCESS
                        : COLORS.WARNING,
                  },
                ].map((row, i) => (
                  <View key={i} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{row.label}</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        row.color && { color: row.color },
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>
                  {t("superadmin.companies.usersCount", {
                    count: companyDetails.users?.length || 0,
                  })}
                </Text>
                {companyDetails.users?.length > 0 ? (
                  companyDetails.users.map((u, i) => (
                    <View key={u.id || i} style={styles.userCard}>
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
                  <Text style={styles.emptySubtext}>
                    {t("superadmin.companies.noUsers")}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>
                  {t("common.close")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  // Summary Header
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
        <Text style={styles.summaryTitle}>
          {t("superadmin.companies.title")}
        </Text>
        <View style={styles.summaryStats}>
          {[
            {
              value: companies.length,
              label: t("superadmin.companies.total"),
            },
            { value: activeCompanies, label: t("superadmin.companies.active") },
            {
              value: totalVehicles,
              label: t("superadmin.companies.vehicle"),
            },
            {
              value: totalDrivers,
              label: t("superadmin.companies.driver"),
            },
          ].map((s, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>
          {t("superadmin.companies.loadingList")}
        </Text>
      </View>
    );
  }

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
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyText}>
              {t("superadmin.companies.emptyList")}
            </Text>
            <Text style={styles.emptySubtext}>
              + butonuna basarak yeni şirket oluşturun
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <DetailsModal />
      <CreateCompanyModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={fetchCompanies}
        COLORS={COLORS}
        styles={styles}
      />
    </View>
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
    summaryContainer: {
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.lg,
      paddingTop: COLORS.SPACING.sm,
    },
    summaryTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.WHITE,
      marginBottom: COLORS.SPACING.md,
    },
    summaryStats: { flexDirection: "row", justifyContent: "space-around" },
    summaryItem: { alignItems: "center" },
    summaryValue: { ...COLORS.TYPOGRAPHY.styles.h3, color: COLORS.WHITE },
    summaryLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE_80,
      marginTop: 2,
    },
    listContent: { padding: COLORS.SPACING.md, paddingBottom: 80 },
    companyCard: { marginBottom: COLORS.SPACING.md },
    companyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.md,
    },
    companyInfo: { flex: 1 },
    companyName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      color: COLORS.TEXT_PRIMARY,
    },
    companySlug: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
    },
    statusText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginHorizontal: 3,
      borderLeftWidth: 3,
      alignItems: "center",
    },
    statValue: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    statLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    companyMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    metaText: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.MUTED },
    cardActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: COLORS.SPACING.sm,
      paddingTop: COLORS.SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    cardActionBtn: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
    },
    cardActionText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    emptyContainer: { alignItems: "center", padding: COLORS.SPACING.xxxl },
    emptyIcon: { fontSize: 48, marginBottom: COLORS.SPACING.sm },
    emptyText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    emptySubtext: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.DISABLED,
      marginTop: COLORS.SPACING.xs,
    },
    fab: {
      position: "absolute",
      right: COLORS.SPACING.lg,
      bottom: COLORS.SPACING.lg,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      ...COLORS.SHADOWS.lg,
    },
    fabText: { ...COLORS.TYPOGRAPHY.styles.h2, color: COLORS.WHITE },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      maxHeight: "85%",
      padding: COLORS.SPACING.lg,
    },
    createModalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      maxHeight: "90%",
      padding: COLORS.SPACING.lg,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    modalTitle: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    closeButton: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.MUTED,
      padding: COLORS.SPACING.xs,
    },
    modalLoading: { padding: COLORS.SPACING.xxxl, alignItems: "center" },
    detailSection: { marginBottom: COLORS.SPACING.lg },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    detailStatCard: {
      width: "48%",
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    detailStatValue: { ...COLORS.TYPOGRAPHY.styles.h2, color: COLORS.PRIMARY },
    detailStatLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
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
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
    },
    userCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    userInfo: { flex: 1 },
    userEmail: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    userName: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    roleBadge: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
    },
    roleText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    closeModalButton: {
      backgroundColor: COLORS.PRIMARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.lg,
    },
    closeModalButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },
    formSection: {
      marginBottom: COLORS.SPACING.lg,
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.md,
    },
    formSectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.md,
    },
    inputGroup: { marginBottom: COLORS.SPACING.md },
    inputLabel: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.xs,
    },
    input: {
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
    },
    inputError: { borderColor: COLORS.WARNING },
    inputHint: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    errorText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WARNING,
      marginTop: COLORS.SPACING.xs,
    },
    packageOptions: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.md,
    },
    packageOption: {
      flex: 1,
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      borderWidth: 2,
      borderColor: COLORS.INPUT_BORDER,
      marginHorizontal: COLORS.SPACING.xs,
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
    },
    packageOptionSelected: { backgroundColor: COLORS.SECONDARY },
    packageName: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    packageLimit: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
      textAlign: "center",
    },
    limitInputs: { flexDirection: "row", justifyContent: "space-between" },
    limitInputGroup: { flex: 1, marginHorizontal: COLORS.SPACING.xs },
    limitInput: {
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
      textAlign: "center",
    },
    nameInputs: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.md,
    },
    nameInputGroup: { flex: 1, marginHorizontal: COLORS.SPACING.xs },
    formButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xl,
    },
    cancelBtn: {
      flex: 1,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    cancelBtnText: { ...COLORS.TYPOGRAPHY.styles.button, color: COLORS.MUTED },
    createBtn: {
      flex: 2,
      backgroundColor: COLORS.SUCCESS,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
    },
    createBtnDisabled: { backgroundColor: COLORS.DISABLED },
    createBtnText: { ...COLORS.TYPOGRAPHY.styles.button, color: COLORS.WHITE },
  });

export default SuperAdminCompaniesScreen;
