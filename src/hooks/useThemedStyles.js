// src/hooks/useThemedStyles.js
// TulipFleet - Themed Styles Hook
// Created: 22 Ocak 2026
//
// Bu hook, StyleSheet.create() ile dinamik tema kullanımını kolaylaştırır.
//
// KULLANIM:
// ---------
// const makeStyles = (COLORS) => StyleSheet.create({
//   container: { backgroundColor: COLORS.BACKGROUND },
// });
//
// const MyScreen = () => {
//   const styles = useThemedStyles(makeStyles);
//   return <View style={styles.container} />;
// };

import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * StyleSheet factory fonksiyonunu tema renkleriyle çalıştırır
 * ve memoize eder (performans için).
 *
 * @param {Function} makeStyles - (COLORS) => StyleSheet.create({...})
 * @returns {Object} StyleSheet object
 */
export const useThemedStyles = (makeStyles) => {
  const { COLORS } = useTheme();

  const styles = useMemo(() => makeStyles(COLORS), [COLORS, makeStyles]);

  return styles;
};

/**
 * COLORS ve isDark'ı birlikte döndüren versiyon
 * (conditional styling için)
 *
 * @param {Function} makeStyles - (COLORS, isDark) => StyleSheet.create({...})
 * @returns {Object} StyleSheet object
 */
export const useThemedStylesWithMode = (makeStyles) => {
  const { COLORS, isDark } = useTheme();

  const styles = useMemo(
    () => makeStyles(COLORS, isDark),
    [COLORS, isDark, makeStyles]
  );

  return styles;
};

export default useThemedStyles;
