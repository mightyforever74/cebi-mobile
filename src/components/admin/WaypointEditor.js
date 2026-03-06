/**
 * WaypointEditor.js - Simplified Waypoint List Editor v4
 * TulipFleet - Shared between CreateTaskScreen & EditTaskScreen
 *
 * v4 Changes (v3 → v4):
 * - Lat/Lng manuel input KALDIRILDI
 * - Address input → Google Places Autocomplete (400ms debounce)
 * - Seçilen adres otomatik geocode → koordinatlar arka planda saklanır
 * - Adres yanında durum ikonu: ✅ koordinat var | ⚠️ koordinat yok | spinner
 *
 * v3 korunanlar:
 * - moveUp / moveDown sıralama
 * - DateTimePicker (iOS modal / Android iki aşamalı)
 * - Dashed empty state + inline "Durak Ekle" butonu
 * - Silme onayı Alert
 * - readOnly modu
 * - labels sistemi
 *
 * UI Guide v3 uyumu:
 * - Tüm inline style'lar StyleSheet.create + COLORS token'larına taşındı
 * - Hardcoded hex/rgba → COLORS token
 * - Hardcoded spacing/fontSize → COLORS.SPACING / COLORS.TYPOGRAPHY
 * - gap kullanımı → flexDirection + marginRight
 * - withAlpha → COLORS token'ları üzerinden runtime çözümü
 */

import { GOOGLE_MAPS_API_KEY } from "@env";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─────────────────────────────────────────────────────────
// PLACES AUTOCOMPLETE HELPERS
// ─────────────────────────────────────────────────────────
const geocodeCache = new Map();

async function geocodeAddress(address) {
  const cacheKey = address.trim().toLowerCase();
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?address=${encodeURIComponent(address)}` +
      `&key=${GOOGLE_MAPS_API_KEY}&language=tr`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === "OK" && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      const coords = { latitude: lat, longitude: lng };
      if (geocodeCache.size >= 200)
        geocodeCache.delete(geocodeCache.keys().next().value);
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
  } catch (e) {
    console.warn("[WaypointEditor] geocode error:", e.message);
  }
  return null;
}

async function fetchPlaceSuggestions(input, sessionToken) {
  if (!input || input.length < 3) return [];
  try {
    const url =
      `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
      `?input=${encodeURIComponent(input)}` +
      `&key=${GOOGLE_MAPS_API_KEY}&language=tr&sessiontoken=${sessionToken}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.predictions || [];
  } catch {
    return [];
  }
}

// Unique ID generator (timestamp + random, reorder-safe)
const generateWpId = () =>
  `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Props:
 * - waypoints: Array
 * - setWaypoints: function
 * - COLORS: theme colors object
 * - labels: { title, add, limitReached, name, address, planned,
 *             noStops, clearConfirm, clearStop, cancel, done }
 * - maxStops?: number (default 10)
 * - readOnly?: boolean (default false)
 * - inputStyle?: object (parent's TextInput style for consistency)
 */
const WaypointEditor = ({
  waypoints = [],
  setWaypoints,
  COLORS,
  labels = {},
  maxStops = 10,
  readOnly = false,
  inputStyle = {},
}) => {
  const { i18n } = useTranslation();

  // Places autocomplete state (per waypoint id)
  const [suggestions, setSuggestions] = useState({}); // { [wpId]: prediction[] }
  const [loadingSug, setLoadingSug] = useState({}); // { [wpId]: boolean }
  const sessionTokens = useRef({}); // { [wpId]: string }
  const debounceTimers = useRef({}); // { [wpId]: timeoutId }

  const getSessionToken = (wpId) => {
    if (!sessionTokens.current[wpId])
      sessionTokens.current[wpId] = Math.random().toString(36).substr(2, 9);
    return sessionTokens.current[wpId];
  };

  const renewSessionToken = (wpId) => {
    sessionTokens.current[wpId] = Math.random().toString(36).substr(2, 9);
  };

  // Planned arrival picker state
  const [pickerWpId, setPickerWpId] = useState(null);
  const [pickerMode, setPickerMode] = useState("date"); // 'date' | 'time'
  const [pickerValue, setPickerValue] = useState(new Date());

  // iOS modal state
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [tempIOSValue, setTempIOSValue] = useState(new Date());

  // --- Labels with defaults ---
  const L = {
    title: labels.title || "Stops",
    add: labels.add || "Add Stop",
    limitReached: labels.limitReached || "Stop limit reached",
    name: labels.name || "Stop Name",
    address: labels.address || "Enter address...",
    planned: labels.planned || "Planned Arrival",
    noStops: labels.noStops || "No stops added yet",
    clearConfirm: labels.clearConfirm || "Remove this stop?",
    clearStop: labels.clearStop || "Remove",
  };

  // --- StyleSheet — COLORS token'larına bağımlı, useMemo ile oluşturulur ---
  const S = useMemo(() => makeStyles(COLORS), [COLORS]);

  // --- Base input style (parent'tan override alabilir) ---
  const baseInput = useMemo(
    () => [S.baseInput, inputStyle],
    [S.baseInput, inputStyle]
  );

  // --- CRUD Helpers ---
  const addWaypoint = () => {
    if (readOnly) return;
    if (waypoints.length >= maxStops) return;
    setWaypoints((prev) => [
      ...prev,
      {
        id: generateWpId(),
        name: "",
        address: "",
        latitude: null,
        longitude: null,
        planned_arrival: null,
        status: "pending",
      },
    ]);
  };

  const removeWaypoint = (id) => {
    if (readOnly) return;
    Alert.alert(L.clearStop, L.clearConfirm, [
      { text: labels.cancel || "Cancel", style: "cancel" },
      {
        text: L.clearStop,
        style: "destructive",
        onPress: () =>
          setWaypoints((prev) => prev.filter((wp) => wp.id !== id)),
      },
    ]);
  };

  const moveUp = (index) => {
    if (readOnly) return;
    if (index === 0) return;
    setWaypoints((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index) => {
    if (readOnly) return;
    if (index === waypoints.length - 1) return;
    setWaypoints((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const updateWaypoint = (id, field, value) => {
    if (readOnly) return;
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  // ── Places Autocomplete Handlers ──
  const handleAddressChange = useCallback(
    (wpId, text) => {
      if (readOnly) return;
      setWaypoints((prev) =>
        prev.map((w) =>
          w.id === wpId
            ? { ...w, address: text, latitude: null, longitude: null }
            : w
        )
      );

      clearTimeout(debounceTimers.current[wpId]);
      if (text.length < 3) {
        setSuggestions((prev) => ({ ...prev, [wpId]: [] }));
        return;
      }
      debounceTimers.current[wpId] = setTimeout(async () => {
        setLoadingSug((prev) => ({ ...prev, [wpId]: true }));
        const preds = await fetchPlaceSuggestions(text, getSessionToken(wpId));
        setSuggestions((prev) => ({ ...prev, [wpId]: preds }));
        setLoadingSug((prev) => ({ ...prev, [wpId]: false }));
      }, 400);
    },
    [readOnly]
  );

  const handleSelectSuggestion = useCallback(async (wpId, pred) => {
    const address = pred.description;
    setSuggestions((prev) => ({ ...prev, [wpId]: [] }));
    setWaypoints((prev) =>
      prev.map((w) =>
        w.id === wpId ? { ...w, address, latitude: null, longitude: null } : w
      )
    );
    const coords = await geocodeAddress(address);
    if (coords) {
      setWaypoints((prev) =>
        prev.map((w) =>
          w.id === wpId
            ? {
                ...w,
                address,
                latitude: coords.latitude,
                longitude: coords.longitude,
              }
            : w
        )
      );
    }
    renewSessionToken(wpId);
  }, []);

  const isAtLimit = waypoints.length >= maxStops;

  // --- Planned Arrival Picker ---
  const openPlannedPicker = (wpId, currentValue) => {
    const date = currentValue ? new Date(currentValue) : new Date();
    setPickerWpId(wpId);
    setPickerValue(date);

    if (Platform.OS === "ios") {
      setTempIOSValue(date);
      setShowIOSModal(true);
    } else {
      setPickerMode("date");
    }
  };

  const onAndroidPickerChange = (event, selected) => {
    if (event.type === "dismissed") {
      setPickerWpId(null);
      return;
    }
    if (!selected) return;

    if (pickerMode === "date") {
      setPickerValue(selected);
      setPickerMode("time");
    } else {
      const combined = new Date(pickerValue);
      combined.setHours(selected.getHours());
      combined.setMinutes(selected.getMinutes());
      combined.setSeconds(0);
      updateWaypoint(pickerWpId, "planned_arrival", combined.toISOString());
      setPickerWpId(null);
      setPickerMode("date");
    }
  };

  const handleIOSDone = () => {
    updateWaypoint(pickerWpId, "planned_arrival", tempIOSValue.toISOString());
    setShowIOSModal(false);
    setPickerWpId(null);
  };

  // Format planned arrival for display
  const formatPlanned = (isoStr) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString(i18n.language || "tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <View>
      {/* Header: Title + Add Button */}
      <View style={S.header}>
        <Text style={S.headerTitle}>{L.title}</Text>

        {!readOnly && (
          <TouchableOpacity
            onPress={addWaypoint}
            disabled={isAtLimit}
            activeOpacity={0.7}
            style={[S.addBtn, isAtLimit && S.addBtnDisabled]}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={isAtLimit ? COLORS.TEXT_MUTED : COLORS.PRIMARY}
            />
            <Text style={[S.addBtnText, isAtLimit && S.addBtnTextDisabled]}>
              {isAtLimit ? L.limitReached : L.add}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state — dashed border + icon + inline add button */}
      {waypoints.length === 0 && (
        <View style={S.emptyState}>
          <Ionicons
            name="git-branch-outline"
            size={28}
            color={COLORS.TEXT_MUTED}
          />
          <View style={S.emptyStateGap} />
          <Text style={S.emptyStateText}>{L.noStops}</Text>
          {!readOnly && (
            <TouchableOpacity
              onPress={addWaypoint}
              activeOpacity={0.7}
              style={S.emptyStateAddBtn}
            >
              <Ionicons name="add" size={16} color={COLORS.PRIMARY} />
              <Text style={S.emptyStateAddText}>{L.add}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Waypoint cards */}
      {waypoints.map((wp, index) => {
        const plannedDisplay = formatPlanned(wp.planned_arrival);
        const wpSuggestions = suggestions[wp.id] || [];
        const wpLoading = loadingSug[wp.id] || false;
        const hasCoords = !!(wp.latitude && wp.longitude);

        return (
          <View key={wp.id} style={S.card}>
            {/* Card header: index badge + controls */}
            <View style={S.cardHeader}>
              {/* Left: badge + name */}
              <View style={S.cardHeaderLeft}>
                <View style={S.indexBadge}>
                  <Text style={S.indexBadgeText}>{index + 1}</Text>
                </View>
                <Text style={S.wpNameText} numberOfLines={1}>
                  {wp.name || `${L.name.split(" ")[0]} ${index + 1}`}
                </Text>
              </View>

              {/* Right: reorder + delete */}
              {!readOnly && (
                <View style={S.cardControls}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    style={[S.controlBtn, index === 0 && S.controlBtnDisabled]}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === waypoints.length - 1}
                    style={[
                      S.controlBtn,
                      index === waypoints.length - 1 && S.controlBtnDisabled,
                    ]}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeWaypoint(wp.id)}
                    style={S.controlBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={COLORS.ERROR}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Stop Name input */}
            <TextInput
              style={baseInput}
              placeholder={L.name}
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={wp.name}
              onChangeText={(val) => updateWaypoint(wp.id, "name", val)}
              editable={!readOnly}
            />

            {/* Address — Google Places Autocomplete */}
            <View style={S.addressWrapper}>
              <View style={S.addressInputRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={COLORS.TEXT_MUTED}
                  style={S.addressIcon}
                />
                <TextInput
                  style={S.addressInput}
                  placeholder={L.address}
                  placeholderTextColor={COLORS.TEXT_MUTED}
                  value={wp.address || ""}
                  onChangeText={(val) => handleAddressChange(wp.id, val)}
                  onBlur={() =>
                    setTimeout(
                      () => setSuggestions((p) => ({ ...p, [wp.id]: [] })),
                      200
                    )
                  }
                  editable={!readOnly}
                  returnKeyType="search"
                />
                {/* Durum ikonu */}
                {wpLoading && (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.PRIMARY}
                    style={S.statusIcon}
                  />
                )}
                {!wpLoading && hasCoords && (
                  <Ionicons
                    name="checkmark-circle"
                    size={17}
                    color={COLORS.SUCCESS}
                    style={S.statusIcon}
                  />
                )}
                {!wpLoading && !!wp.address && !hasCoords && (
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color={COLORS.WARNING}
                    style={S.statusIcon}
                  />
                )}
              </View>

              {/* Suggestions dropdown */}
              {wpSuggestions.length > 0 && (
                <View style={S.suggestionsDropdown}>
                  {wpSuggestions.slice(0, 5).map((pred) => (
                    <TouchableOpacity
                      key={pred.place_id}
                      onPress={() => handleSelectSuggestion(wp.id, pred)}
                      style={S.suggestionItem}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={COLORS.TEXT_MUTED}
                        style={S.suggestionIcon}
                      />
                      <View style={S.suggestionText}>
                        <Text style={S.suggestionMainText} numberOfLines={1}>
                          {pred.structured_formatting?.main_text ||
                            pred.description}
                        </Text>
                        {!!pred.structured_formatting?.secondary_text && (
                          <Text style={S.suggestionSubText} numberOfLines={1}>
                            {pred.structured_formatting.secondary_text}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Planned Arrival — tap to pick date/time */}
            <View style={S.plannedRow}>
              <TouchableOpacity
                onPress={() =>
                  !readOnly && openPlannedPicker(wp.id, wp.planned_arrival)
                }
                activeOpacity={0.7}
                disabled={readOnly}
                style={S.plannedBtn}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.PRIMARY}
                />
                <View style={S.plannedGap} />
                <Text
                  style={[
                    S.plannedText,
                    plannedDisplay ? S.plannedTextFilled : S.plannedTextEmpty,
                  ]}
                  numberOfLines={1}
                >
                  {plannedDisplay || L.planned}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.TEXT_MUTED}
                />
              </TouchableOpacity>

              {/* Remove planned */}
              {wp.planned_arrival && !readOnly && (
                <TouchableOpacity
                  onPress={() => updateWaypoint(wp.id, "planned_arrival", null)}
                  style={S.plannedClearBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.TEXT_MUTED}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Android DateTimePicker — date then time (iki aşamalı) */}
      {Platform.OS === "android" && pickerWpId && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display={pickerMode === "date" ? "calendar" : "clock"}
          onChange={onAndroidPickerChange}
          is24Hour
        />
      )}

      {/* iOS DateTimePicker Modal */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showIOSModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowIOSModal(false);
            setPickerWpId(null);
          }}
        >
          <Pressable
            style={S.modalOverlay}
            onPress={() => {
              setShowIOSModal(false);
              setPickerWpId(null);
            }}
          >
            <Pressable style={S.modalSheet} onPress={() => {}}>
              <SafeAreaView>
                <View style={S.modalHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowIOSModal(false);
                      setPickerWpId(null);
                    }}
                  >
                    <Text style={S.modalCancelText}>
                      {labels.cancel || "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={S.modalTitleText}>{L.planned}</Text>
                  <TouchableOpacity onPress={handleIOSDone}>
                    <Text style={S.modalDoneText}>{labels.done || "Done"}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempIOSValue}
                  mode="datetime"
                  display="spinner"
                  onChange={(_, selected) => {
                    if (selected) setTempIOSValue(selected);
                  }}
                  is24Hour
                  style={S.datePicker}
                />
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────
// STYLES — COLORS token tabanlı, UI Guide v3 uyumlu
// ─────────────────────────────────────────────────────────
const makeStyles = (COLORS) =>
  StyleSheet.create({
    // ── Header ───────────────────────────────────────────
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.md,
    },
    headerTitle: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY_LIGHT || COLORS.PRIMARY + "1A",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.xxl,
    },
    addBtnDisabled: {
      backgroundColor: COLORS.DIVIDER,
      opacity: 0.5,
    },
    addBtnText: {
      color: COLORS.PRIMARY,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
      marginLeft: COLORS.SPACING.xs,
    },
    addBtnTextDisabled: {
      color: COLORS.TEXT_MUTED,
    },

    // ── Empty State ───────────────────────────────────────
    emptyState: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
      backgroundColor: COLORS.SURFACE_ALT || COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      borderStyle: "dashed",
    },
    emptyStateGap: {
      height: COLORS.SPACING.sm,
    },
    emptyStateText: {
      color: COLORS.TEXT_MUTED,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    emptyStateAddBtn: {
      marginTop: COLORS.SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY_LIGHT || COLORS.PRIMARY + "1A",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.xxl,
    },
    emptyStateAddText: {
      color: COLORS.PRIMARY,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
      marginLeft: COLORS.SPACING.xs,
    },

    // ── Waypoint Card ─────────────────────────────────────
    card: {
      backgroundColor: COLORS.SURFACE,
      borderRadius: COLORS.RADIUS.card,
      padding: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: COLORS.SPACING.sm,
    },
    cardHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
    },
    indexBadge: {
      width: COLORS.SPACING.lg + COLORS.SPACING.xs,
      height: COLORS.SPACING.lg + COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      backgroundColor: COLORS.PRIMARY,
      justifyContent: "center",
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    indexBadgeText: {
      color: COLORS.WHITE,
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    wpNameText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
      color: COLORS.TEXT_PRIMARY,
    },
    cardControls: {
      flexDirection: "row",
      alignItems: "center",
    },
    controlBtn: {
      padding: COLORS.SPACING.xs,
      marginLeft: COLORS.SPACING.xs,
    },
    controlBtnDisabled: {
      opacity: 0.3,
    },

    // ── Base Input ────────────────────────────────────────
    baseInput: {
      backgroundColor: COLORS.INPUT_BG || COLORS.SURFACE,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER || COLORS.DIVIDER,
      borderRadius: COLORS.RADIUS.md,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
    },

    // ── Address Input ─────────────────────────────────────
    addressWrapper: {
      marginTop: COLORS.SPACING.sm,
    },
    addressInputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER || COLORS.DIVIDER,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: COLORS.INPUT_BG || COLORS.SURFACE,
      paddingHorizontal: COLORS.SPACING.sm,
      minHeight: COLORS.SPACING.xxl + COLORS.SPACING.xs,
    },
    addressIcon: {
      marginRight: COLORS.SPACING.sm,
    },
    addressInput: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      paddingVertical: COLORS.SPACING.sm,
    },
    statusIcon: {
      marginLeft: COLORS.SPACING.sm,
    },

    // ── Suggestions Dropdown ──────────────────────────────
    suggestionsDropdown: {
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
      borderRadius: COLORS.RADIUS.md,
      backgroundColor: COLORS.SURFACE,
      marginTop: COLORS.SPACING.xs,
      zIndex: 999,
      ...COLORS.SHADOWS.card,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    suggestionIcon: {
      marginRight: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.xs,
    },
    suggestionText: {
      flex: 1,
    },
    suggestionMainText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
      color: COLORS.TEXT_PRIMARY,
    },
    suggestionSubText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_MUTED,
      marginTop: COLORS.SPACING.xs,
    },

    // ── Planned Arrival ───────────────────────────────────
    plannedRow: {
      marginTop: COLORS.SPACING.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    plannedBtn: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      backgroundColor: COLORS.PRIMARY_LIGHT || COLORS.PRIMARY + "0F",
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.PRIMARY_BORDER || COLORS.PRIMARY + "26",
    },
    plannedGap: {
      width: COLORS.SPACING.sm,
    },
    plannedText: {
      flex: 1,
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
    },
    plannedTextFilled: {
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
    },
    plannedTextEmpty: {
      color: COLORS.TEXT_MUTED,
    },
    plannedClearBtn: {
      padding: COLORS.SPACING.sm,
      marginLeft: COLORS.SPACING.xs,
    },

    // ── iOS Modal ─────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY || COLORS.BLACK + "80",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xxl,
      borderTopRightRadius: COLORS.RADIUS.xxl,
      borderWidth: 1,
      borderColor: COLORS.DIVIDER,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    modalCancelText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_MUTED,
    },
    modalTitleText: {
      ...COLORS.TYPOGRAPHY.styles.h4,
      color: COLORS.TEXT_PRIMARY,
    },
    modalDoneText: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.semiBold,
      color: COLORS.PRIMARY,
    },
    datePicker: {
      height: COLORS.SPACING.xxxl + COLORS.SPACING.xxxl + COLORS.SPACING.xxl,
    },
  });

export default WaypointEditor;
