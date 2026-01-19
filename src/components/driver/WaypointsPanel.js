/**
 * WaypointsPanel.js - Collapsible Waypoints List (v2)
 * TulipFleet - Driver Navigation Waypoints
 *

import { Ionicons } from "@expo/vector-icons";
import { Text } from "galio-framework";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// Tema Renkleri (Driver = Green Theme)
const COLORS = {
  primary: "#10B981",
  primaryDark: "#059669",
  primaryLight: "#34D399",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  pending: "#94A3B8",
  current: "#3B82F6",
  completed: "#10B981",
};

// Waypoint status ikonları
const STATUS_CONFIG = {
  pending: {
    icon: "ellipse-outline",
    color: COLORS.pending,
    bgColor: "#F1F5F9",
  },
  current: {
    icon: "navigate",
    color: COLORS.current,
    bgColor: "#EFF6FF",
  },
  completed: {
    icon: "checkmark-circle",
    color: COLORS.completed,
    bgColor: "#ECFDF5",
  },
  skipped: {
    icon: "close-circle",
    color: COLORS.error,
    bgColor: "#FEF2F2",
  },
};

// i18n helper with namespace prefix
const getText = (t, key, fallbackTr, fallbackEn, isEn) => {
  // Try with nav. namespace first
  const namespacedKey = `nav.${key}`;
  let translated = t(namespacedKey);

  // If namespaced key returns itself, try without namespace
  if (translated === namespacedKey) {
    translated = t(key);
  }

  // If still returns key, use fallback
  if (translated === key || translated === namespacedKey) {
    return isEn ? fallbackEn : fallbackTr;
  }
  return translated;
};

/**
 * Single Waypoint Item
 */
const WaypointItem = ({
  waypoint,
  displayIndex, // FIX #3: UI görsel sırası
  isLast,
  onPress,
  isEn,
  t,
}) => {
  const status = waypoint.status || "pending";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  // Format ETA (already handles timezone - Date converts UTC to local)
  const formatETA = (eta) => {
    if (!eta) return null;
    const date = new Date(eta);
    return date.toLocaleTimeString(isEn ? "en-GB" : "tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) {
      return isEn ? `${minutes} min` : `${minutes} dk`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return isEn ? `${hours}h` : `${hours} sa`;
    }
    return isEn ? `${hours}h ${mins}m` : `${hours} sa ${mins} dk`;
  };

  // FIX #3: Press handler uses waypointIndex (null for origin/destination)
  const handlePress = () => {
    onPress?.(waypoint, waypoint.waypointIndex);
  };

  return (
    <TouchableOpacity
      style={styles.waypointItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Timeline Line */}
      <View style={styles.timelineContainer}>
        <View style={[styles.timelineDot, { backgroundColor: config.bgColor }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
        </View>
        {!isLast && (
          <View
            style={[
              styles.timelineLine,
              status === "completed" && { backgroundColor: COLORS.completed },
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={styles.waypointContent}>
        {/* Header Row */}
        <View style={styles.waypointHeader}>
          <View style={styles.waypointTitleRow}>
            <Text style={[styles.waypointIndex, { color: config.color }]}>
              {displayIndex}
            </Text>
            <Text style={styles.waypointName} numberOfLines={1}>
              {waypoint.name || waypoint.address || `Waypoint ${displayIndex}`}
            </Text>
          </View>
          {waypoint.eta && status !== "completed" && (
            <View style={styles.etaBadge}>
              <Ionicons
                name="time-outline"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.etaText}>{formatETA(waypoint.eta)}</Text>
            </View>
          )}
        </View>

        {/* Address */}
        {waypoint.address && waypoint.name && (
          <Text style={styles.waypointAddress} numberOfLines={2}>
            {waypoint.address}
          </Text>
        )}

        {/* Meta Row */}
        <View style={styles.waypointMeta}>
          {/* Distance */}
          {waypoint.distance_km != null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="navigate-outline"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>
                {Number(waypoint.distance_km).toFixed(1)} km
              </Text>
            </View>
          )}

          {/* Duration */}
          {waypoint.duration_min != null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="hourglass-outline"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>
                {formatDuration(waypoint.duration_min)}
              </Text>
            </View>
          )}

          {/* Stop Time */}
          {waypoint.stop_duration_min != null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="pause-circle-outline"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>
                {getText(t, "stop", "Durak", "Stop", isEn)}:{" "}
                {waypoint.stop_duration_min} dk
              </Text>
            </View>
          )}

          {/* Completed Time */}
          {status === "completed" && waypoint.completed_at && (
            <View style={[styles.metaItem, styles.completedBadge]}>
              <Ionicons name="checkmark" size={12} color={COLORS.completed} />
              <Text style={[styles.metaText, { color: COLORS.completed }]}>
                {formatETA(waypoint.completed_at)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {waypoint.notes && (
          <View style={styles.notesContainer}>
            <Ionicons
              name="document-text-outline"
              size={12}
              color={COLORS.textSecondary}
            />
            <Text style={styles.notesText} numberOfLines={2}>
              {waypoint.notes}
            </Text>
          </View>
        )}
      </View>

      {/* Arrow */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textSecondary}
        style={styles.waypointArrow}
      />
    </TouchableOpacity>
  );
};

/**
 * Main Waypoints Panel Component
 */
export default function WaypointsPanel({
  waypoints = [],
  currentWaypointIndex = 0,
  origin,
  destination,
  onWaypointPress,
  onOriginPress,
  onDestinationPress,
  style,
}) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Calculate stats
  const totalWaypoints = waypoints.length;
  const isDirectRoute = totalWaypoints === 0;

  // FIX #2: completedWaypoints tek kaynaktan (currentWaypointIndex)
  // Backend status'larına değil, currentWaypointIndex'e güveniyoruz
  const completedWaypoints = Math.min(
    Math.max(currentWaypointIndex, 0),
    totalWaypoints
  );

  const hasWaypoints = totalWaypoints > 0 || origin || destination;

  // Build full route list (origin + waypoints + destination)
  const routeList = useMemo(() => {
    const list = [];
    let displayIdx = 1;

    // Origin
    if (origin) {
      list.push({
        ...origin,
        _type: "origin",
        waypointIndex: null, // FIX #3: origin has no waypoint index
        name:
          origin.name || getText(t, "start_point", "Başlangıç", "Start", isEn),
        status: "completed", // Origin is always completed when navigation starts
        displayIndex: displayIdx++,
      });
    }

    // Waypoints with status derived from currentWaypointIndex
    waypoints.forEach((wp, idx) => {
      // FIX #2: Status from currentWaypointIndex, not from wp.status
      const derivedStatus =
        idx < currentWaypointIndex
          ? "completed"
          : idx === currentWaypointIndex
          ? "current"
          : "pending";
      list.push({
        ...wp,
        _type: "waypoint",
        waypointIndex: idx, // FIX #3: actual waypoint index for callbacks
        status: derivedStatus,
        displayIndex: displayIdx++,
      });
    });

    // Destination
    if (destination) {
      // FIX #1: Direkt rota için destination = current
      const destStatus = isDirectRoute
        ? "current"
        : completedWaypoints === totalWaypoints
        ? "current"
        : "pending";

      list.push({
        ...destination,
        _type: "destination",
        waypointIndex: null, // FIX #3: destination has no waypoint index
        name:
          destination.name ||
          getText(t, "destination", "Varış", "Destination", isEn),
        status: destStatus,
        displayIndex: displayIdx++,
      });
    }

    return list;
  }, [
    origin,
    destination,
    waypoints,
    currentWaypointIndex,
    isDirectRoute,
    completedWaypoints,
    totalWaypoints,
    t,
    isEn,
  ]);

  // FIX #4: Dynamic expanded height based on content
  const expandedMaxHeight = useMemo(() => {
    const baseHeight = 60; // Header padding
    const itemHeight = 80; // Approximate height per item
    const calculated = baseHeight + routeList.length * itemHeight;
    return Math.min(calculated, 420); // Cap at 420
  }, [routeList.length]);

  // Toggle animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded, animatedHeight, rotateAnim]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Handle waypoint press
  const handleItemPress = (waypoint, waypointIndex) => {
    if (waypoint._type === "origin" && onOriginPress) {
      onOriginPress(waypoint);
    } else if (waypoint._type === "destination" && onDestinationPress) {
      onDestinationPress(waypoint);
    } else if (waypoint._type === "waypoint" && onWaypointPress) {
      // FIX #3: Pass actual waypoint index, not routeList index
      onWaypointPress(waypoint, waypointIndex);
    }
  };

  if (!hasWaypoints) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header - Always Visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="flag-outline" size={18} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {getText(
                t,
                "route_waypoints",
                "Rota Noktaları",
                "Route Waypoints",
                isEn
              )}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isDirectRoute
                ? getText(
                    t,
                    "direct_route",
                    "Direkt rota",
                    "Direct route",
                    isEn
                  )
                : `${completedWaypoints}/${totalWaypoints} ${getText(
                    t,
                    "completed",
                    "tamamlandı",
                    "completed",
                    isEn
                  )}`}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Progress indicator - only show if has waypoints */}
          {!isDirectRoute && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        totalWaypoints > 0
                          ? (completedWaypoints / totalWaypoints) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textSecondary}
            />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* Expandable Content */}
      <Animated.View
        style={[
          styles.content,
          {
            // FIX #4: Dynamic max height
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, expandedMaxHeight],
            }),
            opacity: animatedHeight,
          },
        ]}
      >
        <ScrollView
          style={styles.waypointsList}
          showsVerticalScrollIndicator={false}
          // FIX #5: nestedScrollEnabled only on Android
          nestedScrollEnabled={Platform.OS === "android"}
        >
          {routeList.map((item, idx) => (
            <WaypointItem
              key={item.id || `${item._type}-${idx}`}
              waypoint={item}
              displayIndex={item.displayIndex} // FIX #3: UI display number
              isLast={idx === routeList.length - 1}
              onPress={handleItemPress}
              isEn={isEn}
              t={t}
            />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: COLORS.card,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Progress
  progressContainer: {
    width: 50,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Content
  content: {
    overflow: "hidden",
  },
  waypointsList: {
    maxHeight: 350,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  // Waypoint Item
  waypointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },

  // Timeline
  timelineContainer: {
    alignItems: "center",
    width: 32,
    marginRight: 10,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: COLORS.border,
    marginTop: 4,
  },

  // Waypoint Content
  waypointContent: {
    flex: 1,
    paddingRight: 8,
  },
  waypointHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waypointTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  waypointIndex: {
    fontSize: 12,
    fontWeight: "800",
    minWidth: 18,
  },
  waypointName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  waypointAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginLeft: 26,
  },

  // ETA Badge
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Meta
  waypointMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
    marginLeft: 26,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  completedBadge: {
    backgroundColor: COLORS.completed + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // Notes
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 6,
    marginLeft: 26,
    padding: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.warning,
    fontStyle: "italic",
  },

  // Arrow
  waypointArrow: {
    marginTop: 4,
  },
});
