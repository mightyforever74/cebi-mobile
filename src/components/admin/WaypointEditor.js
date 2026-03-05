/**
 * WaypointEditor.js - Simplified Waypoint List Editor v3
 * TulipFleet - Shared between CreateTaskScreen & EditTaskScreen
 *
 * v3 Changes:
 * - Lat/Lng collapsible (varsayılan kapalı — geocode otomatik yapılır)
 * - Planned arrival DateTimePicker ile (ISO elle yazma yok)
 * - Dashed empty state + inline "Durak Ekle" butonu
 * - Silme onayı Alert
 * - iOS: datetime spinner modal / Android: date→time iki aşamalı picker
 */

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- helper: #RRGGBB => #RRGGBBAA ---
const withAlpha = (hex, alpha01) => {
  if (
    !hex ||
    typeof hex !== "string" ||
    !hex.startsWith("#") ||
    hex.length !== 7
  )
    return hex;
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${hex}${alpha}`;
};

// Unique ID generator (timestamp + random, reorder-safe)
const generateWpId = () =>
  `wp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// Lat/Lng validation
const isValidLat = (v) => {
  const n = Number(v);
  return !isNaN(n) && n >= -90 && n <= 90;
};
const isValidLng = (v) => {
  const n = Number(v);
  return !isNaN(n) && n >= -180 && n <= 180;
};

/**
 * Props:
 * - waypoints: Array
 * - setWaypoints: function
 * - COLORS: theme colors object
 * - labels: { title, add, limitReached, name, address, lat, lng, planned,
 *             invalid, noStops, coordsToggle, clearConfirm, clearStop, cancel, done }
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
  // Collapsible coords state (per waypoint)
  const [expandedCoords, setExpandedCoords] = useState({});

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
    address: labels.address || "Stop Address",
    lat: labels.lat || "Lat",
    lng: labels.lng || "Lng",
    planned: labels.planned || "Planned Arrival",
    invalid: labels.invalid || "Invalid coordinates",
    noStops: labels.noStops || "No stops added yet",
    coordsToggle: labels.coordsToggle || "Coordinates",
    clearConfirm: labels.clearConfirm || "Remove this stop?",
    clearStop: labels.clearStop || "Remove",
  };

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

  const toggleCoords = (id) => {
    setExpandedCoords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isAtLimit = waypoints.length >= maxStops;

  // --- Coordinate validation ---
  const hasInvalidCoords = (wp) => {
    if (!wp.latitude && !wp.longitude) return false;
    return (
      (wp.latitude && !isValidLat(wp.latitude)) ||
      (wp.longitude && !isValidLng(wp.longitude))
    );
  };

  // --- Planned Arrival Picker ---
  const openPlannedPicker = (wpId, currentValue) => {
    const date = currentValue ? new Date(currentValue) : new Date();
    setPickerWpId(wpId);
    setPickerValue(date);

    if (Platform.OS === "ios") {
      setTempIOSValue(date);
      setShowIOSModal(true);
    } else {
      // Android: date picker ilk açılır
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
      // Date seçildi → time picker aç
      setPickerValue(selected);
      setPickerMode("time");
    } else {
      // Time seçildi → birleştir ve kaydet
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
      return d.toLocaleString(undefined, {
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

  // --- Base input style ---
  const baseInput = {
    backgroundColor: COLORS.SURFACE || COLORS.SECONDARY || "#FFF",
    borderWidth: 1,
    borderColor: COLORS.DIVIDER || COLORS.BORDER || "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.TEXT || "#000",
    ...inputStyle,
  };

  return (
    <View>
      {/* Header: Title + Add Button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: COLORS.TEXT,
          }}
        >
          {L.title}
        </Text>

        {!readOnly && (
          <TouchableOpacity
            onPress={addWaypoint}
            disabled={isAtLimit}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isAtLimit
                ? withAlpha(COLORS.MUTED || "#999", 0.15)
                : withAlpha(COLORS.PRIMARY, 0.1),
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              opacity: isAtLimit ? 0.5 : 1,
            }}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={isAtLimit ? COLORS.MUTED : COLORS.PRIMARY}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: isAtLimit ? COLORS.MUTED : COLORS.PRIMARY,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              {isAtLimit ? L.limitReached : L.add}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Empty state — dashed border + icon + inline add button */}
      {waypoints.length === 0 && (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 24,
            backgroundColor: withAlpha(COLORS.SECONDARY || "#F5F5F5", 0.3),
            borderRadius: 12,
            borderWidth: 1,
            borderColor: withAlpha(COLORS.DIVIDER || "#E0E0E0", 0.3),
            borderStyle: "dashed",
          }}
        >
          <Ionicons
            name="git-branch-outline"
            size={28}
            color={COLORS.MUTED || "#999"}
          />
          <View style={{ height: 8 }} />
          <Text
            style={{
              color: COLORS.MUTED,
              fontSize: 14,
            }}
          >
            {L.noStops}
          </Text>
          {!readOnly && (
            <TouchableOpacity
              onPress={addWaypoint}
              activeOpacity={0.7}
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: withAlpha(COLORS.PRIMARY, 0.1),
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Ionicons
                name="add"
                size={16}
                color={COLORS.PRIMARY}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  color: COLORS.PRIMARY,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                {L.add}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Waypoint cards */}
      {waypoints.map((wp, index) => {
        const invalidCoords = hasInvalidCoords(wp);
        const showCoords = expandedCoords[wp.id];
        const plannedDisplay = formatPlanned(wp.planned_arrival);

        return (
          <View
            key={wp.id}
            style={{
              backgroundColor: withAlpha(
                COLORS.SECONDARY || COLORS.SURFACE || "#F5F5F5",
                0.4
              ),
              borderRadius: 14,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: invalidCoords
                ? COLORS.ERROR || "#FF0000"
                : COLORS.DIVIDER || COLORS.BORDER || "#E0E0E0",
            }}
          >
            {/* Card header: index badge + controls */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              {/* Left: badge + name */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: COLORS.PRIMARY,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.WHITE || "#FFF",
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{
                    fontWeight: "600",
                    color: COLORS.TEXT,
                    fontSize: 15,
                  }}
                  numberOfLines={1}
                >
                  {wp.name || `${L.name} ${index + 1}`}
                </Text>
              </View>

              {/* Right: reorder + delete */}
              {!readOnly && (
                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    style={{
                      opacity: index === 0 ? 0.3 : 1,
                      padding: 4,
                      marginRight: 6,
                    }}
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
                    style={{
                      opacity: index === waypoints.length - 1 ? 0.3 : 1,
                      padding: 4,
                      marginRight: 6,
                    }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={COLORS.PRIMARY}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeWaypoint(wp.id)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={COLORS.ERROR || "#FF3B30"}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Stop Name input */}
            <TextInput
              style={baseInput}
              placeholder={L.name}
              placeholderTextColor={COLORS.PLACEHOLDER || COLORS.MUTED}
              value={wp.name}
              onChangeText={(val) => updateWaypoint(wp.id, "name", val)}
              editable={!readOnly}
            />

            {/* Address input */}
            <TextInput
              style={[baseInput, { marginTop: 8 }]}
              placeholder={L.address}
              placeholderTextColor={COLORS.PLACEHOLDER || COLORS.MUTED}
              value={wp.address || ""}
              onChangeText={(val) => updateWaypoint(wp.id, "address", val)}
              editable={!readOnly}
            />

            {/* Planned Arrival — tap to pick date/time */}
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  !readOnly && openPlannedPicker(wp.id, wp.planned_arrival)
                }
                activeOpacity={0.7}
                disabled={readOnly}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  backgroundColor: withAlpha(COLORS.PRIMARY, 0.06),
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: withAlpha(COLORS.PRIMARY, 0.15),
                }}
              >
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={COLORS.PRIMARY}
                />
                <View style={{ width: 8 }} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: plannedDisplay ? COLORS.TEXT : COLORS.MUTED,
                    fontWeight: plannedDisplay ? "600" : "400",
                  }}
                  numberOfLines={1}
                >
                  {plannedDisplay || L.planned}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={COLORS.MUTED}
                />
              </TouchableOpacity>

              {/* Remove planned */}
              {wp.planned_arrival && !readOnly && (
                <TouchableOpacity
                  onPress={() => updateWaypoint(wp.id, "planned_arrival", null)}
                  style={{ padding: 8, marginLeft: 4 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={COLORS.MUTED}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Collapsible Lat/Lng toggle */}
            <TouchableOpacity
              onPress={() => toggleCoords(wp.id)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
                paddingVertical: 4,
              }}
            >
              <Ionicons
                name={showCoords ? "chevron-up" : "chevron-down"}
                size={14}
                color={COLORS.MUTED}
              />
              <View style={{ width: 4 }} />
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.MUTED,
                  fontWeight: "500",
                }}
              >
                {L.coordsToggle}
                {wp.latitude && wp.longitude
                  ? ` (${Number(wp.latitude).toFixed(4)}, ${Number(wp.longitude).toFixed(4)})`
                  : ""}
              </Text>
            </TouchableOpacity>

            {/* Lat / Lng row — collapsible */}
            {showCoords && (
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <TextInput
                  style={[
                    baseInput,
                    { flex: 1, marginRight: 8 },
                    wp.latitude && !isValidLat(wp.latitude)
                      ? { borderColor: COLORS.ERROR || "#FF0000" }
                      : {},
                  ]}
                  placeholder={L.lat}
                  placeholderTextColor={COLORS.PLACEHOLDER || COLORS.MUTED}
                  value={wp.latitude != null ? String(wp.latitude) : ""}
                  onChangeText={(val) =>
                    updateWaypoint(wp.id, "latitude", val || null)
                  }
                  keyboardType="numeric"
                  editable={!readOnly}
                />
                <TextInput
                  style={[
                    baseInput,
                    { flex: 1 },
                    wp.longitude && !isValidLng(wp.longitude)
                      ? { borderColor: COLORS.ERROR || "#FF0000" }
                      : {},
                  ]}
                  placeholder={L.lng}
                  placeholderTextColor={COLORS.PLACEHOLDER || COLORS.MUTED}
                  value={wp.longitude != null ? String(wp.longitude) : ""}
                  onChangeText={(val) =>
                    updateWaypoint(wp.id, "longitude", val || null)
                  }
                  keyboardType="numeric"
                  editable={!readOnly}
                />
              </View>
            )}

            {/* Invalid coords warning */}
            {invalidCoords && (
              <Text
                style={{
                  color: COLORS.ERROR || "#FF0000",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {L.invalid}
              </Text>
            )}
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
            style={{
              flex: 1,
              backgroundColor: withAlpha(COLORS.BLACK || "#000", 0.5),
              justifyContent: "flex-end",
            }}
            onPress={() => {
              setShowIOSModal(false);
              setPickerWpId(null);
            }}
          >
            <Pressable
              style={{
                backgroundColor: COLORS.SURFACE || COLORS.WHITE || "#FFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 1,
                borderColor: COLORS.DIVIDER || "#E0E0E0",
              }}
              onPress={() => {}}
            >
              <SafeAreaView>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.DIVIDER || "#E0E0E0",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setShowIOSModal(false);
                      setPickerWpId(null);
                    }}
                  >
                    <Text style={{ fontSize: 16, color: COLORS.MUTED }}>
                      {labels.cancel || "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "600",
                      color: COLORS.TEXT,
                    }}
                  >
                    {L.planned}
                  </Text>
                  <TouchableOpacity onPress={handleIOSDone}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: COLORS.PRIMARY,
                      }}
                    >
                      {labels.done || "Done"}
                    </Text>
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
                  style={{ height: 216 }}
                />
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

export default WaypointEditor;
