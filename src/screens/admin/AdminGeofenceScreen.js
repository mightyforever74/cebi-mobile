/**
 * AdminGeofenceScreen.js - v1.0
 * TulipFleet - Admin Geofence Management
 * Phase 0 Foundation compliant: DataState / EmptyState / StatusBadge / withAlpha
 * Circle + Polygon, alert integration, CSRD support
 * Created: 07 Mart 2026
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, {
  Circle,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import Card from "../../components/ui/Card";
import DataState from "../../components/ui/DataState";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { geofenceAPI } from "../../services/api";
import { withAlpha } from "../../utils/colorUtils";

// ─── Constants ────────────────────────────────────────────────────────────────
const FENCE_TYPES = ["circle", "polygon"];

const RADIUS_PRESETS = [100, 250, 500, 1000, 2500, 5000];

const CATEGORY_ICONS = {
  general: "location-outline",
  depot: "business-outline",
  city_center: "storefront-outline",
  emission_zone: "leaf-outline",
  border: "flag-outline",
  sensitive_area: "warning-outline",
};

const CATEGORY_COLORS = (COLORS) => ({
  general: COLORS.PRIMARY,
  depot: COLORS.INFO,
  city_center: COLORS.WARNING,
  emission_zone: COLORS.SUCCESS,
  border: COLORS.LABEL,
  sensitive_area: COLORS.ERROR,
});

const DEFAULT_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

const EMPTY_FORM = {
  name: "",
  description: "",
  fence_type: "circle",
  category: "general",
  radius: 500,
  customRadius: "",
  alert_on_entry: false,
  alert_on_exit: false,
  time_restriction: false,
  start_hour: "08",
  end_hour: "18",
  csrd_tracked: false,
};

// ─── makeStyles ──────────────────────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
    },

    // ── Header bar ──
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    headerStats: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerStatText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: 4,
    },
    headerStatBold: {
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.pill,
    },
    addButtonText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },

    // ── List ──
    listContent: {
      padding: COLORS.SPACING.md,
      paddingBottom: 32,
    },
    zoneCard: {
      marginBottom: COLORS.SPACING.sm,
    },
    zoneCardInner: {
      padding: COLORS.SPACING.md,
    },
    zoneRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    zoneIconWrap: {
      width: 44,
      height: 44,
      borderRadius: COLORS.RADIUS.xl,
      alignItems: "center",
      justifyContent: "center",
      marginRight: COLORS.SPACING.sm,
    },
    zoneInfo: {
      flex: 1,
    },
    zoneName: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    zoneMeta: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    zoneBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
      flexWrap: "wrap",
    },
    zoneTag: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: COLORS.RADIUS.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginRight: 4,
      marginTop: 4,
    },
    zoneTagText: {
      fontSize: 11,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      marginLeft: 3,
    },
    zoneActions: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: COLORS.SPACING.xs,
    },
    zoneActionBar: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
      paddingTop: COLORS.SPACING.xs,
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: COLORS.RADIUS.lg,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },

    // ── Map preview strip ──
    mapStrip: {
      height: 160,
      marginHorizontal: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.card,
      overflow: "hidden",
      ...COLORS.SHADOWS.card,
    },
    mapStripMap: {
      flex: 1,
    },

    // ── Modal ──
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      maxHeight: "92%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.DIVIDER,
      alignSelf: "center",
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    modalClose: {
      padding: 4,
    },
    modalScroll: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
    },

    // ── Form ──
    sectionLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.md,
    },
    textInput: {
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
    },
    textInputMulti: {
      height: 80,
      textAlignVertical: "top",
    },
    segmentRow: {
      flexDirection: "row",
      borderRadius: COLORS.RADIUS.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      backgroundColor: COLORS.BACKGROUND,
    },
    segmentBtnActive: {
      backgroundColor: COLORS.PRIMARY,
    },
    segmentText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: 4,
    },
    segmentTextActive: {
      color: COLORS.WHITE,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: COLORS.RADIUS.pill,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      marginRight: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
      borderWidth: 1,
    },
    categoryChipText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      marginLeft: 4,
    },
    radiusPresets: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    radiusChip: {
      borderRadius: COLORS.RADIUS.pill,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 4,
      marginRight: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
      borderWidth: 1,
    },
    radiusChipText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    switchRowLast: {
      borderBottomWidth: 0,
    },
    switchLabel: {
      flex: 1,
      marginRight: COLORS.SPACING.sm,
    },
    switchLabelText: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
    },
    switchLabelSub: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    hourRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.xs,
    },
    hourInput: {
      width: 56,
      textAlign: "center",
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      paddingVertical: COLORS.SPACING.xs,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.TEXT,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    hourSep: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_SECONDARY,
      marginHorizontal: COLORS.SPACING.xs,
    },
    csrdBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: withAlpha(COLORS.SUCCESS, 0.1),
      borderRadius: COLORS.RADIUS.md,
      padding: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.xs,
      borderLeftWidth: 3,
      borderLeftColor: COLORS.SUCCESS,
    },
    csrdBannerText: {
      flex: 1,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: COLORS.SPACING.xs,
      lineHeight: 16,
    },

    // ── Draw map in modal ──
    mapSearchRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    mapSearchInput: {
      flex: 1,
      backgroundColor: COLORS.BACKGROUND,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 8,
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      color: COLORS.TEXT,
      marginRight: COLORS.SPACING.xs,
    },
    mapSearchBtn: {
      width: 40,
      height: 40,
      borderRadius: COLORS.RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    drawMapWrap: {
      height: 220,
      borderRadius: COLORS.RADIUS.md,
      overflow: "hidden",
      marginTop: COLORS.SPACING.xs,
    },
    drawMap: {
      flex: 1,
    },
    drawHint: {
      // overlay: harita üzeri okunabilirlik için #000 sabit — theme token değil, bilinçli istisna
      backgroundColor: withAlpha("#000000", 0.55),
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.md,
      position: "absolute",
      bottom: COLORS.SPACING.sm,
      alignSelf: "center",
    },
    drawHintText: {
      color: "#FFFFFF",
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      textAlign: "center",
    },
    drawClearBtn: {
      position: "absolute",
      top: COLORS.SPACING.xs,
      right: COLORS.SPACING.xs,
      // overlay: harita üzeri okunabilirlik için #000 sabit — bilinçli istisna
      backgroundColor: withAlpha("#000000", 0.55),
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 4,
      flexDirection: "row",
      alignItems: "center",
    },
    drawClearText: {
      color: "#FFFFFF",
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      marginLeft: 4,
    },

    // ── Save button ──
    saveBtn: {
      backgroundColor: COLORS.PRIMARY,
      borderRadius: COLORS.RADIUS.pill,
      paddingVertical: COLORS.SPACING.sm,
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.lg,
      marginBottom: COLORS.SPACING.md,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      color: COLORS.WHITE,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
  });

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminGeofenceScreen() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const drawMapRef = useRef(null);

  // ── State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editZone, setEditZone] = useState(null); // null = new
  const [form, setForm] = useState(EMPTY_FORM);
  const [drawPoints, setDrawPoints] = useState([]); // polygon points
  const [circleCenter, setCircleCenter] = useState(null); // circle center
  const [mapSearch, setMapSearch] = useState(""); // harita arama
  const [mapSearching, setMapSearching] = useState(false);

  // ── Derived ──
  const catColors = useMemo(() => CATEGORY_COLORS(COLORS), [COLORS]);

  const activeCount = useMemo(
    () => zones.filter((z) => z.is_active).length,
    [zones]
  );

  // ── Map search ──
  const handleMapSearch = useCallback(async () => {
    const q = mapSearch.trim();
    if (!q) return;
    try {
      setMapSearching(true);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=AIzaSyCAenCjwzpOicARpk3TQmV49t7-gAp1eIk`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === "OK" && json.results.length > 0) {
        const { lat, lng } = json.results[0].geometry.location;
        drawMapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800
        );
      }
    } catch {
      /* sessiz fail */
    } finally {
      setMapSearching(false);
    }
  }, [mapSearch]);

  // ── Load ──
  const loadZones = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await geofenceAPI.getAll();
      setZones(data.geofences ?? data.zones ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // ── Open modal ──
  const openNew = useCallback(() => {
    setEditZone(null);
    setForm(EMPTY_FORM);
    setDrawPoints([]);
    setCircleCenter(null);
    setShowModal(true);
  }, []);

  const openEdit = useCallback((zone) => {
    setEditZone(zone);
    const coords = zone.coordinates ?? {};
    setForm({
      name: zone.name ?? "",
      description: zone.description ?? "",
      fence_type: zone.fence_type ?? "circle",
      category: zone.category ?? "general",
      radius: parseFloat(zone.radius) || 500,
      customRadius: "",
      alert_on_entry: zone.alert_on_entry ?? false,
      alert_on_exit: zone.alert_on_exit ?? false,
      time_restriction: !!(zone.start_hour || zone.end_hour),
      start_hour:
        zone.start_hour != null
          ? String(zone.start_hour).padStart(2, "0")
          : "08",
      end_hour:
        zone.end_hour != null ? String(zone.end_hour).padStart(2, "0") : "18",
      csrd_tracked: zone.csrd_tracked ?? false,
    });
    if (zone.fence_type === "circle" && coords.lat) {
      setCircleCenter({ latitude: coords.lat, longitude: coords.lng });
      setDrawPoints([]);
    } else if (zone.fence_type === "polygon" && Array.isArray(coords)) {
      setDrawPoints(coords.map((c) => ({ latitude: c.lat, longitude: c.lng })));
      setCircleCenter(null);
    } else {
      setDrawPoints([]);
      setCircleCenter(null);
    }
    setShowModal(true);
  }, []);

  // ── Map long-press draw ──
  const handleDrawPress = useCallback(
    (e) => {
      const { latitude, longitude } = e.nativeEvent.coordinate;
      if (form.fence_type === "circle") {
        setCircleCenter({ latitude, longitude });
      } else {
        setDrawPoints((prev) => [...prev, { latitude, longitude }]);
      }
    },
    [form.fence_type]
  );

  // ── Save ──
  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert("", t("geofence.nameRequired"));
      return;
    }
    const effectiveRadius = form.customRadius
      ? parseInt(form.customRadius, 10)
      : form.radius;

    if (form.fence_type === "circle" && !circleCenter) {
      Alert.alert("", t("geofence.drawFirst"));
      return;
    }
    if (form.fence_type === "polygon" && drawPoints.length < 3) {
      Alert.alert("", t("geofence.polygonMinPoints"));
      return;
    }

    // Saat validasyonu
    if (form.time_restriction) {
      const sh = parseInt(form.start_hour, 10);
      const eh = parseInt(form.end_hour, 10);
      if (isNaN(sh) || sh < 0 || sh > 23 || isNaN(eh) || eh < 0 || eh > 23) {
        Alert.alert(
          "",
          t("common.invalidHour", "Geçerli saat aralığı 0–23 olmalıdır.")
        );
        return;
      }
    }

    const coordinates =
      form.fence_type === "circle"
        ? {
            lat: circleCenter.latitude,
            lng: circleCenter.longitude,
            radius: effectiveRadius,
          }
        : drawPoints.map((p) => ({ lat: p.latitude, lng: p.longitude }));

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      fence_type: form.fence_type,
      category: form.category,
      radius: form.fence_type === "circle" ? effectiveRadius : null,
      coordinates,
      alert_on_entry: form.alert_on_entry,
      alert_on_exit: form.alert_on_exit,
      start_hour: form.time_restriction ? parseInt(form.start_hour, 10) : null,
      end_hour: form.time_restriction ? parseInt(form.end_hour, 10) : null,
      csrd_tracked: form.csrd_tracked,
    };

    try {
      setSaving(true);
      if (editZone) {
        await geofenceAPI.update(editZone.id, payload);
      } else {
        await geofenceAPI.create(payload);
      }
      setShowModal(false);
      loadZones();
    } catch {
      Alert.alert(
        "",
        editZone ? t("geofence.updateFailed") : t("geofence.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  }, [form, circleCenter, drawPoints, editZone, loadZones, t]);

  // ── Delete ──
  const handleDelete = useCallback(
    (zone) => {
      Alert.alert(
        t("geofence.deleteTitle"),
        t("geofence.deleteConfirm", { name: zone.name }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await geofenceAPI.delete(zone.id);
                loadZones();
              } catch {
                Alert.alert("", t("geofence.deleteFailed"));
              }
            },
          },
        ]
      );
    },
    [loadZones, t]
  );

  // ── Toggle active — optimistic: önce local güncelle, fail → rollback ──
  const handleToggleActive = useCallback(async (zone) => {
    const prev = zone.is_active;
    // 1. Önce local state'i güncelle (optimistic)
    setZones((z) =>
      z.map((z) => (z.id === zone.id ? { ...z, is_active: !prev } : z))
    );
    try {
      // 2. API'yi çağır
      await geofenceAPI.update(zone.id, { is_active: !prev });
    } catch {
      // 3. Fail → eski değere rollback
      setZones((z) =>
        z.map((z) => (z.id === zone.id ? { ...z, is_active: prev } : z))
      );
    }
  }, []);

  // ── Render zone item ──
  const renderZone = useCallback(
    ({ item }) => {
      const catColor = catColors[item.category] ?? COLORS.PRIMARY;
      const catIcon = CATEGORY_ICONS[item.category] ?? "location-outline";
      const radiusLabel =
        item.fence_type === "circle" && item.radius
          ? item.radius >= 1000
            ? `${(item.radius / 1000).toFixed(1)} km`
            : `${item.radius} m`
          : item.fence_type === "polygon"
            ? t("geofence.polygon")
            : "";

      return (
        <Card variant="elevated" style={styles.zoneCard}>
          <View style={styles.zoneCardInner}>
            <View style={styles.zoneRow}>
              {/* Category icon */}
              <View
                style={[
                  styles.zoneIconWrap,
                  { backgroundColor: withAlpha(catColor, 0.12) },
                ]}
              >
                <Ionicons name={catIcon} size={22} color={catColor} />
              </View>

              {/* Info */}
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.zoneMeta} numberOfLines={1}>
                  {radiusLabel}
                  {item.description ? `  ·  ${item.description}` : ""}
                </Text>
              </View>
            </View>

            {/* Tags + Actions row */}
            <View style={styles.zoneBadgeRow}>
              {/* Active / Passive badge */}
              <StatusBadge
                status={item.is_active ? "ONLINE" : "OFFLINE"}
                size="sm"
                dot
              />

              {/* Alert tags */}
              {item.alert_on_entry && (
                <View
                  style={[
                    styles.zoneTag,
                    {
                      backgroundColor: withAlpha(COLORS.INFO, 0.1),
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name="enter-outline"
                    size={11}
                    color={COLORS.INFO}
                  />
                  <Text style={[styles.zoneTagText, { color: COLORS.INFO }]}>
                    {t("geofence.alertOnEntry")}
                  </Text>
                </View>
              )}
              {item.alert_on_exit && (
                <View
                  style={[
                    styles.zoneTag,
                    {
                      backgroundColor: withAlpha(COLORS.WARNING, 0.1),
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name="exit-outline"
                    size={11}
                    color={COLORS.WARNING}
                  />
                  <Text style={[styles.zoneTagText, { color: COLORS.WARNING }]}>
                    {t("geofence.alertOnExit")}
                  </Text>
                </View>
              )}
              {/* CSRD tag */}
              {item.csrd_tracked && (
                <View
                  style={[
                    styles.zoneTag,
                    {
                      backgroundColor: withAlpha(COLORS.SUCCESS, 0.1),
                      borderColor: "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name="leaf-outline"
                    size={11}
                    color={COLORS.SUCCESS}
                  />
                  <Text style={[styles.zoneTagText, { color: COLORS.SUCCESS }]}>
                    CSRD
                  </Text>
                </View>
              )}
            </View>

            {/* Action bar */}
            <View style={styles.zoneActionBar}>
              <Switch
                value={item.is_active}
                onValueChange={() => handleToggleActive(item)}
                trackColor={{
                  false: COLORS.DIVIDER,
                  true: withAlpha(COLORS.SUCCESS, 0.4),
                }}
                thumbColor={
                  item.is_active ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY
                }
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: withAlpha(COLORS.PRIMARY, 0.08) },
                ]}
                onPress={() => openEdit(item)}
              >
                <Ionicons
                  name="pencil-outline"
                  size={16}
                  color={COLORS.PRIMARY}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: withAlpha(COLORS.ERROR, 0.08) },
                ]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      );
    },
    [COLORS, catColors, styles, openEdit, handleDelete, handleToggleActive, t]
  );

  // ── Map overlay data ──
  const mapOverlays = useMemo(() => {
    return zones
      .filter((z) => z.is_active)
      .map((z) => {
        const catColor = catColors[z.category] ?? COLORS.PRIMARY;
        const coords = z.coordinates ?? {};
        if (z.fence_type === "circle" && coords.lat) {
          return {
            id: z.id,
            type: "circle",
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: parseFloat(z.radius) || 500,
            color: catColor,
          };
        }
        if (z.fence_type === "polygon" && Array.isArray(coords)) {
          return {
            id: z.id,
            type: "polygon",
            coordinates: coords.map((c) => ({
              latitude: c.lat,
              longitude: c.lng,
            })),
            color: catColor,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [zones, catColors, COLORS]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Header stats bar ── */}
      <View style={styles.headerBar}>
        <View style={styles.headerStats}>
          <Ionicons
            name="layers-outline"
            size={16}
            color={COLORS.TEXT_SECONDARY}
          />
          <Text style={styles.headerStatText}>
            <Text style={styles.headerStatBold}>{zones.length}</Text>{" "}
            {t("geofence.totalZones")}
            {"  ·  "}
            <Text style={styles.headerStatBold}>{activeCount}</Text>{" "}
            {t("geofence.active")}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openNew}>
          <Ionicons name="add" size={16} color={COLORS.WHITE} />
          <Text style={styles.addButtonText}>{t("geofence.addZone")}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Map strip (active zones overview) ── */}
      {!loading && !error && zones.length > 0 && (
        <View style={styles.mapStrip}>
          <MapView
            ref={mapRef}
            style={styles.mapStripMap}
            provider={PROVIDER_GOOGLE}
            initialRegion={DEFAULT_REGION}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            moveOnMarkerPress={false}
          >
            {mapOverlays.map((ov) =>
              ov.type === "circle" ? (
                <Circle
                  key={ov.id}
                  center={ov.center}
                  radius={ov.radius}
                  fillColor={withAlpha(ov.color, 0.18)}
                  strokeColor={withAlpha(ov.color, 0.7)}
                  strokeWidth={1.5}
                />
              ) : (
                <Polygon
                  key={ov.id}
                  coordinates={ov.coordinates}
                  fillColor={withAlpha(ov.color, 0.18)}
                  strokeColor={withAlpha(ov.color, 0.7)}
                  strokeWidth={1.5}
                />
              )
            )}
          </MapView>
        </View>
      )}

      {/* ── Page state: loading / error ── */}
      {loading && <DataState loading />}
      {!loading && error && <DataState error={error} onRetry={loadZones} />}

      {/* ── Zone list ── */}
      {!loading && !error && (
        <FlatList
          data={zones}
          keyExtractor={(item, index) =>
            item?.id ? String(item.id) : `zone-${index}`
          }
          renderItem={renderZone}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              size="sm"
              icon="location-outline"
              title={t("geofence.emptyTitle")}
              subtitle={t("geofence.emptyDesc")}
              action={{ label: t("geofence.addFirstZone"), onPress: openNew }}
            />
          }
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editZone ? t("geofence.editFence") : t("geofence.newFence")}
              </Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowModal(false)}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Zone name ── */}
              <Text style={styles.sectionLabel}>{t("geofence.name")}</Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={t("geofence.namePlaceholder")}
                placeholderTextColor={COLORS.TEXT_SECONDARY}
              />

              {/* ── Description ── */}
              <Text style={styles.sectionLabel}>
                {t("geofence.description")}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textInputMulti]}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder={t("geofence.descriptionPlaceholder")}
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                multiline
              />

              {/* ── Fence type ── */}
              <Text style={styles.sectionLabel}>{t("geofence.fenceType")}</Text>
              <View style={styles.segmentRow}>
                {FENCE_TYPES.map((ft) => {
                  const active = form.fence_type === ft;
                  return (
                    <TouchableOpacity
                      key={ft}
                      style={[
                        styles.segmentBtn,
                        active && styles.segmentBtnActive,
                      ]}
                      onPress={() => {
                        setForm((f) => ({ ...f, fence_type: ft }));
                        setDrawPoints([]);
                        setCircleCenter(null);
                      }}
                    >
                      <Ionicons
                        name={
                          ft === "circle"
                            ? "radio-button-on-outline"
                            : "shapes-outline"
                        }
                        size={14}
                        color={active ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
                      />
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {ft === "circle"
                          ? t("geofence.type.circle", "Circle")
                          : t("geofence.polygon")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Radius (circle only) ── */}
              {form.fence_type === "circle" && (
                <>
                  <Text style={styles.sectionLabel}>
                    {t("geofence.radius")}
                  </Text>
                  <View style={styles.radiusPresets}>
                    {RADIUS_PRESETS.map((r) => {
                      const active = !form.customRadius && form.radius === r;
                      return (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.radiusChip,
                            {
                              backgroundColor: active
                                ? COLORS.PRIMARY
                                : withAlpha(COLORS.PRIMARY, 0.06),
                              borderColor: active
                                ? COLORS.PRIMARY
                                : COLORS.DIVIDER,
                            },
                          ]}
                          onPress={() =>
                            setForm((f) => ({
                              ...f,
                              radius: r,
                              customRadius: "",
                            }))
                          }
                        >
                          <Text
                            style={[
                              styles.radiusChipText,
                              { color: active ? COLORS.WHITE : COLORS.TEXT },
                            ]}
                          >
                            {r >= 1000 ? `${r / 1000} km` : `${r} m`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TextInput
                    style={[styles.textInput, { marginTop: COLORS.SPACING.xs }]}
                    value={form.customRadius}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, customRadius: v }))
                    }
                    placeholder={t("geofence.customRadius")}
                    placeholderTextColor={COLORS.TEXT_SECONDARY}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* ── Category ── */}
              <Text style={styles.sectionLabel}>{t("geofence.category")}</Text>
              <View style={styles.categoryGrid}>
                {Object.keys(CATEGORY_ICONS).map((cat) => {
                  const active = form.category === cat;
                  const catColor = catColors[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: active
                            ? catColor
                            : withAlpha(catColor, 0.08),
                          borderColor: active
                            ? catColor
                            : withAlpha(catColor, 0.25),
                        },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, category: cat }))}
                    >
                      <Ionicons
                        name={CATEGORY_ICONS[cat]}
                        size={13}
                        color={active ? COLORS.WHITE : catColor}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          { color: active ? COLORS.WHITE : catColor },
                        ]}
                      >
                        {t(`geofence.categories.${cat}`, cat)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Draw on map ── */}
              <Text style={styles.sectionLabel}>
                {form.fence_type === "circle"
                  ? t("geofence.hintCircle")
                  : t("geofence.hintPolygon", { count: drawPoints.length })}
              </Text>
              {/* ── Map Search ── */}
              <View style={styles.mapSearchRow}>
                <TextInput
                  style={styles.mapSearchInput}
                  placeholder={t("geofence.searchPlaceholder", "Konum ara...")}
                  placeholderTextColor={COLORS.TEXT_SECONDARY}
                  value={mapSearch}
                  onChangeText={setMapSearch}
                  onSubmitEditing={handleMapSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[
                    styles.mapSearchBtn,
                    { backgroundColor: COLORS.PRIMARY },
                  ]}
                  onPress={handleMapSearch}
                  disabled={mapSearching}
                >
                  {mapSearching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.drawMapWrap}>
                <MapView
                  ref={drawMapRef}
                  style={styles.drawMap}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={
                    circleCenter
                      ? {
                          latitude: circleCenter.latitude,
                          longitude: circleCenter.longitude,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        }
                      : DEFAULT_REGION
                  }
                  onLongPress={handleDrawPress}
                >
                  {/* Circle preview */}
                  {form.fence_type === "circle" && circleCenter && (
                    <Circle
                      center={circleCenter}
                      radius={
                        form.customRadius
                          ? parseInt(form.customRadius, 10) || 500
                          : form.radius
                      }
                      fillColor={withAlpha(
                        catColors[form.category] ?? COLORS.PRIMARY,
                        0.2
                      )}
                      strokeColor={catColors[form.category] ?? COLORS.PRIMARY}
                      strokeWidth={2}
                    />
                  )}
                  {/* Polygon preview */}
                  {form.fence_type === "polygon" && drawPoints.length >= 3 && (
                    <Polygon
                      coordinates={drawPoints}
                      fillColor={withAlpha(
                        catColors[form.category] ?? COLORS.PRIMARY,
                        0.2
                      )}
                      strokeColor={catColors[form.category] ?? COLORS.PRIMARY}
                      strokeWidth={2}
                    />
                  )}
                  {/* Polygon nokta marker'ları */}
                  {form.fence_type === "polygon" &&
                    drawPoints.map((pt, idx) => (
                      <Marker
                        key={`pt-${idx}`}
                        coordinate={pt}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={false}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor:
                              catColors[form.category] ?? COLORS.PRIMARY,
                            borderWidth: 2,
                            borderColor: "#FFFFFF",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 9,
                              fontWeight: "bold",
                            }}
                          >
                            {idx + 1}
                          </Text>
                        </View>
                      </Marker>
                    ))}
                </MapView>

                {/* Clear button */}
                {(circleCenter || drawPoints.length > 0) && (
                  <TouchableOpacity
                    style={styles.drawClearBtn}
                    onPress={() => {
                      setDrawPoints([]);
                      setCircleCenter(null);
                    }}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={12}
                      color="#FFFFFF"
                    />
                    <Text style={styles.drawClearText}>
                      {t("geofence.clearPoints")}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Hint overlay */}
                <View style={styles.drawHint} pointerEvents="none">
                  <Text style={styles.drawHintText}>
                    {form.fence_type === "circle"
                      ? t("geofence.hintCircle")
                      : t("geofence.hintPolygon", { count: drawPoints.length })}
                  </Text>
                </View>
              </View>

              {/* ── Alert settings ── */}
              <Text style={styles.sectionLabel}>
                {t("geofence.alertSettings")}
              </Text>
              <Card variant="flat">
                <View style={[styles.switchRow]}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>
                      {t("geofence.alertOnEntry")}
                    </Text>
                  </View>
                  <Switch
                    value={form.alert_on_entry}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, alert_on_entry: v }))
                    }
                    trackColor={{
                      false: COLORS.DIVIDER,
                      true: withAlpha(COLORS.INFO, 0.4),
                    }}
                    thumbColor={
                      form.alert_on_entry ? COLORS.INFO : COLORS.TEXT_SECONDARY
                    }
                  />
                </View>
                <View style={[styles.switchRow]}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>
                      {t("geofence.alertOnExit")}
                    </Text>
                  </View>
                  <Switch
                    value={form.alert_on_exit}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, alert_on_exit: v }))
                    }
                    trackColor={{
                      false: COLORS.DIVIDER,
                      true: withAlpha(COLORS.WARNING, 0.4),
                    }}
                    thumbColor={
                      form.alert_on_exit
                        ? COLORS.WARNING
                        : COLORS.TEXT_SECONDARY
                    }
                  />
                </View>
                <View style={[styles.switchRow, styles.switchRowLast]}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>
                      {t("geofence.timeRestriction")}
                    </Text>
                    <Text style={styles.switchLabelSub}>
                      {t("geofence.timeHint")}
                    </Text>
                  </View>
                  <Switch
                    value={form.time_restriction}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, time_restriction: v }))
                    }
                    trackColor={{
                      false: COLORS.DIVIDER,
                      true: withAlpha(COLORS.PRIMARY, 0.4),
                    }}
                    thumbColor={
                      form.time_restriction
                        ? COLORS.PRIMARY
                        : COLORS.TEXT_SECONDARY
                    }
                  />
                </View>
                {form.time_restriction && (
                  <View
                    style={[
                      styles.hourRow,
                      {
                        paddingHorizontal: COLORS.SPACING.sm,
                        paddingBottom: COLORS.SPACING.sm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.switchLabelSub,
                        { marginRight: COLORS.SPACING.xs },
                      ]}
                    >
                      {t("geofence.startHour")}
                    </Text>
                    <TextInput
                      style={styles.hourInput}
                      value={form.start_hour}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, start_hour: v }))
                      }
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={styles.hourSep}>–</Text>
                    <TextInput
                      style={styles.hourInput}
                      value={form.end_hour}
                      onChangeText={(v) =>
                        setForm((f) => ({ ...f, end_hour: v }))
                      }
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text
                      style={[
                        styles.switchLabelSub,
                        { marginLeft: COLORS.SPACING.xs },
                      ]}
                    >
                      {t("geofence.endHour")}
                    </Text>
                  </View>
                )}
              </Card>

              {/* ── CSRD ── */}
              <Text style={styles.sectionLabel}>CSRD</Text>
              <Card variant="flat">
                <View style={[styles.switchRow, styles.switchRowLast]}>
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>
                      {t("geofence.csrdTracked")}
                    </Text>
                  </View>
                  <Switch
                    value={form.csrd_tracked}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, csrd_tracked: v }))
                    }
                    trackColor={{
                      false: COLORS.DIVIDER,
                      true: withAlpha(COLORS.SUCCESS, 0.4),
                    }}
                    thumbColor={
                      form.csrd_tracked ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY
                    }
                  />
                </View>
                {form.csrd_tracked && (
                  <View style={styles.csrdBanner}>
                    <Ionicons
                      name="leaf-outline"
                      size={14}
                      color={COLORS.SUCCESS}
                    />
                    <Text style={styles.csrdBannerText}>
                      {t("geofence.csrdInfo")}
                    </Text>
                  </View>
                )}
              </Card>

              {/* ── Save button ── */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving
                    ? "..."
                    : editZone
                      ? t("common.save")
                      : t("geofence.addZone")}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
