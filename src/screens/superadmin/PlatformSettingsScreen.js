// src/screens/superadmin/PlatformSettingsScreen.js
// TulipFleet - Platform Ayarları (Placeholder)
// Updated: UI System Guide v3 uyumlu

import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const PlatformSettingsScreen = () => {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Platform Ayarları</Text>
      <Text style={styles.subtitle}>
        Bu alan yakında yapılandırılabilir platform ayarlarıyla güncellenecek.
      </Text>
    </View>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: COLORS.SPACING.lg,
      backgroundColor: COLORS.BACKGROUND,
    },
    title: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      textAlign: "center",
    },
  });

export default PlatformSettingsScreen;
