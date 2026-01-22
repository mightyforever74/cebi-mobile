// src/context/ThemeContext.js
// TulipFleet - Global Theme Context
// Updated: 22 Ocak 2026 - Theme.js tek kaynak

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StatusBar, useColorScheme } from "react-native";

// TEK KAYNAK: Theme.js'ten import
import { getColors } from "../../constants/Theme";

// Storage key
const THEME_STORAGE_KEY = "@settings_dark_mode";

// ==============================================
// Context - null ile oluştur (guard düzgün çalışsın)
// ==============================================
const ThemeContext = createContext(null);

// ==============================================
// Provider Component
// ==============================================
export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved theme preference
  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDark(JSON.parse(savedTheme));
      } else {
        // System preference as default
        setIsDark(systemColorScheme === "dark");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      setIsDark(false);
    } finally {
      setIsHydrated(true);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // StatusBar otomatik güncelleme
  useEffect(() => {
    if (isHydrated) {
      const colors = getColors(isDark);
      StatusBar.setBarStyle(colors.STATUS_BAR_STYLE, true);
      // Android için
      if (StatusBar.setBackgroundColor) {
        StatusBar.setBackgroundColor(colors.STATUS_BAR_BG);
      }
    }
  }, [isDark, isHydrated]);

  // Toggle theme
  const toggleTheme = useCallback(async () => {
    try {
      const newValue = !isDark;
      setIsDark(newValue);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newValue));
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, [isDark]);

  // Set specific theme
  const setTheme = useCallback(async (darkMode) => {
    try {
      setIsDark(darkMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(darkMode));
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, []);

  // COLORS - Theme.js'ten (tek kaynak)
  const COLORS = useMemo(() => getColors(isDark), [isDark]);

  // Galio/Argon theme objesi
  const argonTheme = useMemo(
    () => ({
      COLORS,
      SIZES: {
        BASE: 16,
        FONT: 16,
        OPACITY: 0.8,
      },
    }),
    [COLORS]
  );

  const value = useMemo(
    () => ({
      // State
      isDark,
      isHydrated,
      themeMode: isDark ? "dark" : "light",

      // Actions
      toggleTheme,
      setTheme,

      // Colors (TEK KAYNAK)
      COLORS,

      // Galio/Argon için
      argonTheme,
    }),
    [isDark, isHydrated, toggleTheme, setTheme, COLORS, argonTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ==============================================
// Hook - Guard ile
// ==============================================
export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used within a ThemeProvider.\n" +
        "Make sure ThemeProvider wraps your component tree in App.js"
    );
  }

  return context;
};

export default ThemeContext;
