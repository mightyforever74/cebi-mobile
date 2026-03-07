// src/components/ui/EmptyState.js
// TulipFleet - Reusable Empty State Component
// Phase 0 Foundation
//
// DataState'in empty branch'i sayfa-seviye (loading/error ile aynı wrapper).
// EmptyState ise FlatList ListEmptyComponent ve inline empty durumları için.
//
// KULLANIM:
//   // FlatList
//   <FlatList ListEmptyComponent={<EmptyState icon="clipboard-outline"
//     title={t("tasks.noActiveTasks")} subtitle={t("tasks.newTasksWillAppear")} />} />
//
//   // Inline (section içi)
//   <EmptyState icon="alert-circle-outline" title="Uyarı yok"
//     size="sm" />
//
//   // Action button ile
//   <EmptyState icon="add-circle-outline" title="Henüz görev yok"
//     subtitle="İlk görevi oluşturun"
//     action={{ label: "Görev Oluştur", onPress: () => navigation.navigate("CreateTask") }} />

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    // ── Container ────────────────────────────
    // NOT: flex:1 page-level (ScrollView dışı) için güvenli.
    // FlatList ListEmptyComponent içinde → size="sm" kullan (flex:1 yok).
    containerMd: {
      flex:             1,
      justifyContent:   "center",
      alignItems:       "center",
      paddingVertical:  COLORS.SPACING.xxxl,
      paddingHorizontal:COLORS.SPACING.xl,
      backgroundColor:  COLORS.BACKGROUND,
    },
    containerSm: {
      alignItems:       "center",
      paddingVertical:  COLORS.SPACING.xl,
      paddingHorizontal:COLORS.SPACING.lg,
    },
    containerLg: {
      flex:             1,
      justifyContent:   "center",
      alignItems:       "center",
      paddingVertical:  60,
      paddingHorizontal:COLORS.SPACING.xl,
      backgroundColor:  COLORS.BACKGROUND,
    },

    // ── Text ─────────────────────────────────
    titleMd: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color:       COLORS.TEXT,
      marginTop:   COLORS.SPACING.md,
      textAlign:   "center",
    },
    titleSm: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight:  COLORS.TYPOGRAPHY.weights.semibold,
      color:       COLORS.TEXT,
      marginTop:   COLORS.SPACING.sm,
      textAlign:   "center",
    },
    titleLg: {
      ...COLORS.TYPOGRAPHY.styles.h2,
      color:       COLORS.TEXT,
      marginTop:   COLORS.SPACING.md,
      textAlign:   "center",
    },

    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color:       COLORS.TEXT_SECONDARY,
      textAlign:   "center",
      marginTop:   COLORS.SPACING.sm,
    },
    subtitleSm: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color:       COLORS.MUTED,
      textAlign:   "center",
      marginTop:   COLORS.SPACING.xs,
    },

    // ── Action button ─────────────────────────
    actionButton: {
      marginTop:        COLORS.SPACING.md,
      backgroundColor:  COLORS.PRIMARY,
      paddingHorizontal:COLORS.SPACING.lg,
      paddingVertical:  COLORS.SPACING.sm,
      borderRadius:     COLORS.RADIUS.md,
    },
    actionButtonText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color:      COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
  });

// Icon size per size variant
const ICON_SIZES = { sm: 40, md: 64, lg: 80 };

const EmptyState = ({
  icon      = "file-tray-outline",  // Ionicons name
  iconColor,                         // override — default COLORS.MUTED
  title,
  subtitle,
  size      = "md",                  // "sm" | "md" | "lg"
  action,                            // { label: string, onPress: fn }
}) => {
  const styles     = useThemedStyles(makeStyles);
  const { COLORS } = useTheme();

  const containerStyle =
    size === "sm" ? styles.containerSm :
    size === "lg" ? styles.containerLg :
    styles.containerMd;

  const titleStyle =
    size === "sm" ? styles.titleSm :
    size === "lg" ? styles.titleLg :
    styles.titleMd;

  const subtitleStyle =
    size === "sm" ? styles.subtitleSm : styles.subtitle;

  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

  return (
    <View style={containerStyle}>
      <Ionicons
        name={icon}
        size={iconSize}
        color={iconColor || COLORS.MUTED}
      />

      {title ? (
        <Text style={titleStyle}>{title}</Text>
      ) : null}

      {subtitle ? (
        <Text style={subtitleStyle}>{subtitle}</Text>
      ) : null}

      {action ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default EmptyState;
