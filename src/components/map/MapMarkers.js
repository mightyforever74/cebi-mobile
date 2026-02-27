// src/components/map/MapMarkers.js
// TulipFleet - Shared Map Marker Components
// Google Maps / Yandex Maps tarzı profesyonel teardrop pin tasarımı
// Plaka yok — temiz ve sade
// Used by: FleetMapScreen, DriverRouteMapScreen, VehicleTrackScreen
// Created: 23 Şubat 2026

import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, View } from "react-native";

// ============================================
// VEHICLE MARKER — Google Maps teardrop pin
// ============================================
export const VehicleMarker = ({
  speed = 0,
  isOnline = true,
  isSelected = false,
  heading = 0,
  color,
}) => {
  const moving = speed > 5;
  const bgColor = color
    ? color
    : isSelected
      ? "#4285F4"
      : isOnline
        ? "#34A853"
        : "#9AA0A6";
  const size = isSelected ? 40 : 34;

  return (
    <View style={mStyles.pinContainer}>
      <View
        style={[
          mStyles.pinBody,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            borderBottomRightRadius: 4,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      >
        <View
          style={[
            mStyles.pinInner,
            {
              width: size * 0.58,
              height: size * 0.58,
              borderRadius: (size * 0.58) / 2,
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        >
          <Ionicons
            name="car"
            size={isSelected ? 18 : 15}
            color={bgColor}
            style={heading ? { transform: [{ rotate: `${heading}deg` }] } : {}}
          />
        </View>
      </View>

      {moving && (
        <View style={[mStyles.speedBadge, { backgroundColor: bgColor }]}>
          <Text style={mStyles.speedText}>{Math.round(speed)}</Text>
        </View>
      )}

      <View style={mStyles.groundShadow} />
    </View>
  );
};

// ============================================
// DESTINATION MARKER — kırmızı Google pin
// ============================================
export const DestinationMarker = ({ label, color }) => {
  const bgColor = color || "#EA4335";

  return (
    <View style={mStyles.pinContainer}>
      <View
        style={[
          mStyles.pinBody,
          {
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: bgColor,
            borderBottomRightRadius: 4,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      >
        <View
          style={[
            mStyles.pinInner,
            {
              width: 22,
              height: 22,
              borderRadius: 11,
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        >
          <Ionicons name="flag" size={14} color={bgColor} />
        </View>
      </View>
      <View style={mStyles.groundShadow} />
      {label && (
        <View style={[mStyles.labelBadge, { backgroundColor: bgColor }]}>
          <Text style={mStyles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// START MARKER — yeşil Google pin
// ============================================
export const StartMarker = ({ label }) => {
  const bgColor = "#34A853";

  return (
    <View style={mStyles.pinContainer}>
      <View
        style={[
          mStyles.pinBody,
          {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: bgColor,
            borderBottomRightRadius: 4,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      >
        <View
          style={[
            mStyles.pinInner,
            {
              width: 20,
              height: 20,
              borderRadius: 10,
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        >
          <View style={[mStyles.dotCenter, { backgroundColor: bgColor }]} />
        </View>
      </View>
      <View style={mStyles.groundShadow} />
      {label && (
        <View style={[mStyles.labelBadge, { backgroundColor: bgColor }]}>
          <Text style={mStyles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// END MARKER — kırmızı Google pin
// ============================================
export const EndMarker = ({ label }) => {
  const bgColor = "#EA4335";

  return (
    <View style={mStyles.pinContainer}>
      <View
        style={[
          mStyles.pinBody,
          {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: bgColor,
            borderBottomRightRadius: 4,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      >
        <View
          style={[
            mStyles.pinInner,
            {
              width: 20,
              height: 20,
              borderRadius: 10,
              transform: [{ rotate: "-45deg" }],
            },
          ]}
        >
          <Ionicons name="square" size={10} color={bgColor} />
        </View>
      </View>
      <View style={mStyles.groundShadow} />
      {label && (
        <View style={[mStyles.labelBadge, { backgroundColor: bgColor }]}>
          <Text style={mStyles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

// ============================================
// WAYPOINT MARKER — numaralı minimal daire
// ============================================
export const WaypointMarker = ({ index, status = "pending", label }) => {
  const colors = {
    completed: "#34A853",
    current: "#4285F4",
    pending: "#9AA0A6",
  };
  const bgColor = colors[status];
  const isCurrent = status === "current";

  return (
    <View style={mStyles.waypointContainer}>
      <View
        style={[
          mStyles.waypointCircle,
          {
            backgroundColor: bgColor,
            width: isCurrent ? 30 : 26,
            height: isCurrent ? 30 : 26,
            borderRadius: isCurrent ? 15 : 13,
          },
        ]}
      >
        {status === "completed" ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <Text style={mStyles.waypointNumber}>{index + 1}</Text>
        )}
      </View>
    </View>
  );
};

// ============================================
// PLAYBACK MARKER — geçmiş rota oynatma
// ============================================
export const PlaybackMarker = ({ heading = 0, color }) => {
  const bgColor = color || "#4285F4";

  return (
    <View style={mStyles.playbackContainer}>
      <View
        style={[mStyles.playbackGlow, { backgroundColor: bgColor + "25" }]}
      />
      <View
        style={[
          mStyles.playbackDot,
          {
            backgroundColor: bgColor,
            transform: heading ? [{ rotate: `${heading}deg` }] : [],
          },
        ]}
      >
        <Ionicons name="navigate" size={14} color="#FFFFFF" />
      </View>
    </View>
  );
};

// ============================================
// NAV MARKER — Google blue dot + heading beam
// ============================================
export const NavMarker = ({ color }) => {
  const bgColor = color || "#4285F4";

  return (
    <View style={mStyles.navContainer}>
      <View style={[mStyles.navBeam, { borderBottomColor: bgColor + "30" }]} />
      <View style={[mStyles.navOuter, { backgroundColor: bgColor + "20" }]}>
        <View style={[mStyles.navDot, { backgroundColor: bgColor }]} />
      </View>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  android: { elevation: 6 },
});

const SHADOW_SM = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  android: { elevation: 3 },
});

const mStyles = StyleSheet.create({
  pinContainer: {
    alignItems: "center",
  },
  pinBody: {
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  pinInner: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  dotCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  groundShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#00000018",
    marginTop: 2,
  },
  speedBadge: {
    position: "absolute",
    top: -4,
    right: -12,
    minWidth: 20,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    ...SHADOW_SM,
  },
  speedText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    includeFontPadding: false,
  },
  labelBadge: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 100,
    ...SHADOW_SM,
  },
  labelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    textAlign: "center",
    includeFontPadding: false,
  },
  waypointContainer: {
    alignItems: "center",
  },
  waypointCircle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    ...SHADOW,
  },
  waypointNumber: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    includeFontPadding: false,
  },
  playbackContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
  },
  playbackGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  playbackDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    ...SHADOW,
  },
  navContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  navBeam: {
    position: "absolute",
    top: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  navOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    ...SHADOW,
  },
});
