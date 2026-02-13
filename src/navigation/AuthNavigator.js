// src/navigation/AuthNavigator.js
// TulipFleet - Authentication Navigator
// Updated: 05 Şubat 2026 - Register kaldırıldı, ForgotPassword + Contact eklendi

import { createStackNavigator } from "@react-navigation/stack";
import { COLORS } from "../constants/config";
import ContactScreen from "../screens/auth/ContactScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import LoginScreen from "../screens/auth/LoginScreen";

const Stack = createStackNavigator();

const AuthNavigator = () => {
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
        options={{ title: "Giriş" }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: "Şifremi Unuttum" }}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{ title: "Bize Ulaşın" }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
