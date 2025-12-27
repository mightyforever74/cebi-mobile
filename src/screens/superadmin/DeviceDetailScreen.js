// src/screens/superadmin/DeviceDetailScreen.js
// TulipFleet - Cihaz Detay ve Atama
// Created: 26 Aralık 2025 - Mevcut yapıyla senkronize

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
import { API_URL } from "../../constants/config";
import { useAuth } from "../../context/AuthContext";

const DeviceDetailScreen = ({ route, navigation }) => {
  const { device: initialDevice } = route.params;
  const { token } = useAuth();

  const [device, setDevice] = useState(initialDevice);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Atama modal
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

  // Şirkete ata
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
      console.error("Assign error:", error);
      Alert.alert("Hata", "Bağlantı hatası");
    } finally {
      setActionLoading(false);
    }
  };

  // Atamayı kaldır
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

  // Durum değiştir
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

  // Zaman farkı
  const getTimeDifference = (dateStr) => {
    if (!dateStr) return "Bilinmiyor";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  // Durum rengi
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "#2DCE89";
      case "pending":
        return "#FB6340";
      case "faulty":
        return "#F5365C";
      case "maintenance":
        return "#11CDEF";
      default:
        return "#8898AA";
    }
  };

  // Bilgi satırı
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
        <ActivityIndicator size="large" color="#5E72E4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
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
                <Text style={styles.statusText}>
                  {device.status?.toUpperCase()}
                </Text>
                {device.is_online && (
                  <View style={styles.onlineBadge}>
                    <Ionicons name="radio-button-on" size={10} color="#FFF" />
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
          <Text style={styles.sectionTitle}>📟 Cihaz Bilgileri</Text>
          <View style={styles.card}>
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
          </View>
        </View>

        {/* Atama Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Atama Durumu</Text>
          <View style={styles.card}>
            {device.company_name ? (
              <>
                <InfoRow
                  label="Şirket"
                  value={device.company_name}
                  valueColor="#5E72E4"
                />
                {device.vehicle_plate ? (
                  <InfoRow
                    label="Araç"
                    value={`${device.vehicle_plate} (${
                      device.vehicle_brand || ""
                    } ${device.vehicle_model || ""})`}
                    valueColor="#2DCE89"
                  />
                ) : (
                  <InfoRow
                    label="Araç"
                    value="Atanmamış"
                    valueColor="#FB6340"
                  />
                )}
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
                    color="#F5365C"
                  />
                  <Text style={styles.unassignText}>Atamayı Kaldır</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.unassignedContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={40}
                  color="#FB6340"
                />
                <Text style={styles.unassignedText}>
                  Bu cihaz henüz atanmamış
                </Text>
                <TouchableOpacity
                  style={styles.assignButton}
                  onPress={() => setAssignModalVisible(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.assignButtonText}>Şirkete Ata</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Son Konum */}
        {device.last_latitude && device.last_longitude && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Son Konum</Text>
            <View style={styles.card}>
              <InfoRow
                label="Koordinat"
                value={`${device.last_latitude}, ${device.last_longitude}`}
              />
            </View>
          </View>
        )}

        {/* İstatistikler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {device.total_uptime_minutes || 0}
              </Text>
              <Text style={styles.statLabel}>Çalışma (dk)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {device.total_alerts_sent || 0}
              </Text>
              <Text style={styles.statLabel}>Alert</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{device.error_count || 0}</Text>
              <Text style={styles.statLabel}>Hata</Text>
            </View>
          </View>
        </View>

        {/* Durum Değiştir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Durum Değiştir</Text>
          <View style={styles.statusButtons}>
            {[
              { key: "active", label: "Aktif", color: "#2DCE89" },
              { key: "faulty", label: "Arızalı", color: "#F5365C" },
              { key: "maintenance", label: "Bakımda", color: "#11CDEF" },
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
                      fontWeight: "bold",
                    },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Olay Geçmişi */}
        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Olay Geçmişi</Text>
            <View style={styles.card}>
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
            </View>
          </View>
        )}
      </ScrollView>

      {/* Atama Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cihazı Ata</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#8898AA" />
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
                      selectedCompany?.id === item.id && { color: "#FFF" },
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
                          selectedVehicle?.id === item.id && { color: "#FFF" },
                        ]}
                      >
                        {item.plate_no}
                      </Text>
                      <Text
                        style={[
                          styles.vehicleModel,
                          selectedVehicle?.id === item.id && { color: "#FFF" },
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
                <ActivityIndicator color="#FFF" />
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
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  headerCard: {
    backgroundColor: "#5E72E4",
    padding: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  deviceCode: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFF",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2DCE89",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  onlineText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  firmwareBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  firmwareText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Section
  section: {
    paddingHorizontal: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#32325D",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    fontSize: 13,
    color: "#8898AA",
  },
  infoValue: {
    fontSize: 13,
    color: "#32325D",
    fontWeight: "500",
    maxWidth: "55%",
    textAlign: "right",
  },

  // Unassigned
  unassignedContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  unassignedText: {
    fontSize: 14,
    color: "#8898AA",
    marginTop: 10,
    marginBottom: 15,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5E72E4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  assignButtonText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  unassignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    paddingVertical: 10,
  },
  unassignText: {
    color: "#F5365C",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#5E72E4",
  },
  statLabel: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 4,
  },

  // Status buttons
  statusButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  statusButtonText: {
    fontSize: 13,
    color: "#525F7F",
  },

  // Logs
  logItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5E72E4",
    marginTop: 5,
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    fontSize: 13,
    color: "#32325D",
  },
  logTime: {
    fontSize: 11,
    color: "#8898AA",
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#32325D",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#525F7F",
    marginBottom: 10,
    marginTop: 10,
  },
  companyList: {
    maxHeight: 150,
  },
  companyItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F6F9FC",
    borderRadius: 8,
    marginBottom: 8,
  },
  companyItemSelected: {
    backgroundColor: "#5E72E4",
  },
  companyName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#32325D",
  },
  vehicleList: {
    maxHeight: 120,
  },
  vehicleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F6F9FC",
    borderRadius: 8,
    marginBottom: 6,
  },
  vehicleItemSelected: {
    backgroundColor: "#2DCE89",
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#32325D",
  },
  vehicleModel: {
    fontSize: 12,
    color: "#8898AA",
  },
  assignModalButton: {
    backgroundColor: "#5E72E4",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  assignModalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DeviceDetailScreen;
