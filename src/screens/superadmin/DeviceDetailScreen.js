// src/screens/superadmin/DeviceDetailScreen.js
// TulipFleet - Cihaz Detay ve Atama
// Updated: UI System Guide v3 uyumlu

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../../components/ui/Card";
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";

const DeviceDetailScreen = ({ route, navigation }) => {
  const { device: initialDevice } = route.params;
  const { token } = useAuth();
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [device, setDevice] = useState(initialDevice);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [commandLoading, setCommandLoading] = useState(null);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    fetchDeviceDetail();
    fetchCompanies();
  }, []);

  const fetchDeviceDetail = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/superadmin/devices/${device.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDevice(data.device || device);
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Fetch device detail error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/superadmin/companies`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Fetch companies error:", error);
    }
  };

  const fetchVehicles = async (companyId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/vehicles?company_id=${companyId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || data || []);
      }
    } catch (error) {
      console.error("Fetch vehicles error:", error);
      setVehicles([]);
    }
  };

  const handleAssign = async () => {
    if (!selectedCompany) {
      Alert.alert("Hata", "Lütfen bir şirket seçin");
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/superadmin/devices/${device.id}/assign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            vehicle_id: selectedVehicle?.id || null,
          }),
        }
      );
      if (response.ok) {
        Alert.alert("Başarılı", "Cihaz atandı");
        setAssignModalVisible(false);
        setSelectedCompany(null);
        setSelectedVehicle(null);
        fetchDeviceDetail();
      } else {
        Alert.alert("Hata", "Atama başarısız");
      }
    } catch (error) {
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassign = () => {
    Alert.alert(
      "Atamayı Kaldır",
      "Bu cihazın şirket atamasını kaldırmak istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Kaldır",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await fetch(
                `${API_URL}/api/superadmin/devices/${device.id}/unassign`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );
              if (response.ok) {
                Alert.alert("Başarılı", "Atama kaldırıldı");
                fetchDeviceDetail();
              } else {
                Alert.alert("Hata", "İşlem başarısız");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = (newStatus) => {
    const statusLabels = {
      active: "Aktif",
      faulty: "Arızalı",
      maintenance: "Bakımda",
    };
    Alert.alert(
      "Durum Değiştir",
      `Cihaz durumunu "${statusLabels[newStatus]}" olarak değiştirmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Değiştir",
          onPress: async () => {
            setActionLoading(true);
            try {
              const response = await fetch(
                `${API_URL}/api/superadmin/devices/${device.id}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: newStatus }),
                }
              );
              if (response.ok) {
                Alert.alert("Başarılı", "Durum güncellendi");
                fetchDeviceDetail();
              } else {
                Alert.alert("Hata", "Güncelleme başarısız");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSendCommand = (command, commandName, isDanger = false) => {
    Alert.alert(
      "Uzaktan Komut",
      isDanger
        ? `${commandName} komutu göndermek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        : `${commandName} komutu göndermek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Gönder",
          style: isDanger ? "destructive" : "default",
          onPress: async () => {
            setCommandLoading(command);
            try {
              const response = await fetch(
                `${API_URL}/api/devices/${device.id}/command`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ command }),
                }
              );
              const data = await response.json();
              if (response.ok) {
                Alert.alert("Başarılı", data.message || "Komut gönderildi");
              } else {
                Alert.alert("Hata", data.error || "Komut gönderilemedi");
              }
            } catch (error) {
              Alert.alert("Hata", "Bağlantı hatası");
            } finally {
              setCommandLoading(null);
            }
          },
        },
      ]
    );
  };

  const getTimeDifference = (dateStr) => {
    if (!dateStr) return "Bilinmiyor";
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return COLORS.SUCCESS;
      case "pending":
        return COLORS.WARNING;
      case "faulty":
        return COLORS.ERROR;
      case "maintenance":
        return COLORS.INFO;
      default:
        return COLORS.MUTED;
    }
  };

  const InfoRow = ({ label, value, valueColor }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value || "-"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.deviceCode}>{device.device_code}</Text>
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(device.status) },
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {device.status?.toUpperCase()}
                </Text>
                {device.is_online && (
                  <View style={styles.onlineBadge}>
                    <Ionicons
                      name="radio-button-on"
                      size={10}
                      color={COLORS.WHITE}
                    />
                    <Text style={styles.onlineText}>ONLINE</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.firmwareBadge}>
              <Text style={styles.firmwareText}>
                v{device.firmware_version || "?"}
              </Text>
            </View>
          </View>
        </View>

        {/* Cihaz Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cihaz Bilgileri</Text>
          <Card variant="flat">
            <InfoRow label="MAC Adresi" value={device.mac_address} />
            <InfoRow label="Chip Model" value={device.chip_model} />
            <InfoRow label="Seri No" value={device.serial_number} />
            <InfoRow
              label="WiFi Sinyal"
              value={device.wifi_rssi ? `${device.wifi_rssi} dBm` : null}
            />
            <InfoRow label="Son IP" value={device.last_ip_address} />
            <InfoRow
              label="Son Görülme"
              value={getTimeDifference(device.last_seen_at)}
            />
          </Card>
        </View>

        {/* Atama */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Atama Durumu</Text>
          <Card variant="flat">
            {device.company_name ? (
              <>
                <InfoRow
                  label="Şirket"
                  value={device.company_name}
                  valueColor={COLORS.PRIMARY}
                />
                <InfoRow
                  label="Araç"
                  value={
                    device.vehicle_plate
                      ? `${device.vehicle_plate} (${device.vehicle_brand || ""} ${device.vehicle_model || ""})`
                      : "Atanmamış"
                  }
                  valueColor={
                    device.vehicle_plate ? COLORS.SUCCESS : COLORS.WARNING
                  }
                />
                <InfoRow
                  label="Atanma Tarihi"
                  value={
                    device.assigned_at
                      ? new Date(device.assigned_at).toLocaleDateString("tr-TR")
                      : null
                  }
                />
                <TouchableOpacity
                  style={styles.unassignButton}
                  onPress={handleUnassign}
                  disabled={actionLoading}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={COLORS.ERROR}
                  />
                  <Text style={styles.unassignText}>Atamayı Kaldır</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.unassignedContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={40}
                  color={COLORS.WARNING}
                />
                <Text style={styles.unassignedText}>
                  Bu cihaz henüz atanmamış
                </Text>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => setAssignModalVisible(true)}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={COLORS.WHITE}
                  />
                  <Text style={styles.assignButtonText}>Şirkete Ata</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        </View>

        {/* Son Konum */}
        {device.last_latitude && device.last_longitude && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Konum</Text>
            <Card variant="flat">
              <InfoRow
                label="Koordinat"
                value={`${device.last_latitude}, ${device.last_longitude}`}
              />
            </Card>
          </View>
        )}

        {/* İstatistikler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          <View style={styles.statsRow}>
            {[
              {
                value: device.total_uptime_minutes || 0,
                label: "Çalışma (dk)",
              },
              { value: device.total_alerts_sent || 0, label: "Alert" },
              { value: device.error_count || 0, label: "Hata" },
            ].map((s, i) => (
              <Card key={i} variant="flat" style={styles.statBox}>
                <Text style={styles.statNumber}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Durum Değiştir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Durum Değiştir</Text>
          <View style={styles.statusButtons}>
            {[
              { key: "active", label: "Aktif", color: COLORS.SUCCESS },
              { key: "faulty", label: "Arızalı", color: COLORS.ERROR },
              { key: "maintenance", label: "Bakımda", color: COLORS.INFO },
            ].map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[
                  styles.statusButton,
                  device.status === s.key && {
                    backgroundColor: s.color + "20",
                    borderColor: s.color,
                  },
                ]}
                onPress={() => handleStatusChange(s.key)}
                disabled={device.status === s.key || actionLoading}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    device.status === s.key && {
                      color: s.color,
                      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Uzaktan Komutlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uzaktan Komutlar</Text>
          <Card variant="flat">
            <View style={styles.commandButtons}>
              {[
                {
                  cmd: "STATUS",
                  name: "Durum",
                  icon: "pulse-outline",
                  style: styles.commandButtonSafe,
                },
                {
                  cmd: "RECALIBRATE",
                  name: "Kalibre",
                  icon: "compass-outline",
                  style: styles.commandButtonSafe,
                },
                {
                  cmd: "RESET",
                  name: "Reset",
                  icon: "refresh-outline",
                  style: styles.commandButtonWarning,
                  danger: true,
                },
                {
                  cmd: "CLEAR_WIFI",
                  name: "WiFi Sil",
                  icon: "wifi-outline",
                  style: styles.commandButtonDanger,
                  danger: true,
                },
              ].map((c) => (
                <TouchableOpacity
                  key={c.cmd}
                  style={[styles.commandButton, c.style]}
                  onPress={() => handleSendCommand(c.cmd, c.name, c.danger)}
                  disabled={commandLoading !== null}
                >
                  {commandLoading === c.cmd ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <>
                      <Ionicons name={c.icon} size={18} color={COLORS.WHITE} />
                      <Text style={styles.commandButtonText}>{c.name}</Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>

        {/* Olay Geçmişi */}
        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Olay Geçmişi</Text>
            <Card variant="flat">
              {logs.slice(0, 10).map((log, index) => (
                <View key={log.id || index} style={styles.logItem}>
                  <View style={styles.logDot} />
                  <View style={styles.logContent}>
                    <Text style={styles.logMessage}>{log.message}</Text>
                    <Text style={styles.logTime}>
                      {new Date(log.created_at).toLocaleString("tr-TR")}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Atama Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cihazı Ata</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.MUTED} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Şirket Seç</Text>
            <FlatList
              data={companies}
              keyExtractor={(item) => item.id}
              style={styles.companyList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.companyItem,
                    selectedCompany?.id === item.id &&
                      styles.companyItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCompany(item);
                    setSelectedVehicle(null);
                    fetchVehicles(item.id);
                  }}
                >
                  <Text
                    style={[
                      styles.companyName,
                      selectedCompany?.id === item.id && {
                        color: COLORS.WHITE,
                      },
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            {selectedCompany && vehicles.length > 0 && (
              <>
                <Text style={styles.modalLabel}>Araç Seç (Opsiyonel)</Text>
                <FlatList
                  data={vehicles}
                  keyExtractor={(item) => item.id}
                  style={styles.vehicleList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.vehicleItem,
                        selectedVehicle?.id === item.id &&
                          styles.vehicleItemSelected,
                      ]}
                      onPress={() =>
                        setSelectedVehicle(
                          selectedVehicle?.id === item.id ? null : item
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.vehiclePlate,
                          selectedVehicle?.id === item.id && {
                            color: COLORS.WHITE,
                          },
                        ]}
                      >
                        {item.plate_no}
                      </Text>
                      <Text
                        style={[
                          styles.vehicleModel,
                          selectedVehicle?.id === item.id && {
                            color: COLORS.WHITE,
                          },
                        ]}
                      >
                        {item.brand} {item.model}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
            <TouchableOpacity
              style={[
                styles.assignModalButton,
                !selectedCompany && styles.buttonDisabled,
              ]}
              onPress={handleAssign}
              disabled={!selectedCompany || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={COLORS.WHITE} />
              ) : (
                <Text style={styles.assignModalButtonText}>
                  {selectedCompany
                    ? `${selectedCompany.name}'e Ata`
                    : "Şirket Seçin"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.WHITE} />
        </View>
      )}
    </View>
  );
};

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    scrollContent: { paddingBottom: COLORS.SPACING.xl },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BACKGROUND,
    },
    headerCard: { backgroundColor: COLORS.PRIMARY, padding: COLORS.SPACING.lg },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    deviceCode: { ...COLORS.TYPOGRAPHY.styles.h2, color: COLORS.WHITE },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: COLORS.SPACING.sm,
    },
    statusDot: {
      width: COLORS.SPACING.sm,
      height: COLORS.SPACING.sm,
      borderRadius: COLORS.SPACING.xs,
    },
    statusLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE_80,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.sm,
    },
    onlineBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.SUCCESS,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.full,
      marginLeft: COLORS.SPACING.sm,
    },
    onlineText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginLeft: COLORS.SPACING.xs,
    },
    firmwareBadge: {
      backgroundColor: COLORS.WHITE_20,
      paddingHorizontal: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
    },
    firmwareText: { ...COLORS.TYPOGRAPHY.styles.label, color: COLORS.WHITE },
    section: {
      paddingHorizontal: COLORS.SPACING.md,
      marginTop: COLORS.SPACING.md,
    },
    sectionTitle: {
      ...COLORS.TYPOGRAPHY.styles.label,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    infoLabel: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.MUTED },
    infoValue: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      maxWidth: "55%",
      textAlign: "right",
    },
    unassignedContainer: {
      alignItems: "center",
      paddingVertical: COLORS.SPACING.lg,
    },
    unassignedText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.md,
    },
    assignButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.PRIMARY,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.RADIUS.sm,
    },
    assignButtonText: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.WHITE,
      marginLeft: COLORS.SPACING.sm,
    },
    unassignButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
    },
    unassignText: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      color: COLORS.ERROR,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      marginLeft: COLORS.SPACING.xs,
    },
    statsRow: { flexDirection: "row", justifyContent: "space-between" },
    statBox: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: COLORS.SPACING.xs,
    },
    statNumber: { ...COLORS.TYPOGRAPHY.styles.h3, color: COLORS.PRIMARY },
    statLabel: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    statusButtons: { flexDirection: "row", justifyContent: "space-between" },
    statusButton: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      marginHorizontal: COLORS.SPACING.xs,
      borderRadius: COLORS.RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.INPUT_BORDER,
      alignItems: "center",
      backgroundColor: COLORS.CARD,
    },
    statusButtonText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_SECONDARY,
    },
    commandButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    commandButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      minWidth: "48%",
      marginBottom: COLORS.SPACING.sm,
    },
    commandButtonSafe: { backgroundColor: COLORS.PRIMARY },
    commandButtonWarning: { backgroundColor: COLORS.WARNING },
    commandButtonDanger: { backgroundColor: COLORS.ERROR },
    commandButtonText: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.semibold,
      marginLeft: COLORS.SPACING.xs,
    },
    logItem: {
      flexDirection: "row",
      paddingVertical: COLORS.SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    logDot: {
      width: COLORS.SPACING.sm,
      height: COLORS.SPACING.sm,
      borderRadius: COLORS.SPACING.xs,
      backgroundColor: COLORS.PRIMARY,
      marginTop: COLORS.SPACING.xs,
      marginRight: COLORS.SPACING.sm,
    },
    logContent: { flex: 1 },
    logMessage: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      color: COLORS.TEXT_PRIMARY,
    },
    logTime: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontSize: COLORS.TYPOGRAPHY.sizes.xs,
      color: COLORS.MUTED,
      marginTop: COLORS.SPACING.xs,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: COLORS.SURFACE,
      borderTopLeftRadius: COLORS.RADIUS.xl,
      borderTopRightRadius: COLORS.RADIUS.xl,
      padding: COLORS.SPACING.lg,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: COLORS.SPACING.lg,
    },
    modalTitle: { ...COLORS.TYPOGRAPHY.styles.h4, color: COLORS.TEXT_PRIMARY },
    modalLabel: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_SECONDARY,
      marginBottom: COLORS.SPACING.sm,
      marginTop: COLORS.SPACING.sm,
    },
    companyList: { maxHeight: 160 },
    companyItem: {
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.SECONDARY,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
    },
    companyItemSelected: { backgroundColor: COLORS.PRIMARY },
    companyName: {
      ...COLORS.TYPOGRAPHY.styles.bodySmall,
      fontWeight: COLORS.TYPOGRAPHY.weights.medium,
      color: COLORS.TEXT_PRIMARY,
    },
    vehicleList: { maxHeight: 120 },
    vehicleItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      backgroundColor: COLORS.SECONDARY,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.xs,
    },
    vehicleItemSelected: { backgroundColor: COLORS.SUCCESS },
    vehiclePlate: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
    },
    vehicleModel: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.MUTED },
    assignModalButton: {
      backgroundColor: COLORS.PRIMARY,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      alignItems: "center",
      marginTop: COLORS.SPACING.lg,
    },
    assignModalButtonText: {
      ...COLORS.TYPOGRAPHY.styles.button,
      color: COLORS.WHITE,
    },
    buttonDisabled: { opacity: 0.5 },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default DeviceDetailScreen;
