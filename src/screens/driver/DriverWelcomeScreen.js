// src/screens/driver/DriverWelcomeScreen.js
// TulipFleet - Premium Welcome Screen with Video Background
// Version: 4.1 - Full i18n Support

import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import { ResizeMode, Video } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

const { width, height } = Dimensions.get("window");

const DriverWelcomeScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Video state
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const hasNavigated = useRef(false);
  const isMounted = useRef(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const autoTimerRef = useRef(null);

  // Get first name or fallback
  const firstName =
    user?.first_name || user?.email?.split("@")[0] || t("welcome.driver");

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t("welcome.goodMorning");
    if (hour >= 12 && hour < 18) return t("welcome.goodAfternoon");
    if (hour >= 18 && hour < 22) return t("welcome.goodEvening");
    return t("welcome.goodNight");
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
    ]).start();

    // Auto-navigate timer (5 seconds)
    autoTimerRef.current = setTimeout(navigateToDashboard, 5000);

    // Cleanup
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      isMounted.current = false;
    };
  }, []);

  // Navigation with reset (fixes drawer crash)
  const navigateToDashboard = () => {
    if (!isMounted.current) return;
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);

    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: "DriverDashboard" }] })
    );
  };

  // Tap anywhere to continue
  const handleScreenTap = () => {
    navigateToDashboard();
  };

  return (
    <TouchableWithoutFeedback onPress={handleScreenTap}>
      <View style={styles.container}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        {/* Video Background */}
        {!videoError ? (
          <Video
            source={require("../../assets/videos/welcomeloopv2.mp4")}
            style={styles.backgroundVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping
            isMuted
            useNativeControls={false}
            onLoad={() => setVideoLoaded(true)}
            onError={(e) => {
              console.log("[WELCOME_VIDEO_ERROR]", e?.nativeEvent || e);
              setVideoError(true);
            }}
          />
        ) : null}

        {/* Loading placeholder - video yüklenene kadar */}
        {!videoLoaded && (
          <LinearGradient
            colors={["#0f3460", "#16213e", "#1a1a2e"]}
            style={styles.backgroundVideo}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Gradient Overlay - Sadece alt kısımda */}
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0,0,0,0.1)",
            "rgba(0,0,0,0.3)",
            "rgba(0,0,0,0.5)",
          ]}
          locations={[0, 0.4, 0.7, 1]}
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

            <Text style={styles.subtitle}>{t("welcome.subtitle")}</Text>
          </Animated.View>

          {/* Bottom Section - Stats Only */}
          <Animated.View
            style={[
              styles.bottomSection,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            {/* Stats Preview Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={20} color="#2DCE89" />
                <Text style={styles.statText}>{t("welcome.tasksReady")}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="car" size={20} color="#11CDEF" />
                <Text style={styles.statText}>
                  {t("welcome.vehicleActive")}
                </Text>
              </View>
            </View>

            {/* Tap hint */}
            <Text style={styles.tapHint}>{t("welcome.tapToContinue")}</Text>
          </Animated.View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  topSection: {
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
  bottomSection: {
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
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
  tapHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "400",
  },
});

export default DriverWelcomeScreen;
