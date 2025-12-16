import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../constants/config";

const VehicleInfoSheet = ({ vehicle, onClose, onViewDetails, isTablet }) => {
  const lastUpdate = vehicle.last_location_time
    ? new Date(vehicle.last_location_time).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Bilinmiyor";

  const getStatusBadge = (status) => {
    const statusConfig = {
      in_use: { label: "Kullanımda", color: "#10B981", bg: "#D1FAE5" },
      available: { label: "Müsait", color: "#3B82F6", bg: "#DBEAFE" },
      maintenance: { label: "Bakımda", color: "#F59E0B", bg: "#FEF3C7" },
      retired: { label: "Emekli", color: "#6B7280", bg: "#F3F4F6" },
    };
    return (
      statusConfig[status] || { label: status, color: "#6B7280", bg: "#F3F4F6" }
    );
  };

  const statusBadge = getStatusBadge(vehicle.status);

  return (
    <View style={[styles.container, isTablet && styles.tablet]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="car" size={24} color={COLORS.primary} />
          <Text style={styles.title}>{vehicle.plate_no}</Text>
          <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.badgeText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={[styles.content, isTablet && styles.contentTablet]}>
        {/* Sol Sütun */}
        <View style={styles.column}>
          <InfoRow
            icon="car-sport"
            label="Model"
            value={
              `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() ||
              "Belirtilmemiş"
            }
          />
          <InfoRow
            icon="person"
            label="Sürücü"
            value={vehicle.driver_email || "Atanmamış"}
          />
          {!isTablet && (
            <InfoRow icon="time" label="Son Güncelleme" value={lastUpdate} />
          )}
        </View>

        {/* Sağ Sütun (Tablet) */}
        {isTablet && (
          <View style={styles.column}>
            <InfoRow
              icon="speedometer"
              label="Hız"
              value={`${vehicle.speed || 0} km/s`}
            />
            <InfoRow icon="time" label="Son Güncelleme" value={lastUpdate} />
          </View>
        )}
      </View>

      {/* Hız bilgisi (Telefon) */}
      {!isTablet && vehicle.speed !== undefined && (
        <InfoRow
          icon="speedometer"
          label="Hız"
          value={`${vehicle.speed || 0} km/s`}
        />
      )}

      {/* Action Buttons */}
      {onViewDetails && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.detailBtn} onPress={onViewDetails}>
            <Ionicons name="information-circle" size={18} color="#fff" />
            <Text style={styles.detailBtnText}>Detaylar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={18} color={COLORS.gray} />
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 80,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  tablet: {
    bottom: 40,
    padding: 20,
    maxWidth: 500,
    alignSelf: "center",
    left: 0,
    right: 0,
    marginHorizontal: "auto",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || "#E5E5E5",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    marginTop: 4,
  },
  contentTablet: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  infoLabel: {
    color: COLORS.gray,
    fontWeight: "500",
    fontSize: 13,
    width: 100,
  },
  infoValue: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || "#E5E5E5",
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  detailBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default VehicleInfoSheet;
