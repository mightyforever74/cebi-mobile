// src/screens/superadmin/CompaniesScreen.js
// TulipFleet - Birleşik Şirket + Abonelik Yönetimi
// Updated: 21 Ocak 2026 - Subscription Management
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği (Rehbere uygun)

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { API_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { formatDate, formatNumber } from "../../utils/helpers";

// --- helper: #RRGGBB => #RRGGBBAA (rgba/hardcode olmadan) ---
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

// ------------------------------------
// THEMED STYLES (Rehber Pattern)
// ------------------------------------
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      color: COLORS.MUTED,
      fontSize: 14,
      fontWeight: "500",
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      margin: 15,
      marginBottom: 0,
      borderRadius: 10,
      paddingHorizontal: 15,
      height: 48,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.22) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 15,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    // Summary
    summaryContainer: { padding: 15 },
    summaryRow: { flexDirection: "row", gap: 8 },
    summaryCard: {
      flex: 1,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      elevation: 1,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 4,
    },
    summaryLabel: { fontSize: 11, color: COLORS.MUTED },

    revenueCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 10,
      padding: 15,
      marginTop: 10,
      gap: 12,
      elevation: 1,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    revenueLabel: {
      flex: 1,
      fontSize: 15,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    revenueValue: { fontSize: 22, fontWeight: "bold", color: COLORS.SUCCESS },

    // Urgent
    urgentContainer: {
      marginHorizontal: 15,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 10,
      overflow: "hidden",
      elevation: 1,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    urgentHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    urgentHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    urgentTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    urgentContent: { padding: 15, gap: 12 },
    urgentCard: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    urgentCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    urgentCompanyName: {
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    urgentInfo: { fontSize: 13, color: COLORS.MUTED, marginTop: 4 },
    urgentActions: { flexDirection: "row", gap: 8, marginTop: 12 },

    // Action buttons
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    successBtn: { backgroundColor: COLORS.SUCCESS },
    warningBtn: { backgroundColor: COLORS.WARNING },
    dangerBtn: { backgroundColor: COLORS.ERROR },
    actionBtnText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 13 },

    // Filters
    filtersContainer: { paddingHorizontal: 15, paddingVertical: 12 },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      marginRight: 8,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    filterTabActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    filterTabText: {
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "600",
      fontSize: 13,
    },
    filterTabTextActive: { color: COLORS.WHITE },

    // Company card
    listContent: { paddingHorizontal: 15, paddingBottom: 110 },
    companyCard: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderRadius: 12,
      padding: 15,
      marginBottom: 12,
      elevation: 2,
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.18) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    companyIcon: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.12),
      justifyContent: "center",
      alignItems: "center",
    },
    companyIconText: { fontSize: 22 },
    companyInfo: { flex: 1, marginLeft: 12 },
    companyName: {
      fontSize: 16,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    companySlug: { fontSize: 12, color: COLORS.MUTED, marginTop: 2 },

    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: "700" },

    cardBody: { marginTop: 12 },
    cardInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    cardInfoText: { fontSize: 13, color: COLORS.MUTED },
    cardSubInfo: { fontSize: 12, color: COLORS.MUTED, marginTop: 6 },

    statsRow: {
      flexDirection: "row",
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    statItem: { flex: 1, alignItems: "center" },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    statLabel: { fontSize: 11, color: COLORS.MUTED, marginTop: 2 },

    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    cardFooterText: { fontSize: 13, color: COLORS.MUTED },

    // Empty
    emptyContainer: { alignItems: "center", paddingVertical: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 10 },
    emptyText: { color: COLORS.MUTED, fontSize: 15 },

    // FAB
    fab: {
      position: "absolute",
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      elevation: 5,
      shadowColor: COLORS.PRIMARY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },

    // Modal
    modalContainer: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    modalContent: { flex: 1 },
    modalActions: {
      flexDirection: "row",
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER ?? COLORS.BORDER,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    modalBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 10,
      gap: 8,
    },
    modalBtnText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
    cancelBtn: { backgroundColor: withAlpha(COLORS.MUTED, 0.22) },
    cancelBtnText: {
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "700",
      fontSize: 15,
    },
    disabledBtn: { opacity: 0.6 },

    // Tabs
    tabsContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER ?? COLORS.BORDER,
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
    },
    tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
    tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.PRIMARY },
    tabText: { fontSize: 13, color: COLORS.MUTED, fontWeight: "600" },
    tabTextActive: { color: COLORS.PRIMARY, fontWeight: "800" },
    tabContent: { padding: 16 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginBottom: 12,
    },

    // Info rows
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        withAlpha(COLORS.BORDER, 0.12) || (COLORS.DIVIDER ?? COLORS.BORDER),
      gap: 12,
    },
    infoRowWithBadge: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor:
        withAlpha(COLORS.BORDER, 0.12) || (COLORS.DIVIDER ?? COLORS.BORDER),
      gap: 12,
    },
    infoLabel: { fontSize: 14, color: COLORS.MUTED, fontWeight: "600" },
    infoValue: {
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "600",
    },

    // Usage bar
    usageContainer: { marginBottom: 15 },
    usageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    usageLabel: {
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "600",
    },
    usageValue: { fontSize: 14, color: COLORS.MUTED, fontWeight: "600" },
    usageBarBg: {
      height: 8,
      backgroundColor: withAlpha(COLORS.MUTED, 0.18),
      borderRadius: 4,
      overflow: "hidden",
    },
    usageBarFill: { height: "100%", borderRadius: 4 },

    // Payment modal
    paymentCompanyName: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      padding: 16,
      textAlign: "center",
    },
    calculatedFee: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      padding: 16,
      marginHorizontal: 16,
      borderRadius: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.14) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    calculatedFeeText: {
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    calculatedFeeTier: { fontSize: 13, color: COLORS.MUTED, marginTop: 4 },

    inputLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
    },
    input: {
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      fontSize: 15,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      borderWidth: 1,
      borderColor: COLORS.INPUT ?? COLORS.DIVIDER ?? COLORS.BORDER,
    },
    textArea: { minHeight: 80, textAlignVertical: "top" },

    methodContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 8 },
    methodBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: withAlpha(COLORS.MUTED, 0.18),
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.12) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    methodBtnActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    methodBtnText: {
      fontSize: 13,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "700",
    },
    methodBtnTextActive: { color: COLORS.WHITE },

    periodContainer: { flexDirection: "row", paddingHorizontal: 16, gap: 10 },
    periodField: { flex: 1 },

    // Payment & Device rows
    paymentRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      gap: 12,
    },
    paymentDate: {
      flex: 1,
      fontSize: 14,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "600",
    },
    paymentAmount: {
      fontSize: 14,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },

    deviceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor:
        withAlpha(COLORS.BORDER, 0.12) || (COLORS.DIVIDER ?? COLORS.BORDER),
      gap: 12,
    },
    deviceCode: {
      fontSize: 14,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    devicePlate: { fontSize: 13, color: COLORS.MUTED },

    // Audit
    auditRow: { flexDirection: "row", paddingVertical: 12 },
    auditDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: COLORS.PRIMARY,
      marginTop: 6,
      marginRight: 12,
    },
    auditContent: { flex: 1 },
    auditAction: {
      fontSize: 14,
      fontWeight: "800",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
    },
    auditMeta: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
      fontWeight: "600",
    },
    auditReason: {
      fontSize: 13,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      marginTop: 4,
      fontWeight: "600",
    },
  });

// ------------------------------------
// TOKEN-BASED BADGE MAPS (no hex)
// ------------------------------------
const useStatusConfig = (COLORS) => {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      trial: {
        bg: withAlpha(COLORS.WARNING, 0.14),
        text: COLORS.WARNING,
        label: t("superadmin.companies.trial"),
      },
      active: {
        bg: withAlpha(COLORS.SUCCESS, 0.14),
        text: COLORS.SUCCESS,
        label: t("superadmin.companies.active"),
      },
      suspended: {
        bg: withAlpha(COLORS.ERROR, 0.14),
        text: COLORS.ERROR,
        label: t("superadmin.companies.suspendedStatus"),
      },
      expired: {
        bg: withAlpha(COLORS.MUTED, 0.14),
        text: COLORS.MUTED,
        label: t("superadmin.companies.expired"),
      },
      cancelled: {
        bg: withAlpha(COLORS.MUTED, 0.14),
        text: COLORS.MUTED,
        label: t("superadmin.companies.cancelled"),
      },
    }),
    [COLORS, t]
  );
};

const useTierConfig = (COLORS) =>
  useMemo(
    () => ({
      starter: {
        bg: withAlpha(COLORS.INFO, 0.14),
        text: COLORS.INFO,
        label: "Starter",
        price: "€15",
      },
      professional: {
        bg: withAlpha(COLORS.SUCCESS, 0.14),
        text: COLORS.SUCCESS,
        label: "Professional",
        price: "€25",
      },
      enterprise: {
        bg: withAlpha(COLORS.WARNING, 0.14),
        text: COLORS.WARNING,
        label: "Enterprise",
        price: "€29",
      },
      custom: {
        bg: withAlpha(COLORS.LABEL ?? COLORS.PRIMARY, 0.14),
        text: COLORS.LABEL ?? COLORS.PRIMARY,
        label: "Custom",
        price: "-",
      },
    }),
    [COLORS]
  );

// ------------------------------------
// MAIN SCREEN
// ------------------------------------
const CompaniesScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const STATUS_COLORS = useStatusConfig(COLORS);
  const TIER_COLORS = useTierConfig(COLORS);

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
        Alert.alert(t("common.error"), t("superadmin.sessionExpired"));
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
        Alert.alert(t("common.error"), t("superadmin.companies.loadFailed"));
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert(t("common.error"), t("superadmin.connectionError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies();
  }, [fetchCompanies]);

  // Filtrelenmiş şirketler
  const filteredCompanies = useMemo(() => {
    const list = Array.isArray(data.companies) ? data.companies : [];
    return list.filter((company) => {
      if (
        activeFilter !== "all" &&
        company.subscription_status !== activeFilter
      )
        return false;
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
  }, [data.companies, activeFilter, searchQuery]);

  // Askıya al
  const handleSuspend = async (company) => {
    Alert.alert(
      t("superadmin.companies.suspend"),
      t("superadmin.companies.suspendConfirm", { name: company.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("superadmin.companies.suspend"),
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
                Alert.alert(
                  t("common.success"),
                  t("superadmin.companies.suspended")
                );
                fetchCompanies();
              } else {
                Alert.alert(
                  t("common.error"),
                  t("superadmin.companies.suspendFailed")
                );
              }
            } catch (error) {
              Alert.alert(t("common.error"), t("superadmin.connectionError"));
            }
          },
        },
      ]
    );
  };

  // Trial uzat
  const handleExtendTrial = async (company) => {
    Alert.alert(
      t("superadmin.companies.extendTitle"),
      t("superadmin.companies.extendConfirm", { name: company.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("superadmin.companies.extendAction"),
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
                Alert.alert(
                  t("common.success"),
                  t("superadmin.companies.trialExtended")
                );
                fetchCompanies();
              } else {
                Alert.alert(
                  t("common.error"),
                  t("superadmin.companies.trialExtendFailed")
                );
              }
            } catch (error) {
              Alert.alert(t("common.error"), t("superadmin.connectionError"));
            }
          },
        },
      ]
    );
  };

  // Şirket sil
  const handleDeleteCompany = (company) => {
    Alert.alert(
      t("superadmin.companies.deleteTitle"),
      t("superadmin.companies.deleteConfirmIrreversible", {
        name: company.name,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
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
                Alert.alert(
                  t("common.success"),
                  t("superadmin.companies.deleted")
                );
                fetchCompanies();
              } else {
                Alert.alert(
                  t("common.error"),
                  t("superadmin.companies.deleteFailed")
                );
              }
            } catch (error) {
              Alert.alert(t("common.error"), t("superadmin.connectionError"));
            }
          },
        },
      ]
    );
  };

  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <SummaryCard
          label={t("superadmin.companies.total")}
          value={data.summary.total || 0}
          icon="business"
          color={COLORS.PRIMARY}
        />
        <SummaryCard
          label={t("superadmin.companies.active")}
          value={data.summary.by_status?.active || 0}
          icon="checkmark-circle"
          color={COLORS.SUCCESS}
        />
        <SummaryCard
          label={t("superadmin.companies.trial")}
          value={data.summary.by_status?.trial || 0}
          icon="time"
          color={COLORS.WARNING}
        />
        <SummaryCard
          label={t("superadmin.companies.suspendedStatus")}
          value={data.summary.by_status?.suspended || 0}
          icon="pause-circle"
          color={COLORS.ERROR}
        />
      </View>

      <View style={styles.revenueCard}>
        <Ionicons name="wallet" size={24} color={COLORS.SUCCESS} />
        <Text style={styles.revenueLabel}>
          {t("superadmin.companies.monthlyRevenue")}
        </Text>
        <Text style={styles.revenueValue}>
          €{formatNumber(data.summary.monthly_revenue || 0)}
        </Text>
      </View>
    </View>
  );

  const renderUrgent = () => {
    const { payment_overdue = [], trial_ending = [] } = data.urgent || {};
    if (payment_overdue.length === 0 && trial_ending.length === 0) return null;

    const totalUrgent = payment_overdue.length + trial_ending.length;

    return (
      <View style={styles.urgentContainer}>
        <TouchableOpacity
          style={styles.urgentHeader}
          onPress={() => setShowUrgent(!showUrgent)}
          activeOpacity={0.85}
        >
          <View style={styles.urgentHeaderLeft}>
            <Ionicons name="warning" size={20} color={COLORS.ERROR} />
            <Text style={styles.urgentTitle}>
              {t("superadmin.companies.urgentAction", { count: totalUrgent })}
            </Text>
          </View>
          <Ionicons
            name={showUrgent ? "chevron-up" : "chevron-down"}
            size={20}
            color={COLORS.MUTED}
          />
        </TouchableOpacity>

        {showUrgent && (
          <View style={styles.urgentContent}>
            {payment_overdue.map((company) => (
              <View key={`overdue-${company.id}`} style={styles.urgentCard}>
                <View style={styles.urgentCardHeader}>
                  <Text style={styles.urgentCompanyName}>{company.name}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: withAlpha(COLORS.ERROR, 0.14) },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: COLORS.ERROR }]}>
                      {t("superadmin.companies.overdueDays", {
                        count: company.days_overdue,
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.urgentInfo}>
                  {t("superadmin.companies.amountDue", {
                    amount: company.amount_due,
                  })}
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
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>
                      {t("superadmin.companies.paymentReceived")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.dangerBtn]}
                    onPress={() => handleSuspend(company)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="pause" size={16} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>
                      {t("superadmin.companies.suspend")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {trial_ending.map((company) => (
              <View key={`trial-${company.id}`} style={styles.urgentCard}>
                <View style={styles.urgentCardHeader}>
                  <Text style={styles.urgentCompanyName}>{company.name}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: withAlpha(COLORS.WARNING, 0.14) },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: COLORS.WARNING }]}>
                      {t("superadmin.companies.daysLeft", {
                        count: company.days_left,
                      })}
                    </Text>
                  </View>
                </View>
                <Text style={styles.urgentInfo}>
                  {company.vehicle_count} {t("superadmin.companies.vehicle")}
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
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>
                      {t("superadmin.companies.startSubscription")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.warningBtn]}
                    onPress={() => handleExtendTrial(company)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="time" size={16} color={COLORS.WHITE} />
                    <Text style={styles.actionBtnText}>
                      {t("superadmin.companies.extend")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          {
            key: "all",
            label: t("superadmin.companies.filterAll"),
            count: (data.companies || []).length,
          },
          {
            key: "active",
            label: t("superadmin.companies.active"),
            count: data.summary.by_status?.active || 0,
          },
          {
            key: "trial",
            label: t("superadmin.companies.trial"),
            count: data.summary.by_status?.trial || 0,
          },
          {
            key: "suspended",
            label: t("superadmin.companies.suspendedStatus"),
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
            activeOpacity={0.85}
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
        activeOpacity={0.85}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.companyIcon}>
              <Text style={styles.companyIconText}>🏢</Text>
            </View>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.companySlug} numberOfLines={1}>
                @{item.slug}
              </Text>
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
              {t("superadmin.companies.vehiclesFee", {
                count: item.vehicle_count || 0,
                fee: item.monthly_fee || 0,
              })}
            </Text>
          </View>

          {item.subscription_status === "active" &&
            item.days_until_due !== null && (
              <Text style={styles.cardSubInfo}>
                {item.days_until_due > 0
                  ? t("superadmin.companies.nextPaymentDays", {
                      count: item.days_until_due,
                    })
                  : t("superadmin.companies.nextPaymentToday")}
              </Text>
            )}

          {item.subscription_status === "trial" &&
            item.trial_days_left !== null && (
              <Text
                style={[
                  styles.cardSubInfo,
                  {
                    color:
                      item.trial_days_left <= 3 ? COLORS.ERROR : COLORS.MUTED,
                  },
                ]}
              >
                {t("superadmin.companies.trialDaysLeft", {
                  count: item.trial_days_left,
                })}
              </Text>
            )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.vehicle_count || 0}</Text>
            <Text style={styles.statLabel}>
              {t("superadmin.companies.vehicle")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.driver_count || 0}</Text>
            <Text style={styles.statLabel}>
              {t("superadmin.companies.driver")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.device_count || 0}</Text>
            <Text style={styles.statLabel}>
              {t("superadmin.companies.device")}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tier.price}</Text>
            <Text style={styles.statLabel}>
              {t("superadmin.companies.perVehicle")}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardFooterText} numberOfLines={1}>
            {item.city || item.admin_email || "-"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("common.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("superadmin.companies.searchPlaceholder")}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.MUTED}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle" size={20} color={COLORS.MUTED} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredCompanies}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderCompanyCard}
        ListHeaderComponent={
          <>
            {renderSummary()}
            {renderUrgent()}
            {renderFilters()}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏢</Text>
            <Text style={styles.emptyText}>
              {t("superadmin.companies.empty")}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateCompany")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>

      {/* Detail Modal */}
      <CompanyDetailModal
        visible={showDetailModal}
        company={selectedCompany}
        STATUS_COLORS={STATUS_COLORS}
        TIER_COLORS={TIER_COLORS}
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
        TIER_COLORS={TIER_COLORS}
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

// ------------------------------------
// SUB COMPONENTS (theme-aware)
// ------------------------------------
const SummaryCard = ({ label, value, icon, color }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={20} color={color || COLORS.PRIMARY} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
};

// ============================================
// CompanyDetailModal
// ============================================
const CompanyDetailModal = ({
  visible,
  company,
  STATUS_COLORS,
  TIER_COLORS,
  onClose,
  onPayment,
  onSuspend,
  onDelete,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [activeTab, setActiveTab] = useState("general");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && company) {
      setActiveTab("general");
      loadDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, company?.id]);

  const loadDetail = async () => {
    if (!company?.id) return;
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
    STATUS_COLORS?.[company.subscription_status] || STATUS_COLORS?.active;
  const tier = TIER_COLORS?.[company.subscription_tier] || TIER_COLORS?.starter;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} numberOfLines={1}>
            {company.name}
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
            <Ionicons
              name="close"
              size={24}
              color={COLORS.TEXT ?? COLORS.DEFAULT}
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {[
            { key: "general", label: t("superadmin.companies.tabGeneral") },
            {
              key: "subscription",
              label: t("superadmin.companies.tabSubscription"),
            },
            { key: "devices", label: t("superadmin.companies.tabDevices") },
            { key: "history", label: t("superadmin.companies.tabHistory") },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
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

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.PRIMARY}
              style={{ marginTop: 40 }}
            />
          ) : (
            <>
              {/* Genel Tab */}
              {activeTab === "general" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>
                    {t("superadmin.companies.companyInfo")}
                  </Text>
                  <InfoRow
                    label={t("superadmin.companies.companyName")}
                    value={company.name}
                  />
                  <InfoRow
                    label={t("auth.email")}
                    value={company.email}
                  />
                  <InfoRow
                    label={t("superadmin.create.phone")}
                    value={company.phone}
                  />
                  <InfoRow
                    label={t("superadmin.create.city")}
                    value={company.city}
                  />
                  <InfoRow
                    label={t("superadmin.create.taxId")}
                    value={company.tax_id}
                  />

                  {detail?.admin && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                        {t("superadmin.companies.adminInfo")}
                      </Text>
                      <InfoRow
                        label={t("superadmin.create.firstName")}
                        value={
                          detail.admin.first_name
                            ? `${detail.admin.first_name} ${detail.admin.last_name || ""}`.trim()
                            : "-"
                        }
                      />
                      <InfoRow
                        label={t("auth.email")}
                        value={detail.admin.email}
                      />
                      <InfoRow
                        label={t("superadmin.create.phone")}
                        value={detail.admin.phone}
                      />
                    </>
                  )}

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    {t("superadmin.companies.usage")}
                  </Text>
                  <UsageBar
                    label={t("navigation.vehicles")}
                    current={detail?.usage?.vehicles?.current || 0}
                    max={detail?.usage?.vehicles?.max || 10}
                  />
                  <UsageBar
                    label={t("navigation.drivers")}
                    current={detail?.usage?.drivers?.current || 0}
                    max={detail?.usage?.drivers?.max || 15}
                  />
                </View>
              )}

              {/* Abonelik Tab */}
              {activeTab === "subscription" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>
                    {t("superadmin.companies.packageStatus")}
                  </Text>

                  <View style={styles.infoRowWithBadge}>
                    <Text style={styles.infoLabel}>
                      {t("superadmin.companies.package")}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: tier.bg }]}>
                      <Text style={[styles.badgeText, { color: tier.text }]}>
                        {tier.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRowWithBadge}>
                    <Text style={styles.infoLabel}>
                      {t("superadmin.companies.status")}
                    </Text>
                    <View
                      style={[styles.badge, { backgroundColor: status.bg }]}
                    >
                      <Text style={[styles.badgeText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <InfoRow
                    label={t("superadmin.companies.vehicleFee")}
                    value={`€${company.per_vehicle_fee || 0}${t("superadmin.companies.perVehicle")}`}
                  />
                  <InfoRow
                    label={t("superadmin.companies.monthlyTotal")}
                    value={`€${company.monthly_fee || 0}`}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                    {t("superadmin.companies.dates")}
                  </Text>
                  <InfoRow
                    label={t("superadmin.companies.startDate")}
                    value={formatDate(company.subscription_starts_at)}
                  />
                  <InfoRow
                    label={t("superadmin.companies.lastPayment")}
                    value={formatDate(company.last_payment_at)}
                  />
                  <InfoRow
                    label={t("superadmin.companies.nextPayment")}
                    value={formatDate(company.next_payment_due)}
                  />

                  {detail?.recent_payments?.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                        {t("superadmin.companies.recentPayments")}
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
                            color={COLORS.SUCCESS}
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
                    {t("superadmin.companies.assignedDevices", {
                      count: detail?.devices?.length || 0,
                    })}
                  </Text>

                  {detail?.devices?.map((device) => {
                    const isActive = device.status === "active";
                    const chipBg = withAlpha(
                      isActive ? COLORS.SUCCESS : COLORS.ERROR,
                      0.14
                    );
                    const chipText = isActive ? COLORS.SUCCESS : COLORS.ERROR;

                    return (
                      <View key={device.id} style={styles.deviceRow}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.deviceCode}>
                            {device.serial || device.device_code}
                          </Text>
                          <Text style={styles.devicePlate}>
                            {device.plate_no ||
                              t("superadmin.devices.unassigned")}
                          </Text>
                        </View>

                        <View
                          style={[styles.badge, { backgroundColor: chipBg }]}
                        >
                          <Text style={[styles.badgeText, { color: chipText }]}>
                            {isActive
                              ? t("superadmin.devices.online")
                              : t("superadmin.devices.offline")}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {(!detail?.devices || detail.devices.length === 0) && (
                    <Text style={styles.emptyText}>
                      {t("superadmin.companies.deviceEmpty")}
                    </Text>
                  )}
                </View>
              )}

              {/* Geçmiş Tab */}
              {activeTab === "history" && (
                <View style={styles.tabContent}>
                  <Text style={styles.sectionTitle}>
                    {t("superadmin.companies.changeHistory")}
                  </Text>

                  {detail?.audit_logs?.map((log) => (
                    <View key={log.id} style={styles.auditRow}>
                      <View style={styles.auditDot} />
                      <View style={styles.auditContent}>
                        <Text style={styles.auditAction}>
                          {formatAction(log.action, t)}
                        </Text>
                        <Text style={styles.auditMeta}>
                          {formatDate(log.created_at)} •{" "}
                          {log.changed_by_name ||
                            t("superadmin.companies.system")}
                        </Text>
                        {log.reason ? (
                          <Text style={styles.auditReason}>{log.reason}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}

                  {(!detail?.audit_logs || detail.audit_logs.length === 0) && (
                    <Text style={styles.emptyText}>
                      {t("superadmin.companies.historyEmpty")}
                    </Text>
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
            activeOpacity={0.85}
          >
            <Ionicons name="card" size={18} color={COLORS.WHITE} />
            <Text style={styles.modalBtnText}>
              {t("superadmin.companies.payment")}
            </Text>
          </TouchableOpacity>

          {company.subscription_status !== "suspended" ? (
            <TouchableOpacity
              style={[styles.modalBtn, styles.warningBtn]}
              onPress={onSuspend}
              activeOpacity={0.85}
            >
              <Ionicons name="pause" size={18} color={COLORS.WHITE} />
              <Text style={styles.modalBtnText}>
                {t("superadmin.companies.suspend")}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            style={[styles.modalBtn, styles.dangerBtn]}
            onPress={onDelete}
            activeOpacity={0.85}
          >
            <Ionicons name="trash" size={18} color={COLORS.WHITE} />
            <Text style={styles.modalBtnText}>{t("common.delete")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ============================================
// PaymentModal
// ============================================
const PaymentModal = ({
  visible,
  company,
  TIER_COLORS,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
      setInvoiceNumber("");
      setNotes("");
      setPaymentMethod("bank_transfer");
    }
  }, [visible, company]);

  const handleSubmit = async () => {
    if (!amount || !periodStart || !periodEnd) {
      Alert.alert(
        t("common.error"),
        t("superadmin.companies.amountPeriodRequired")
      );
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
        Alert.alert(t("common.success"), t("superadmin.companies.paymentSaved"));
        onSuccess();
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert(
          t("common.error"),
          errorData.error || t("superadmin.companies.paymentSaveFailed")
        );
      }
    } catch (error) {
      Alert.alert(t("common.error"), t("superadmin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  if (!company) return null;

  const tier = TIER_COLORS?.[company.subscription_tier] || TIER_COLORS?.starter;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {t("superadmin.companies.savePayment")}
          </Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.85}>
            <Ionicons
              name="close"
              size={24}
              color={COLORS.TEXT ?? COLORS.DEFAULT}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.paymentCompanyName}>{company.name}</Text>

          <View style={styles.calculatedFee}>
            <Text style={styles.calculatedFeeText}>
              {t("superadmin.companies.feeFormula", {
                count: company.vehicle_count || 0,
                unit: t("superadmin.companies.vehicle"),
                fee: company.per_vehicle_fee || 0,
                total:
                  (company.vehicle_count || 0) * (company.per_vehicle_fee || 0),
              })}
            </Text>
            <Text style={styles.calculatedFeeTier}>
              {t("superadmin.companies.packageTag", { label: tier.label })}
            </Text>
          </View>

          <Text style={styles.inputLabel}>
            {t("superadmin.companies.amountEur")}
          </Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={COLORS.PLACEHOLDER}
          />

          <Text style={styles.inputLabel}>
            {t("superadmin.companies.paymentMethod")}
          </Text>
          <View style={styles.methodContainer}>
            {[
              {
                key: "bank_transfer",
                label: t("superadmin.companies.payHavale"),
              },
              { key: "credit_card", label: t("superadmin.companies.payCard") },
              { key: "invoice", label: t("superadmin.companies.payInvoice") },
            ].map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[
                  styles.methodBtn,
                  paymentMethod === method.key && styles.methodBtnActive,
                ]}
                onPress={() => setPaymentMethod(method.key)}
                activeOpacity={0.85}
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
              <Text style={styles.inputLabel}>
                {t("superadmin.companies.periodStart")}
              </Text>
              <TextInput
                style={styles.input}
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
            <View style={styles.periodField}>
              <Text style={styles.inputLabel}>
                {t("superadmin.companies.periodEnd")}
              </Text>
              <TextInput
                style={styles.input}
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>
            {t("superadmin.companies.invoiceNo")}
          </Text>
          <TextInput
            style={styles.input}
            value={invoiceNumber}
            onChangeText={setInvoiceNumber}
            placeholder="INV-2026-001"
            placeholderTextColor={COLORS.PLACEHOLDER}
          />

          <Text style={styles.inputLabel}>
            {t("superadmin.companies.noteOptional")}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t("superadmin.companies.notePlaceholder")}
            placeholderTextColor={COLORS.PLACEHOLDER}
            multiline
            numberOfLines={3}
          />
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalBtn, styles.cancelBtn]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modalBtn,
              styles.successBtn,
              loading && styles.disabledBtn,
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={COLORS.WHITE} />
                <Text style={styles.modalBtnText}>{t("common.save")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Helper components
const InfoRow = ({ label, value }) => {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
};

const UsageBar = ({ label, current, max }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const barColor =
    percentage > 80
      ? COLORS.ERROR
      : percentage > 50
        ? COLORS.WARNING
        : COLORS.SUCCESS;

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
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
};

// Helper functions
const formatDateISO = (date) => date.toISOString().split("T")[0];

const ACTION_I18N_KEYS = {
  payment_received: "superadmin.companies.actionPaymentReceived",
  suspended: "superadmin.companies.actionSuspended",
  tier_changed: "superadmin.companies.actionTierChanged",
  trial_extended: "superadmin.companies.actionTrialExtended",
  company_created: "superadmin.companies.actionCreated",
  activated: "superadmin.companies.actionActivated",
};

const formatAction = (action, t) => {
  const key = ACTION_I18N_KEYS[action];
  return key ? t(key) : action;
};

export default CompaniesScreen;
