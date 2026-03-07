// src/components/ui/StatusBadge.js
// TulipFleet - Status Badge Component
// Phase 0 - Component Library
// UI Guide v3 compliant: COLORS token, 8px grid, sıfır hardcoded hex

import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { withAlpha } from "../../utils/colorUtils";

/**
 * Severity → COLORS token mapping
 * Yeni severity eklemek için BURAYA GEL
 */
const SEVERITY_MAP = {
  CRITICAL: { token: "ERROR",   defaultLabel: "Critical" },
  WARNING:  { token: "WARNING", defaultLabel: "Warning"  },
  INFO:     { token: "INFO",    defaultLabel: "Info"     },
  SUCCESS:  { token: "SUCCESS", defaultLabel: "OK"       },
  // Vehicle / Task status aliases
  ONLINE:   { token: "SUCCESS", defaultLabel: "Online"   },
  OFFLINE:  { token: "MUTED",   defaultLabel: "Offline"  },
  ON_TASK:  { token: "PRIMARY", defaultLabel: "On Task"  },
  PENDING:  { token: "WARNING", defaultLabel: "Pending"  },
  RESOLVED: { token: "MUTED",   defaultLabel: "Resolved" },
};

/**
 * StatusBadge
 *
 * @param {string} status   - "CRITICAL" | "WARNING" | "INFO" | "SUCCESS" | "ONLINE" | "OFFLINE" | "ON_TASK" | "PENDING" | "RESOLVED"
 * @param {string} label    - Override label (i18n string verilirse status default'u ezer)
 * @param {"sm"|"md"|"lg"} size - Badge boyutu (default: "md")
 * @param {boolean} dot     - Renkli nokta göster (default: false)
 *
 * @example
 * <StatusBadge status="CRITICAL" />
 * <StatusBadge status="WARNING" label={t("alerts.warning")} />
 * <StatusBadge status="ONLINE" size="sm" dot />
 */
export default function StatusBadge({
  status = "INFO",
  label,
  size = "md",
  dot = false,
}) {
  const { COLORS } = useTheme();

  const cfg = SEVERITY_MAP[status?.toUpperCase()] || SEVERITY_MAP.INFO;
  const color = COLORS[cfg.token] || COLORS.INFO;
  const text = label || cfg.defaultLabel;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: withAlpha(color, 0.12),
          borderColor: withAlpha(color, 0.35),
        },
        size === "sm" && styles.badgeSm,
        size === "lg" && styles.badgeLg,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: color },
            size === "sm" && styles.dotSm,
          ]}
        />
      )}
      <Text
        style={[
          styles.text,
          { color },
          size === "sm" && styles.textSm,
          size === "lg" && styles.textLg,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10, // ~8px grid
    paddingVertical: 4,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  dotSm: {
    width: 5,
    height: 5,
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
    fontWeight: "600",
  },
  textLg: {
    fontSize: 14,
    fontWeight: "700",
  },
});
