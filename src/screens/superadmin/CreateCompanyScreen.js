// src/screens/superadmin/CreateCompanyScreen.js
// TulipFleet - Yeni Şirket Oluşturma (3 Adım Wizard)
// Updated: UI System Guide v3 uyumlu

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const CreateCompanyScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const [maxVehicles, setMaxVehicles] = useState("10");
  const [maxDrivers, setMaxDrivers] = useState("10");

  const generateSlug = (name) =>
    name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleCompanyNameChange = (text) => {
    setCompanyName(text);
    setCompanySlug(generateSlug(text));
  };
  const validateStep1 = () => {
    if (!companyName.trim()) {
      Alert.alert(t("common.error"), t("superadmin.create.nameRequired"));
      return false;
    }
    if (!companySlug.trim()) {
      Alert.alert(t("common.error"), t("superadmin.create.slugRequired"));
      return false;
    }
    return true;
  };
  const validateStep2 = () => {
    if (!adminEmail.trim()) {
      Alert.alert(t("common.error"), t("superadmin.create.adminEmailRequired"));
      return false;
    }
    if (!adminEmail.includes("@")) {
      Alert.alert(t("common.error"), t("superadmin.create.emailInvalid"));
      return false;
    }
    if (!adminPassword || adminPassword.length < 6) {
      Alert.alert(t("common.error"), t("superadmin.create.passwordShort"));
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateStep1() || !validateStep2()) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/superadmin/companies`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: companyName,
          slug: companySlug,
          tax_id: taxId,
          address,
          city,
          phone,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_first_name: adminFirstName,
          admin_last_name: adminLastName,
          admin_phone: adminPhone,
          max_vehicles: parseInt(maxVehicles) || 10,
          max_drivers: parseInt(maxDrivers) || 10,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert(
          t("common.success"),
          t("superadmin.create.success", {
            name: companyName,
            email: adminEmail,
          }),
          [{ text: t("common.ok"), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          t("common.error"),
          data.error || t("superadmin.create.failed")
        );
      }
    } catch (error) {
      console.error("Create error:", error);
      Alert.alert(t("common.error"), t("superadmin.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    autoCapitalize,
    secureTextEntry,
    multiline,
    numberOfLines,
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.PLACEHOLDER}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("superadmin.create.companyInfo")}</Text>
      <Text style={styles.stepDescription}>
        {t("superadmin.create.step1desc")}
      </Text>
      <InputField
        label={t("superadmin.create.companyName")}
        value={companyName}
        onChangeText={handleCompanyNameChange}
        placeholder={t("superadmin.create.namePlaceholder")}
      />
      <InputField
        label={t("superadmin.create.slugUrl")}
        value={companySlug}
        onChangeText={setCompanySlug}
        placeholder="abc-lojistik"
        autoCapitalize="none"
      />
      <InputField
        label={t("superadmin.create.taxId")}
        value={taxId}
        onChangeText={setTaxId}
        placeholder={t("superadmin.create.taxPlaceholder")}
        keyboardType="numeric"
      />
      <InputField
        label={t("superadmin.create.city")}
        value={city}
        onChangeText={setCity}
        placeholder={t("superadmin.create.cityPlaceholder")}
      />
      <InputField
        label={t("superadmin.create.address")}
        value={address}
        onChangeText={setAddress}
        placeholder={t("superadmin.create.addressPlaceholder")}
        multiline
        numberOfLines={3}
      />
      <InputField
        label={t("superadmin.create.phone")}
        value={phone}
        onChangeText={setPhone}
        placeholder="+90 5XX XXX XX XX"
        keyboardType="phone-pad"
      />
      <TouchableOpacity
        style={styles.nextButton}
        onPress={() => validateStep1() && setStep(2)}
      >
        <Text style={styles.nextButtonText}>{t("superadmin.create.next")}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{t("superadmin.create.adminAccount")}</Text>
      <Text style={styles.stepDescription}>
        {t("superadmin.create.adminAccountDesc")}
      </Text>
      <InputField
        label={t("superadmin.create.email")}
        value={adminEmail}
        onChangeText={setAdminEmail}
        placeholder="admin@sirket.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <InputField
        label={t("superadmin.create.password")}
        value={adminPassword}
        onChangeText={setAdminPassword}
        placeholder={t("createDriver.passwordPlaceholder")}
        secureTextEntry
      />
      <InputField
        label={t("superadmin.create.firstName")}
        value={adminFirstName}
        onChangeText={setAdminFirstName}
        placeholder={t("superadmin.create.firstNamePlaceholder")}
      />
      <InputField
        label={t("superadmin.create.lastName")}
        value={adminLastName}
        onChangeText={setAdminLastName}
        placeholder={t("superadmin.create.lastNamePlaceholder")}
      />
      <InputField
        label={t("superadmin.create.phone")}
        value={adminPhone}
        onChangeText={setAdminPhone}
        placeholder="+90 5XX XXX XX XX"
        keyboardType="phone-pad"
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backBtn]}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backBtnText}>{t("superadmin.create.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={() => validateStep2() && setStep(3)}
        >
          <Text style={styles.nextButtonText}>
            {t("superadmin.create.next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {t("superadmin.create.packageLimits")}
      </Text>
      <Text style={styles.stepDescription}>
        {t("superadmin.create.packageLimitsDesc")}
      </Text>
      <InputField
        label={t("superadmin.create.maxVehiclesCount")}
        value={maxVehicles}
        onChangeText={setMaxVehicles}
        placeholder="10"
        keyboardType="numeric"
      />
      <InputField
        label={t("superadmin.create.maxDriversCount")}
        value={maxDrivers}
        onChangeText={setMaxDrivers}
        placeholder="10"
        keyboardType="numeric"
      />

      <Card variant="flat" style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{t("superadmin.create.summary")}</Text>
        {[
          {
            label: t("superadmin.create.summaryCompany"),
            value: companyName,
          },
          { label: t("superadmin.create.summaryAdmin"), value: adminEmail },
          {
            label: t("superadmin.create.summaryLimitsLabel"),
            value: t("superadmin.create.summaryLimits", {
              vehicles: maxVehicles,
              drivers: maxDrivers,
            }),
          },
        ].map((row, i) => (
          <View key={i} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </Card>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.navButton, styles.backBtn]}
          onPress={() => setStep(2)}
        >
          <Text style={styles.backBtnText}>{t("superadmin.create.back")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.createBtn]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.WHITE} size="small" />
          ) : (
            <Text style={styles.createBtnText}>
              {t("superadmin.create.submit")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((s, i) => (
            <View
              key={s}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {i > 0 && (
                <View
                  style={[
                    styles.progressLine,
                    step >= s && styles.progressLineActive,
                  ]}
                />
              )}
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    step >= s && styles.progressDotActive,
                  ]}
                >
                  <Text style={styles.progressDotText}>{s}</Text>
                </View>
                <Text style={styles.progressLabel}>
                  {s === 1
                    ? t("superadmin.dashboard.company")
                    : s === 2
                      ? t("superadmin.users.admin")
                      : t("superadmin.companies.package")}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    scrollView: { flex: 1 },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.lg,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    progressStep: { alignItems: "center" },
    progressDot: {
      width: COLORS.SPACING.xl,
      height: COLORS.SPACING.xl,
      borderRadius: COLORS.SPACING.md,
      backgroundColor: COLORS.DIVIDER,
      justifyContent: "center",
      alignItems: "center",
    },
    progressDotActive: { backgroundColor: COLORS.PRIMARY },
    progressDotText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.WHITE,
    },
    progressLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    progressLine: {
      width: COLORS.SPACING.xl,
      height: 3,
      backgroundColor: COLORS.DIVIDER,
      marginHorizontal: COLORS.SPACING.xs,
    },
    progressLineActive: { backgroundColor: COLORS.PRIMARY },
    stepContent: { padding: COLORS.SPACING.lg },
    stepTitle: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    stepDescription: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      marginBottom: COLORS.SPACING.lg,
    },
    inputGroup: { marginBottom: COLORS.SPACING.md },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    input: {
      backgroundColor: COLORS.INPUT_BG,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      borderRadius: COLORS.RADIUS.sm,
      padding: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
    },
    textArea: { height: 80, textAlignVertical: "top" },
    buttonRow: { flexDirection: "row", marginTop: COLORS.SPACING.lg },
    navButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
    },
    backBtn: {
      backgroundColor: COLORS.SECONDARY,
      marginRight: COLORS.SPACING.sm,
    },
    backBtnText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.TEXT_SECONDARY,
    },
    nextButton: {
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginTop: COLORS.SPACING.lg,
    },
    nextButtonText: { ...COLORS.TYPOGRAPHY.styles.button, color: COLORS.WHITE },
    createBtn: {
      backgroundColor: COLORS.SUCCESS,
      marginLeft: COLORS.SPACING.sm,
    },
    createBtnText: { ...COLORS.TYPOGRAPHY.styles.button, color: COLORS.WHITE },
    summaryCard: { marginTop: COLORS.SPACING.md },
    summaryTitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    summaryRow: { flexDirection: "row", marginBottom: COLORS.SPACING.sm },
    summaryLabel: {
      width: 80,
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
    },
    summaryValue: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
  });

export default CreateCompanyScreen;
