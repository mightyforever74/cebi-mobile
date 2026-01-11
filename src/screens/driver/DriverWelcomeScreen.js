// src/screens/driver/DriverWelcomeScreen.js
// TulipFleet - Premium Welcome Screen with Video Background
// Created: 11 Ocak 2026
// Version: 2.1 FINAL+ - Double navigation guard + countdown clamp

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");

// import { ResizeMode, Video } from "expo-av";  // Bu satırı sil veya yorum yap

const DriverWelcomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Countdown state
  const [countdown, setCountdown] = useState(5);

  // Prevent double navigation (button + timeout race)
  const hasNavigated = useRef(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimRef = useRef(null);

  // Get first name or fallback
  const firstName = user?.first_name || user?.email?.split("@")[0] || "Sürücü";

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return "İyi geceler";
    if (hour < 12) return "Günaydın";
    if (hour < 18) return "İyi günler";
    return "İyi akşamlar";
  };

  // Route: AppNavigator.js'de "DriverDashboard" olarak tanımlı ✅
  const navigateToDashboard = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    navigation.replace("DriverDashboard");
  };

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for button (with cleanup reference)
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimRef.current.start();

    // Auto-navigate timer (5 seconds)
    const autoNavigateTimer = setTimeout(() => {
      navigateToDashboard();
    }, 5000);

    // Countdown timer (clamp to 0)
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(autoNavigateTimer);
      clearInterval(countdownInterval);
      pulseAnimRef.current?.stop();
    };
  }, []);

  const handleContinue = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigateToDashboard();
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* Gradient Background (Video yerine) */}
      <LinearGradient
        colors={["#1a1a2e", "#16213e", "#0f3460", "#1a1a2e"]}
        style={styles.backgroundVideo}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Gradient Overlay */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.3)",
          "rgba(0,0,0,0.5)",
          "rgba(0,0,0,0.7)",
          "rgba(0,0,0,0.85)",
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.overlay}
      />

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Top Section - Logo & Branding */}
        <Animated.View
          style={[
            styles.topSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top + 20,
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🚛</Text>
            <Text style={styles.logoText}>TulipFleet</Text>
          </View>
        </Animated.View>

        {/* Middle Section - Greeting */}
        <Animated.View
          style={[
            styles.middleSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName} 👋</Text>

          {/* Decorative line */}
          <View style={styles.decorativeLine} />

          <Text style={styles.subtitle}>Sürücü paneline hoş geldin</Text>
        </Animated.View>

        {/* Bottom Section - CTA */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          {/* Stats Preview Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#2DCE89" />
              <Text style={styles.statText}>Görevler hazır</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="car" size={20} color="#11CDEF" />
              <Text style={styles.statText}>Araç aktif</Text>
            </View>
          </View>

          {/* Main CTA Button */}
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleContinue}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#2DCE89", "#26B576"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Devam Et</Text>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Countdown hint */}
          <Text style={styles.skipHint}>
            {countdown > 0
              ? `${countdown} saniye sonra otomatik geçilecek`
              : "Yönlendiriliyor..."}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },

  // Top Section
  topSection: {
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  logoEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // Middle Section
  middleSection: {
    alignItems: "center",
  },
  greeting: {
    fontSize: 18,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  decorativeLine: {
    width: 60,
    height: 4,
    backgroundColor: "#2DCE89",
    borderRadius: 2,
    marginVertical: 24,
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textAlign: "center",
  },

  // Bottom Section
  bottomSection: {
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  statText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginLeft: 8,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  ctaButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#2DCE89",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 48,
    gap: 12,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  skipHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 16,
  },
});

export default DriverWelcomeScreen;
