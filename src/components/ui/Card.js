// src/components/ui/Card.js
// TulipFleet - Unified Card Component
// Created: 11 Şubat 2026
//
// TEK KAYNAK: Tüm card stilleri buradan yönetilir
// makeStyles içinde yeni card yazmak YASAK - variant ekle!

import { View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

/**
 * Card Component
 *
 * @param {string} variant - "default" | "elevated" | "flat" | "setup"
 * @param {boolean} noMargin - Tüm margin'leri kaldır
 * @param {boolean} noMarginBottom - Sadece marginBottom: 0
 * @param {boolean} noPadding - Padding'i kaldır
 * @param {object} style - Override stiller (son çare!)
 * @param {ReactNode} children
 *
 * @example
 * // Standart kullanım
 * <Card>...</Card>
 *
 * // Admin dashboard (marginBottom: 0)
 * <Card noMarginBottom>...</Card>
 *
 * // Setup ekranları (farklı radius/elevation)
 * <Card variant="setup">...</Card>
 *
 * // Override (son çare)
 * <Card style={{ marginHorizontal: 8 }}>...</Card>
 */
const Card = ({
  children,
  variant = "default",
  noMargin = false,
  noMarginBottom = false,
  noPadding = false,
  style,
  ...props
}) => {
  const { COLORS } = useTheme();

  // Base card style from theme
  const baseStyle = getVariantStyle(variant, COLORS);

  // Margin overrides (basit ve deterministik)
  const marginStyle = noMargin
    ? { margin: 0 }
    : noMarginBottom
      ? { marginBottom: 0 }
      : null;

  // Padding override
  const paddingStyle = noPadding ? { padding: 0 } : null;

  return (
    <View
      style={[
        baseStyle,
        marginStyle,
        paddingStyle,
        style, // User override (son çare)
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

/**
 * Variant'a göre stil döndür
 * YENİ VARIANT EKLEMEK İÇİN BURAYA GEL!
 *
 * VARIANT MATRİSİ:
 * | Variant     | background | border | shadow   |
 * |-------------|------------|--------|----------|
 * | default     | CARD       | yes    | card (3) |
 * | flat        | CARD       | yes    | none     |
 * | elevated    | CARD       | no     | md (4)   |
 * | setup       | CARD       | yes    | sm (2)   |
 * | compact     | CARD       | yes    | card (3) |
 * | transparent | none       | no     | none     |
 */
const getVariantStyle = (variant, COLORS) => {
  const { SPACING, RADIUS, SHADOWS } = COLORS;

  switch (variant) {
    case "elevated":
      // Daha belirgin shadow, border YOK
      return {
        backgroundColor: COLORS.CARD,
        borderRadius: RADIUS.card,
        padding: SPACING.cardPadding,
        margin: SPACING.cardMargin,
        ...SHADOWS.md,
      };

    case "flat":
      // Shadow YOK, border VAR (kaybolmaz!)
      return {
        backgroundColor: COLORS.CARD,
        borderRadius: RADIUS.card,
        padding: SPACING.cardPadding,
        margin: SPACING.cardMargin,
        borderWidth: 1,
        borderColor: COLORS.CARD_BORDER,
        ...SHADOWS.none,
      };

    case "transparent":
      // Hiçbir şey yok - sadece container, padding/margin ekranda verilsin
      return {
        backgroundColor: "transparent",
      };

    case "setup":
      // DeviceSetupScreen için özel (radius 16, elevation 2)
      return {
        backgroundColor: COLORS.CARD,
        borderRadius: RADIUS.lg, // 16
        padding: SPACING.cardPadding,
        marginBottom: SPACING.md, // 16 (8px grid uyumlu)
        borderWidth: 1,
        borderColor: COLORS.CARD_BORDER,
        ...SHADOWS.sm, // elevation 2
      };

    case "compact":
      // Daha sıkı padding VE margin
      return {
        backgroundColor: COLORS.CARD,
        borderRadius: RADIUS.card,
        padding: SPACING.sm, // 8
        margin: SPACING.sm, // 8
        borderWidth: 1,
        borderColor: COLORS.CARD_BORDER,
        ...SHADOWS.card,
      };

    case "default":
    default:
      // Standart card (DriverDashboard/AdminDashboard uyumlu)
      return {
        backgroundColor: COLORS.CARD,
        borderRadius: RADIUS.card, // 12
        padding: SPACING.cardPadding, // 16
        margin: SPACING.cardMargin, // 16
        borderWidth: 1,
        borderColor: COLORS.CARD_BORDER,
        ...SHADOWS.card, // elevation 3
      };
  }
};

export default Card;

/**
 * VARIANT KATALOĞU:
 *
 * | Variant     | background | border | shadow   | padding | margin | Kullanım                    |
 * |-------------|------------|--------|----------|---------|--------|------------------------------|
 * | default     | CARD       | yes    | card (3) | 16      | 16     | Standart kartlar             |
 * | flat        | CARD       | yes    | none     | 16      | 16     | Shadow istemediğinde         |
 * | elevated    | CARD       | no     | md (4)   | 16      | 16     | Öne çıkan kartlar            |
 * | setup       | CARD       | yes    | sm (2)   | 16      | 0/16   | DeviceSetup ekranları        |
 * | compact     | CARD       | yes    | card (3) | 8       | 8      | Sıkı padding gereken yerler  |
 * | transparent | none       | no     | none     | 0       | 0      | Nadir - sadece container     |
 *
 * YENİ VARIANT EKLERKEN:
 * 1. Gerçekten gerekli mi? Mevcut variant + style override yetmez mi?
 * 2. 6'dan fazla variant olmasın (karmaşıklık artar)
 * 3. 8px grid'e uy (4, 8, 16, 24, 32...)
 * 4. Dark mode'da test et!
 */
