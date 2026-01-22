// src/components/AnimatedSplash.js
// TulipFleet - Animasyonlu Tam Ekran Splash Screen
// Regen (Dark Mode): useTheme + useThemedStyles + hardcoded hex temizliği
// Animasyon akışı korunmuştur.

import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";

// --- helper: #RRGGBB => #RRGGBBAA (rgba/hardcode olmadan) ---
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

const { width, height } = Dimensions.get("window");

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
    },
    gradientTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: height * 0.3,
      backgroundColor: withAlpha(COLORS.PRIMARY, 0.22),
    },
    gradientBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: height * 0.3,
      // PRIMARY yerine INFO/GRADIENT_END tercih edilebilir; token yoksa PRIMARY fallback
      backgroundColor: withAlpha(
        COLORS.INFO ?? COLORS.GRADIENT_END ?? COLORS.PRIMARY,
        0.18
      ),
    },
    logo: {
      width: width * 0.55,
      height: height * 0.4,
      marginBottom: 20,
    },
    textContainer: {
      alignItems: "center",
      marginTop: 10,
    },
    appName: {
      fontSize: 36,
      fontWeight: "700",
      color: COLORS.WHITE,
      letterSpacing: 4,
      textShadowColor: withAlpha(COLORS.BLACK, 0.2),
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    tagline: {
      fontSize: 14,
      color: withAlpha(COLORS.WHITE, 0.8),
      marginTop: 8,
      letterSpacing: 1,
    },
    bottomDecor: {
      position: "absolute",
      bottom: 60,
      flexDirection: "row",
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: withAlpha(COLORS.WHITE, 0.3),
    },
    dotActive: {
      backgroundColor: withAlpha(COLORS.WHITE, 0.8),
      width: 24,
    },
  });

const AnimatedSplash = ({ onFinish }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(30)).current;
  const containerFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1) Logo fade in + scale
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      // 2) Text fade in + slide up
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 3) Bekle
      Animated.delay(800),
      // 4) Tümü fade out
      Animated.timing(containerFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onFinish) onFinish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerFadeAnim }]}>
      <StatusBar backgroundColor={COLORS.PRIMARY} barStyle="light-content" />

      {/* Gradient Background Effect */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {/* Logo */}
      <Animated.Image
        source={require("../../assets/splash-tulip.png")}
        style={[
          styles.logo,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: textSlideAnim }],
          },
        ]}
      >
        <Text style={styles.appName}>TULIPFLEET</Text>
        <Text style={styles.tagline}>Fleet Management System</Text>
      </Animated.View>

      {/* Bottom Decoration */}
      <View style={styles.bottomDecor}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
      </View>
    </Animated.View>
  );
};

export default AnimatedSplash;
