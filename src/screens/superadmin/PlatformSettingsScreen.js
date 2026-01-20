// src/screens/superadmin/PlatformSettingsScreen.js
import { StyleSheet, Text, View } from "react-native";

const PlatformSettingsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Platform Ayarları</Text>
      <Text style={styles.subtitle}>
        Bu alan yakında yapılandırılabilir platform ayarlarıyla güncellenecek.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F7FAFC",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#32325D",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8898AA",
    textAlign: "center",
  },
});

export default PlatformSettingsScreen;
