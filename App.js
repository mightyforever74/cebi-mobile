// App.js - TulipFleet Mobile App
// Updated: 21 Ocak 2026 - Animasyonlu Splash Screen
import * as SplashScreen from "expo-splash-screen";
import { GalioProvider } from "galio-framework";
import { useEffect, useState } from "react";
import RNBootSplash from "react-native-bootsplash";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { argonTheme } from "./constants";
import PushNotificationService from "./services/pushNotificationService";
import "./src/locales/i18n";

// AuthProvider import
import { AuthProvider } from "./src/context/AuthContext";

// NEW: RootNavigator (includes NavigationContainer)
import RootNavigator from "./src/navigation/RootNavigator";

// NEW: Animated Splash
import AnimatedSplash from "./src/components/AnimatedSplash";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        // Minimum bekleme süresi
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Native splash'ları gizle
        SplashScreen.hideAsync();
        RNBootSplash.hide({ fade: true, duration: 200 });
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    // Push notification başlat
    PushNotificationService.initialize();
  }, []);

  // Animasyonlu splash bitince
  const handleSplashFinish = () => {
    setShowAnimatedSplash(false);
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GalioProvider theme={argonTheme}>
        <AuthProvider>
          <RootNavigator />
          {/* Animated Splash - en üstte göster */}
          {showAnimatedSplash && (
            <AnimatedSplash onFinish={handleSplashFinish} />
          )}
        </AuthProvider>
      </GalioProvider>
    </GestureHandlerRootView>
  );
}
