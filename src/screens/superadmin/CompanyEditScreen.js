// src/screens/superadmin/CompanyEditScreen.js
// TulipFleet - Şirket Düzenleme Ekranı
// Updated: 27 Aralık 2025 - data.company fix

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

const CompanyEditScreen = ({ route, navigation }) => {
  const { companyId } = route.params || {};
  
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

  // Şirket bilgilerini yükle
  useEffect(() => {
    if (companyId) {
      fetchCompany();
    } else {
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

      console.log("📡 Fetching company:", companyId);

      const response = await fetch(
        `${API_URL}/api/superadmin/companies/${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📦 Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Company data:", data);
        
        // ✅ FIX: Backend data.company içinde döndürüyor
        const companyData = data.company || data;
        
        setCompany({
          name: companyData.name || "",
          slug: companyData.slug || "",
          address: companyData.address || "",
          phone: companyData.phone || "",
          email: companyData.email || "",
          is_active: companyData.status === "active" || companyData.is_active !== false,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API Error:", response.status, errorData);
        Alert.alert("Hata", "Şirket bilgileri yüklenemedi");
        navigation.goBack();
      }
    } catch (error) {
      console.error("❌ Fetch company error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validasyon
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
        const errorData = await response.json().catch(() => ({}));
        Alert.alert("Hata", errorData.error || "Güncelleme başarısız");
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
        <ActivityIndicator size="large" color="#5E72E4" />
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
        {/* Form */}
        <View style={styles.form}>
          {/* Şirket Adı */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şirket Adı *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color="#8898AA" />
              <TextInput
                style={styles.input}
                value={company.name}
                onChangeText={(text) => setCompany({ ...company, name: text })}
                placeholder="Şirket adı"
                placeholderTextColor="#ADB5BD"
              />
            </View>
          </View>

          {/* Slug */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Slug</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="link-outline" size={20} color="#8898AA" />
              <TextInput
                style={styles.input}
                value={company.slug}
                onChangeText={(text) => setCompany({ ...company, slug: text.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="sirket-slug"
                placeholderTextColor="#ADB5BD"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#8898AA" />
              <TextInput
                style={styles.input}
                value={company.email}
                onChangeText={(text) => setCompany({ ...company, email: text })}
                placeholder="info@sirket.com"
                placeholderTextColor="#ADB5BD"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Telefon */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#8898AA" />
              <TextInput
                style={styles.input}
                value={company.phone}
                onChangeText={(text) => setCompany({ ...company, phone: text })}
                placeholder="+90 555 123 4567"
                placeholderTextColor="#ADB5BD"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Adres */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adres</Text>
            <View style={[styles.inputContainer, { height: 80, alignItems: "flex-start", paddingTop: 12 }]}>
              <Ionicons name="location-outline" size={20} color="#8898AA" />
              <TextInput
                style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                value={company.address}
                onChangeText={(text) => setCompany({ ...company, address: text })}
                placeholder="Şirket adresi"
                placeholderTextColor="#ADB5BD"
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
              onValueChange={(value) => setCompany({ ...company, is_active: value })}
              trackColor={{ false: "#DEE2E6", true: "#5E72E4" }}
              thumbColor={company.is_active ? "#FFF" : "#FFF"}
            />
          </View>
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
            </>
          )}
        </TouchableOpacity>

        {/* İptal Butonu */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#8898AA",
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#32325D",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: "#32325D",
  },
  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  switchDescription: {
    fontSize: 12,
    color: "#8898AA",
    marginTop: 2,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2DCE89",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: "#ADB5BD",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 30,
  },
  cancelButtonText: {
    color: "#8898AA",
    fontSize: 16,
  },
});

export default CompanyEditScreen;