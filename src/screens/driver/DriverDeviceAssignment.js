// src/screens/driver/DriverDeviceAssignment.js
// TulipFleet - Device Assignment Screen
// Version: 2.0 - Full i18n Support

import { useRoute } from "@react-navigation/native";
import { BarCodeScanner } from "expo-barcode-scanner";
import * as Linking from "expo-linking";
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
import { theme } from "../../constants";
import { deviceAPI, driverAPI } from "../../services/api";

const { COLORS, SIZES } = theme;

const DriverDeviceAssignment = () => {
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
  const [hasPermission, setHasPermission] = useState(null);

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

  // Lazy permission request
  useEffect(() => {
    if (scannerModal && hasPermission === null) {
      requestCameraPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerModal]);

  const requestCameraPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

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
    const res = await deviceAPI.validateClaimToken(token);
    return res?.data ?? res; // { valid, device, expires_in_hours }
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
      const qrData = await handleValidateQR(token);

      if (qrData?.valid) {
        Alert.alert(
          t("deviceAssignment.qrValid"),
          `${t("deviceAssignment.device")}: ${qrData?.device?.serial}\n${t(
            "deviceAssignment.expiresIn"
          )}: ${qrData?.expires_in_hours} ${t("deviceAssignment.hours")}`,
          [
            { text: t("deviceAssignment.cancel"), style: "cancel" },
            {
              text: t("deviceAssignment.assignToVehicle"),
              onPress: () => handleClaimByToken(token),
            },
          ]
        );
      } else {
        Alert.alert(
          t("deviceAssignment.invalidQR"),
          t("deviceAssignment.qrExpired")
        );
      }
    } catch (err) {
      Alert.alert(
        t("deviceAssignment.invalidQR"),
        err?.response?.data?.error || t("deviceAssignment.qrExpired")
      );
    } finally {
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
      await deviceAPI.claimByToken(token, {
        action: "assign_to_vehicle",
        vehicleId,
      });

      Alert.alert(
        t("deviceAssignment.success"),
        t("deviceAssignment.deviceAssigned")
      );
      await handleFetchAssignableDevices();
      setScannerModal(false);
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

  const renderAssignableDeviceItem = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: SIZES.BASE }}>
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
            <Text style={styles.btnText}>{t("deviceAssignment.assign")}</Text>
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
      <View style={[styles.infoCard, !hasVehicle && styles.infoCardWarning]}>
        <Text style={styles.infoLabel}>{t("deviceAssignment.vehicleId")}:</Text>
        <Text style={styles.infoValue}>
          {vehicleId || t("deviceAssignment.notSelected")}
        </Text>
        {!hasVehicle && (
          <Text style={styles.warningText}>
            {t("deviceAssignment.vehicleRequired")}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            (!hasVehicle || loadingActionDeviceId === "qr") &&
              styles.btnDisabled,
          ]}
          onPress={() => setScannerModal(true)}
          disabled={!hasVehicle || loadingActionDeviceId === "qr"}
        >
          <Text style={styles.actionBtnText}>
            📷 {t("deviceAssignment.qrScan")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnSecondary,
            (!hasVehicle || loadingAction) && styles.btnDisabled,
          ]}
          onPress={() => setSearchModal(true)}
          disabled={!hasVehicle || loadingAction}
        >
          <Text style={styles.actionBtnText}>
            🔍 {t("deviceAssignment.serial")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnTertiary,
            !hasVehicle && styles.btnDisabled,
          ]}
          onPress={() => setDeviceListModal(true)}
          disabled={!hasVehicle}
        >
          <Text style={styles.actionBtnText}>
            📋 {t("deviceAssignment.list")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Optional hint */}
      {!hasVehicle && (
        <View style={styles.hintCard}>
          <Text style={styles.hintText}>{t("deviceAssignment.hint")}</Text>
        </View>
      )}

      {/* QR Scanner Modal */}
      <Modal
        visible={scannerModal}
        animationType="slide"
        onRequestClose={() => setScannerModal(false)}
      >
        <View style={styles.scannerContainer}>
          {hasPermission === null ? (
            <View style={styles.permissionContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.permissionText}>
                {t("deviceAssignment.requestingCamera")}
              </Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.errorText}>
                ❌ {t("deviceAssignment.cameraPermissionDenied")}
              </Text>
              <Text style={styles.permissionText}>
                {t("deviceAssignment.enableCameraPermission")}
              </Text>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.btnText}>
                  {t("deviceAssignment.openSettings")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={() => setScannerModal(false)}
              >
                <Text style={styles.btnText}>
                  {t("deviceAssignment.close")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <BarCodeScanner
                onBarCodeScanned={
                  scannerModal ? handleBarCodeScanned : undefined
                }
                style={styles.scanner}
              />
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger]}
                onPress={() => setScannerModal(false)}
              >
                <Text style={styles.btnText}>
                  {t("deviceAssignment.cancel")}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
              placeholder={t("deviceAssignment.serialPlaceholder")}
              value={searchSerial}
              onChangeText={setSearchSerial}
              autoCapitalize="characters"
              placeholderTextColor={COLORS.MUTED}
            />

            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnPrimary,
                loadingAction && styles.btnDisabled,
              ]}
              onPress={handleSearchSerial}
              disabled={loadingAction}
            >
              {loadingAction ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Text style={styles.btnText}>
                  {t("deviceAssignment.search")}
                </Text>
              )}
            </TouchableOpacity>

            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(d) => String(d.id)}
                style={styles.searchList}
                contentContainerStyle={{ paddingBottom: SIZES.BASE }}
                renderItem={renderSearchResultItem}
                refreshing={loadingList}
                onRefresh={handleFetchAssignableDevices}
              />
            ) : (
              <Text style={styles.emptyText}>
                {t("deviceAssignment.noResultsYet")}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, { marginTop: SIZES.BASE }]}
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
                contentContainerStyle={{ paddingBottom: SIZES.BASE }}
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
              style={[styles.btn, styles.btnDanger, { marginTop: SIZES.BASE }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.SECONDARY,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: SIZES.BASE + 4,
    fontWeight: "bold",
    color: COLORS.TEXT,
  },
  headerBtn: {
    fontSize: SIZES.BASE + 3,
  },
  infoCard: {
    marginHorizontal: SIZES.BASE,
    marginVertical: SIZES.BASE / 2,
    padding: SIZES.BASE,
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE / 2,
    borderLeftWidth: SIZES.BASE / 4,
    borderLeftColor: COLORS.INFO,
  },
  infoCardWarning: {
    borderLeftColor: COLORS.WARNING,
  },
  infoLabel: {
    fontSize: SIZES.BASE - 2,
    color: COLORS.MUTED,
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: SIZES.BASE - 1,
    color: COLORS.TEXT,
    marginTop: 2,
  },
  warningText: {
    marginTop: SIZES.BASE / 2,
    color: COLORS.WARNING,
    fontSize: SIZES.BASE - 2,
    fontWeight: "bold",
  },
  hintCard: {
    marginHorizontal: SIZES.BASE,
    marginBottom: SIZES.BASE / 2,
    padding: SIZES.BASE,
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE / 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  hintText: {
    color: COLORS.MUTED,
    fontSize: SIZES.BASE - 2,
  },
  actionBar: {
    flexDirection: "row",
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
    gap: SIZES.BASE / 2,
    backgroundColor: COLORS.WHITE,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: SIZES.BASE,
    borderRadius: SIZES.BASE / 2,
    alignItems: "center",
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
    fontWeight: "bold",
    fontSize: SIZES.BASE - 2,
  },
  deviceCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE / 2,
    padding: SIZES.BASE,
    marginBottom: SIZES.BASE / 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
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
    color: COLORS.TEXT,
  },
  status: {
    fontSize: SIZES.BASE - 3,
    backgroundColor: COLORS.INPUT,
    paddingHorizontal: SIZES.BASE / 4,
    paddingVertical: 2,
    borderRadius: SIZES.BASE / 4,
    marginTop: SIZES.BASE / 4,
    color: COLORS.MUTED,
    alignSelf: "flex-start",
  },
  online: {
    fontSize: SIZES.BASE + 2,
  },
  value: {
    marginTop: 6,
    color: COLORS.MUTED,
    fontSize: SIZES.BASE - 2,
  },
  disabledText: {
    marginTop: SIZES.BASE / 2,
    color: COLORS.MUTED,
    fontSize: SIZES.BASE - 2,
  },
  btn: {
    paddingVertical: SIZES.BASE / 2,
    borderRadius: SIZES.BASE / 2,
    alignItems: "center",
    marginTop: SIZES.BASE / 2,
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
    fontWeight: "bold",
    fontSize: SIZES.BASE - 2,
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
    padding: SIZES.BASE * 2,
  },
  permissionText: {
    color: COLORS.WHITE,
    marginTop: SIZES.BASE,
    fontSize: SIZES.BASE - 1,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.WARNING,
    fontSize: SIZES.BASE,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SIZES.BASE,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: SIZES.BASE,
    paddingHorizontal: SIZES.BASE * 1.5,
    paddingVertical: SIZES.BASE * 1.5,
    width: "100%",
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: SIZES.BASE + 2,
    fontWeight: "bold",
    marginBottom: SIZES.BASE,
    color: COLORS.TEXT,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: SIZES.BASE / 2,
    paddingVertical: SIZES.BASE / 2,
    paddingHorizontal: SIZES.BASE,
    fontSize: SIZES.BASE - 1,
    color: COLORS.TEXT,
    backgroundColor: COLORS.WHITE,
  },
  searchList: {
    marginTop: SIZES.BASE,
    maxHeight: 320,
  },
  listModal: {
    marginTop: SIZES.BASE,
    maxHeight: 420,
  },
  searchItem: {
    backgroundColor: COLORS.SECONDARY,
    padding: SIZES.BASE,
    borderRadius: SIZES.BASE / 2,
    marginBottom: SIZES.BASE / 2,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  emptyText: {
    marginTop: SIZES.BASE,
    color: COLORS.MUTED,
    fontSize: SIZES.BASE - 2,
    textAlign: "center",
  },
});

export default DriverDeviceAssignment;
