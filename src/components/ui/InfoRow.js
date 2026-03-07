// src/components/ui/InfoRow.js
// TulipFleet - Reusable Info Row Component
// Phase 0 Foundation
//
// İKİ VARIANT:
//   "row"    → label left / value right (space-between) + optional divider
//             DriverTaskDetail, DriverVehicle, DriverProfile tarzı
//   "detail" → icon (optional) / label (fixed width) / value (flex)
//             AdminTasks, DriverTaskDetail expanded tarzı
//
// KULLANIM:
//   <InfoRow label="Plaka" value="34 ABC 123" />
//   <InfoRow label="Mesafe" value="128 km" divider />
//   <InfoRow variant="detail" icon="flag-outline" iconColor={COLORS.ERROR}
//            label="Öncelik" value="Yüksek" />
//   <InfoRow label="Durum" value={<StatusBadge status="SUCCESS" />} />

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    // ── "row" variant ──────────────────────────
    row: {
      flexDirection:    "row",
      justifyContent:   "space-between",
      alignItems:       "center",
      paddingVertical:  COLORS.SPACING.sm,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    rowLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      flex: 1,
    },
    rowValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT,
      textAlign: "right",
      flex: 1,
    },

    // ── "detail" variant ────────────────────────
    detail: {
      flexDirection:  "row",
      alignItems:     "flex-start",
      marginBottom:   COLORS.SPACING.sm,
    },
    detailIcon: {
      width:           24,
      alignItems:      "center",
      marginTop:       2,
    },
    detailLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color:       COLORS.MUTED,
      width:       80,
      marginLeft:  COLORS.SPACING.xs,
    },
    detailValue: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color:      COLORS.TEXT,
      flex:       1,
    },

    // ── valueNode containers ──────────────────
    valueNodeRow: {
      flex:       1,
      alignItems: "flex-end",
    },
    valueNodeDetail: {
      flex: 1,
    },
  });

const InfoRow = ({
  variant   = "row",  // "row" | "detail"
  label,
  value,
  // "row" props
  divider   = false,
  // "detail" props
  icon,               // Ionicons name
  iconColor,          // override — default COLORS.MUTED
  iconSize  = 16,
  // value override için (node kabul eder)
  valueNode,          // varsa value string yerine bu render edilir
  // numberOfLines for value
  numberOfLines,
}) => {
  const styles     = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  if (variant === "detail") {
    return (
      <View style={styles.detail}>
        {/* icon slot — boşsa da yer kaplar (alignment için) */}
        <View style={styles.detailIcon}>
          {icon ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor || COLORS.MUTED}
            />
          ) : null}
        </View>

        <Text style={styles.detailLabel} numberOfLines={1}>
          {label}
        </Text>

        {valueNode ? (
          <View style={styles.valueNodeDetail}>{valueNode}</View>
        ) : (
          <Text style={styles.detailValue} numberOfLines={numberOfLines}>
            {value ?? "—"}
          </Text>
        )}
      </View>
    );
  }

  // default: "row" variant
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {valueNode ? (
        <View style={styles.valueNodeRow}>{valueNode}</View>
      ) : (
        <Text style={styles.rowValue} numberOfLines={numberOfLines}>
          {value ?? "—"}
        </Text>
      )}
    </View>
  );
};

export default InfoRow;
