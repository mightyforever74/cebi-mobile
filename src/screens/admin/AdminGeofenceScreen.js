// src/screens/admin/AdminGeofenceScreen.js
// TulipFleet - Geofence Yönetim Ekranı v2
// Teleport koruması | duration_seconds | Draw toolbar | Zone preview

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, Polygon } from "react-native-maps";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { geofenceAPI } from "../../services/api";

// ─────────────────────────────────────────────
// KATEGORİ TANIMI
// ─────────────────────────────────────────────
const FENCE_CATEGORIES = [
  { key: "general", icon: "location-outline", color: "#6B7280" },
  { key: "depot", icon: "home-outline", color: "#3B82F6" },
  { key: "city_center", icon: "business-outline", color: "#8B5CF6" },
  { key: "emission_zone", icon: "leaf-outline", color: "#10B981" },
  { key: "border", icon: "flag-outline", color: "#F59E0B" },
  { key: "sensitive_area", icon: "shield-outline", color: "#EF4444" },
];

const getCategoryColor = (key) =>
  FENCE_CATEGORIES.find((c) => c.key === key)?.color || "#6B7280";
const getCategoryIcon = (key) =>
  FENCE_CATEGORIES.find((c) => c.key === key)?.icon || "location-outline";

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m}dk`;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
const AdminGeofenceScreen = ({ navigation }) => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();

  // Liste
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFence, setEditingFence] = useState(null);
  const [saving, setSaving] = useState(false);

  // Önizleme modal
  const [previewFence, setPreviewFence] = useState(null);

  // Form
  const [form, setForm] = useState({
    name: "",
    description: "",
    fence_type: "circle",
    coordinates: null,
    radius: "500",
    alert_on_entry: true,
    alert_on_exit: true,
    fence_category: "general",
    time_restriction: {
      enabled: false,
      start_hour: 22,
      end_hour: 6,
      days: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  // Harita — draw mode
  // drawMode: null | 'circle' | 'polygon'
  const [drawMode, setDrawMode] = useState(null);
  const [polygonPoints, setPolygonPoints] = useState([]);
  const mapRef = useRef(null);
  const modalMapRef = useRef(null);

  const [mapRegion] = useState({
    latitude: 41.0082,
    longitude: 28.9784,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });

  // ─────────────────────────────────────────────
  // FETCH
  // ─────────────────────────────────────────────
  const fetchGeofences = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await geofenceAPI.getAll();
      setGeofences(data.geofences || []);
    } catch (err) {
      console.error("Geofence fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  // ─────────────────────────────────────────────
  // FORM
  // ─────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      fence_type: "circle",
      coordinates: null,
      radius: "500",
      alert_on_entry: true,
      alert_on_exit: true,
      fence_category: "general",
      time_restriction: {
        enabled: false,
        start_hour: 22,
        end_hour: 6,
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    setPolygonPoints([]);
    setDrawMode(null);
    setEditingFence(null);
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (fence) => {
    setEditingFence(fence);
    setForm({
      name: fence.name,
      description: fence.description || "",
      fence_type: fence.fence_type,
      coordinates: fence.coordinates,
      radius: String(fence.radius || 500),
      alert_on_entry: fence.alert_on_entry,
      alert_on_exit: fence.alert_on_exit,
      fence_category: fence.fence_category || "general",
      time_restriction: fence.time_restriction || {
        enabled: false,
        start_hour: 22,
        end_hour: 6,
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    if (fence.fence_type === "polygon") setPolygonPoints(fence.coordinates);
    setModalVisible(true);
  };

  // ─────────────────────────────────────────────
  // DRAW MODE
  // ─────────────────────────────────────────────
  const activateDrawMode = (type) => {
    // Tip değişince çizimi sıfırla
    if (type !== form.fence_type) {
      setForm((p) => ({ ...p, fence_type: type, coordinates: null }));
      setPolygonPoints([]);
    }
    setDrawMode(type);
  };

  const handleMapLongPress = (e) => {
    if (!drawMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;

    if (drawMode === "circle") {
      setForm((p) => ({
        ...p,
        coordinates: { lat: latitude, lng: longitude },
      }));
      setDrawMode(null); // çember için tek tıklama yeterli
    } else {
      const newPoints = [...polygonPoints, { lat: latitude, lng: longitude }];
      setPolygonPoints(newPoints);
      setForm((p) => ({ ...p, coordinates: newPoints }));
    }
  };

  const undoLastPoint = () => {
    const newPoints = polygonPoints.slice(0, -1);
    setPolygonPoints(newPoints);
    setForm((p) => ({
      ...p,
      coordinates: newPoints.length > 0 ? newPoints : null,
    }));
  };

  const clearDraw = () => {
    setPolygonPoints([]);
    setForm((p) => ({ ...p, coordinates: null }));
    setDrawMode(null);
  };

  // ─────────────────────────────────────────────
  // KAYDET
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t("common.error"), t("geofence.nameRequired"));
      return;
    }
    if (!form.coordinates) {
      Alert.alert(t("common.error"), t("geofence.drawFirst"));
      return;
    }
    if (form.fence_type === "polygon" && polygonPoints.length < 3) {
      Alert.alert(t("common.error"), t("geofence.polygonMinPoints"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        fence_type: form.fence_type,
        coordinates: form.coordinates,
        radius: form.fence_type === "circle" ? parseFloat(form.radius) : null,
        alert_on_entry: form.alert_on_entry,
        alert_on_exit: form.alert_on_exit,
        fence_category: form.fence_category,
        time_restriction: form.time_restriction.enabled
          ? form.time_restriction
          : null,
      };
      if (editingFence) await geofenceAPI.update(editingFence.id, payload);
      else await geofenceAPI.create(payload);
      setModalVisible(false);
      resetForm();
      fetchGeofences(true);
    } catch (err) {
      Alert.alert(
        t("common.error"),
        err?.response?.data?.error || t("geofence.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // SİL / TOGGLE
  // ─────────────────────────────────────────────
  const handleDelete = (fence) => {
    Alert.alert(
      t("geofence.deleteTitle"),
      t("geofence.deleteConfirm", { name: fence.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await geofenceAPI.remove(fence.id);
              fetchGeofences(true);
            } catch {
              Alert.alert(t("common.error"), t("geofence.deleteFailed"));
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (fence) => {
    try {
      await geofenceAPI.update(fence.id, { is_active: !fence.is_active });
      fetchGeofences(true);
    } catch {
      Alert.alert(t("common.error"), t("geofence.updateFailed"));
    }
  };

  // ─────────────────────────────────────────────
  // RENDER — Önizleme modal
  // ─────────────────────────────────────────────
  const renderPreviewModal = () => {
    if (!previewFence) return null;
    const f = previewFence;
    const catColor = getCategoryColor(f.fence_category);

    const region =
      f.fence_type === "circle" && f.coordinates?.lat
        ? {
            latitude: parseFloat(f.coordinates.lat),
            longitude: parseFloat(f.coordinates.lng),
            latitudeDelta: Math.max(0.02, (parseFloat(f.radius) * 6) / 111000),
            longitudeDelta: Math.max(0.02, (parseFloat(f.radius) * 6) / 111000),
          }
        : f.fence_type === "polygon" && f.coordinates?.length > 0
          ? {
              latitude:
                f.coordinates.reduce((a, p) => a + p.lat, 0) /
                f.coordinates.length,
              longitude:
                f.coordinates.reduce((a, p) => a + p.lng, 0) /
                f.coordinates.length,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }
          : mapRegion;

    return (
      <Modal
        visible={!!previewFence}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setPreviewFence(null)}
      >
        <View style={styles.previewContainer}>
          {/* Header */}
          <View style={[styles.previewHeader, { borderBottomColor: catColor }]}>
            <TouchableOpacity onPress={() => setPreviewFence(null)}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={COLORS.TEXT_PRIMARY}
              />
            </TouchableOpacity>
            <View style={styles.previewTitleBlock}>
              <Text style={styles.previewTitle}>{f.name}</Text>
              <View
                style={[
                  styles.previewStatusBadge,
                  {
                    backgroundColor: f.is_active
                      ? COLORS.SUCCESS + "20"
                      : COLORS.MUTED + "30",
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewStatusDot,
                    {
                      backgroundColor: f.is_active
                        ? COLORS.SUCCESS
                        : COLORS.TEXT_SECONDARY,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.previewStatusText,
                    {
                      color: f.is_active
                        ? COLORS.SUCCESS
                        : COLORS.TEXT_SECONDARY,
                    },
                  ]}
                >
                  {f.is_active ? t("geofence.active") : t("common.off")}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setPreviewFence(null);
                openEdit(f);
              }}
            >
              <Ionicons
                name="pencil-outline"
                size={22}
                color={COLORS.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          {/* Harita */}
          <MapView
            ref={mapRef}
            style={styles.previewMap}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
          >
            {f.fence_type === "circle" && f.coordinates?.lat && (
              <>
                <Circle
                  center={{
                    latitude: parseFloat(f.coordinates.lat),
                    longitude: parseFloat(f.coordinates.lng),
                  }}
                  radius={parseFloat(f.radius)}
                  fillColor={catColor + (f.is_active ? "30" : "15")}
                  strokeColor={f.is_active ? catColor : COLORS.MUTED}
                  strokeWidth={f.is_active ? 2 : 1}
                />
                <Marker
                  coordinate={{
                    latitude: parseFloat(f.coordinates.lat),
                    longitude: parseFloat(f.coordinates.lng),
                  }}
                  pinColor={f.is_active ? catColor : "#9CA3AF"}
                />
              </>
            )}
            {f.fence_type === "polygon" &&
              Array.isArray(f.coordinates) &&
              f.coordinates.length >= 3 && (
                <Polygon
                  coordinates={f.coordinates.map((p) => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  fillColor={catColor + (f.is_active ? "30" : "15")}
                  strokeColor={f.is_active ? catColor : COLORS.MUTED}
                  strokeWidth={f.is_active ? 2 : 1}
                />
              )}
          </MapView>

          {/* Detay kartı */}
          <ScrollView style={styles.previewDetails}>
            <View style={styles.previewRow}>
              <Ionicons
                name={getCategoryIcon(f.fence_category)}
                size={16}
                color={catColor}
              />
              <Text style={styles.previewRowText}>
                {t(`geofence.categories.${f.fence_category}`)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons
                name={
                  f.fence_type === "circle"
                    ? "radio-button-on-outline"
                    : "shapes-outline"
                }
                size={16}
                color={COLORS.TEXT_SECONDARY}
              />
              <Text style={styles.previewRowText}>
                {t(`geofence.type.${f.fence_type}`)}
                {f.fence_type === "circle" && f.radius
                  ? `  —  ${f.radius}m`
                  : ""}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons
                name="log-in-outline"
                size={16}
                color={f.alert_on_entry ? COLORS.SUCCESS : COLORS.MUTED}
              />
              <Text style={styles.previewRowText}>
                {t("geofence.alertOnEntry")}:{" "}
                {f.alert_on_entry ? t("common.on") : t("common.off")}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Ionicons
                name="log-out-outline"
                size={16}
                color={f.alert_on_exit ? COLORS.ERROR : COLORS.MUTED}
              />
              <Text style={styles.previewRowText}>
                {t("geofence.alertOnExit")}:{" "}
                {f.alert_on_exit ? t("common.on") : t("common.off")}
              </Text>
            </View>
            {f.total_events > 0 && (
              <View style={styles.previewRow}>
                <Ionicons name="pulse-outline" size={16} color={COLORS.INFO} />
                <Text style={styles.previewRowText}>
                  {f.total_events} {t("geofence.events")} ({f.events_last_7d}{" "}
                  {t("geofence.last7d")})
                </Text>
              </View>
            )}
            {f.total_duration_minutes > 0 && (
              <View style={[styles.previewRow, styles.csrdRow]}>
                <Ionicons
                  name="leaf-outline"
                  size={16}
                  color={COLORS.SUCCESS}
                />
                <Text
                  style={[styles.previewRowText, { color: COLORS.SUCCESS }]}
                >
                  CSRD: {Math.round(f.total_duration_minutes)}{" "}
                  {t("geofence.minutes")} {t("geofence.totalTime")}
                </Text>
              </View>
            )}
            {f.description && (
              <Text style={styles.previewDesc}>{f.description}</Text>
            )}
            <TouchableOpacity
              style={styles.previewEventsBtn}
              onPress={() => {
                setPreviewFence(null);
                navigation.navigate("GeofenceEvents", {
                  geofenceId: f.id,
                  name: f.name,
                });
              }}
            >
              <Ionicons name="list-outline" size={18} color={COLORS.PRIMARY} />
              <Text style={styles.previewEventsBtnText}>
                {t("geofence.viewEvents")}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────
  // RENDER — Draw toolbar (modal içinde)
  // ─────────────────────────────────────────────
  const renderDrawToolbar = () => (
    <View style={styles.drawToolbar}>
      {/* Circle tool */}
      <TouchableOpacity
        style={[
          styles.toolBtn,
          drawMode === "circle" && styles.toolBtnActive,
          form.fence_type === "circle" &&
            !drawMode &&
            form.coordinates &&
            styles.toolBtnDone,
        ]}
        onPress={() => activateDrawMode("circle")}
      >
        <Ionicons
          name="radio-button-on-outline"
          size={20}
          color={
            drawMode === "circle"
              ? COLORS.WHITE
              : form.coordinates && form.fence_type === "circle"
                ? COLORS.SUCCESS
                : COLORS.PRIMARY
          }
        />
        <Text
          style={[
            styles.toolBtnText,
            drawMode === "circle" && { color: COLORS.WHITE },
          ]}
        >
          {drawMode === "circle"
            ? t("geofence.tapToPlace")
            : form.coordinates && form.fence_type === "circle"
              ? t("geofence.placed")
              : t("geofence.type.circle")}
        </Text>
      </TouchableOpacity>

      {/* Polygon tool */}
      <TouchableOpacity
        style={[
          styles.toolBtn,
          drawMode === "polygon" && styles.toolBtnActive,
          form.fence_type === "polygon" &&
            polygonPoints.length >= 3 &&
            !drawMode &&
            styles.toolBtnDone,
        ]}
        onPress={() => activateDrawMode("polygon")}
      >
        <Ionicons
          name="shapes-outline"
          size={20}
          color={
            drawMode === "polygon"
              ? COLORS.WHITE
              : polygonPoints.length >= 3
                ? COLORS.SUCCESS
                : COLORS.PRIMARY
          }
        />
        <Text
          style={[
            styles.toolBtnText,
            drawMode === "polygon" && { color: COLORS.WHITE },
          ]}
        >
          {drawMode === "polygon"
            ? `${t("geofence.addPoint")} (${polygonPoints.length})`
            : polygonPoints.length >= 3
              ? `${t("geofence.polygon")} (${polygonPoints.length})`
              : t("geofence.type.polygon")}
        </Text>
      </TouchableOpacity>

      {/* Undo / Clear */}
      {form.fence_type === "polygon" && polygonPoints.length > 0 && (
        <TouchableOpacity style={styles.toolBtnSmall} onPress={undoLastPoint}>
          <Ionicons
            name="arrow-undo-outline"
            size={18}
            color={COLORS.WARNING}
          />
        </TouchableOpacity>
      )}
      {(form.coordinates || polygonPoints.length > 0) && (
        <TouchableOpacity style={styles.toolBtnSmall} onPress={clearDraw}>
          <Ionicons name="trash-outline" size={18} color={COLORS.ERROR} />
        </TouchableOpacity>
      )}
    </View>
  );

  // ─────────────────────────────────────────────
  // RENDER — Harita önizleme (modal içinde)
  // ─────────────────────────────────────────────
  const renderModalMap = () => {
    const hasCenter = form.fence_type === "circle" && form.coordinates?.lat;
    const region = hasCenter
      ? {
          latitude: form.coordinates.lat,
          longitude: form.coordinates.lng,
          latitudeDelta: Math.max(
            0.015,
            (parseFloat(form.radius) * 5) / 111000
          ),
          longitudeDelta: Math.max(
            0.015,
            (parseFloat(form.radius) * 5) / 111000
          ),
        }
      : mapRegion;

    return (
      <View style={styles.mapWrapper}>
        <MapView
          ref={modalMapRef}
          style={styles.map}
          region={region}
          onLongPress={handleMapLongPress}
          showsUserLocation
        >
          {/* Circle önizleme */}
          {form.fence_type === "circle" && form.coordinates?.lat && (
            <>
              <Circle
                center={{
                  latitude: form.coordinates.lat,
                  longitude: form.coordinates.lng,
                }}
                radius={parseFloat(form.radius) || 500}
                fillColor={getCategoryColor(form.fence_category) + "35"}
                strokeColor={getCategoryColor(form.fence_category)}
                strokeWidth={2}
              />
              <Marker
                coordinate={{
                  latitude: form.coordinates.lat,
                  longitude: form.coordinates.lng,
                }}
                pinColor={getCategoryColor(form.fence_category)}
              />
            </>
          )}

          {/* Polygon önizleme */}
          {form.fence_type === "polygon" && polygonPoints.length >= 3 && (
            <Polygon
              coordinates={polygonPoints.map((p) => ({
                latitude: p.lat,
                longitude: p.lng,
              }))}
              fillColor={getCategoryColor(form.fence_category) + "35"}
              strokeColor={getCategoryColor(form.fence_category)}
              strokeWidth={2}
            />
          )}
          {form.fence_type === "polygon" &&
            polygonPoints.map((p, i) => (
              <Marker
                key={i}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                pinColor={getCategoryColor(form.fence_category)}
                title={`${i + 1}`}
              />
            ))}
        </MapView>

        {/* Draw toolbar — harita üstünde */}
        <View style={styles.mapToolbarOverlay}>{renderDrawToolbar()}</View>

        {/* İpucu */}
        {drawMode && (
          <View style={styles.drawHint}>
            <Text style={styles.drawHintText}>
              {drawMode === "circle"
                ? t("geofence.hintCircle")
                : t("geofence.hintPolygon", { count: polygonPoints.length })}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // RENDER — Edit/Create Modal
  // ─────────────────────────────────────────────
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      onRequestClose={() => {
        setModalVisible(false);
        resetForm();
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
          >
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {editingFence ? t("geofence.editFence") : t("geofence.newFence")}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <Text style={styles.saveBtn}>{t("common.save")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Harita + draw toolbar */}
          {renderModalMap()}

          {/* Yarıçap (circle) */}
          {form.fence_type === "circle" && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("geofence.radius")}</Text>
              <View style={styles.radiusRow}>
                {["100", "250", "500", "1000", "2000", "5000"].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.radiusChip,
                      form.radius === r && styles.radiusChipActive,
                    ]}
                    onPress={() => setForm((p) => ({ ...p, radius: r }))}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        form.radius === r && styles.radiusChipTextActive,
                      ]}
                    >
                      {parseInt(r) >= 1000
                        ? `${parseInt(r) / 1000}km`
                        : `${r}m`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={form.radius}
                onChangeText={(v) =>
                  setForm((p) => ({ ...p, radius: v.replace(/[^0-9]/g, "") }))
                }
                keyboardType="numeric"
                placeholder={t("geofence.customRadius")}
                placeholderTextColor={COLORS.PLACEHOLDER}
              />
            </View>
          )}

          {/* İsim */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("geofence.name")}</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder={t("geofence.namePlaceholder")}
              placeholderTextColor={COLORS.PLACEHOLDER}
            />
          </View>

          {/* Açıklama */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("geofence.description")}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder={t("geofence.descriptionPlaceholder")}
              placeholderTextColor={COLORS.PLACEHOLDER}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Kategori */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("geofence.category")}</Text>
            <View style={styles.categoryGrid}>
              {FENCE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.catChip,
                    form.fence_category === cat.key && {
                      backgroundColor: cat.color + "20",
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() =>
                    setForm((p) => ({ ...p, fence_category: cat.key }))
                  }
                >
                  <Ionicons
                    name={cat.icon}
                    size={16}
                    color={
                      form.fence_category === cat.key
                        ? cat.color
                        : COLORS.TEXT_SECONDARY
                    }
                  />
                  <Text
                    style={[
                      styles.catChipText,
                      form.fence_category === cat.key && { color: cat.color },
                    ]}
                  >
                    {t(`geofence.categories.${cat.key}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.fence_category === "emission_zone" && (
              <View style={styles.csrdInfo}>
                <Ionicons
                  name="leaf-outline"
                  size={14}
                  color={COLORS.SUCCESS}
                />
                <Text style={styles.csrdInfoText}>
                  {t("geofence.csrdInfo")}
                </Text>
              </View>
            )}
          </View>

          {/* Alert ayarları */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {t("geofence.alertSettings")}
            </Text>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons
                  name="log-in-outline"
                  size={18}
                  color={COLORS.SUCCESS}
                />
                <Text style={styles.switchText}>
                  {t("geofence.alertOnEntry")}
                </Text>
              </View>
              <Switch
                value={form.alert_on_entry}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, alert_on_entry: v }))
                }
                trackColor={{
                  false: COLORS.MUTED,
                  true: COLORS.SUCCESS + "80",
                }}
                thumbColor={
                  form.alert_on_entry ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY
                }
              />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={COLORS.ERROR}
                />
                <Text style={styles.switchText}>
                  {t("geofence.alertOnExit")}
                </Text>
              </View>
              <Switch
                value={form.alert_on_exit}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, alert_on_exit: v }))
                }
                trackColor={{ false: COLORS.MUTED, true: COLORS.ERROR + "80" }}
                thumbColor={
                  form.alert_on_exit ? COLORS.ERROR : COLORS.TEXT_SECONDARY
                }
              />
            </View>
          </View>

          {/* Zaman kısıtlaması */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.WARNING}
                />
                <Text style={styles.switchText}>
                  {t("geofence.timeRestriction")}
                </Text>
              </View>
              <Switch
                value={form.time_restriction.enabled}
                onValueChange={(v) =>
                  setForm((p) => ({
                    ...p,
                    time_restriction: { ...p.time_restriction, enabled: v },
                  }))
                }
                trackColor={{
                  false: COLORS.MUTED,
                  true: COLORS.WARNING + "80",
                }}
                thumbColor={
                  form.time_restriction.enabled
                    ? COLORS.WARNING
                    : COLORS.TEXT_SECONDARY
                }
              />
            </View>
            {form.time_restriction.enabled && (
              <View style={styles.timeBlock}>
                <Text style={styles.timeHint}>{t("geofence.timeHint")}</Text>
                <View style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>
                      {t("geofence.startHour")}
                    </Text>
                    <TextInput
                      style={styles.timeInput}
                      value={String(form.time_restriction.start_hour)}
                      onChangeText={(v) =>
                        setForm((p) => ({
                          ...p,
                          time_restriction: {
                            ...p.time_restriction,
                            start_hour: parseInt(v) || 0,
                          },
                        }))
                      }
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor={COLORS.PLACEHOLDER}
                    />
                  </View>
                  <Text style={styles.timeSeparator}>—</Text>
                  <View style={styles.timeField}>
                    <Text style={styles.timeLabel}>
                      {t("geofence.endHour")}
                    </Text>
                    <TextInput
                      style={styles.timeInput}
                      value={String(form.time_restriction.end_hour)}
                      onChangeText={(v) =>
                        setForm((p) => ({
                          ...p,
                          time_restriction: {
                            ...p.time_restriction,
                            end_hour: parseInt(v) || 0,
                          },
                        }))
                      }
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor={COLORS.PLACEHOLDER}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  // ─────────────────────────────────────────────
  // RENDER — Fence kart
  // ─────────────────────────────────────────────
  const renderFenceCard = (fence) => {
    const catColor = getCategoryColor(fence.fence_category);
    const catIcon = getCategoryIcon(fence.fence_category);
    const isActive = fence.is_active;

    return (
      <TouchableOpacity
        key={fence.id}
        style={[
          styles.fenceCard,
          {
            borderLeftColor: isActive ? catColor : COLORS.MUTED,
            opacity: isActive ? 1 : 0.65,
          },
        ]}
        onPress={() => setPreviewFence(fence)}
        activeOpacity={0.8}
      >
        <View style={styles.fenceHeader}>
          <View style={styles.fenceTitleRow}>
            <View
              style={[
                styles.catBadge,
                {
                  backgroundColor: (isActive ? catColor : COLORS.MUTED) + "20",
                },
              ]}
            >
              <Ionicons
                name={catIcon}
                size={14}
                color={isActive ? catColor : COLORS.TEXT_SECONDARY}
              />
            </View>
            <View style={styles.fenceTitleBlock}>
              <Text
                style={[
                  styles.fenceName,
                  !isActive && { color: COLORS.TEXT_SECONDARY },
                ]}
              >
                {fence.name}
              </Text>
              <Text style={styles.fenceMeta}>
                {fence.fence_type === "circle"
                  ? `⊙ ${fence.radius}m`
                  : `⬡ ${t("geofence.polygon")}`}
                {"  ·  "}
                {t(
                  `geofence.categories.${fence.fence_category}`,
                  fence.fence_category
                )}
              </Text>
            </View>
          </View>

          {/* Aktif/Pasif badge */}
          <View
            style={[
              styles.activeBadge,
              {
                backgroundColor: isActive
                  ? COLORS.SUCCESS + "20"
                  : COLORS.MUTED + "20",
              },
            ]}
          >
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: isActive
                    ? COLORS.SUCCESS
                    : COLORS.TEXT_SECONDARY,
                },
              ]}
            />
            <Text
              style={[
                styles.activeText,
                { color: isActive ? COLORS.SUCCESS : COLORS.TEXT_SECONDARY },
              ]}
            >
              {isActive ? t("geofence.active") : t("common.off")}
            </Text>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.fenceStats}>
          {fence.alert_on_entry && (
            <View style={styles.fenceStat}>
              <Ionicons
                name="log-in-outline"
                size={13}
                color={COLORS.SUCCESS}
              />
              <Text style={styles.fenceStatText}>{t("geofence.entry")}</Text>
            </View>
          )}
          {fence.alert_on_exit && (
            <View style={styles.fenceStat}>
              <Ionicons name="log-out-outline" size={13} color={COLORS.ERROR} />
              <Text style={styles.fenceStatText}>{t("geofence.exit")}</Text>
            </View>
          )}
          {fence.total_events > 0 && (
            <View style={styles.fenceStat}>
              <Ionicons name="pulse-outline" size={13} color={COLORS.INFO} />
              <Text style={styles.fenceStatText}>
                {fence.total_events} {t("geofence.events")}
              </Text>
            </View>
          )}
          {fence.total_duration_minutes > 0 && (
            <View style={styles.fenceStat}>
              <Ionicons name="leaf-outline" size={13} color={COLORS.SUCCESS} />
              <Text style={[styles.fenceStatText, { color: COLORS.SUCCESS }]}>
                {Math.round(fence.total_duration_minutes)}dk CSRD
              </Text>
            </View>
          )}
        </View>

        {/* Aksiyon butonları */}
        <View style={styles.fenceActions}>
          <Switch
            value={isActive}
            onValueChange={() => handleToggleActive(fence)}
            trackColor={{ false: COLORS.MUTED, true: COLORS.PRIMARY + "80" }}
            thumbColor={isActive ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEdit(fence)}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color={COLORS.TEXT_SECONDARY}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDelete(fence)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>{t("geofence.loading")}</Text>
      </View>
    );
  }

  const activeCount = geofences.filter((f) => f.is_active).length;
  const emissionCount = geofences.filter(
    (f) => f.fence_category === "emission_zone"
  ).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t("geofence.title")}</Text>
          <Text style={styles.headerSub}>
            {geofences.length} {t("geofence.totalZones")}
            {"  ·  "}
            {activeCount} {t("geofence.active")}
            {emissionCount > 0 && `  ·  ${emissionCount} CSRD`}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color={COLORS.WHITE} />
          <Text style={styles.addBtnText}>{t("geofence.addZone")}</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {geofences.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color={COLORS.MUTED} />
            <Text style={styles.emptyTitle}>{t("geofence.emptyTitle")}</Text>
            <Text style={styles.emptyDesc}>{t("geofence.emptyDesc")}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
              <Text style={styles.emptyBtnText}>
                {t("geofence.addFirstZone")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          geofences.map(renderFenceCard)
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {renderModal()}
      {renderPreviewModal()}
    </View>
  );
};

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    loadingText: {
      marginTop: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
    },

    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    headerTitle: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    headerSub: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.button,
    },
    addBtnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: 4,
    },

    list: { flex: 1 },
    listContent: { padding: COLORS.SPACING.md },

    // Fence kart
    fenceCard: {
      backgroundColor: COLORS.CARD,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      borderLeftWidth: 4,
      ...COLORS.SHADOWS.card,
    },
    fenceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.xs,
    },
    fenceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: COLORS.SPACING.sm,
    },
    catBadge: {
      width: 32,
      height: 32,
      borderRadius: COLORS.RADIUS.full,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    fenceTitleBlock: { flex: 1 },
    fenceName: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
    },
    fenceMeta: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginTop: 2,
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 3,
      borderRadius: COLORS.RADIUS.badge,
    },
    activeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    activeText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    fenceStats: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: COLORS.SPACING.sm,
    },
    fenceStat: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.xs,
    },
    fenceStatText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: 3,
    },
    fenceActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: COLORS.DIVIDER,
      paddingTop: COLORS.SPACING.sm,
    },
    actionBtn: { padding: COLORS.SPACING.sm, marginLeft: COLORS.SPACING.xs },

    // Empty
    emptyState: { alignItems: "center", paddingVertical: COLORS.SPACING.xxl },
    emptyTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.md,
    },
    emptyDesc: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      textAlign: "center",
      marginTop: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.xl,
    },
    emptyBtn: {
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.xl,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.button,
      marginTop: COLORS.SPACING.lg,
    },
    emptyBtnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Modal
    modalContainer: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    modalTitle: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    saveBtn: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    modalScroll: { flex: 1 },

    // Harita wrapper
    mapWrapper: {
      height: 280,
      margin: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.card,
      overflow: "hidden",
      position: "relative",
    },
    map: { flex: 1 },
    mapToolbarOverlay: {
      position: "absolute",
      top: COLORS.SPACING.sm,
      left: COLORS.SPACING.sm,
      right: COLORS.SPACING.sm,
    },
    drawHint: {
      position: "absolute",
      bottom: COLORS.SPACING.sm,
      left: COLORS.SPACING.sm,
      right: COLORS.SPACING.sm,
      backgroundColor: "rgba(0,0,0,0.65)",
      borderRadius: COLORS.RADIUS.badge,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
    },
    drawHintText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.caption,
      textAlign: "center",
    },

    // Draw toolbar
    drawToolbar: { flexDirection: "row", alignItems: "center" },
    toolBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE + "F0",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.button,
      borderWidth: 1,
      borderColor: COLORS.PRIMARY,
      marginRight: COLORS.SPACING.xs,
    },
    toolBtnActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    toolBtnDone: { borderColor: COLORS.SUCCESS },
    toolBtnSmall: {
      backgroundColor: COLORS.SURFACE + "F0",
      padding: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      marginRight: COLORS.SPACING.xs,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    toolBtnText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.PRIMARY,
      marginLeft: 4,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },

    // Form
    section: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
    },
    sectionLabel: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    input: {
      backgroundColor: COLORS.INPUT,
      borderRadius: COLORS.RADIUS.input,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    inputMulti: {
      height: 80,
      textAlignVertical: "top",
      paddingTop: COLORS.SPACING.sm,
    },
    radiusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: COLORS.SPACING.sm,
    },
    radiusChip: {
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.badge,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      marginRight: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
      backgroundColor: COLORS.SURFACE,
    },
    radiusChipActive: {
      backgroundColor: COLORS.PRIMARY,
      borderColor: COLORS.PRIMARY,
    },
    radiusChipText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    radiusChipTextActive: { color: COLORS.WHITE },
    categoryGrid: { flexDirection: "row", flexWrap: "wrap" },
    catChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.badge,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      marginRight: COLORS.SPACING.xs,
      marginBottom: COLORS.SPACING.xs,
      backgroundColor: COLORS.SURFACE,
    },
    catChipText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginLeft: 4,
    },
    csrdInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SUCCESS + "10",
      padding: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.badge,
      marginTop: COLORS.SPACING.sm,
    },
    csrdInfoText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.SUCCESS,
      marginLeft: 6,
      flex: 1,
    },
    switchRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    switchLabel: { flexDirection: "row", alignItems: "center" },
    switchText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    timeBlock: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.sm,
    },
    timeHint: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    timeField: { alignItems: "center" },
    timeLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: 4,
    },
    timeInput: {
      width: 64,
      backgroundColor: COLORS.INPUT,
      borderRadius: COLORS.RADIUS.input,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      textAlign: "center",
      paddingVertical: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    timeSeparator: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_SECONDARY,
      marginHorizontal: COLORS.SPACING.md,
    },

    // Preview modal
    previewContainer: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    previewHeader: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 2,
    },
    previewTitleBlock: { flex: 1, marginHorizontal: COLORS.SPACING.md },
    previewTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    previewStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: 2,
      borderRadius: COLORS.RADIUS.badge,
      alignSelf: "flex-start",
      marginTop: 4,
    },
    previewStatusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
    previewStatusText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
    },
    previewMap: { height: 320 },
    previewDetails: { flex: 1, padding: COLORS.SPACING.md },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    previewRowText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      marginLeft: COLORS.SPACING.sm,
    },
    csrdRow: {
      backgroundColor: COLORS.SUCCESS + "10",
      borderRadius: COLORS.RADIUS.badge,
      paddingHorizontal: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.xs,
    },
    previewDesc: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.TEXT_SECONDARY,
      marginTop: COLORS.SPACING.md,
      paddingTop: COLORS.SPACING.sm,
    },
    previewEventsBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.PRIMARY + "15",
      borderRadius: COLORS.RADIUS.button,
      paddingVertical: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.lg,
      borderWidth: 1,
      borderColor: COLORS.PRIMARY + "50",
    },
    previewEventsBtnText: {
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.sm,
    },
  });

export default AdminGeofenceScreen;
