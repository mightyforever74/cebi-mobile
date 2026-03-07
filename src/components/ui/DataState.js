// src/components/ui/DataState.js
// TulipFleet - Data State Wrapper
// Phase 0 - Component Library
// UI Guide v3 compliant

import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

/**
 * DataState - 4 state wrapper: loading / empty / error / data
 *
 * @param {boolean} loading      - Yükleniyor mu?
 * @param {boolean} empty        - Veri yok mu?
 * @param {string|object} error  - Hata var mı?
 * @param {string} emptyIcon     - Boş durum ikonu (Ionicons)
 * @param {string} emptyTitle    - Boş durum başlığı
 * @param {string} emptyMessage  - Boş durum açıklama
 * @param {string} errorMessage  - Hata mesajı (override)
 * @param {Function} onRetry     - Yeniden dene butonu callback
 * @param {string} retryLabel    - Yeniden dene buton metni
 * @param {ReactNode} children   - Data state içeriği
 *
 * @example
 * <DataState
 *   loading={loading}
 *   error={error}
 *   empty={vehicles.length === 0}
 *   emptyIcon="car-outline"
 *   emptyTitle="Araç Yok"
 *   emptyMessage="Henüz araç eklenmemiş."
 *   onRetry={fetchVehicles}
 * >
 *   <VehicleList vehicles={vehicles} />
 * </DataState>
 */
export default function DataState({
  loading = false,
  empty = false,
  error = null,
  emptyIcon = "file-tray-outline",
  emptyTitle = "Veri Bulunamadı",
  emptyMessage,
  errorMessage,
  onRetry,
  retryLabel = "Yeniden Dene",
  children,
}) {
  const { COLORS } = useTheme();

  // 1. LOADING
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  // 2. ERROR
  if (error) {
    const message =
      errorMessage ||
      (typeof error === "string"
        ? error
        : error?.response?.data?.error || error?.message || "Bir hata oluştu.");

    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={COLORS.ERROR}
          style={styles.icon}
        />
        <Text
          style={[
            styles.title,
            { color: COLORS.TEXT },
          ]}
        >
          Hata
        </Text>
        <Text
          style={[styles.message, { color: COLORS.MUTED }]}
        >
          {message}
        </Text>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: COLORS.ERROR }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.WHITE} />
            <Text style={[styles.retryText, { color: COLORS.WHITE }]}>
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. EMPTY
  if (empty) {
    return (
      <View style={styles.center}>
        <Ionicons
          name={emptyIcon}
          size={52}
          color={COLORS.MUTED}
          style={styles.icon}
        />
        <Text style={[styles.title, { color: COLORS.TEXT }]}>
          {emptyTitle}
        </Text>
        {emptyMessage && (
          <Text style={[styles.message, { color: COLORS.MUTED }]}>
            {emptyMessage}
          </Text>
        )}
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: COLORS.PRIMARY }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.WHITE} />
            <Text style={[styles.retryText, { color: COLORS.WHITE }]}>
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 4. DATA
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 200,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.7,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
