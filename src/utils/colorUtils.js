// src/utils/colorUtils.js
// TulipFleet - Color Utilities
// TEK KAYNAK: withAlpha helper - tüm ekranlarda bu import edilecek
// Artık her dosyada withAlpha tanımlamak YASAK

/**
 * Hex renge alpha kanalı ekler
 * @param {string} hex - "#RRGGBB" formatında renk
 * @param {number} alpha - 0 ile 1 arası opacity
 * @returns {string} "#RRGGBBAA" formatında renk
 */
export const withAlpha = (hex, alpha) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;

  const a = Math.max(0, Math.min(1, alpha));
  const alphaHex = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  return `${hex}${alphaHex}`;
};
