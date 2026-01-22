// constants/Theme.js
// TulipFleet - Genişletilmiş Argon Theme
// Updated: 22 Ocak 2026 - Dark Mode token'ları eklendi
//
// ÖNEMLİ: Bu dosya TEK KAYNAK (single source of truth)
// Tüm renkler buradan gelir, hardcoded hex YASAK!

// ==============================================
// LIGHT MODE COLORS
// ==============================================
export const LIGHT_COLORS = {
  // === Argon Orijinal ===
  DEFAULT: "#172B4D",
  PRIMARY: "#5E72E4",
  SECONDARY: "#F7FAFC",
  LABEL: "#FE2472",
  INFO: "#11CDEF",
  ERROR: "#F5365C",
  SUCCESS: "#2DCE89",
  WARNING: "#FB6340",
  TEXT: "#32325D",
  MUTED: "#8898AA",
  INPUT: "#DCDCDC",
  INPUT_SUCCESS: "#7BDEB2",
  INPUT_ERROR: "#FCB3A4",
  ACTIVE: "#5E72E4",
  BUTTON_COLOR: "#9C26B0",
  PLACEHOLDER: "#9FA5AA",
  SWITCH_ON: "#5E72E4",
  SWITCH_OFF: "#D4D9DD",
  GRADIENT_START: "#6B24AA",
  GRADIENT_END: "#AC2688",
  PRICE_COLOR: "#EAD5FB",
  BORDER_COLOR: "#E7E7E7",
  BLOCK: "#E7E7E7",
  ICON: "#172B4D",
  HEADER: "#525F7F",
  BORDER: "#CAD1D7",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  TWITTER: "#1DA1F2",
  FACEBOOK: "#3B5999",
  DRIBBBLE: "#EA4C89",

  // === YENİ: Dark Mode için gerekli token'lar ===
  BACKGROUND: "#F4F5F7", // Ekran arka planı
  SURFACE: "#FFFFFF", // Kart/modal arka planı
  CARD: "#FFFFFF", // Kart arka planı (SURFACE ile aynı olabilir)
  TEXT_PRIMARY: "#32325D", // Ana metin (TEXT ile aynı)
  TEXT_SECONDARY: "#525F7F", // Alt metin / açıklama
  TEXT_MUTED: "#8898AA", // Soluk metin (MUTED ile aynı)
  DIVIDER: "#E9ECEF", // Ayırıcı çizgi
  OVERLAY: "rgba(0, 0, 0, 0.5)", // Modal overlay
  SHADOW: "#000000", // Gölge rengi

  // === Status Bar ===
  STATUS_BAR_STYLE: "dark-content",
  STATUS_BAR_BG: "#F4F5F7",
};

// ==============================================
// DARK MODE COLORS
// ==============================================
export const DARK_COLORS = {
  // === Argon karşılıkları ===
  DEFAULT: "#F1F5F9",
  PRIMARY: "#818CF8",
  SECONDARY: "#1E293B",
  LABEL: "#F472B6",
  INFO: "#38BDF8",
  ERROR: "#F87171",
  SUCCESS: "#34D399",
  WARNING: "#FBBF24",
  TEXT: "#F1F5F9",
  MUTED: "#64748B",
  INPUT: "#334155",
  INPUT_SUCCESS: "#34D399",
  INPUT_ERROR: "#F87171",
  ACTIVE: "#818CF8",
  BUTTON_COLOR: "#A855F7",
  PLACEHOLDER: "#64748B",
  SWITCH_ON: "#818CF8",
  SWITCH_OFF: "#475569",
  GRADIENT_START: "#8B5CF6",
  GRADIENT_END: "#D946EF",
  PRICE_COLOR: "#4C1D95",
  BORDER_COLOR: "#334155",
  BLOCK: "#334155",
  ICON: "#E2E8F0",
  HEADER: "#CBD5E1",
  BORDER: "#475569",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  TWITTER: "#1DA1F2",
  FACEBOOK: "#3B5999",
  DRIBBBLE: "#EA4C89",

  // === Dark Mode token'ları ===
  BACKGROUND: "#0F172A",
  SURFACE: "#1E293B",
  CARD: "#1E293B",
  TEXT_PRIMARY: "#F1F5F9",
  TEXT_SECONDARY: "#94A3B8",
  TEXT_MUTED: "#64748B",
  DIVIDER: "#334155",
  OVERLAY: "rgba(0, 0, 0, 0.7)",
  SHADOW: "#000000",

  // === Status Bar ===
  STATUS_BAR_STYLE: "light-content",
  STATUS_BAR_BG: "#0F172A",
};

// ==============================================
// DEFAULT EXPORT (Geriye uyumluluk için)
// ==============================================
export default {
  COLORS: LIGHT_COLORS,
};

// ==============================================
// HELPER: Tema seçici
// ==============================================
export const getColors = (isDark) => (isDark ? DARK_COLORS : LIGHT_COLORS);
