// src/navigation/RootNavigator.js
// TulipFleet - Root Navigator (Auth Check)

import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../constants/config";
import { useAuth } from "../context/AuthContext";
import AppNavigator from "./AppNavigator";
import AuthNavigator from "./AuthNavigator";

const RootNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // Loading state - Auth durumu kontrol edilirken
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>TulipFleet yükleniyor...</Text>
      </View>
    );
  }

  console.log(
    "🚦 RootNavigator - Auth:",
    isAuthenticated,
    "User:",
    user?.email
  );

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

export default RootNavigator;
