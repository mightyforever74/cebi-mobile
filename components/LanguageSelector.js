// src/components/LanguageSelector.js
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { LANGUAGES } from "../locales/i18n";

// --- helper: #RRGGBB => #RRGGBBAA (overlay/soft bg için) ---
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
    selector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.25) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    label: {
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      fontWeight: "500",
    },
    valueContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    flag: {
      fontSize: 20,
      marginRight: 8,
    },
    value: {
      fontSize: 14,
      color: COLORS.MUTED,
    },
    arrow: {
      fontSize: 20,
      color: COLORS.MUTED,
      marginLeft: 8,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: withAlpha(COLORS.BLACK, 0.5),
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE ?? COLORS.CARD ?? COLORS.WHITE,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "70%",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER ?? COLORS.BORDER,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      textAlign: "center",
      marginBottom: 16,
    },

    langItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: withAlpha(COLORS.SECONDARY, 0.65),
      borderWidth: 1,
      borderColor:
        withAlpha(COLORS.BORDER, 0.2) || (COLORS.DIVIDER ?? COLORS.BORDER),
    },
    langItemActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    langFlag: {
      fontSize: 24,
      marginRight: 12,
    },
    langName: {
      fontSize: 16,
      color: COLORS.TEXT ?? COLORS.DEFAULT,
      flex: 1,
    },
    langNameActive: {
      color: COLORS.WHITE,
      fontWeight: "600",
    },
    checkmark: {
      fontSize: 18,
      color: COLORS.WHITE,
      fontWeight: "bold",
    },

    closeBtn: {
      backgroundColor: COLORS.MUTED,
      padding: 14,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 12,
    },
    closeBtnText: {
      color: COLORS.WHITE,
      fontSize: 16,
      fontWeight: "600",
    },
  });

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = useMemo(
    () => LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0],
    [i18n.language]
  );

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.label}>{t("settings.language")}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.flag}>{currentLang.flag}</Text>
          <Text style={styles.value}>{currentLang.name}</Text>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("settings.selectLanguage")}
            </Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const active = item.code === i18n.language;
                return (
                  <TouchableOpacity
                    style={[styles.langItem, active && styles.langItemActive]}
                    onPress={() => changeLanguage(item.code)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.langFlag}>{item.flag}</Text>
                    <Text
                      style={[styles.langName, active && styles.langNameActive]}
                    >
                      {item.name}
                    </Text>
                    {active && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LanguageSelector;
