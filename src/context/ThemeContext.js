// src/context/ThemeContext.js
// TulipFleet - Global Theme Context
// Updated: 23 Ocak 2026 - String theme support ('dark'/'light')

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
  const [theme, setThemeState] = useState("light"); // 'light' | 'dark'
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved theme preference
  const loadTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        const parsed = JSON.parse(savedTheme);
        // Backward compatibility: boolean → string
        if (typeof parsed === "boolean") {
          setThemeState(parsed ? "dark" : "light");
        } else {
          setThemeState(parsed);
        }
      } else {
        // System preference as default
        setThemeState(systemColorScheme === "dark" ? "dark" : "light");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      setThemeState("light");
    } finally {
      setIsHydrated(true);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // isDark helper
  const isDark = theme === "dark";

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
      const newTheme = theme === "dark" ? "light" : "dark";
      setThemeState(newTheme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme));
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  }, [theme]);

  // Set specific theme (string: 'dark' | 'light' veya boolean backward compat için)
  const setTheme = useCallback(async (newTheme) => {
    try {
      let themeToSet;

      // Backward compatibility: boolean → string
      if (typeof newTheme === "boolean") {
        themeToSet = newTheme ? "dark" : "light";
      } else {
        themeToSet = newTheme;
      }

      setThemeState(themeToSet);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeToSet));
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
      theme, // 'light' | 'dark'
      isDark,
      isHydrated,
      themeMode: theme, // Alias

      // Actions
      toggleTheme,
      setTheme,

      // Colors (TEK KAYNAK)
      COLORS,

      // Galio/Argon için
      argonTheme,
    }),
    [theme, isDark, isHydrated, toggleTheme, setTheme, COLORS, argonTheme]
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
