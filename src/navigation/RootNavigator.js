// src/navigation/RootNavigator.js
// TulipFleet - Root Navigator (Auth Check)
// Single NavigationContainer - this is critical!
// Regen (Dark Mode): useTheme + useThemedStyles + config COLORS kaldırıldı
// Updated: 22 Ocak 2026 - Lale görseli eklendi (korundu)

import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigationTheme } from "../hooks/useNavigationTheme";
import { useThemedStyles } from "../hooks/useThemedStyles";

import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";

// Navigation Reference (for navigation outside components)
export const navigationRef = React.createRef();

const makeStyles = (COLORS) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
      padding: 20,
    },
    loadingContent: {
      alignItems: "center",
    },
    loadingLogo: {
      width: 100,
      height: 120,
      marginBottom: 16,
    },
    loadingTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: COLORS.PRIMARY,
      marginBottom: 24,
    },
    spinner: {
      marginBottom: 16,
    },
    loadingText: {
      fontSize: 16,
      color: COLORS.MUTED,
      fontWeight: "500",
    },
  });

const RootNavigator = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading, user } = useAuth();

  // Theme (rehbere uygun)
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Navigation theme (zaten doğru yaklaşım, korundu)
  const navigationTheme = useNavigationTheme();

  // Loading state - Auth durumu kontrol edilirken
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Image
            source={require("../../assets/splash-tulip.png")}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.loadingTitle}>TulipFleet</Text>
          <ActivityIndicator
            size="large"
            color={COLORS.PRIMARY}
            style={styles.spinner}
          />
          <Text style={styles.loadingText}>{t("root.loading")}</Text>
        </View>
      </View>
    );
  }

  console.log(
    "🚦 RootNavigator - Auth:",
    isAuthenticated,
    "User:",
    user?.email,
    "Role:",
    user?.role
  );

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={(state) => {
        // Track navigation state changes for debugging
        if (__DEV__) {
          const getActiveRouteName = (s) => {
            if (!s) return null;
            const route = s.routes[s.index];
            if (route.state) return getActiveRouteName(route.state);
            return route.name;
          };
          const currentRoute = getActiveRouteName(state);
          console.log("📍 Navigation:", currentRoute);
        }
      }}
    >
      {isAuthenticated && user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default RootNavigator;
