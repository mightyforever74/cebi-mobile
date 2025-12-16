// src/navigation/AuthNavigator.js
// TulipFleet - Authentication Navigator

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { COLORS } from "../constants/config";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";

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
        name="Register" 
        component={RegisterScreen}
        options={{ title: "Kayıt" }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
