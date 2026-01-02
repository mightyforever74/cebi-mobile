// App.js - TulipFleet Mobile App
// Updated: 16 Aralık 2025 - RootNavigator'a geçiş
import * as SplashScreen from "expo-splash-screen";
import { GalioProvider } from "galio-framework";
import { useEffect, useState } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { argonTheme } from "./constants";
import PushNotificationService from "./services/pushNotificationService";

// AuthProvider import
import { AuthProvider } from "./src/context/AuthContext";

// NEW: RootNavigator (includes NavigationContainer)
import RootNavigator from "./src/navigation/RootNavigator";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    // Push notification başlat
    PushNotificationService.initialize();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GalioProvider theme={argonTheme}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </GalioProvider>
    </GestureHandlerRootView>
  );
}
