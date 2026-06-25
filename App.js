// App.js - TulipFleet Mobile App
// Updated: 22 Ocak 2026 - Dark Mode v2 (Kritik düzeltmeler)
// FIX: Provider sırası, Galio dinamik theme, flicker önleme
import * as SplashScreen from "expo-splash-screen";
import { GalioProvider } from "galio-framework";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
let RNBootSplash = null;
try {
  RNBootSplash = require("react-native-bootsplash").default;
} catch (e) {}

import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import PushNotificationService from "./services/pushNotificationService";
import "./src/locales/i18n";

// AuthProvider import
import { AuthProvider } from "./src/context/AuthContext";

// ThemeProvider import - EN DIŞTA OLMALI
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";

// RootNavigator (includes NavigationContainer)
import RootNavigator from "./src/navigation/RootNavigator";

// Animated Splash
import AnimatedSplash from "./src/components/AnimatedSplash";

SplashScreen.preventAutoHideAsync();

// ==============================================
// Inner App - ThemeContext'e erişebilir
// ==============================================
const AppContent = () => {
  const { argonTheme, isHydrated, COLORS } = useTheme();
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowAnimatedSplash(false);
  };

  // FIX #5: Theme yüklenene kadar bekle (flicker önleme)
  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.BACKGROUND,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    // FIX #2: GalioProvider artık dinamik theme alıyor
    <GalioProvider theme={argonTheme}>
      <AuthProvider>
        <RootNavigator />
        {/* Animated Splash - en üstte göster */}
        {showAnimatedSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
      </AuthProvider>
    </GalioProvider>
  );
};

// ==============================================
// Main App - ThemeProvider en dışta
// ==============================================
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

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
        if (RNBootSplash) RNBootSplash.hide({ fade: true, duration: 200 });
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
      {/* FIX: ThemeProvider EN DIŞTA - böylece GalioProvider theme'i alabilir */}
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
