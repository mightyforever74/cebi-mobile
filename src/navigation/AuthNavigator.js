// src/navigation/AuthNavigator.js
// TulipFleet - Authentication Navigator
// Updated: 05 Şubat 2026 - Register kaldırıldı, ForgotPassword + Contact eklendi

import { createStackNavigator } from "@react-navigation/stack";
import { useTranslation } from "react-i18next";
import { COLORS } from "../constants/config";
import ContactScreen from "../screens/auth/ContactScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import LoginScreen from "../screens/auth/LoginScreen";

const Stack = createStackNavigator();

const AuthNavigator = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
        // Smooth transitions
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
      initialRouteName="Login"
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: t("auth.loginTitle") }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t("auth.forgotPasswordTitle") }}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{ title: t("auth.contactTitle") }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
