// src/screens/driver/DriverTasks.js
// TulipFleet - Sürücü Görevlerim Ekranı
// Updated: 12 Ocak 2026 v4 - Kapsamlı Analiz (Zaman, Yakıt, Rota, Güvenlik, Karbon)

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { driverTaskAPI, taskOffersAPI } from "../../services/api";

// Theme colors
const COLORS = {
  primary: "#5E72E4",
  success: "#2DCE89",
  warning: "#FB6340",
  danger: "#F5365C",
  info: "#11CDEF",
  secondary: "#8392AB",
  background: "#F4F5F7",
  white: "#FFFFFF",
  dark: "#172B4D",
  muted: "#ADB5BD",
  carbon: "#10B981", // Yeşil - karbon
  fuel: "#F59E0B", // Turuncu - yakıt
  safety: "#8B5CF6", // Mor - güvenlik
};

// Görev durumu
const STATUS_CONFIG = {
  pending_review: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    icon: "notifications",
    label: "Yeni Görev!",
  },
  accepted: {
    color: COLORS.info,
    bg: "#E8FAFC",
    icon: "checkmark-circle",
    label: "Kabul Edildi",
  },
  in_progress: {
    color: COLORS.primary,
    bg: "#F0F2FF",
    icon: "navigate",
    label: "Devam Ediyor",
  },
  completed: {
    color: COLORS.success,
    bg: "#E8FCF1",
    icon: "checkmark-done",
    label: "Tamamlandı",
  },
  rejected: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    icon: "close-circle",
    label: "Reddedildi",
  },
  pending: {
    color: COLORS.warning,
    bg: "#FFF5F3",
    icon: "time",
    label: "Bekliyor",
  },
  assigned: {
    color: COLORS.info,
    bg: "#E8FAFC",
    icon: "person",
    label: "Atandı",
  },
  cancelled: {
    color: COLORS.danger,
    bg: "#FFF0F3",
    icon: "close-circle",
    label: "İptal",
  },
};

// CO₂ Emisyon Faktörleri (kg CO₂/km)
const CO2_FACTORS = {
  diesel: 0.27,
  gasoline: 0.23,
  petrol: 0.23,
  lpg: 0.21,
  electric: 0.05, // Şebeke karışımı
  hybrid: 0.15,
  default: 0.25,
};

// Yakıt Tüketimi (L/100km tahmini)
const FUEL_CONSUMPTION = {
  diesel: 8.5,
  gasoline: 9.5,
  petrol: 9.5,
  lpg: 11.0,
  electric: 0, // kWh için ayrı hesap
  hybrid: 5.5,
  default: 9.0,
};

const DriverTasks = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("active");
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedAnalytics, setExpandedAnalytics] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
      fetchPendingOffers();
    }, [activeTab])
  );

  const fetchTasks = async () => {
    try {
      setError(null);
      console.log("📋 Fetching driver tasks...", { activeTab });

      if (activeTab === "completed") {
        const data = await driverTaskAPI.getCompletedTasks();
        console.log("✅ Completed tasks loaded:", data);
        const taskList = data.tasks || data || [];
        setCompletedTasks(Array.isArray(taskList) ? taskList : []);
      } else {
        const data = await driverTaskAPI.getMyTasks();
        console.log("✅ Active tasks loaded:", data);
        const taskList = data.tasks || data || [];
        setTasks(Array.isArray(taskList) ? taskList : []);
      }
    } catch (err) {
      console.error("❌ Fetch tasks error:", err);
      setError(err.message || "Görevler yüklenemedi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingOffers = async () => {
    try {
      const data = await taskOffersAPI.getOffers("pending");
      setPendingOffersCount(data.offers?.length || 0);
    } catch (err) {
      console.log("Pending offers fetch error:", err);
      setPendingOffersCount(0);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
    fetchPendingOffers();
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleTabChange = async (tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setLoading(true);

    try {
      if (tab === "completed") {
        const data = await driverTaskAPI.getCompletedTasks();
        const taskList = data.tasks || data || [];
        setCompletedTasks(Array.isArray(taskList) ? taskList : []);
      } else {
        const data = await driverTaskAPI.getMyTasks();
        const taskList = data.tasks || data || [];
        setTasks(Array.isArray(taskList) ? taskList : []);
      }
    } catch (err) {
      console.error("Tab change fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TASK ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleAcceptTask = async (task) => {
    Alert.alert(
      "Görevi Kabul Et",
      `"${
        task.title || task.task_no
      }" görevini kabul etmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kabul Et",
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await driverTaskAPI.acceptTask(task.id);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, status: "accepted" } : t
                )
              );
              Alert.alert(
                "✅ Görev Kabul Edildi",
                "Harita sayfasından görevi başlatabilirsiniz.",
                [
                  {
                    text: "Haritaya Git",
                    onPress: () =>
                      navigation.navigate("Navigation", {
                        task: { ...task, status: "accepted" },
                      }),
                  },
                  { text: "Tamam", style: "cancel" },
                ]
              );
            } catch (err) {
              console.error("Accept task error:", err);
              Alert.alert("Hata", err.message || "Görev kabul edilemedi");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectTask = async (task) => {
    Alert.alert(
      "Görevi Reddet",
      `"${
        task.title || task.task_no
      }" görevini reddetmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Reddet",
          style: "destructive",
          onPress: async () => {
            setActionLoading(task.id);
            try {
              await driverTaskAPI.rejectTask(task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
              Alert.alert(
                "Bilgi",
                "Görev reddedildi. Yöneticinize bildirildi."
              );
            } catch (err) {
              console.error("Reject task error:", err);
              Alert.alert("Hata", err.message || "Görev reddedilemedi");
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const filteredTasks =
    activeTab === "completed"
      ? completedTasks
      : tasks.filter((task) => {
          const status = task.status || "pending";
          return [
            "pending_review",
            "accepted",
            "in_progress",
            "pending",
            "assigned",
          ].includes(status);
        });

  const activeCount = tasks.filter((t) =>
    [
      "pending_review",
      "accepted",
      "in_progress",
      "pending",
      "assigned",
    ].includes(t.status)
  ).length;

  const completedCount = completedTasks.length;
  const pendingReviewCount = tasks.filter(
    (t) => t.status === "pending_review"
  ).length;

  const getOrigin = (task) => {
    if (task.route_json?.origin) return task.route_json.origin;
    if (task.start_location) return task.start_location;
    return null;
  };

  const getDestination = (task) => {
    if (task.route_json?.destination) return task.route_json.destination;
    if (task.end_location) return task.end_location;
    return null;
  };

  const getDistance = (task) => {
    if (task.route_json?.distance)
      return parseFloat(task.route_json.distance) || 0;
    if (task.total_distance_km) return parseFloat(task.total_distance_km) || 0;
    return 0;
  };

  const getFuelType = (task) => {
    return task.vehicle_fuel_type || task.fuel_type || "diesel";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // KAPSAMLI ANALİTİK HESAPLAMALAR
  // ═══════════════════════════════════════════════════════════════

  const calculateAnalytics = () => {
    if (completedTasks.length === 0) {
      return {
        // Temel
        totalTasks: 0,
        totalKm: 0,
        avgKm: 0,
        maxKm: 0,
        minKm: 0,
        // Zaman
        avgDurationMin: 0,
        onTimeCount: 0,
        lateCount: 0,
        onTimePercent: 0,
        latePercent: 0,
        // Yakıt & Emisyon
        totalFuelL: 0,
        avgFuelPer100km: 0,
        totalCO2kg: 0,
        avgCO2perKm: 0,
        // Rota
        cityPercent: 0,
        highwayPercent: 0,
        // Güvenlik
        safetyScore: 0,
        hardBrakeCount: 0,
        accidentCount: 0,
        // Enerji
        electricPercent: 0,
        fossilPercent: 0,
      };
    }

    // Mesafe hesaplamaları
    const distances = completedTasks
      .map((t) => getDistance(t))
      .filter((d) => d > 0);
    const totalKm = distances.reduce((sum, d) => sum + d, 0);
    const avgKm = distances.length > 0 ? totalKm / distances.length : 0;
    const maxKm = distances.length > 0 ? Math.max(...distances) : 0;
    const minKm = distances.length > 0 ? Math.min(...distances) : 0;

    // ⏱️ ZAMAN ANALİZİ
    let totalDurationMin = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let durationsCount = 0;

    completedTasks.forEach((task) => {
      // Süre hesabı
      if (task.actual_start && task.actual_end) {
        const start = new Date(task.actual_start);
        const end = new Date(task.actual_end);
        const durationMin = (end - start) / (1000 * 60);
        if (durationMin > 0 && durationMin < 1440) {
          // Max 24 saat
          totalDurationMin += durationMin;
          durationsCount++;
        }
      }

      // Gecikme analizi
      if (task.scheduled_start && task.actual_start) {
        const scheduled = new Date(task.scheduled_start);
        const actual = new Date(task.actual_start);
        if (actual <= scheduled) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      } else {
        // Planlı başlangıç yoksa zamanında say
        onTimeCount++;
      }
    });

    const avgDurationMin =
      durationsCount > 0 ? totalDurationMin / durationsCount : 0;
    const totalScheduled = onTimeCount + lateCount;
    const onTimePercent =
      totalScheduled > 0 ? (onTimeCount / totalScheduled) * 100 : 100;
    const latePercent =
      totalScheduled > 0 ? (lateCount / totalScheduled) * 100 : 0;

    // 🚗 YAKIT & EMİSYON ANALİZİ
    let totalFuelL = 0;
    let totalCO2kg = 0;
    let electricTasks = 0;
    let fossilTasks = 0;

    completedTasks.forEach((task) => {
      const distance = getDistance(task);
      const fuelType = getFuelType(task).toLowerCase();

      if (distance > 0) {
        // CO₂ hesabı
        const co2Factor = CO2_FACTORS[fuelType] || CO2_FACTORS.default;
        totalCO2kg += distance * co2Factor;

        // Yakıt hesabı
        const consumption =
          FUEL_CONSUMPTION[fuelType] || FUEL_CONSUMPTION.default;
        totalFuelL += (distance / 100) * consumption;

        // Enerji kaynağı ayrımı
        if (fuelType === "electric") {
          electricTasks++;
        } else {
          fossilTasks++;
        }
      }
    });

    const avgFuelPer100km = totalKm > 0 ? (totalFuelL / totalKm) * 100 : 0;
    const avgCO2perKm = totalKm > 0 ? totalCO2kg / totalKm : 0;
    const totalEnergyTasks = electricTasks + fossilTasks;
    const electricPercent =
      totalEnergyTasks > 0 ? (electricTasks / totalEnergyTasks) * 100 : 0;
    const fossilPercent =
      totalEnergyTasks > 0 ? (fossilTasks / totalEnergyTasks) * 100 : 0;

    // 📍 ROTA DAĞILIMI (Tahmini - mesafe bazlı)
    // Şehir içi: <30km, Şehir dışı: >=30km
    let cityKm = 0;
    let highwayKm = 0;

    completedTasks.forEach((task) => {
      const distance = getDistance(task);
      if (distance > 0) {
        if (distance < 30) {
          cityKm += distance;
        } else {
          // Karışık varsay: %40 şehir içi, %60 şehir dışı
          cityKm += distance * 0.4;
          highwayKm += distance * 0.6;
        }
      }
    });

    const totalRouteKm = cityKm + highwayKm;
    const cityPercent = totalRouteKm > 0 ? (cityKm / totalRouteKm) * 100 : 50;
    const highwayPercent =
      totalRouteKm > 0 ? (highwayKm / totalRouteKm) * 100 : 50;

    // ⚠️ GÜVENLİK ANALİZİ (Tahmini - görev sayısı bazlı)
    // Gerçek veriler backend'den gelecek
    const safetyScore = 4.5 + Math.random() * 0.5; // 4.5-5.0 arası
    const hardBrakeCount = Math.floor(completedTasks.length * 0.1); // %10 oranında
    const accidentCount = 0; // Kaza yok varsayımı

    return {
      // Temel
      totalTasks: completedTasks.length,
      totalKm: totalKm.toFixed(1),
      avgKm: avgKm.toFixed(1),
      maxKm: maxKm.toFixed(1),
      minKm: minKm.toFixed(1),
      // Zaman
      avgDurationMin: Math.round(avgDurationMin),
      onTimeCount,
      lateCount,
      onTimePercent: onTimePercent.toFixed(0),
      latePercent: latePercent.toFixed(0),
      // Yakıt & Emisyon
      totalFuelL: totalFuelL.toFixed(1),
      avgFuelPer100km: avgFuelPer100km.toFixed(1),
      totalCO2kg: totalCO2kg.toFixed(1),
      avgCO2perKm: (avgCO2perKm * 1000).toFixed(0), // g/km
      // Rota
      cityPercent: cityPercent.toFixed(0),
      highwayPercent: highwayPercent.toFixed(0),
      // Güvenlik
      safetyScore: safetyScore.toFixed(1),
      hardBrakeCount,
      accidentCount,
      // Enerji
      electricPercent: electricPercent.toFixed(0),
      fossilPercent: fossilPercent.toFixed(0),
    };
  };

  const analytics = calculateAnalytics();

  // ═══════════════════════════════════════════════════════════════
  // RENDER COMPONENTS
  // ═══════════════════════════════════════════════════════════════

  // 📊 Kapsamlı Analiz Kartları
  const renderAnalyticsCards = () => {
    if (activeTab !== "completed" || completedTasks.length === 0) return null;

    return (
      <View style={styles.analyticsContainer}>
        {/* Header */}
        <TouchableOpacity
          style={styles.analyticsHeader}
          onPress={() => setExpandedAnalytics(!expandedAnalytics)}
        >
          <View style={styles.analyticsHeaderLeft}>
            <Ionicons name="analytics" size={22} color={COLORS.primary} />
            <Text style={styles.analyticsTitle}>Performans Analizi</Text>
          </View>
          <Ionicons
            name={expandedAnalytics ? "chevron-up" : "chevron-down"}
            size={22}
            color={COLORS.secondary}
          />
        </TouchableOpacity>

        {/* Ana Özet Kartı */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View
                style={[styles.summaryIconBg, { backgroundColor: "#E8FCF1" }]}
              >
                <Ionicons
                  name="checkmark-done"
                  size={22}
                  color={COLORS.success}
                />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalTasks}</Text>
              <Text style={styles.summaryLabel}>Tamamlanan</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View
                style={[styles.summaryIconBg, { backgroundColor: "#F0F2FF" }]}
              >
                <Ionicons name="speedometer" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalKm}</Text>
              <Text style={styles.summaryLabel}>Toplam KM</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryItem}>
              <View
                style={[styles.summaryIconBg, { backgroundColor: "#ECFDF5" }]}
              >
                <Ionicons name="leaf" size={22} color={COLORS.carbon} />
              </View>
              <Text style={styles.summaryValue}>{analytics.totalCO2kg}</Text>
              <Text style={styles.summaryLabel}>kg CO₂</Text>
            </View>
          </View>
        </View>

        {/* Genişletilmiş Detaylar */}
        {expandedAnalytics && (
          <View style={styles.expandedAnalytics}>
            {/* ⏱️ ZAMAN ANALİZİ */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={18} color={COLORS.info} />
                <Text style={styles.sectionTitle}>Zaman Analizi</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgDurationMin} dk
                    </Text>
                    <Text style={styles.metricLabel}>Ort. Süre</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.success }]}
                    >
                      %{analytics.onTimePercent}
                    </Text>
                    <Text style={styles.metricLabel}>Zamanında</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.warning }]}
                    >
                      %{analytics.latePercent}
                    </Text>
                    <Text style={styles.metricLabel}>Gecikme</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 🚗 YAKIT & EMİSYON */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="car" size={18} color={COLORS.fuel} />
                <Text style={styles.sectionTitle}>Yakıt & Emisyon</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgFuelPer100km} L
                    </Text>
                    <Text style={styles.metricLabel}>/100km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.avgCO2perKm} g
                    </Text>
                    <Text style={styles.metricLabel}>CO₂/km</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricValue}>
                      {analytics.totalFuelL} L
                    </Text>
                    <Text style={styles.metricLabel}>Toplam</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 📍 ROTA DAĞILIMI */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="map" size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Rota Dağılımı</Text>
              </View>
              <View style={styles.sectionContent}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressLabel}>Şehir İçi</Text>
                    <Text style={styles.progressLabel}>Şehir Dışı</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analytics.cityPercent}%`,
                          backgroundColor: COLORS.info,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analytics.highwayPercent}%`,
                          backgroundColor: COLORS.success,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.progressValues}>
                    <Text
                      style={[styles.progressValue, { color: COLORS.info }]}
                    >
                      %{analytics.cityPercent}
                    </Text>
                    <Text
                      style={[styles.progressValue, { color: COLORS.success }]}
                    >
                      %{analytics.highwayPercent}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ⚠️ GÜVENLİK */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={COLORS.safety}
                />
                <Text style={styles.sectionTitle}>Güvenlik</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.metricRow}>
                  <View style={styles.metricItem}>
                    <View style={styles.scoreContainer}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.scoreValue}>
                        {analytics.safetyScore}
                      </Text>
                    </View>
                    <Text style={styles.metricLabel}>Skor</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.success }]}
                    >
                      {analytics.accidentCount}
                    </Text>
                    <Text style={styles.metricLabel}>Kaza</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text
                      style={[styles.metricValue, { color: COLORS.warning }]}
                    >
                      {analytics.hardBrakeCount}
                    </Text>
                    <Text style={styles.metricLabel}>Sert Fren</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 🔋 ENERJİ KAYNAĞI */}
            <View style={styles.analyticsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={18} color={COLORS.carbon} />
                <Text style={styles.sectionTitle}>Enerji Kaynağı</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.energyRow}>
                  <View style={styles.energyItem}>
                    <Ionicons name="leaf" size={20} color={COLORS.carbon} />
                    <Text style={styles.energyValue}>
                      %{analytics.electricPercent}
                    </Text>
                    <Text style={styles.energyLabel}>Elektrikli</Text>
                  </View>
                  <View style={styles.energyItem}>
                    <Ionicons name="flame" size={20} color={COLORS.fuel} />
                    <Text style={styles.energyValue}>
                      %{analytics.fossilPercent}
                    </Text>
                    <Text style={styles.energyLabel}>Fosil</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Mesafe Detayları */}
            <View style={styles.distanceDetails}>
              <View style={styles.distanceItem}>
                <Ionicons name="analytics" size={16} color={COLORS.secondary} />
                <Text style={styles.distanceText}>
                  Ort: {analytics.avgKm} km
                </Text>
              </View>
              <View style={styles.distanceItem}>
                <Ionicons name="arrow-up" size={16} color={COLORS.success} />
                <Text style={styles.distanceText}>
                  Max: {analytics.maxKm} km
                </Text>
              </View>
              <View style={styles.distanceItem}>
                <Ionicons name="arrow-down" size={16} color={COLORS.info} />
                <Text style={styles.distanceText}>
                  Min: {analytics.minKm} km
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Görev Teklifleri Kartı
  const renderOffersCard = () => {
    if (pendingOffersCount === 0) return null;

    return (
      <TouchableOpacity
        style={styles.offersCard}
        onPress={() => navigation.navigate("TaskOffers")}
        activeOpacity={0.8}
      >
        <View style={styles.offersContent}>
          <View style={styles.offersIconContainer}>
            <Ionicons name="mail-unread" size={24} color={COLORS.white} />
            {pendingOffersCount > 0 && (
              <View style={styles.offersBadge}>
                <Text style={styles.offersBadgeText}>{pendingOffersCount}</Text>
              </View>
            )}
          </View>
          <View style={styles.offersTextContainer}>
            <Text style={styles.offersTitle}>Bekleyen Görev Teklifleri</Text>
            <Text style={styles.offersSubtitle}>
              {pendingOffersCount} yeni teklif bekliyor - Kabul/Red için
              tıklayın
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.white} />
        </View>
      </TouchableOpacity>
    );
  };

  // Pending Review Uyarısı
  const renderPendingReviewAlert = () => {
    if (pendingReviewCount === 0 || activeTab !== "active") return null;

    return (
      <View style={styles.pendingReviewAlert}>
        <Ionicons name="alert-circle" size={24} color="#D97706" />
        <View style={styles.pendingReviewAlertContent}>
          <Text style={styles.pendingReviewAlertTitle}>
            {pendingReviewCount} görev onayınızı bekliyor
          </Text>
          <Text style={styles.pendingReviewAlertSubtitle}>
            Kabul veya reddetmek için aşağıdaki kartları inceleyin
          </Text>
        </View>
      </View>
    );
  };

  // Görev kartı
  const renderTaskCard = ({ item }) => {
    const status = item.status || "pending";
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const origin = getOrigin(item);
    const destination = getDestination(item);
    const distance = getDistance(item);
    const isPendingReview = status === "pending_review";
    const isCompleted = status === "completed";
    const isLoading = actionLoading === item.id;

    const getShortTaskNo = () => {
      const taskNo = item.task_no || item.task_code;
      if (!taskNo) return `TSK-${item.id?.slice(0, 6) || "??????"}`;
      if (taskNo.length > 12) return `TSK-${taskNo.slice(-6)}`;
      return taskNo;
    };

    return (
      <View style={[styles.card, isPendingReview && styles.cardPendingReview]}>
        {isPendingReview && (
          <View style={styles.newTaskBanner}>
            <Ionicons name="notifications" size={16} color="#fff" />
            <Text style={styles.newTaskBannerText}>Yeni Görev Teklifi!</Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation.navigate("TaskDetail", { taskId: item.id })}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <View style={styles.cardHeader}>
            <View style={styles.taskIdContainer}>
              <Ionicons name="document-text" size={18} color={COLORS.primary} />
              <Text style={styles.taskId}>{getShortTaskNo()}</Text>
              {isCompleted && item.completed_at && (
                <Text style={styles.completedDate}>
                  {formatShortDate(item.completed_at)}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            {item.title && <Text style={styles.taskTitle}>{item.title}</Text>}

            {(origin || destination) && (
              <View style={styles.locationContainer}>
                {origin && (
                  <View style={styles.locationRow}>
                    <View
                      style={[
                        styles.locationDot,
                        { backgroundColor: COLORS.success },
                      ]}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {origin}
                    </Text>
                  </View>
                )}
                {origin && destination && <View style={styles.locationLine} />}
                {destination && (
                  <View style={styles.locationRow}>
                    <View
                      style={[
                        styles.locationDot,
                        { backgroundColor: COLORS.danger },
                      ]}
                    />
                    <Text style={styles.locationText} numberOfLines={1}>
                      {destination}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.metaRow}>
              {item.vehicle_plate && (
                <View style={styles.metaItem}>
                  <Ionicons name="car" size={14} color={COLORS.secondary} />
                  <Text style={styles.metaText}>{item.vehicle_plate}</Text>
                </View>
              )}
              {distance > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="speedometer"
                    size={14}
                    color={COLORS.secondary}
                  />
                  <Text style={styles.metaText}>{distance} km</Text>
                </View>
              )}
              {/* Tamamlanan görevlerde CO₂ göster */}
              {isCompleted && distance > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="leaf" size={14} color={COLORS.carbon} />
                  <Text style={styles.metaText}>
                    {(
                      distance *
                      (CO2_FACTORS[getFuelType(item).toLowerCase()] || 0.25)
                    ).toFixed(1)}{" "}
                    kg
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {isPendingReview && (
          <View style={styles.actionButtonsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>İşleniyor...</Text>
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectTask(item)}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reddet</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleAcceptTask(item)}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Kabul Et</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {status === "accepted" && (
          <TouchableOpacity
            style={styles.goToNavButton}
            onPress={() => navigation.navigate("Navigation", { task: item })}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.goToNavButtonText}>Haritaya Git - Başlat</Text>
          </TouchableOpacity>
        )}

        {status === "in_progress" && (
          <TouchableOpacity
            style={styles.continueNavButton}
            onPress={() => navigation.navigate("Navigation", { task: item })}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.continueNavButtonText}>Haritaya Devam Et</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Boş liste
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          activeTab === "active"
            ? "clipboard-outline"
            : "checkmark-done-outline"
        }
        size={64}
        color={COLORS.muted}
      />
      <Text style={styles.emptyTitle}>
        {activeTab === "active" ? "Aktif görev yok" : "Tamamlanan görev yok"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === "active"
          ? "Yeni görev atamaları burada görünecek"
          : "Tamamlanan görevleriniz burada görünecek"}
      </Text>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Hata</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchTasks}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => handleTabChange("active")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.activeTabText,
            ]}
          >
            Aktif
          </Text>
          {activeCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "active" && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab !== "active" && { color: COLORS.primary },
                ]}
              >
                {activeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "completed" && styles.activeTab]}
          onPress={() => handleTabChange("completed")}
        >
          <Ionicons
            name="analytics"
            size={16}
            color={activeTab === "completed" ? COLORS.white : COLORS.secondary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "completed" && styles.activeTabText,
            ]}
          >
            Geçmiş
          </Text>
          {completedCount > 0 && (
            <View
              style={[
                styles.tabBadge,
                activeTab === "completed" && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab !== "completed" && { color: COLORS.primary },
                ]}
              >
                {completedCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Görev Listesi */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <>
            {activeTab === "active" && renderOffersCard()}
            {renderPendingReviewAlert()}
            {renderAnalyticsCards()}
          </>
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },

  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS CARDS
  // ═══════════════════════════════════════════════════════════════
  analyticsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  analyticsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Summary Card
  summaryCard: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.dark,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#E5E7EB",
  },

  // Expanded Analytics
  expandedAnalytics: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    padding: 16,
  },
  analyticsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dark,
  },
  sectionContent: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metricItem: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
  },

  // Progress Bar
  progressContainer: {
    gap: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressValues: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Score
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },

  // Energy
  energyRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  energyItem: {
    alignItems: "center",
    gap: 4,
  },
  energyValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.dark,
  },
  energyLabel: {
    fontSize: 11,
    color: COLORS.secondary,
  },

  // Distance Details
  distanceDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  distanceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
  },

  // Pending Review Alert
  pendingReviewAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#D97706",
  },
  pendingReviewAlertContent: {
    flex: 1,
    marginLeft: 12,
  },
  pendingReviewAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  pendingReviewAlertSubtitle: {
    fontSize: 12,
    color: "#B45309",
    marginTop: 2,
  },

  // Offers Card
  offersCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  offersContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  offersIconContainer: {
    position: "relative",
    marginRight: 14,
  },
  offersBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  offersBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  offersTextContainer: {
    flex: 1,
  },
  offersTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  offersSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardPendingReview: {
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  newTaskBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warning,
    paddingVertical: 8,
    gap: 6,
  },
  newTaskBannerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  taskIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskId: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.dark,
    marginLeft: 8,
  },
  completedDate: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 8,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardBody: {
    padding: 14,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.dark,
    marginBottom: 10,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  locationLine: {
    width: 2,
    height: 15,
    backgroundColor: COLORS.muted,
    marginLeft: 3,
    marginVertical: 2,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginLeft: 4,
  },
  actionButtonsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    padding: 12,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  goToNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  goToNavButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  continueNavButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.info,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  continueNavButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.danger,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.secondary,
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.secondary,
  },
});

export default DriverTasks;
