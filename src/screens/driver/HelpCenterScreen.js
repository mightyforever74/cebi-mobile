// src/screens/shared/HelpCenterScreen.js
// TulipFleet - Yardım Merkezi (Interaktif FAQ - In-App)
// Shared: Driver & Admin ortak kullanır
// Updated: 11 Şubat 2026 - Theme tokens + 8px grid cleanup
// Mevcut: TroubleshootingScreen + LEDIndicatorsScreen linkleri korundu

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

// ============================================
// QUICK HELP TOPICS - Renkler runtime'da COLORS'dan alınır
// ============================================
const getQuickTopics = (COLORS) => [
  {
    id: "troubleshooting",
    icon: "build-outline",
    color: COLORS.WARNING,
    titleKey: "help.troubleshooting",
    screen: "TroubleshootingScreen",
  },
  {
    id: "led",
    icon: "bulb-outline",
    color: COLORS.SUCCESS,
    titleKey: "help.ledIndicators",
    screen: "LEDIndicatorsScreen",
  },
];

// ============================================
// FAQ CATEGORIES - Renkler runtime'da COLORS'dan alınır
// ============================================
const getFaqCategories = (COLORS) => [
  {
    id: "account",
    icon: "person-circle-outline",
    color: COLORS.PRIMARY,
    titleKey: "help.account.title",
    questions: [
      { id: "a1", qKey: "help.account.q1", aKey: "help.account.a1" },
      { id: "a2", qKey: "help.account.q2", aKey: "help.account.a2" },
      { id: "a3", qKey: "help.account.q3", aKey: "help.account.a3" },
    ],
  },
  {
    id: "vehicles",
    icon: "car-sport-outline",
    color: COLORS.SUCCESS,
    titleKey: "help.vehicles.title",
    questions: [
      { id: "v1", qKey: "help.vehicles.q1", aKey: "help.vehicles.a1" },
      { id: "v2", qKey: "help.vehicles.q2", aKey: "help.vehicles.a2" },
      { id: "v3", qKey: "help.vehicles.q3", aKey: "help.vehicles.a3" },
    ],
  },
  {
    id: "tasks",
    icon: "clipboard-outline",
    color: COLORS.WARNING,
    titleKey: "help.tasks.title",
    questions: [
      { id: "t1", qKey: "help.tasks.q1", aKey: "help.tasks.a1" },
      { id: "t2", qKey: "help.tasks.q2", aKey: "help.tasks.a2" },
      { id: "t3", qKey: "help.tasks.q3", aKey: "help.tasks.a3" },
    ],
  },
  {
    id: "technical",
    icon: "settings-outline",
    color: COLORS.LABEL,
    titleKey: "help.technical.title",
    questions: [
      { id: "tc1", qKey: "help.technical.q1", aKey: "help.technical.a1" },
      { id: "tc2", qKey: "help.technical.q2", aKey: "help.technical.a2" },
      { id: "tc3", qKey: "help.technical.q3", aKey: "help.technical.a3" },
    ],
  },
];

// ============================================
// FAQ ITEM (Accordion - Animated)
// ============================================
const FAQItem = ({ question, answer, isOpen, onToggle, COLORS }) => {
  const animValue = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    Animated.timing(animValue, {
      toValue: isOpen ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    onToggle();
  }, [isOpen, onToggle, animValue]);

  const bodyHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const arrowRotate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      style={{
        marginBottom: COLORS.SPACING.sm, // 8
        borderRadius: COLORS.RADIUS.sm, // 8
        backgroundColor: COLORS.BACKGROUND,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: COLORS.SPACING.md, // 16
          paddingVertical: COLORS.SPACING.sm + COLORS.SPACING.xs, // 12
        }}
      >
        <Ionicons
          name="help-circle-outline"
          size={18}
          color={COLORS.PRIMARY}
          style={{ marginRight: COLORS.SPACING.sm }} // 8
        />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: COLORS.TEXT,
            lineHeight: 20,
          }}
        >
          {question}
        </Text>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={COLORS.MUTED} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: bodyHeight,
          overflow: "hidden",
          paddingHorizontal: COLORS.SPACING.md, // 16
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: COLORS.TEXT_SECONDARY,
            lineHeight: 20,
            paddingBottom: COLORS.SPACING.md, // 16
            paddingLeft: COLORS.SPACING.lg + COLORS.SPACING.xs, // 28
          }}
        >
          {answer}
        </Text>
      </Animated.View>
    </View>
  );
};

// ============================================
// CATEGORY CARD (Expandable)
// ============================================
const CategoryCard = ({
  category,
  isExpanded,
  onToggle,
  openQuestionId,
  onQuestionToggle,
  t,
  COLORS,
  getLightBg,
}) => {
  const animValue = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  const toggleCategory = useCallback(() => {
    Animated.timing(animValue, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    onToggle();
  }, [isExpanded, onToggle, animValue]);

  const contentHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500],
  });

  return (
    <View
      style={{
        marginBottom: COLORS.SPACING.md, // 16
        borderRadius: COLORS.RADIUS.card, // 12
        backgroundColor: COLORS.CARD,
        ...COLORS.SHADOWS.card,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={toggleCategory}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: COLORS.SPACING.md, // 16
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: COLORS.RADIUS.sm, // 8
            backgroundColor: getLightBg(category.color),
            alignItems: "center",
            justifyContent: "center",
            marginRight: COLORS.SPACING.md, // 16
          }}
        >
          <Ionicons name={category.icon} size={22} color={category.color} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.TEXT }}>
            {t(category.titleKey)}
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.MUTED, marginTop: 2 }}>
            {category.questions.length} {t("help.questionCount") || "soru"}
          </Text>
        </View>

        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: COLORS.RADIUS.md, // 16
            backgroundColor: isExpanded
              ? getLightBg(category.color)
              : COLORS.BACKGROUND,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={isExpanded ? category.color : COLORS.MUTED}
          />
        </View>
      </TouchableOpacity>

      <Animated.View
        style={{
          maxHeight: contentHeight,
          overflow: "hidden",
          paddingHorizontal: COLORS.SPACING.md, // 16
        }}
      >
        {category.questions.map((q) => (
          <FAQItem
            key={q.id}
            question={t(q.qKey)}
            answer={t(q.aKey)}
            isOpen={openQuestionId === q.id}
            onToggle={() => onQuestionToggle(q.id)}
            COLORS={COLORS}
          />
        ))}
        <View style={{ height: COLORS.SPACING.sm }} />
      </Animated.View>
    </View>
  );
};

// ============================================
// makeStyles - Dark Mode Uyumlu
// ============================================
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: Platform.OS === "ios" ? 56 : 44,
      paddingBottom: COLORS.SPACING.md, // 16
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.CARD,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.full, // 20
      backgroundColor: COLORS.BACKGROUND,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: COLORS.TEXT,
    },
    headerSubtitle: {
      fontSize: 12,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    hero: {
      marginHorizontal: COLORS.SPACING.md, // 16
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm, // 8
      padding: COLORS.SPACING.lg, // 24
      borderRadius: COLORS.RADIUS.xl, // 20
      backgroundColor: COLORS.PRIMARY,
    },
    heroIconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md, // 16
    },
    heroIconCircle: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.lg, // 24
      backgroundColor: COLORS.WHITE_20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: COLORS.WHITE,
    },
    heroSubtitle: {
      fontSize: 13,
      color: COLORS.WHITE_80,
      marginTop: 2,
    },
    heroHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WHITE_20,
      borderRadius: COLORS.RADIUS.card, // 12
      paddingHorizontal: COLORS.SPACING.md, // 16
      paddingVertical: COLORS.SPACING.sm + 2, // 10
    },
    heroHintIcon: {
      marginRight: COLORS.SPACING.sm, // 8 - gap yerine
    },
    heroHintText: {
      fontSize: 13,
      color: COLORS.WHITE_80,
      fontWeight: "500",
    },
    quickSection: {
      marginHorizontal: COLORS.SPACING.md, // 16
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xs, // 4
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.sm + 2, // 10
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    topicCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.card, // 12
      padding: COLORS.SPACING.md, // 16
      marginBottom: COLORS.SPACING.sm, // 8
      ...COLORS.SHADOWS.xs,
    },
    topicIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.sm, // 8
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md, // 16
    },
    topicTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: COLORS.TEXT,
    },
    faqSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: COLORS.TEXT,
      marginHorizontal: COLORS.SPACING.md, // 16
      marginTop: COLORS.SPACING.lg, // 24
      marginBottom: COLORS.SPACING.sm + 2, // 10
    },
    categoriesContainer: {
      paddingHorizontal: COLORS.SPACING.md, // 16
    },
    contactCard: {
      marginHorizontal: COLORS.SPACING.md, // 16
      marginTop: COLORS.SPACING.lg, // 24
      marginBottom: COLORS.SPACING.sm + 2, // 10
      padding: COLORS.SPACING.lg, // 24
      borderRadius: COLORS.RADIUS.card, // 12
      backgroundColor: COLORS.CARD,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    contactIconCircle: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.lg, // 24
      backgroundColor: COLORS.SECONDARY,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.md, // 16
    },
    contactTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: COLORS.TEXT,
      textAlign: "center",
    },
    contactSubtitle: {
      fontSize: 13,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.xs, // 4
      marginBottom: COLORS.SPACING.md, // 16
      lineHeight: 18,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs + 2, // 6
    },
    contactText: {
      fontSize: 14,
      color: COLORS.TEXT,
      marginLeft: COLORS.SPACING.sm + 2, // 10
    },
    contactBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg, // 24
      paddingVertical: COLORS.SPACING.md, // 16
      borderRadius: COLORS.RADIUS.card, // 12
      marginTop: COLORS.SPACING.md, // 16
    },
    contactBtnIcon: {
      marginRight: COLORS.SPACING.sm, // 8 - gap yerine
    },
    contactBtnText: {
      color: COLORS.WHITE,
      fontWeight: "700",
      fontSize: 14,
    },
    footerText: {
      textAlign: "center",
      fontSize: 11,
      color: COLORS.MUTED,
      marginVertical: COLORS.SPACING.md, // 16
      opacity: 0.6,
    },
  });

// ============================================
// MAIN COMPONENT
// ============================================
const HelpCenterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Theme-aware light background helper
  const getLightBg = (color) => {
    if (color === COLORS.SUCCESS) return COLORS.SUCCESS_LIGHT;
    if (color === COLORS.WARNING) return COLORS.WARNING_LIGHT;
    if (color === COLORS.ERROR) return COLORS.ERROR_LIGHT;
    if (color === COLORS.INFO) return COLORS.INFO_LIGHT;
    if (color === COLORS.PRIMARY) return COLORS.SECONDARY;
    if (color === COLORS.LABEL) return COLORS.INFO_LIGHT;
    return COLORS.DIVIDER;
  };

  // Runtime data with theme colors
  const QUICK_TOPICS = getQuickTopics(COLORS);
  const FAQ_CATEGORIES = getFaqCategories(COLORS);

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [openQuestionId, setOpenQuestionId] = useState(null);

  const handleCategoryToggle = useCallback(
    (catId) => {
      if (expandedCategory === catId) {
        setExpandedCategory(null);
        setOpenQuestionId(null);
      } else {
        setExpandedCategory(catId);
        setOpenQuestionId(null);
      }
    },
    [expandedCategory]
  );

  const handleQuestionToggle = useCallback((qId) => {
    setOpenQuestionId((prev) => (prev === qId ? null : qId));
  }, []);

  const handleTopicPress = useCallback(
    (topic) => {
      if (topic.screen) {
        navigation.navigate(topic.screen);
      }
    },
    [navigation]
  );

  const handleContactSupport = useCallback(() => {
    const email = "mightyforever74@gmail.com";
    const subject = encodeURIComponent("TulipFleet - Destek Talebi");
    const body = encodeURIComponent(
      `\n\n---\nPlatform: ${Platform.OS} ${Platform.Version}\nUygulama: TulipFleet`
    );
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(
      () => {}
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            {t("help.title") || "Yardım Merkezi"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t("help.subtitle") || "Sıkça sorulan sorular ve rehber"}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: COLORS.SPACING.xl }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconRow}>
            <View style={styles.heroIconCircle}>
              <Ionicons name="book-outline" size={24} color={COLORS.WHITE} />
            </View>
            <View>
              <Text style={styles.heroTitle}>
                {t("help.heroTitle") || "Nasıl yardımcı olabiliriz?"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {t("help.heroSubtitle") || "Sıkça sorulan sorulara göz atın"}
              </Text>
            </View>
          </View>
          <View style={styles.heroHint}>
            <Ionicons
              name="bulb-outline"
              size={16}
              color={COLORS.WHITE_80}
              style={styles.heroHintIcon}
            />
            <Text style={styles.heroHintText}>
              {t("help.heroHint") || "Bir kategoriye tıklayarak soruları görün"}
            </Text>
          </View>
        </View>

        {/* Quick Topics (Troubleshooting + LED) */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>
            {t("help.quickHelp") || "Hızlı Yardım"}
          </Text>
          {QUICK_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic.id}
              style={styles.topicCard}
              onPress={() => handleTopicPress(topic)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.topicIcon,
                  { backgroundColor: getLightBg(topic.color) },
                ]}
              >
                <Ionicons name={topic.icon} size={24} color={topic.color} />
              </View>
              <Text style={styles.topicTitle}>
                {t(topic.titleKey) || topic.id}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Categories */}
        <Text style={styles.faqSectionTitle}>
          {t("help.faqTitle") || "Sıkça Sorulan Sorular"}
        </Text>
        <View style={styles.categoriesContainer}>
          {FAQ_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isExpanded={expandedCategory === cat.id}
              onToggle={() => handleCategoryToggle(cat.id)}
              openQuestionId={
                expandedCategory === cat.id ? openQuestionId : null
              }
              onQuestionToggle={handleQuestionToggle}
              t={t}
              COLORS={COLORS}
              getLightBg={getLightBg}
            />
          ))}
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <View style={styles.contactIconCircle}>
            <Ionicons
              name="chatbubbles-outline"
              size={26}
              color={COLORS.PRIMARY}
            />
          </View>
          <Text style={styles.contactTitle}>
            {t("help.contact.title") || "Yine de yardıma mı ihtiyacınız var?"}
          </Text>
          <Text style={styles.contactSubtitle}>
            {t("help.contact.subtitle") ||
              "Sorunuz burada yoksa, destek ekibimizle iletişime geçin"}
          </Text>

          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color={COLORS.MUTED} />
            <Text style={styles.contactText}>mightyforever74@gmail.com</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.MUTED} />
            <Text style={styles.contactText}>+31 6 8367 4537 (NL)</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color={COLORS.MUTED} />
            <Text style={styles.contactText}>+90 533 325 6180 (TR)</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="globe-outline" size={18} color={COLORS.MUTED} />
            <Text style={styles.contactText}>www.tulipfleet.com</Text>
          </View>

          <TouchableOpacity
            style={styles.contactBtn}
            onPress={handleContactSupport}
            activeOpacity={0.7}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={COLORS.WHITE}
              style={styles.contactBtnIcon}
            />
            <Text style={styles.contactBtnText}>
              {t("help.contact.button") || "E-posta Gönder"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>
          {t("help.footer") || "© 2026 TulipFleet - Tüm hakları saklıdır"}
        </Text>
      </ScrollView>
    </View>
  );
};

export default HelpCenterScreen;
