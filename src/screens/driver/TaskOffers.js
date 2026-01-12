// src/screens/driver/TaskOffers.js
// TulipFleet - Driver Task Offers Inbox
// v2.0 - Retry + Error Handling + User Feedback

import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../constants/config";
import { taskOffersAPI } from "../../services/api";

// 🆕 Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 saniye
  maxDelay: 10000, // 10 saniye
};

const TaskOffers = () => {
  const navigation = useNavigation();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");

  // 🆕 Error state
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef(null);

  // 🆕 Exponential backoff delay calculator
  const getRetryDelay = (attempt) => {
    const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, RETRY_CONFIG.maxDelay);
  };

  // 🆕 Enhanced fetch with retry
  const fetchOffers = useCallback(
    async (isRetry = false) => {
      try {
        if (!isRetry) {
          setError(null);
          setRetryCount(0);
        }

        const status = filter === "all" ? null : filter;
        const response = await taskOffersAPI.getOffers(status);

        // ✅ Başarılı - state'leri temizle
        setOffers(response.offers || []);
        setError(null);
        setRetryCount(0);
      } catch (err) {
        console.error("[TaskOffers] Fetch error:", err);

        const statusCode = err.response?.status;
        const isServerError = statusCode >= 500;
        const isNetworkError =
          !err.response && err.message?.includes("Network");

        // 🔄 Retry logic for server/network errors
        if (
          (isServerError || isNetworkError) &&
          retryCount < RETRY_CONFIG.maxAttempts
        ) {
          const nextRetry = retryCount + 1;
          const delay = getRetryDelay(retryCount);

          console.log(
            `[TaskOffers] Retry ${nextRetry}/${RETRY_CONFIG.maxAttempts} in ${delay}ms`
          );
          setRetryCount(nextRetry);
          setError(
            `Bağlantı sorunu, tekrar deneniyor... (${nextRetry}/${RETRY_CONFIG.maxAttempts})`
          );

          retryTimeoutRef.current = setTimeout(() => {
            fetchOffers(true);
          }, delay);
        } else {
          // ❌ Max retry reached or client error
          setError(getErrorMessage(err));
          setOffers([]); // Fallback to empty
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, retryCount]
  );

  // 🆕 User-friendly error messages
  const getErrorMessage = (err) => {
    const statusCode = err.response?.status;

    switch (statusCode) {
      case 401:
        return "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
      case 403:
        return "Bu işlem için yetkiniz bulunmuyor.";
      case 404:
        return "Teklifler bulunamadı.";
      case 500:
      case 502:
      case 503:
        return "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
      default:
        if (!err.response) {
          return "İnternet bağlantınızı kontrol edin.";
        }
        return "Bir hata oluştu. Lütfen tekrar deneyin.";
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [filter]); // filter değişince yeniden fetch (retryCount'u dependency'den çıkardık)

  const onRefresh = () => {
    setRefreshing(true);
    setRetryCount(0); // Manuel refresh'te retry sayacını sıfırla
    fetchOffers();
  };

  // 🆕 Manuel retry button handler
  const handleManualRetry = () => {
    setLoading(true);
    setRetryCount(0);
    fetchOffers();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return COLORS.warning;
      case "accepted":
        return COLORS.success;
      case "rejected":
        return COLORS.danger;
      case "expired":
        return COLORS.textSecondary;
      default:
        return COLORS.info;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Bekliyor";
      case "accepted":
        return "Kabul Edildi";
      case "rejected":
        return "Reddedildi";
      case "expired":
        return "Süresi Doldu";
      default:
        return status;
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case "high":
        return "🔴";
      case "urgent":
        return "🚨";
      default:
        return "🟢";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;

    if (diff <= 0) return "Süresi doldu";

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} dk kaldı`;

    const hours = Math.floor(minutes / 60);
    return `${hours} saat kaldı`;
  };

  const renderOffer = ({ item }) => {
    const timeRemaining =
      item.status === "pending" ? getTimeRemaining(item.expires_at) : null;

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() =>
          navigation.navigate("TaskOfferDetail", { offerId: item.id })
        }
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerTitleRow}>
            <Text style={styles.priorityIcon}>
              {getPriorityIcon(item.priority)}
            </Text>
            <Text style={styles.offerTitle} numberOfLines={1}>
              {item.title || item.task_no || "Görev"}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.offerDetails}>
          {item.start_location && (
            <Text style={styles.detailText}>📍 {item.start_location}</Text>
          )}
          {item.end_location && (
            <Text style={styles.detailText}>🏁 {item.end_location}</Text>
          )}
          {item.vehicle_plate && (
            <Text style={styles.detailText}>🚚 {item.vehicle_plate}</Text>
          )}
        </View>

        <View style={styles.offerFooter}>
          <Text style={styles.dateText}>📅 {formatDate(item.created_at)}</Text>
          {timeRemaining && (
            <Text style={[styles.timeRemaining, { color: COLORS.warning }]}>
              ⏱️ {timeRemaining}
            </Text>
          )}
        </View>

        {item.status === "pending" && (
          <View style={styles.actionHint}>
            <Text style={styles.actionHintText}>Detaylar için dokunun →</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ value, label }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[styles.filterText, filter === value && styles.filterTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // 🆕 Error Banner Component
  const ErrorBanner = () => {
    if (!error) return null;

    const isRetrying = retryCount > 0 && retryCount < RETRY_CONFIG.maxAttempts;

    return (
      <View
        style={[styles.errorBanner, isRetrying && styles.errorBannerRetrying]}
      >
        <Text style={styles.errorIcon}>{isRetrying ? "🔄" : "⚠️"}</Text>
        <Text style={styles.errorText}>{error}</Text>
        {!isRetrying && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleManualRetry}
          >
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Teklifler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🆕 Error Banner */}
      <ErrorBanner />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FilterButton value="pending" label="Bekleyen" />
        <FilterButton value="accepted" label="Kabul" />
        <FilterButton value="rejected" label="Red" />
        <FilterButton value="all" label="Tümü" />
      </View>

      {/* Offers List */}
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOffer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{error ? "😔" : "📭"}</Text>
            <Text style={styles.emptyText}>
              {error
                ? "Teklifler yüklenemedi"
                : filter === "pending"
                ? "Bekleyen teklif yok"
                : "Görev teklifi bulunamadı"}
            </Text>
            {error && (
              <TouchableOpacity
                style={styles.emptyRetryButton}
                onPress={handleManualRetry}
              >
                <Text style={styles.emptyRetryText}>🔄 Tekrar Dene</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // 🆕 Error styles
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  errorBannerRetrying: {
    backgroundColor: "#FEF9C3",
    borderBottomColor: "#FDE68A",
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#991B1B",
  },
  retryButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyRetryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyRetryText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  offerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  offerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  priorityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  offerDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 4,
  },
  offerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeRemaining: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionHint: {
    marginTop: 12,
    alignItems: "flex-end",
  },
  actionHintText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default TaskOffers;
