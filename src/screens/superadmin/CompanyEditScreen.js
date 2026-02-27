// src/screens/superadmin/CompanyEditScreen.js
// TulipFleet - Şirket Düzenleme Ekranı
// Updated: UI System Guide v3 uyumlu

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../constants/config";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const CompanyEditScreen = ({ route, navigation }) => {
  const { companyId } = route.params || {};
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
    email: "",
    is_active: true,
  });

  useEffect(() => {
    if (companyId) fetchCompany();
    else {
      Alert.alert("Hata", "Şirket ID bulunamadı");
      navigation.goBack();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş");
        navigation.goBack();
        return;
      }
      const response = await fetch(
        `${API_URL}/api/superadmin/companies/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const cd = data.company || data;
        setCompany({
          name: cd.name || "",
          slug: cd.slug || "",
          address: cd.address || "",
          phone: cd.phone || "",
          email: cd.email || "",
          is_active: cd.status === "active" || cd.is_active !== false,
        });
      } else {
        Alert.alert("Hata", "Şirket bilgileri yüklenemedi");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Fetch company error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!company.name.trim()) {
      Alert.alert("Hata", "Şirket adı zorunludur");
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        Alert.alert("Hata", "Oturum süresi dolmuş");
        return;
      }
      const response = await fetch(
        `${API_URL}/api/superadmin/companies/${companyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: company.name,
            slug: company.slug,
            address: company.address,
            phone: company.phone,
            email: company.email,
            status: company.is_active ? "active" : "inactive",
          }),
        }
      );
      if (response.ok) {
        Alert.alert("Başarılı", "Şirket güncellendi", [
          { text: "Tamam", onPress: () => navigation.goBack() },
        ]);
      } else {
        const ed = await response.json().catch(() => ({}));
        Alert.alert("Hata", ed.error || "Güncelleme başarısız");
      }
    } catch (error) {
      console.error("Save company error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {[
            {
              key: "name",
              label: "Şirket Adı *",
              icon: "business-outline",
              placeholder: "Şirket adı",
            },
            {
              key: "slug",
              label: "Slug",
              icon: "link-outline",
              placeholder: "sirket-slug",
              autoCapitalize: "none",
            },
            {
              key: "email",
              label: "Email",
              icon: "mail-outline",
              placeholder: "info@sirket.com",
              keyboardType: "email-address",
              autoCapitalize: "none",
            },
            {
              key: "phone",
              label: "Telefon",
              icon: "call-outline",
              placeholder: "+90 555 123 4567",
              keyboardType: "phone-pad",
            },
          ].map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name={field.icon} size={20} color={COLORS.MUTED} />
                <TextInput
                  style={styles.input}
                  value={company[field.key]}
                  onChangeText={(text) =>
                    setCompany({
                      ...company,
                      [field.key]:
                        field.key === "slug"
                          ? text.toLowerCase().replace(/\s+/g, "-")
                          : text,
                    })
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={COLORS.PLACEHOLDER}
                  keyboardType={field.keyboardType}
                  autoCapitalize={field.autoCapitalize}
                />
              </View>
            </View>
          ))}

          {/* Adres */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adres</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  height: 80,
                  alignItems: "flex-start",
                  paddingTop: COLORS.SPACING.sm,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.MUTED}
              />
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: "top" }]}
                value={company.address}
                onChangeText={(text) =>
                  setCompany({ ...company, address: text })
                }
                placeholder="Şirket adresi"
                placeholderTextColor={COLORS.PLACEHOLDER}
                multiline
              />
            </View>
          </View>

          {/* Aktif Durumu */}
          <View style={styles.switchGroup}>
            <View>
              <Text style={styles.label}>Şirket Durumu</Text>
              <Text style={styles.switchDescription}>
                {company.is_active ? "Şirket aktif" : "Şirket pasif"}
              </Text>
            </View>
            <Switch
              value={company.is_active}
              onValueChange={(v) => setCompany({ ...company, is_active: v })}
              trackColor={{ false: COLORS.SWITCH_OFF, true: COLORS.SWITCH_ON }}
              thumbColor={COLORS.WHITE}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={COLORS.WHITE}
              />
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
    },
    scrollView: { flex: 1 },
    form: { padding: COLORS.SPACING.lg },
    inputGroup: { marginBottom: COLORS.SPACING.lg },
    label: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.INPUT_BG,
      borderRadius: COLORS.RADIUS.input,
      paddingHorizontal: COLORS.SPACING.md,
      height: COLORS.SPACING.inputHeight,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
    },
    input: {
      flex: 1,
      marginLeft: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
    },
    switchGroup: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.input,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.lg,
      ...COLORS.SHADOWS.xs,
    },
    switchDescription: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.MUTED,
      marginTop: 2,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.SUCCESS,
      marginHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.button,
      marginBottom: COLORS.SPACING.sm,
      ...COLORS.SHADOWS.button,
    },
    saveButtonDisabled: { backgroundColor: COLORS.DISABLED },
    saveButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
      marginLeft: COLORS.SPACING.sm,
    },
    cancelButton: {
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.xl,
    },
    cancelButtonText: { ...COLORS.TYPOGRAPHY.styles.body, color: COLORS.MUTED },
  });

export default CompanyEditScreen;
