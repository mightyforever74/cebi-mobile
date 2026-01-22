// src/navigation/RootNavigator.js
// TulipFleet - Root Navigator (Auth Check)
// Single NavigationContainer - this is critical!
// Updated: 22 Ocak 2026 - Lale görseli eklendi

import { NavigationContainer } from "@react-navigation/native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/config";
import { useAuth } from "../context/AuthContext";
import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";

// Navigation Reference (for navigation outside components)
export const navigationRef = React.createRef();

const RootNavigator = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading, user } = useAuth();

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
            color={COLORS.primary}
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
      onStateChange={(state) => {
        // Track navigation state changes for debugging
        if (__DEV__) {
          const getActiveRouteName = (state) => {
            if (!state) return null;
            const route = state.routes[state.index];
            if (route.state) {
              return getActiveRouteName(route.state);
            }
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
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
    color: COLORS.primary,
    marginBottom: 24,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

export default RootNavigator;
