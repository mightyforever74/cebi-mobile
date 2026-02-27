// src/screens/driver/DriverDeviceAssignment.js
// TulipFleet - Device Assignment Screen
// Version: 2.0 - Full i18n Support

import { useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { deviceAPI, driverAPI } from "../../services/api";

const DriverDeviceAssignment = () => {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const route = useRoute();
  const { vehicleId } = route.params || {};

  const scanLock = useRef(false);

  // State
  const [assignableDevices, setAssignableDevices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingActionDeviceId, setLoadingActionDeviceId] = useState(null);

  // Modal states
  const [scannerModal, setScannerModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [deviceListModal, setDeviceListModal] = useState(false);

  // Form states
  const [searchSerial, setSearchSerial] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [permission, requestPermission] = useCameraPermissions();

  const hasVehicle = Boolean(vehicleId);

  // Response normalization
  const normalize = (res) => {
    const data = res?.data ?? res; // axios || plain
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.devices)) return data.devices;
    return [];
  };

  // Token extract (URL || raw)
  const extractToken = (raw) => {
    if (!raw) return raw;
    if (!raw.includes("://") && !raw.includes("?")) return raw;

    const match = raw.match(/[?&]t=([^&#]+)/);
    if (!match) return raw;

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  };

  useEffect(() => {
    if (vehicleId) {
      handleFetchAssignableDevices();
    } else {
      setLoadingList(false);
      setAssignableDevices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  const handleFetchAssignableDevices = async () => {
    try {
      setLoadingList(true);
      const res = await driverAPI.getAssignableDevices();
      setAssignableDevices(normalize(res));
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.error"),
        err?.response?.data?.error || t("deviceAssignment.loadFailed")
      );
      setAssignableDevices([]);
    } finally {
      setLoadingList(false);
    }
  };

  const handleValidateQR = async (token) => {
    // Validation artık backend'de scanQR sırasında yapılıyor
    // Token formatını kontrol et (64 char)
    const tokenRegex = /^[A-Za-z0-9]{64}$/;
    if (!tokenRegex.test(token)) {
      throw new Error("Invalid token format");
    }
    return { valid: true, token };
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (!hasVehicle) {
      Alert.alert(t("deviceAssignment.error"), t("deviceAssignment.noVehicle"));
      return;
    }
    if (scanLock.current) return;
    scanLock.current = true;

    try {
      setScannerModal(false);

      const token = extractToken(data);

      // Token format validation
      await handleValidateQR(token);

      // Direkt atama onayı iste
      Alert.alert(
        t("deviceAssignment.qrValid"),
        t("deviceAssignment.confirmAssignment"),
        [
          {
            text: t("deviceAssignment.cancel"),
            style: "cancel",
            onPress: () => {
              scanLock.current = false;
            },
          },
          {
            text: t("deviceAssignment.assignToVehicle"),
            onPress: () => handleClaimByToken(token),
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.invalidQR"),
        err?.message || t("deviceAssignment.qrExpired")
      );
      setTimeout(() => {
        scanLock.current = false;
      }, 1000);
    }
  };

  const handleClaimByToken = async (token) => {
    if (!hasVehicle) {
      Alert.alert(t("deviceAssignment.error"), t("deviceAssignment.noVehicle"));
      return;
    }

    try {
      setLoadingActionDeviceId("qr");

      // YENİ API: scanQR
      const result = await deviceAPI.scanQR(
        token,
        "assign_to_vehicle",
        vehicleId
      );

      if (result.success) {
        Alert.alert(
          t("deviceAssignment.success"),
          t("deviceAssignment.deviceAssigned")
        );
        await handleFetchAssignableDevices();
        setScannerModal(false);
      } else {
        Alert.alert(
          t("deviceAssignment.error"),
          result.message || t("deviceAssignment.assignFailed")
        );
      }
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.error"),
        err?.response?.data?.error || t("deviceAssignment.assignFailed")
      );
      throw err;
    } finally {
      setLoadingActionDeviceId(null);
      scanLock.current = false;
    }
  };

  const handleSearchSerial = async () => {
    if (!searchSerial.trim()) {
      Alert.alert(
        t("deviceAssignment.error"),
        t("deviceAssignment.enterSerial")
      );
      return;
    }

    try {
      setLoadingAction(true);
      const res = await driverAPI.searchDevices(searchSerial);
      setSearchResults(normalize(res));
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.notFound"),
        err?.response?.data?.error || t("deviceAssignment.deviceNotFound")
      );
      setSearchResults([]);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAssignByDeviceId = async (deviceId) => {
    if (!hasVehicle) {
      Alert.alert(t("deviceAssignment.error"), t("deviceAssignment.noVehicle"));
      return;
    }

    try {
      setLoadingActionDeviceId(deviceId);
      await driverAPI.assignDevice(deviceId, vehicleId);

      Alert.alert(
        t("deviceAssignment.success"),
        t("deviceAssignment.deviceAssigned")
      );
      await handleFetchAssignableDevices();

      setSearchModal(false);
      setDeviceListModal(false);
      setSearchSerial("");
      setSearchResults([]);
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.error"),
        err?.response?.data?.error || t("deviceAssignment.assignFailed")
      );
      throw err;
    } finally {
      setLoadingActionDeviceId(null);
    }
  };

  // Scanner modal açma - permission ile
  const openScanner = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
    setScannerModal(true);
  };

  const renderAssignableDeviceItem = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: COLORS.SPACING.md }}>
          <Text style={styles.serial}>{item.serial}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>
        <Text style={styles.online}>{item.is_online ? "🟢" : "🔴"}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          styles.btnAssign,
          (!hasVehicle || loadingActionDeviceId === item.id) &&
            styles.btnDisabled,
        ]}
        onPress={() => handleAssignByDeviceId(item.id)}
        disabled={!hasVehicle || loadingActionDeviceId === item.id}
      >
        {loadingActionDeviceId === item.id ? (
          <ActivityIndicator size="small" color={COLORS.WHITE} />
        ) : (
          <Text style={styles.btnText}>📱 {t("deviceAssignment.assign")}</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSearchResultItem = ({ item }) => (
    <View style={styles.searchItem}>
      <Text style={styles.serial}>{item.serial}</Text>
      <Text style={styles.value}>
        {t("deviceAssignment.status")}: {item.status}
      </Text>

      {item.can_assign ? (
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnAssign,
            (!hasVehicle || loadingActionDeviceId === item.id) &&
              styles.btnDisabled,
          ]}
          onPress={() => handleAssignByDeviceId(item.id)}
          disabled={!hasVehicle || loadingActionDeviceId === item.id}
        >
          {loadingActionDeviceId === item.id ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Text style={styles.btnText}>
              📱 {t("deviceAssignment.assign")}
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <Text style={styles.disabledText}>
          {t("deviceAssignment.cannotAssign")}
        </Text>
      )}
    </View>
  );

  if (loadingList && assignableDevices.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("deviceAssignment.title")}</Text>
        <TouchableOpacity onPress={handleFetchAssignableDevices}>
          <Text style={styles.headerBtn}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Info */}
      {hasVehicle ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{t("deviceAssignment.vehicle")}</Text>
          <Text style={styles.infoValue}>ID: {vehicleId}</Text>
        </View>
      ) : (
        <View style={[styles.infoCard, styles.infoCardWarning]}>
          <Text style={styles.warningText}>
            {t("deviceAssignment.noVehicle")}
          </Text>
        </View>
      )}

      {/* Hint */}
      <View style={styles.hintCard}>
        <Text style={styles.hintText}>{t("deviceAssignment.hint")}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={openScanner}
          disabled={!hasVehicle}
        >
          <Text style={styles.actionBtnText}>
            📷 {t("deviceAssignment.scanQR")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => setSearchModal(true)}
        >
          <Text style={styles.actionBtnText}>
            🔍 {t("deviceAssignment.search")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnTertiary]}
          onPress={() => setDeviceListModal(true)}
        >
          <Text style={styles.actionBtnText}>
            📋 {t("deviceAssignment.list")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Assignable Devices List */}
      <Text style={[styles.title, { paddingHorizontal: COLORS.SPACING.md }]}>
        {t("deviceAssignment.availableDevices")} ({assignableDevices.length})
      </Text>

      <FlatList
        data={assignableDevices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderAssignableDeviceItem}
        contentContainerStyle={{ paddingHorizontal: COLORS.SPACING.md }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.value}>
              {t("deviceAssignment.noDevicesAvailable")}
            </Text>
          </View>
        }
        refreshing={loadingList}
        onRefresh={handleFetchAssignableDevices}
      />

      {/* QR Scanner Modal */}
      <Modal visible={scannerModal} animationType="slide">
        <View style={styles.scannerContainer}>
          {!permission ? (
            <View style={styles.permissionContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.permissionText}>
                {t("camera.requestingPermission")}
              </Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.errorText}>
                {t("camera.permissionDenied")}
              </Text>
              <Text style={styles.permissionText}>
                {t("camera.enableInSettings")}
              </Text>
              <TouchableOpacity
                style={[
                  styles.btn,
                  styles.btnPrimary,
                  { marginTop: COLORS.SPACING.md },
                ]}
                onPress={requestPermission}
              >
                <Text style={styles.btnText}>
                  {t("camera.grantPermission")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={styles.scanner}
              facing="back"
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          )}

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnDanger,
              { margin: COLORS.SPACING.md },
            ]}
            onPress={() => setScannerModal(false)}
          >
            <Text style={styles.btnText}>{t("deviceAssignment.close")}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Serial Search Modal */}
      <Modal
        visible={searchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("deviceAssignment.searchBySerial")}
            </Text>

            <TextInput
              style={styles.input}
              value={searchSerial}
              onChangeText={setSearchSerial}
              placeholder={t("deviceAssignment.enterSerial")}
              placeholderTextColor={COLORS.MUTED}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleSearchSerial}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.btnText}>
                  🔍 {t("deviceAssignment.search")}
                </Text>
              )}
            </TouchableOpacity>

            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={(d) => String(d.id)}
                style={styles.searchList}
                renderItem={renderSearchResultItem}
              />
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnDanger,
                { marginTop: COLORS.SPACING.md },
              ]}
              onPress={() => {
                setSearchModal(false);
                setSearchSerial("");
                setSearchResults([]);
              }}
            >
              <Text style={styles.btnText}>{t("deviceAssignment.close")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Device List Modal */}
      <Modal
        visible={deviceListModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeviceListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t("deviceAssignment.availableDevices")}
            </Text>

            {assignableDevices.length > 0 ? (
              <FlatList
                data={assignableDevices}
                keyExtractor={(d) => String(d.id)}
                style={styles.listModal}
                contentContainerStyle={{ paddingBottom: COLORS.SPACING.md }}
                renderItem={renderAssignableDeviceItem}
                refreshing={loadingList}
                onRefresh={handleFetchAssignableDevices}
              />
            ) : (
              <Text style={styles.emptyText}>
                {t("deviceAssignment.noDevicesAvailable")}
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnDanger,
                { marginTop: COLORS.SPACING.md },
              ]}
              onPress={() => setDeviceListModal(false)}
            >
              <Text style={styles.btnText}>{t("deviceAssignment.close")}</Text>
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
      backgroundColor: COLORS.SECONDARY,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.WHITE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.BORDER,
    },
    title: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xxl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    headerBtn: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
    },
    infoCard: {
      marginHorizontal: COLORS.SPACING.md,
      marginVertical: COLORS.SPACING.sm,
      padding: COLORS.SPACING.md,
      backgroundColor: COLORS.WHITE,
      borderRadius: COLORS.SPACING.sm,
      borderLeftWidth: COLORS.SPACING.xs,
      borderLeftColor: COLORS.INFO,
    },
    infoCardWarning: {
      borderLeftColor: COLORS.WARNING,
    },
    infoLabel: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      color: COLORS.MUTED,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    infoValue: {
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      marginTop: 2,
    },
    warningText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.WARNING,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
    },
    hintCard: {
      marginHorizontal: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      padding: COLORS.SPACING.md,
      backgroundColor: COLORS.WHITE,
      borderRadius: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    hintText: {
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    actionBar: {
      flexDirection: "row",
      paddingHorizontal: COLORS.SPACING.md,
      paddingVertical: COLORS.SPACING.sm,
      backgroundColor: COLORS.WHITE,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: COLORS.SPACING.md,
      borderRadius: COLORS.SPACING.sm,
      alignItems: "center",
      marginRight: COLORS.SPACING.sm,
    },
    actionBtnPrimary: {
      backgroundColor: COLORS.PRIMARY,
    },
    actionBtnSecondary: {
      backgroundColor: COLORS.SUCCESS,
    },
    actionBtnTertiary: {
      backgroundColor: COLORS.INFO,
    },
    actionBtnText: {
      color: COLORS.WHITE,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    deviceCard: {
      backgroundColor: COLORS.WHITE,
      borderRadius: COLORS.SPACING.sm,
      padding: COLORS.SPACING.md,
      marginBottom: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: COLORS.SPACING.sm,
    },
    serial: {
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT,
    },
    status: {
      fontSize: COLORS.TYPOGRAPHY.sizes.sm,
      backgroundColor: COLORS.INPUT,
      paddingHorizontal: COLORS.SPACING.xs,
      paddingVertical: 2,
      borderRadius: COLORS.SPACING.xs,
      marginTop: COLORS.SPACING.xs,
      color: COLORS.MUTED,
      alignSelf: "flex-start",
    },
    online: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
    },
    value: {
      marginTop: COLORS.SPACING.xs,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    disabledText: {
      marginTop: COLORS.SPACING.sm,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
    },
    btn: {
      paddingVertical: COLORS.SPACING.sm,
      borderRadius: COLORS.SPACING.sm,
      alignItems: "center",
      marginTop: COLORS.SPACING.sm,
    },
    btnPrimary: {
      backgroundColor: COLORS.PRIMARY,
    },
    btnAssign: {
      backgroundColor: COLORS.SUCCESS,
    },
    btnDanger: {
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
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: COLORS.BLACK,
    },
    scanner: {
      flex: 1,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: COLORS.BLACK,
      padding: COLORS.SPACING.xxxl,
    },
    permissionText: {
      color: COLORS.WHITE,
      marginTop: COLORS.SPACING.md,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      textAlign: "center",
    },
    errorText: {
      color: COLORS.WARNING,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      textAlign: "center",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.OVERLAY,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: COLORS.SPACING.md,
    },
    modalContent: {
      backgroundColor: COLORS.WHITE,
      borderRadius: COLORS.SPACING.md,
      paddingHorizontal: COLORS.SPACING.lg,
      paddingVertical: COLORS.SPACING.lg,
      width: "100%",
      maxHeight: "85%",
    },
    modalTitle: {
      fontSize: COLORS.TYPOGRAPHY.sizes.xl,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      marginBottom: COLORS.SPACING.md,
      color: COLORS.TEXT,
    },
    input: {
      borderWidth: 1,
      borderColor: COLORS.BORDER,
      borderRadius: COLORS.SPACING.sm,
      paddingVertical: COLORS.SPACING.sm,
      paddingHorizontal: COLORS.SPACING.md,
      fontSize: COLORS.TYPOGRAPHY.sizes.lg,
      color: COLORS.TEXT,
      backgroundColor: COLORS.WHITE,
    },
    searchList: {
      marginTop: COLORS.SPACING.md,
      maxHeight: 320,
    },
    listModal: {
      marginTop: COLORS.SPACING.md,
      maxHeight: 420,
    },
    searchItem: {
      backgroundColor: COLORS.SECONDARY,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.SPACING.sm,
      marginBottom: COLORS.SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.BORDER,
    },
    emptyText: {
      marginTop: COLORS.SPACING.md,
      color: COLORS.MUTED,
      fontSize: COLORS.TYPOGRAPHY.sizes.md,
      textAlign: "center",
    },
  });

export default DriverDeviceAssignment;
