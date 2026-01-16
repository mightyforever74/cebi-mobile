// src/components/LanguageSelector.js
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LANGUAGES } from "../locales/i18n";

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang =
    LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langItem,
                    item.code === i18n.language && styles.langItemActive,
                  ]}
                  onPress={() => changeLanguage(item.code)}
                >
                  <Text style={styles.langFlag}>{item.flag}</Text>
                  <Text
                    style={[
                      styles.langName,
                      item.code === i18n.language && styles.langNameActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.code === i18n.language && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: "#32325D",
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
    color: "#8898AA",
  },
  arrow: {
    fontSize: 20,
    color: "#8898AA",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
    textAlign: "center",
    marginBottom: 16,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F7FAFC",
  },
  langItemActive: {
    backgroundColor: "#5E72E4",
  },
  langFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  langName: {
    fontSize: 16,
    color: "#32325D",
    flex: 1,
  },
  langNameActive: {
    color: "#FFF",
    fontWeight: "600",
  },
  checkmark: {
    fontSize: 18,
    color: "#FFF",
    fontWeight: "bold",
  },
  closeBtn: {
    backgroundColor: "#8898AA",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default LanguageSelector;
