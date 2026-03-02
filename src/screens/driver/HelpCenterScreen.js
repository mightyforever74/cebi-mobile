// src/screens/driver/HelpCenterScreen.js
// TulipFleet - Yardım Merkezi (Interaktif FAQ - In-App)
// Shared: Driver & Admin ortak kullanır
// Updated: UI System Guide v3 uyumlu - inline style ihlalleri düzeltildi

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
const FAQItem = ({ question, answer, isOpen, onToggle, COLORS, styles }) => {
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
    <View style={styles.faqItem}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.7}
        style={styles.faqItemHeader}
      >
        <Ionicons
          name="help-circle-outline"
          size={18}
          color={COLORS.PRIMARY}
          style={styles.faqItemIcon}
        />
        <Text style={styles.faqItemQuestion}>{question}</Text>
        <Animated.View style={{ transform: [{ rotate: arrowRotate }] }}>
          <Ionicons name="chevron-down" size={18} color={COLORS.MUTED} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[styles.faqItemBody, { maxHeight: bodyHeight }]}>
        <Text style={styles.faqItemAnswer}>{answer}</Text>
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
  styles,
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
    <View style={styles.categoryCard}>
      <TouchableOpacity
        onPress={toggleCategory}
        activeOpacity={0.7}
        style={styles.categoryHeader}
      >
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: getLightBg(category.color) },
          ]}
        >
          <Ionicons name={category.icon} size={22} color={category.color} />
        </View>

        <View style={styles.categoryInfo}>
          <Text style={styles.categoryTitle}>{t(category.titleKey)}</Text>
          <Text style={styles.categoryCount}>
            {category.questions.length} {t("help.questionCount") || "soru"}
          </Text>
        </View>

        <View
          style={[
            styles.categoryToggle,
            {
              backgroundColor: isExpanded
                ? getLightBg(category.color)
                : COLORS.BACKGROUND,
            },
          ]}
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={isExpanded ? category.color : COLORS.MUTED}
          />
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[styles.categoryContent, { maxHeight: contentHeight }]}
      >
        {category.questions.map((q) => (
          <FAQItem
            key={q.id}
            question={t(q.qKey)}
            answer={t(q.aKey)}
            isOpen={openQuestionId === q.id}
            onToggle={() => onQuestionToggle(q.id)}
            COLORS={COLORS}
            styles={styles}
          />
        ))}
        <View style={{ height: COLORS.SPACING.sm }} />
      </Animated.View>
    </View>
  );
};

// ============================================
// makeStyles - Dark Mode Uyumlu (inline style'lar temizlendi)
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
      paddingBottom: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.CARD,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.BACKGROUND,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    headerTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    headerSubtitle: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    hero: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      padding: COLORS.SPACING.lg,
      borderRadius: COLORS.RADIUS.xl,
      backgroundColor: COLORS.PRIMARY,
    },
    heroIconRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.md,
    },
    heroIconCircle: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.WHITE_20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    heroTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    heroSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.WHITE_80,
      marginTop: 2,
    },
    heroHint: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.WHITE_20,
      borderRadius: COLORS.RADIUS.card,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
    },
    heroHintIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    heroHintText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.WHITE_80,
    },
    quickSection: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xs,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.sm,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    topicCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.xs,
    },
    topicIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.sm,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
    },
    topicTitle: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
    },
    faqSectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.sm,
    },
    categoriesContainer: {
      paddingHorizontal: COLORS.SPACING.md,
    },

    // Category Card (was inline)
    categoryCard: {
      marginBottom: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      backgroundColor: COLORS.CARD,
      ...COLORS.SHADOWS.card,
      overflow: "hidden",
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: COLORS.SPACING.md,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.md,
    },
    categoryInfo: {
      flex: 1,
    },
    categoryTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    categoryCount: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    categoryToggle: {
      width: 32,
      height: 32,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryContent: {
      overflow: "hidden",
      paddingHorizontal: COLORS.SPACING.md,
    },

    // FAQ Item (was inline)
    faqItem: {
      marginBottom: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
      backgroundColor: COLORS.BACKGROUND,
      overflow: "hidden",
    },
    faqItemHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
    },
    faqItemIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    faqItemQuestion: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_PRIMARY,
      lineHeight: 20,
    },
    faqItemBody: {
      overflow: "hidden",
      paddingHorizontal: COLORS.SPACING.md,
    },
    faqItemAnswer: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      lineHeight: 20,
      paddingBottom: COLORS.SPACING.md,
      paddingLeft: COLORS.SPACING.lg + COLORS.SPACING.xs, // 28
    },

    // Contact Card
    contactCard: {
      marginHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.sm,
      padding: COLORS.SPACING.lg,
      borderRadius: COLORS.RADIUS.card,
      backgroundColor: COLORS.CARD,
      alignItems: "center",
      ...COLORS.SHADOWS.card,
    },
    contactIconCircle: {
      width: 48,
      height: 48,
      borderRadius: COLORS.RADIUS.lg,
      backgroundColor: COLORS.SECONDARY,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: COLORS.SPACING.md,
    },
    contactTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      textAlign: "center",
    },
    contactSubtitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.MUTED,
      textAlign: "center",
      marginTop: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.md,
      lineHeight: 18,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.xs,
    },
    contactText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    contactBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      marginTop: COLORS.SPACING.md,
    },
    contactBtnIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    contactBtnText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    footerText: {
      textAlign: "center",
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginVertical: COLORS.SPACING.md,
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
    const email = "info@tulipfleet.com";
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
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT_PRIMARY} />
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

        {/* Quick Topics */}
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
              styles={styles}
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
            <Text style={styles.contactText}>info@tulipfleet.com</Text>
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
