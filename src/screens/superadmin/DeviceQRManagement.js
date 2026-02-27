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
import Card from "../../components/ui/Card";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { superAdminAPI } from "../../services/api";

const DeviceQRManagement = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
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
    <Card variant="flat">
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
    </Card>
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.GREY,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.GREY,
    },
    title: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.BLACK,
    },
    headerBtn: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
    },
    list: {
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
    },
    // card removed, Card component used
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.sm,
    },
    serial: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.BLACK,
    },
    status: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      backgroundColor: COLORS.GREY,
      paddingHorizontal: COLORS.SPACING.xs,
      borderRadius: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.xs,
    },
    online: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
    },
    cardBody: {
      marginVertical: COLORS.SPACING.sm,
    },
    label: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginTop: COLORS.SPACING.xs,
    },
    value: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.BLACK,
    },
    qrStatus: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.PRIMARY,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    actions: {
      flexDirection: "row",
      marginTop: COLORS.SPACING.sm,
    },
    btn: {
      flex: 1,
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.SPACING.sm,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
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
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    usedText: {
      color: COLORS.SUCCESS,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.WHITE,
      borderRadius: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.lg,
      width: "90%",
      alignItems: "center",
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginBottom: COLORS.SPACING.md,
      color: COLORS.BLACK,
    },
    qrImage: {
      width: 250,
      height: 250,
      marginBottom: COLORS.SPACING.md,
    },
    qrInfo: {
      width: "100%",
      marginVertical: COLORS.SPACING.md,
    },
    infoLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginTop: COLORS.SPACING.sm,
    },
    infoValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.BLACK,
      marginBottom: COLORS.SPACING.sm,
    },
    usedLabel: {
      color: COLORS.SUCCESS,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginTop: COLORS.SPACING.sm,
    },
  });

export default DeviceQRManagement;
