// src/hooks/useNavigationTheme.js
// TulipFleet - React Navigation Theme Hook
// FIX #4: Navigation header/tabbar teması

import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { useMemo } from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * React Navigation için dinamik tema döndürür
 * RootNavigator.js içinde kullanılacak
 *
 * Kullanım:
 * const navigationTheme = useNavigationTheme();
 * <NavigationContainer theme={navigationTheme}>
 */
export const useNavigationTheme = () => {
  const { COLORS, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      dark: isDark,
      colors: {
        ...baseTheme.colors,
        primary: COLORS.PRIMARY,
        background: COLORS.BACKGROUND,
        card: COLORS.SURFACE,
        text: COLORS.TEXT,
        border: COLORS.BORDER,
        notification: COLORS.ERROR,
      },
    };
  }, [COLORS, isDark]);

  return navigationTheme;
};

export default useNavigationTheme;
