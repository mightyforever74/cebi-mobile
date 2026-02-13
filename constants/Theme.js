// constants/Theme.js
// TulipFleet - Argon Design System Extended
// Updated: 11 Şubat 2026 - Modern UI tokens (v2 - Theme-aware)
//
// ÖNEMLİ: Bu dosya TEK KAYNAK (single source of truth)
// Tüm renkler, spacing, shadow, typography buradan gelir!
// HARDCODED HEX YASAK - Tüm renkler LIGHT/DARK_COLORS'dan türetilir!

// ==============================================
// SPACING SYSTEM (8px grid - STRICT)
// ==============================================
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  // Semantic aliases (hepsi 8px grid'e uyumlu)
  cardPadding: 16,
  cardMargin: 16,
  sectionGap: 24,
  inputHeight: 48,
  buttonHeight: 48,
  headerPadding: 24, // 8'in katı
  screenPadding: 16,
};

// ==============================================
// BORDER RADIUS
// ==============================================
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
  // Semantic aliases
  card: 12,
  button: 8,
  input: 8,
  avatar: 9999,
  badge: 12,
  modal: 16,
};

// ==============================================
// TYPOGRAPHY
// ==============================================
export const TYPOGRAPHY = {
  // Font weights (string for RN compatibility)
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  // Font sizes
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    h3: 22,
    h2: 26,
    h1: 32,
  },
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  // Pre-built text styles
  styles: {
    h1: {
      fontSize: 32,
      fontWeight: "700",
      lineHeight: 40,
    },
    h2: {
      fontSize: 26,
      fontWeight: "700",
      lineHeight: 34,
    },
    h3: {
      fontSize: 22,
      fontWeight: "600",
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: "600",
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: "400",
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: "400",
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: "400",
      lineHeight: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
    button: {
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 20,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
  },
};

// ==============================================
// LIGHT MODE COLORS
// ==============================================
export const LIGHT_COLORS = {
  // === Argon Orijinal (KORUNDU) ===
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
  GRADIENT_START: "#5E72E4",
  GRADIENT_END: "#825EE4",
  PRICE_COLOR: "#EAD5FB",
  BORDER_COLOR: "#E7E7E7",
  BLOCK: "#E7E7E7",
  ICON: "#172B4D",
  HEADER: "#525F7F",
  BORDER: "#CAD1D7",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  WHITE_80: "rgba(255,255,255,0.8)",
  WHITE_20: "rgba(255,255,255,0.2)",
  TWITTER: "#1DA1F2",
  FACEBOOK: "#3B5999",
  DRIBBBLE: "#EA4C89",

  // === Dark Mode token'ları (KORUNDU) ===
  BACKGROUND: "#F4F5F7",
  SURFACE: "#FFFFFF",
  CARD: "#FFFFFF",
  TEXT_PRIMARY: "#32325D",
  TEXT_SECONDARY: "#525F7F",
  TEXT_MUTED: "#8898AA",
  DIVIDER: "#E9ECEF",
  OVERLAY: "rgba(0, 0, 0, 0.5)",
  SHADOW: "#000000",

  // === Status Bar ===
  STATUS_BAR_STYLE: "dark-content",
  STATUS_BAR_BG: "#F4F5F7",

  // === Semantic Colors ===
  CARD_BORDER: "#E9ECEF",
  INPUT_BG: "#FFFFFF",
  INPUT_BORDER: "#CAD1D7",
  INPUT_FOCUS_BORDER: "#5E72E4",
  DISABLED: "#ADB5BD",
  DISABLED_BG: "#E9ECEF",
  LINK: "#5E72E4",

  // === Status Colors ===
  SUCCESS_LIGHT: "#D4EDDA",
  WARNING_LIGHT: "#FFF3CD",
  ERROR_LIGHT: "#F8D7DA",
  INFO_LIGHT: "#D1ECF1",
};

// ==============================================
// DARK MODE COLORS
// ==============================================
export const DARK_COLORS = {
  // === Argon karşılıkları (KORUNDU) ===
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
  GRADIENT_START: "#818CF8",
  GRADIENT_END: "#A78BFA",
  PRICE_COLOR: "#4C1D95",
  BORDER_COLOR: "#334155",
  BLOCK: "#334155",
  ICON: "#E2E8F0",
  HEADER: "#CBD5E1",
  BORDER: "#475569",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  WHITE_80: "rgba(255,255,255,0.8)",
  WHITE_20: "rgba(255,255,255,0.2)",
  TWITTER: "#1DA1F2",
  FACEBOOK: "#3B5999",
  DRIBBBLE: "#EA4C89",

  // === Dark Mode token'ları (KORUNDU) ===
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

  // === Semantic Colors ===
  CARD_BORDER: "#334155",
  INPUT_BG: "#1E293B",
  INPUT_BORDER: "#475569",
  INPUT_FOCUS_BORDER: "#818CF8",
  DISABLED: "#475569",
  DISABLED_BG: "#1E293B",
  LINK: "#818CF8",

  // === Status Colors ===
  SUCCESS_LIGHT: "rgba(52, 211, 153, 0.2)",
  WARNING_LIGHT: "rgba(251, 191, 36, 0.2)",
  ERROR_LIGHT: "rgba(248, 113, 113, 0.2)",
  INFO_LIGHT: "rgba(56, 189, 248, 0.2)",
};

// ==============================================
// SHADOWS FACTORY (Theme-aware - NO hardcoded hex!)
// ==============================================
export const createShadows = (base) => {
  const shadowColor = base.SHADOW || base.BLACK;

  return {
    none: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    // Semantic presets
    card: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    button: {
      shadowColor: base.PRIMARY, // Theme-aware!
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    header: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    modal: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 10,
    },
  };
};

// ==============================================
// GRADIENTS FACTORY (Theme-aware - NO hardcoded hex!)
// ==============================================
export const createGradients = (base) => ({
  primary: {
    colors: [base.GRADIENT_START, base.GRADIENT_END],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  primaryHorizontal: {
    colors: [base.GRADIENT_START, base.GRADIENT_END],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  success: {
    colors: [base.SUCCESS, base.INFO],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  warning: {
    colors: [base.WARNING, base.ERROR],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  info: {
    colors: [base.INFO, base.PRIMARY],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  error: {
    colors: [base.ERROR, base.LABEL],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  dark: {
    colors: [base.DEFAULT, base.SECONDARY],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  // Header gradients
  header: {
    colors: [base.GRADIENT_START, base.GRADIENT_END],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
  headerSuccess: {
    colors: [base.SUCCESS, base.INFO],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
});

// ==============================================
// COMMON STYLES FACTORY (Theme-aware)
// ==============================================
export const createCommonStyles = (base, shadows) => ({
  // Card preset
  card: {
    backgroundColor: base.CARD,
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    borderWidth: 1,
    borderColor: base.CARD_BORDER,
    ...shadows.card,
  },
  // Card without border
  cardElevated: {
    backgroundColor: base.CARD,
    borderRadius: RADIUS.card,
    padding: SPACING.cardPadding,
    ...shadows.md,
  },
  // Button presets
  buttonPrimary: {
    height: SPACING.buttonHeight,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.lg,
    backgroundColor: base.PRIMARY,
    ...shadows.button,
  },
  buttonOutline: {
    height: SPACING.buttonHeight,
    borderRadius: RADIUS.button,
    borderWidth: 1,
    borderColor: base.PRIMARY,
    paddingHorizontal: SPACING.lg,
    backgroundColor: "transparent",
  },
  buttonSecondary: {
    height: SPACING.buttonHeight,
    borderRadius: RADIUS.button,
    paddingHorizontal: SPACING.lg,
    backgroundColor: base.SECONDARY,
  },
  // Input preset
  input: {
    height: SPACING.inputHeight,
    borderRadius: RADIUS.input,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: base.INPUT_BORDER,
    backgroundColor: base.INPUT_BG,
  },
  inputFocused: {
    borderColor: base.INPUT_FOCUS_BORDER,
  },
  inputError: {
    borderColor: base.ERROR,
    backgroundColor: base.ERROR_LIGHT,
  },
  // Avatar sizes
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarMd: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarXl: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: base.DIVIDER,
    marginVertical: SPACING.md,
  },
  // Section container
  section: {
    marginBottom: SPACING.sectionGap,
  },
  // Screen container
  screenContainer: {
    flex: 1,
    backgroundColor: base.BACKGROUND,
    padding: SPACING.screenPadding,
  },
});

// ==============================================
// DEFAULT EXPORT (Geriye uyumluluk için)
// ==============================================
export default {
  COLORS: LIGHT_COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
};

// ==============================================
// HELPER: Tema seçici (GENİŞLETİLDİ + THEME-AWARE)
// ==============================================
export const getColors = (isDark) => {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Theme-aware factories
  const SHADOWS = createShadows(colors);
  const GRADIENTS = createGradients(colors);
  const COMMON_STYLES = createCommonStyles(colors, SHADOWS);

  return {
    ...colors,
    // Static tokens
    SPACING,
    RADIUS,
    TYPOGRAPHY,
    // Theme-aware tokens
    SHADOWS,
    GRADIENTS,
    COMMON_STYLES,
  };
};

// ==============================================
// HELPER: Dinamik shadow (opsiyonel kullanım)
// ==============================================
export const getShadow = (size = "md", isDark = false) => {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const shadows = createShadows(colors);
  return shadows[size] || shadows.md;
};

// ==============================================
// HELPER: Gradient alma (opsiyonel kullanım)
// ==============================================
export const getGradient = (name = "primary", isDark = false) => {
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const gradients = createGradients(colors);
  return gradients[name] || gradients.primary;
};
