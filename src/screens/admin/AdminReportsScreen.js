// src/screens/admin/AdminReportsScreen.js
// TulipFleet — Raporlar
// Durum: Veri üretim zinciri tamamlanana kadar placeholder
// Bkz: REPORTS_MODULE_AGENT.md

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container:    { flex: 1, backgroundColor: COLORS.BACKGROUND },
    content:      { flex: 1, alignItems: "center", justifyContent: "center", padding: COLORS.SPACING.xl },
    icon:         { marginBottom: COLORS.SPACING.lg },
    title:        { fontSize: COLORS.TYPOGRAPHY.sizes.xl, fontWeight: COLORS.TYPOGRAPHY.weights.bold, color: COLORS.TEXT, textAlign: "center", marginBottom: COLORS.SPACING.sm },
    subtitle:     { fontSize: COLORS.TYPOGRAPHY.sizes.md, color: COLORS.TEXT_SECONDARY, textAlign: "center", marginBottom: COLORS.SPACING.xl, lineHeight: 24 },
    divider:      { width: "80%", height: 1, backgroundColor: COLORS.DIVIDER, marginBottom: COLORS.SPACING.xl },
    roadmapTitle: { fontSize: COLORS.TYPOGRAPHY.sizes.sm, fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: 1, marginBottom: COLORS.SPACING.md },
    item:         { flexDirection: "row", alignItems: "flex-start", marginBottom: COLORS.SPACING.md, width: "100%" },
    itemDot:      { width: 8, height: 8, borderRadius: COLORS.RADIUS.pill, marginTop: 6, marginRight: COLORS.SPACING.sm },
    itemText:     { flex: 1, fontSize: COLORS.TYPOGRAPHY.sizes.sm, color: COLORS.TEXT_SECONDARY, lineHeight: 20 },
    itemLabel:    { fontWeight: COLORS.TYPOGRAPHY.weights.semibold, color: COLORS.TEXT },
  });

const ROADMAP = [
  { done: false, label: "Görev tarihleri zorunlu hale getiriliyor", desc: "planned_start / planned_end doldurulacak" },
  { done: false, label: "Mesafe otomatik hesaplanacak", desc: "actual_distance_km GPS verisiyle güncellenecek" },
  { done: false, label: "Operasyon Özet Raporu", desc: "Dönemsel PDF — görev, sürücü, araç" },
  { done: false, label: "Sürücü Performans Raporu", desc: "Görev tamamlama, sürüş kalitesi, skor" },
];

const AdminReportsScreen = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.icon}>
        <Ionicons name="document-text-outline" size={72} color={COLORS.TEXT_MUTED} />
      </View>

      <Text style={styles.title}>Raporlar Geliştiriliyor</Text>

      <Text style={styles.subtitle}>
        Anlamlı raporlar için önce veri üretim zincirini tamamlıyoruz.{"\n"}
        Görev süreleri ve mesafe verileri hazır olduğunda{"\n"}
        PDF export aktif olacak.
      </Text>

      <View style={styles.divider} />

      <Text style={styles.roadmapTitle}>Yol Haritası</Text>

      {ROADMAP.map((item, idx) => (
        <View key={idx} style={styles.item}>
          <View style={[styles.itemDot, { backgroundColor: item.done ? COLORS.SUCCESS : COLORS.TEXT_MUTED }]} />
          <Text style={styles.itemText}>
            <Text style={styles.itemLabel}>{item.label}{"\n"}</Text>
            {item.desc}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

export default AdminReportsScreen;
