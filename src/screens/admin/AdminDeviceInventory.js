import { useNavigation } from "@react-navigation/native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../constants";
import { adminAPI, deviceAPI } from "../../services/api";

const { COLORS, SIZES } = theme;

const AdminDeviceInventory = () => {
  const navigation = useNavigation();
  const scanLock = useRef(false);

  // State
  const [devices, setDevices] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingActionDeviceId, setLoadingActionDeviceId] = useState(null);
  const [scannerModal, setScannerModal] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [searchSerial, setSearchSerial] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [filterAssigned, setFilterAssigned] = useState("all");

  // ✅ FIX: Permission isteğini lazy yapalım
  useEffect(() => {
    if (scannerModal && hasPermission === null) {
      requestCameraPermission();
    }
  }, [scannerModal]);

  // ✅ Filter değişince otomatik fetch
  useEffect(() => {
    fetchDevices();
  }, [filterAssigned]);

  const requestCameraPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const fetchDevices = async () => {
    try {
      setLoadingList(true);
      const assigned =
        filterAssigned === "all"
          ? undefined
          : filterAssigned === "assigned"
          ? "true"
          : "false";

      const data = await adminAPI.getDevices(assigned);
      const list = Array.isArray(data) ? data : data?.devices || [];
      setDevices(list);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch devices");
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  // ✅ FIX 1: Dayanıklı token extract
  const extractToken = (raw) => {
    if (!raw) return raw;

    // Raw token ise direkt dön
    if (!raw.includes("://") && !raw.includes("?")) return raw;

    // URL parse (URL API yoksa diye basit regex)
    const match = raw.match(/[?&]t=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : raw;
  };

  // ✅ FIX: Double-trigger lock
  const handleBarCodeScanned = async ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;

    try {
      const token = extractToken(data);
      setScannerModal(false);

      const validate = await deviceAPI.validateClaimToken(token);
      if (validate?.valid) {
        Alert.alert(
          "QR Valid",
          `Device: ${validate.device.serial}\nExpires in: ${validate.expires_in_hours} hours`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add to Stock",
              onPress: () => handleAddToStock(token),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        "Invalid QR",
        err.response?.data?.error || "QR code is invalid or expired"
      );
    } finally {
      setTimeout(() => {
        scanLock.current = false;
      }, 1000);
    }
  };

  // ✅ QR claim (Add to Stock)
  const handleAddToStock = async (token) => {
    try {
      setLoadingActionDeviceId("qr");
      const result = await deviceAPI.claimByToken(token, "add_to_stock");
      Alert.alert("Success", `Device ${result.device.serial} added to stock!`);
      fetchDevices();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to add device");
    } finally {
      setLoadingActionDeviceId(null);
    }
  };

  // Serial No Arama
  const handleSearchSerial = async () => {
    if (!searchSerial.trim()) {
      Alert.alert("Error", "Enter a serial number");
      return;
    }

    try {
      setLoadingAction(true);
      const data = await adminAPI.searchDevices(searchSerial);
      const results = Array.isArray(data) ? data : data?.devices || [];
      setSearchResults(results);
    } catch (err) {
      Alert.alert("Not Found", err.response?.data?.error || "Device not found");
      setSearchResults([]);
    } finally {
      setLoadingAction(false);
    }
  };

  // ✅ FIX 3: can_add_to_stock kontrolü
  const handleAddDeviceToStock = async (deviceId) => {
    try {
      setLoadingActionDeviceId(deviceId);
      await adminAPI.claimDevice(deviceId, "add_to_stock");

      Alert.alert("Success", "Device added to stock!");
      setSearchModal(false);
      setSearchResults([]);
      setSearchSerial("");
      fetchDevices();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Failed to add device");
    } finally {
      setLoadingActionDeviceId(null);
    }
  };

  // ✅ useMemo ile grouping
  const groupedDevices = useMemo(() => {
    return [
      {
        title: `Online (${devices.filter((d) => d.is_online).length})`,
        data: devices.filter((d) => d.is_online),
      },
      {
        title: `Offline (${devices.filter((d) => !d.is_online).length})`,
        data: devices.filter((d) => !d.is_online),
      },
    ];
  }, [devices]);

  const renderDeviceItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.serial}>{item.serial}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>
        <Text style={styles.online}>{item.is_online ? "🟢" : "🔴"}</Text>
      </View>

      <View style={styles.cardBody}>
        {item.plate_no && (
          <>
            <Text style={styles.label}>Vehicle:</Text>
            <Text style={styles.value}>{item.plate_no}</Text>
          </>
        )}

        {item.driver_name && (
          <>
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{item.driver_name}</Text>
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

      {/* ✅ FIX 3: can_add_to_stock kontrolü */}
      {item.can_add_to_stock && (
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnAssign,
            loadingActionDeviceId === item.id && styles.btnDisabled,
          ]}
          onPress={() => handleAddDeviceToStock(item.id)}
          disabled={loadingActionDeviceId === item.id}
        >
          {loadingActionDeviceId === item.id ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Text style={styles.btnText}>📦 Add to Stock</Text>
          )}
        </TouchableOpacity>
      )}
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Device Inventory</Text>
        <TouchableOpacity onPress={fetchDevices}>
          <Text style={styles.headerBtn}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterAssigned === "all" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterAssigned("all")}
        >
          <Text style={styles.filterBtnText}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterAssigned === "assigned" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterAssigned("assigned")}
        >
          <Text style={styles.filterBtnText}>Assigned</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filterAssigned === "unassigned" && styles.filterBtnActive,
          ]}
          onPress={() => setFilterAssigned("unassigned")}
        >
          <Text style={styles.filterBtnText}>Unassigned</Text>
        </TouchableOpacity>
      </View>

      {/* ✅ FIX 5: Action buttons'ı disable et */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnPrimary,
            loadingActionDeviceId === "qr" && styles.btnDisabled,
          ]}
          onPress={() => setScannerModal(true)}
          disabled={loadingActionDeviceId === "qr"}
        >
          <Text style={styles.actionBtnText}>📷 QR Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnSecondary,
            loadingAction && styles.btnDisabled,
          ]}
          onPress={() => setSearchModal(true)}
          disabled={loadingAction}
        >
          <Text style={styles.actionBtnText}>🔍 Serial No</Text>
        </TouchableOpacity>
      </View>

      {/* Device List */}
      <SectionList
        sections={groupedDevices}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderDeviceItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
        contentContainerStyle={styles.list}
      />

      {/* QR Scanner Modal */}
      <Modal visible={scannerModal} animationType="slide">
        <View style={styles.scannerContainer}>
          {hasPermission === null ? (
            <View style={styles.permissionContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.permissionText}>
                Requesting camera permission...
              </Text>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.errorText}>❌ Camera permission denied</Text>
              <Text style={styles.permissionText}>
                Please enable camera in settings
              </Text>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => setScannerModal(false)}
              >
                <Text style={styles.btnText}>Close</Text>
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
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {/* Serial Search Modal */}
      <Modal visible={searchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Search by Serial</Text>

            <TextInput
              style={styles.input}
              placeholder="Serial (e.g. TFL-2025-001)"
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
                <Text style={styles.btnText}>Search</Text>
              )}
            </TouchableOpacity>

            {/* ✅ FIX 4: maxHeight ile scroll kontrollü */}
            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={(d) => String(d.id)}
                style={styles.searchList}
                scrollEnabled={true}
                renderItem={({ item }) => (
                  <View style={styles.searchItem}>
                    <Text style={styles.serial}>{item.serial}</Text>
                    <Text style={styles.value}>Status: {item.status}</Text>

                    {item.can_claim ? (
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          styles.btnAssign,
                          loadingActionDeviceId === item.id &&
                            styles.btnDisabled,
                        ]}
                        onPress={() => handleAddDeviceToStock(item.id)}
                        disabled={loadingActionDeviceId === item.id}
                      >
                        {loadingActionDeviceId === item.id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.WHITE}
                          />
                        ) : (
                          <Text style={styles.btnText}>📦 Add</Text>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.disabledText}>
                        Cannot claim (assigned)
                      </Text>
                    )}
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.btn, styles.btnDanger, { marginTop: SIZES.BASE }]}
              onPress={() => {
                setSearchModal(false);
                setSearchSerial("");
                setSearchResults([]);
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
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
    gap: SIZES.BASE / 2,
    backgroundColor: COLORS.WHITE,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: SIZES.BASE / 2,
    paddingHorizontal: SIZES.BASE / 2,
    borderRadius: SIZES.BASE / 2,
    backgroundColor: COLORS.GREY,
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterBtnText: {
    fontSize: SIZES.BASE - 2,
    fontWeight: "bold",
    color: COLORS.BLACK,
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
  actionBtnText: {
    color: COLORS.WHITE,
    fontWeight: "bold",
  },
  list: {
    paddingHorizontal: SIZES.BASE,
    paddingVertical: SIZES.BASE / 2,
  },
  sectionTitle: {
    fontSize: SIZES.BASE,
    fontWeight: "bold",
    color: COLORS.BLACK,
    marginBottom: SIZES.BASE / 2,
    marginTop: SIZES.BASE / 2,
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
  },
  permissionText: {
    color: COLORS.WHITE,
    marginTop: SIZES.BASE,
    fontSize: SIZES.BASE - 1,
  },
  errorText: {
    color: COLORS.WARNING,
    fontSize: SIZES.BASE,
    fontWeight: "bold",
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: SIZES.BASE + 2,
    fontWeight: "bold",
    marginBottom: SIZES.BASE,
    color: COLORS.BLACK,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GREY,
    borderRadius: SIZES.BASE / 2,
    paddingHorizontal: SIZES.BASE / 2,
    paddingVertical: SIZES.BASE / 2,
    marginBottom: SIZES.BASE,
    fontSize: SIZES.BASE - 1,
    color: COLORS.BLACK,
  },
  searchList: {
    marginTop: SIZES.BASE / 2,
    maxHeight: 260,
  },
  searchItem: {
    backgroundColor: COLORS.GREY,
    paddingHorizontal: SIZES.BASE / 2,
    paddingVertical: SIZES.BASE / 2,
    borderRadius: SIZES.BASE / 2,
    marginTop: SIZES.BASE / 2,
    borderLeftWidth: SIZES.BASE / 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  disabledText: {
    color: COLORS.MUTED,
    fontSize: SIZES.BASE - 2,
    marginTop: SIZES.BASE / 2,
  },
});

export default AdminDeviceInventory;
