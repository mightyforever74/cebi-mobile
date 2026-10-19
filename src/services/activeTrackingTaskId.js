// src/services/activeTrackingTaskId.js
// ============================================================
// ADR-CE-02 §4.2 — aktif takip edilen dispatcher task'inin (sefer) id'si,
// kalici (AsyncStorage) depoda tutulur.
//
// NEDEN GEREKLI: telemetrySync.js'teki in-memory `currentTaskId` degiskeni
// sadece foreground JS context'i canliyken anlamlidir. Ama arka plan konum
// guncellemeleri (backgroundLocationTask.js), uygulama arka plandayken
// veya isletim sistemi JS motorunu yeniden baslattiginda calisabilir — bu
// durumda modul-seviyesi in-memory state sifirlanmis olabilir. Bu yuzden
// "hangi sefer icin takip aciksa" bilgisi ayrica kalici depoya yazilir;
// arka plan task'i gonderecegi flush cagrisi icin taskId'yi buradan okur.
// ============================================================

import { getData, removeData, storeData } from "../utils/storage";

const KEY = "activeTrackingTaskId";

export async function setActiveTrackingTaskId(taskId) {
  try {
    await storeData(KEY, taskId);
    return true;
  } catch (error) {
    console.error("activeTrackingTaskId.setActiveTrackingTaskId error:", error);
    return false;
  }
}

export async function getActiveTrackingTaskId() {
  try {
    return await getData(KEY);
  } catch (error) {
    console.error("activeTrackingTaskId.getActiveTrackingTaskId error:", error);
    return null;
  }
}

export async function clearActiveTrackingTaskId() {
  try {
    await removeData(KEY);
    return true;
  } catch (error) {
    console.error("activeTrackingTaskId.clearActiveTrackingTaskId error:", error);
    return false;
  }
}
