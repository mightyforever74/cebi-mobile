// src/screens/driver/DriverSOSScreen.js
// TulipFleet — Acil Durum / SOS Ekranı
// v1.1.0 — 9 Nisan 2026

import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { driverAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

// ============================================================================
// STYLES
// ============================================================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    scrollContent: {
      padding: COLORS.SPACING.md,
      paddingBottom: COLORS.SPACING.xl,
    },
    // Uyarı banner
    warningBanner: {
      backgroundColor: withAlpha(COLORS.WARNING, 0.12),
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.WARNING, 0.4),
      padding: COLORS.SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    warningIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    warningText: {
      flex: 1,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.WARNING,
      fontWeight: "500",
    },
    // Acil ara butonu
    callButton: {
      backgroundColor: COLORS.ERROR,
      borderRadius: COLORS.RADIUS.lg,
      padding: COLORS.SPACING.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.md,
      shadowColor: COLORS.ERROR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    callButtonIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    callButtonText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: "700",
      color: COLORS.WHITE,
      letterSpacing: 0.5,
    },
    callSubText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    // SOS Gönder butonu
    sosButton: {
      backgroundColor: COLORS.WARNING,
      borderRadius: COLORS.RADIUS.lg,
      padding: COLORS.SPACING.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.sm,
    },
    sosButtonDisabled: {
      opacity: 0.5,
    },
    sosButtonIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    sosButtonText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: "700",
      color: COLORS.WHITE,
    },
    // SOS gönderildi durumu
    sosSentCard: {
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.1),
      borderRadius: COLORS.RADIUS.lg,
      borderWidth: 1,
      borderColor: withAlpha(COLORS.SUCCESS, 0.4),
      padding: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.md,
      alignItems: "center",
    },
    sosSentIcon: {
      marginBottom: COLORS.SPACING.sm,
    },
    sosSentTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: "700",
      color: COLORS.SUCCESS,
      marginBottom: COLORS.SPACING.xs,
    },
    sosSentDesc: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.xs,
    },
    // Geri al butonu
    cancelButton: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      marginBottom: COLORS.SPACING.lg,
    },
    cancelButtonText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: "500",
    },
    // Bilgi kartları
    infoSection: {
      marginTop: COLORS.SPACING.md,
    },
    infoTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: "600",
      color: COLORS.TEXT_SECONDARY,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: COLORS.SPACING.sm,
    },
    infoCard: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.md,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    infoLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      width: 80,
    },
    infoValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: "500",
      flex: 1,
    },
    // Yükleniyor
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.md,
    },
    loadingText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.sm,
    },
  });

// ============================================================================
// COMPONENT
// ============================================================================
const DriverSOSScreen = () => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();

  const [sosSent, setSosSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sosLocation, setSosLocation] = useState(null);

  const lastSosRef = useRef(null);

  // ─── Acil Ara ───────────────────────────────────────────────────────────────
  const handleCall112 = useCallback(() => {
    Linking.openURL("tel:112").catch(() => {
      Alert.alert(
        t("sos.callError", "Arama Başlatılamadı"),
        t("sos.callErrorDesc", "Lütfen telefonunuzdan 112'yi arayın.")
      );
    });
  }, [t]);

  // ─── SOS Gönder ─────────────────────────────────────────────────────────────
  const handleSendSOS = useCallback(async () => {
    if (sosSent || sending) return;

    const now = Date.now();
    if (lastSosRef.current && now - lastSosRef.current < 60000) {
      Alert.alert(
        t("sos.rateLimitTitle", "Çok Hızlı"),
        t("sos.rateLimitDesc", "Lütfen 60 saniye bekleyip tekrar deneyin.")
      );
      return;
    }

    setSending(true);

    try {
      let latitude = null;
      let longitude = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 5000,
        }).catch(() => null);

        if (loc) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
          setSosLocation({ latitude, longitude });
        }
      }

      await driverAPI.sendSOS({ latitude, longitude });

      lastSosRef.current = Date.now();
      setSosSent(true);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429) {
        Alert.alert(
          t("sos.rateLimitTitle", "Çok Hızlı"),
          t("sos.rateLimitDesc", "Lütfen 60 saniye bekleyip tekrar deneyin.")
        );
      } else {
        Alert.alert(
          t("sos.errorTitle", "SOS Gönderilemedi"),
          t("sos.errorDesc", "Lütfen 112'yi arayın veya internet bağlantınızı kontrol edin.")
        );
      }
    } finally {
      setSending(false);
    }
  }, [sosSent, sending, t]);

  // ─── SOS Geri Al ────────────────────────────────────────────────────────────
  const handleCancel = useCallback(() => {
    Alert.alert(
      t("sos.cancelTitle", "SOS İptal"),
      t("sos.cancelDesc", "SOS sinyali geri alınacak. Emin misiniz?"),
      [
        { text: t("common.cancel", "Vazgeç"), style: "cancel" },
        {
          text: t("sos.cancelConfirm", "Evet, İptal Et"),
          style: "destructive",
          onPress: () => {
            setSosSent(false);
            setSosLocation(null);
            lastSosRef.current = null;
          },
        },
      ]
    );
  }, [t]);

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Uyarı Banner */}
      <View style={styles.warningBanner}>
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={COLORS.WARNING}
          style={styles.warningIcon}
        />
        <Text style={styles.warningText}>
          {t(
            "sos.warningText",
            "Bu ekran yalnızca gerçek acil durumlar için kullanın. Yanlış alarm bildirilmesi yasaldır."
          )}
        </Text>
      </View>

      {/* Acil Ara Butonu */}
      <TouchableOpacity
        style={styles.callButton}
        onPress={handleCall112}
        activeOpacity={0.85}
      >
        <Ionicons
          name="call"
          size={28}
          color={COLORS.WHITE}
          style={styles.callButtonIcon}
        />
        <Text style={styles.callButtonText}>
          {t("sos.callButton", "Acil Ara — 112")}
        </Text>
      </TouchableOpacity>
      <Text style={styles.callSubText}>
        {t(
          "sos.callSubText",
          "Telefon uygulaması açılır, siz arama başlatırsınız"
        )}
      </Text>

      {/* SOS Gönderildi Durumu */}
      {sosSent ? (
        <>
          <View style={styles.sosSentCard}>
            <Ionicons
              name="checkmark-circle"
              size={40}
              color={COLORS.SUCCESS}
              style={styles.sosSentIcon}
            />
            <Text style={styles.sosSentTitle}>
              {t("sos.sentTitle", "SOS Gönderildi")}
            </Text>
            <Text style={styles.sosSentDesc}>
              {t("sos.sentDesc", "Yöneticiniz bilgilendirildi. Yardım yolda.")}
            </Text>
            {sosLocation && (
              <Text style={styles.sosSentDesc}>
                {"\uD83D\uDCCD"} {sosLocation.latitude.toFixed(5)},{" "}
                {sosLocation.longitude.toFixed(5)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>
              {t("sos.cancelButton", "SOS Sinyalini Geri Al")}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {sending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.WARNING} />
              <Text style={styles.loadingText}>
                {t(
                  "sos.sending",
                  "Konum alınıyor ve SOS gönderiliyor..."
                )}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.sosButton,
                sosSent && styles.sosButtonDisabled,
              ]}
              onPress={handleSendSOS}
              activeOpacity={0.85}
              disabled={sosSent || sending}
            >
              <Ionicons
                name="warning"
                size={24}
                color={COLORS.WHITE}
                style={styles.sosButtonIcon}
              />
              <Text style={styles.sosButtonText}>
                {t("sos.sendButton", "SOS Gönder — Yöneticiye Bildir")}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Bilgi Bölümü */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>
          {t("sos.infoTitle", "Sürücü Bilgileri")}
        </Text>
        <View style={styles.infoCard}>
          {(user?.first_name || user?.last_name) && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("sos.name", "Ad Soyad")}
              </Text>
              <Text style={styles.infoValue}>
                {[user.first_name, user.last_name].filter(Boolean).join(" ")}
              </Text>
            </View>
          )}
          {user?.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("sos.email", "E-posta")}
              </Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default DriverSOSScreen;
