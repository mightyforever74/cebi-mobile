/**
 * WaypointEditor.js - Reusable Waypoint List Editor
 * TulipFleet - Shared between CreateTaskScreen & EditTaskScreen
 *
 * Controlled component: parent owns waypoints state.
 * Supports: add, remove, reorder (up/down), edit fields, readOnly mode.
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

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
 * - labels: { title, add, limitReached, name, address, lat, lng, planned, invalid, noStops }
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
  };

  // --- Helpers ---
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
    setWaypoints((prev) => prev.filter((wp) => wp.id !== id));
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

  const isAtLimit = waypoints.length >= maxStops;

  // --- Coordinate validation for a single waypoint ---
  const hasInvalidCoords = (wp) => {
    if (!wp.latitude && !wp.longitude) return false; // empty is OK (geocode later)
    return (
      (wp.latitude && !isValidLat(wp.latitude)) ||
      (wp.longitude && !isValidLng(wp.longitude))
    );
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
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isAtLimit
                ? withAlpha(COLORS.MUTED || "#999", 0.15)
                : withAlpha(COLORS.PRIMARY, 0.1),
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              gap: 6,
              opacity: isAtLimit ? 0.5 : 1,
            }}
          >
            <Ionicons
              name="add-circle"
              size={18}
              color={isAtLimit ? COLORS.MUTED : COLORS.PRIMARY}
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

      {/* Empty state */}
      {waypoints.length === 0 && (
        <Text
          style={{
            textAlign: "center",
            color: COLORS.MUTED,
            paddingVertical: 20,
            fontSize: 14,
          }}
        >
          {L.noStops}
        </Text>
      )}

      {/* Waypoint cards */}
      {waypoints.map((wp, index) => {
        const invalidCoords = hasInvalidCoords(wp);

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
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: COLORS.PRIMARY,
                    justifyContent: "center",
                    alignItems: "center",
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
                >
                  {wp.name || `${L.name.split(" ")[0]} ${index + 1}`}
                </Text>
              </View>

              {/* Right: reorder + delete */}
              {!readOnly && (
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    style={{ opacity: index === 0 ? 0.3 : 1, padding: 4 }}
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

            {/* Lat / Lng row */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                style={[
                  baseInput,
                  { flex: 1 },
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

            {/* Planned Arrival */}
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: COLORS.MUTED,
                  marginBottom: 4,
                }}
              >
                {L.planned}
              </Text>
              <TextInput
                style={baseInput}
                placeholder="2026-02-20T14:30"
                placeholderTextColor={COLORS.PLACEHOLDER || COLORS.MUTED}
                value={
                  wp.planned_arrival ? wp.planned_arrival.slice(0, 16) : ""
                }
                onChangeText={(val) => {
                  if (!val) {
                    updateWaypoint(wp.id, "planned_arrival", null);
                    return;
                  }
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime()))
                      updateWaypoint(wp.id, "planned_arrival", d.toISOString());
                  } catch {
                    // invalid date string, ignore
                  }
                }}
                autoCapitalize="none"
                editable={!readOnly}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default WaypointEditor;
