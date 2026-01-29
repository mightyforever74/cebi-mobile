import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { COLORS, SIZES } from "../../constants/config";
import { superAdminAPI } from "../../services/api";

const DeviceQRManagement = () => {
  const navigation = useNavigation();
  const [devices, setDevices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingActionDeviceId, setLoadingActionDeviceId] = useState(null);
  const [qrModal, setQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrCodes, setQrCodes] = useState([]); // ← YENİ SATIR EKLE

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoadingList(true);
      const data = await superAdminAPI.getDevices();
      const list = Array.isArray(data) ? data : data?.devices || [];
      setDevices(list);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch devices");
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleGenerateQR = async (deviceId) => {
    try {
      setLoadingActionDeviceId(deviceId);
      const data = await superAdminAPI.generateDeviceQR(deviceId);
      setQrData(data);
      setQrModal(true);
      Alert.alert("Success", "QR Code generated");
      fetchDevices();
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.error || "Failed to generate QR"
      );
    } finally {
      setLoadingActionDeviceId(null);
    }
  };

  const handleShowQRCodes = async (deviceId) => {
    try {
      setLoadingActionDeviceId(deviceId);
      const data = await superAdminAPI.getDeviceQRCodes(deviceId);

      if (data.qr_codes && data.qr_codes.length > 0) {
        setQrCodes(data.qr_codes);
        setQrData(data.qr_codes[0]);
        setQrModal(true);
      } else {
        Alert.alert("Info", "No QR codes found for this device");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to fetch QR codes");
    } finally {
      setLoadingActionDeviceId(null);
    }
  };

  const handleRefreshQR = async (deviceId) => {
    Alert.alert("Refresh QR", "Create new QR code for this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes",
        onPress: () => handleGenerateQR(deviceId),
      },
    ]);
  };

  const renderDeviceCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.serial}>{item.serial}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>
        <Text style={styles.online}>{item.is_online ? "🟢" : "🔴"}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.label}>Company:</Text>
        <Text style={styles.value}>{item.company_name || "Unassigned"}</Text>

        {item.vehicle_id && (
          <>
            <Text style={styles.label}>Vehicle:</Text>
            <Text style={styles.value}>{item.plate_no}</Text>
          </>
        )}

        <Text style={styles.label}>QR Status:</Text>
        <Text style={styles.qrStatus}>
          {item.qr?.has_active
            ? item.qr?.used
              ? "✅ Used"
              : "🔓 Active"
            : "⭕ None"}
        </Text>
      </View>

      <View style={styles.actions}>
        {!item.qr?.has_active ? (
          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnSuccess,
              loadingActionDeviceId === item.id && styles.btnDisabled,
            ]}
            onPress={() => handleGenerateQR(item.id)}
            disabled={loadingActionDeviceId === item.id}
          >
            {loadingActionDeviceId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <Text style={styles.btnText}>📱 Generate</Text>
            )}
          </TouchableOpacity>
        ) : !item.qr?.used ? (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleShowQRCodes(item.id)}
            >
              <Text style={styles.btnText}>👁 Show</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnWarning]}
              onPress={() => handleRefreshQR(item.id)}
            >
              <Text style={styles.btnText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.usedText}>✅ Used</Text>
        )}
      </View>
    </View>
  );

  if (loadingList && devices.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device QR Management</Text>
        <TouchableOpacity onPress={fetchDevices}>
          <Text style={styles.headerBtn}>🔄</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        renderItem={renderDeviceCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
      />

      {/* QR Modal */}
      <Modal visible={qrModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QR Code</Text>

            {/* ✅ HIBRIT: Image varsa image, yoksa QRCode component */}
            <QRCode
              size={250}
              value={qrData?.token || ""}
              color={COLORS.BLACK}
              backgroundColor={COLORS.WHITE}
            />

            <View style={styles.qrInfo}>
              <Text style={styles.infoLabel}>Device:</Text>
              <Text style={styles.infoValue}>{qrData?.device?.serial}</Text>

              <Text style={styles.infoLabel}>Token:</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {qrData?.token}
              </Text>

              <Text style={styles.infoLabel}>Expires In:</Text>
              <Text style={styles.infoValue}>
                {Math.max(
                  0,
                  Math.ceil((new Date(qrData?.expires_at) - new Date()) / 60000)
                )}{" "}
                minutes
              </Text>

              {qrData?.used_at && (
                <Text style={styles.usedLabel}>
                  ✅ Used at {new Date(qrData.used_at).toLocaleString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                setQrModal(false);
                setQrCodes([]);
              }}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GREY,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GREY,
  },
  title: {
    fontSize: SIZES.BASE + 4,
    fontWeight: "bold",
    color: COLORS.BLACK,
  },
  headerBtn: {
    fontSize: SIZES.BASE + 3,
  },
  list: {
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE / 2,
    padding: SIZES.BASE,
    marginBottom: SIZES.BASE / 2,
    borderWidth: 1,
    borderColor: COLORS.GREY,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SIZES.BASE / 2,
  },
  serial: {
    fontSize: SIZES.BASE,
    fontWeight: "bold",
    color: COLORS.BLACK,
  },
  status: {
    fontSize: SIZES.BASE - 3,
    backgroundColor: COLORS.GREY,
    paddingHorizontal: SIZES.BASE / 4,
    borderRadius: SIZES.BASE / 4,
    marginTop: SIZES.BASE / 4,
  },
  online: {
    fontSize: SIZES.BASE + 2,
  },
  cardBody: {
    marginVertical: SIZES.BASE / 2,
  },
  label: {
    fontSize: SIZES.BASE - 2,
    color: COLORS.MUTED,
    fontWeight: "bold",
    marginTop: SIZES.BASE / 4,
  },
  value: {
    fontSize: SIZES.BASE - 1,
    color: COLORS.BLACK,
  },
  qrStatus: {
    fontSize: SIZES.BASE - 2,
    color: COLORS.PRIMARY,
    fontWeight: "bold",
  },
  actions: {
    flexDirection: "row",
    gap: SIZES.BASE / 2,
    marginTop: SIZES.BASE / 2,
  },
  btn: {
    flex: 1,
    paddingVertical: SIZES.BASE / 2,
    borderRadius: SIZES.BASE / 2,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: COLORS.PRIMARY,
  },
  btnSuccess: {
    backgroundColor: COLORS.SUCCESS,
  },
  btnWarning: {
    backgroundColor: COLORS.WARNING,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: COLORS.WHITE,
    fontWeight: "bold",
    fontSize: SIZES.BASE - 2,
  },
  usedText: {
    color: COLORS.SUCCESS,
    fontWeight: "bold",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE,
    paddingHorizontal: SIZES.BASE * 1.5,
    paddingVertical: SIZES.BASE * 1.5,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: SIZES.BASE + 2,
    fontWeight: "bold",
    marginBottom: SIZES.BASE,
    color: COLORS.BLACK,
  },
  qrImage: {
    width: 250,
    height: 250,
    marginBottom: SIZES.BASE,
  },
  qrInfo: {
    width: "100%",
    marginVertical: SIZES.BASE,
  },
  infoLabel: {
    fontSize: SIZES.BASE - 2,
    color: COLORS.MUTED,
    fontWeight: "bold",
    marginTop: SIZES.BASE / 2,
  },
  infoValue: {
    fontSize: SIZES.BASE - 1,
    color: COLORS.BLACK,
    marginBottom: SIZES.BASE / 2,
  },
  usedLabel: {
    color: COLORS.SUCCESS,
    fontWeight: "bold",
    marginTop: SIZES.BASE / 2,
  },
});

export default DeviceQRManagement;
