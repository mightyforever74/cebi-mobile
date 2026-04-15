// src/locales/i18n.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import bg from "./bg.json";
import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import it from "./it.json";
import ku from "./ku.json";
import nl from "./nl.json";
import tr from "./tr.json";

const STORAGE_KEY = "tulipfleet_language";

// Desteklenen diller
export const LANGUAGES = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" }, // ← ekle
  { code: "fr", name: "Français", flag: "🇫🇷" }, // ← ekle
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ku", name: "Kurdî", flag: "🟢" },
];

const languageDetector = {
  type: "languageDetector",
  async: true,
  detect: async (callback) => {
    try {
      const savedLang = await AsyncStorage.getItem(STORAGE_KEY);
      callback(savedLang || "tr");
    } catch (e) {
      callback("tr");
    }
  },
  init: () => {},
  cacheUserLanguage: async (lang) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v3",
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      ku: { translation: ku },
      nl: { translation: nl },
      it: { translation: it },
      bg: { translation: bg },
      es: { translation: es },
      de: { translation: de },
      fr: { translation: fr },
    },
    fallbackLng: "tr",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
