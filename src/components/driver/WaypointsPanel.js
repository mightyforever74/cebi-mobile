/**
 * WaypointsPanel.js - Collapsible Waypoints List (v3)
 * TulipFleet - Driver Navigation Waypoints
 *
 * v3 Fix: galio-framework Text yerine React Native Text
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
  const namespacedKey = `nav.${key}`;
  let translated = t(namespacedKey);

  if (translated === namespacedKey) {
    translated = t(key);
  }

  if (translated === key || translated === namespacedKey) {
    return isEn ? fallbackEn : fallbackTr;
  }
  return translated;
};

/**
 * Single Waypoint Item
 */
const WaypointItem = ({ waypoint, displayIndex, isLast, onPress, isEn, t }) => {
  const status = waypoint.status || "pending";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const formatETA = (eta) => {
    if (!eta) return null;
    const date = new Date(eta);
    return date.toLocaleTimeString(isEn ? "en-GB" : "tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const handlePress = () => {
    if (onPress) {
      onPress(waypoint, waypoint.waypointIndex);
    }
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
  distance,
  duration,
  taskNo,
  onComplete,
  actionLoading = false,
  style,
}) {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const totalWaypoints = waypoints.length;
  const isDirectRoute = totalWaypoints === 0;
  const completedWaypoints = Math.min(
    Math.max(currentWaypointIndex, 0),
    totalWaypoints
  );
  const hasWaypoints = totalWaypoints > 0 || origin || destination;

  const routeList = useMemo(() => {
    const list = [];
    let displayIdx = 1;

    if (origin) {
      list.push({
        ...origin,
        _type: "origin",
        waypointIndex: null,
        name:
          origin.name || getText(t, "start_point", "Başlangıç", "Start", isEn),
        status: "completed",
        displayIndex: displayIdx++,
      });
    }

    waypoints.forEach((wp, idx) => {
      const derivedStatus =
        idx < currentWaypointIndex
          ? "completed"
          : idx === currentWaypointIndex
          ? "current"
          : "pending";
      list.push({
        ...wp,
        _type: "waypoint",
        waypointIndex: idx,
        status: derivedStatus,
        displayIndex: displayIdx++,
      });
    });

    if (destination) {
      const destStatus = isDirectRoute
        ? "current"
        : completedWaypoints === totalWaypoints
        ? "current"
        : "pending";

      list.push({
        ...destination,
        _type: "destination",
        waypointIndex: null,
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

  const expandedMaxHeight = useMemo(() => {
    const baseHeight = 60;
    const itemHeight = 80;
    const calculated = baseHeight + routeList.length * itemHeight;
    return Math.min(calculated, 420);
  }, [routeList.length]);

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

  const handleItemPress = (waypoint, waypointIndex) => {
    if (waypoint._type === "origin" && onOriginPress) {
      onOriginPress(waypoint);
    } else if (waypoint._type === "destination" && onDestinationPress) {
      onDestinationPress(waypoint);
    } else if (waypoint._type === "waypoint" && onWaypointPress) {
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

      {/* ── Trip Info Bar ── */}
      {(distance != null || duration != null || taskNo) && (
        <View style={styles.infoBar}>
          {distance != null && (
            <View style={styles.infoItem}>
              <Ionicons name="speedometer" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{distance} km</Text>
            </View>
          )}
          {duration != null && (
            <View style={styles.infoItem}>
              <Ionicons name="time" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{duration} dk</Text>
            </View>
          )}
          {taskNo && (
            <View style={styles.infoItem}>
              <Text style={styles.infoTaskNo}>{taskNo}</Text>
            </View>
          )}
          {onComplete && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={onComplete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.completeBtnText}>
                    {isEn ? "Complete" : "Tamamla"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Expandable Content */}
      <Animated.View
        style={[
          styles.content,
          {
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
          nestedScrollEnabled={Platform.OS === "android"}
        >
          {routeList.map((item, idx) => (
            <WaypointItem
              key={item.id || `${item._type}-${idx}`}
              waypoint={item}
              displayIndex={item.displayIndex}
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
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  infoTaskNo: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  completeBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completeBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
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
  content: {
    overflow: "hidden",
  },
  waypointsList: {
    maxHeight: 350,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
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
  waypointArrow: {
    marginTop: 4,
  },
});