// src/services/telemetrySync.js
// ============================================================
// ADR-CE-01 / ADR-CE-02; Mobil Telemetri: GPS toplama (foreground +
// arka plan) ve periyodik senkronizasyon orkestrasyonu.
//
// GUNCELLEME (§4.2, bu tur): gercek arka plan takibi eklendi. Daha once
// (v2) bu dosyanin kapsami "sadece ekran acikken" idi; simdi
// `Location.startLocationUpdatesAsync` + `expo-task-manager` ile ekran
// kapali/uygulama arka planda iken de konum toplanabiliyor (bkz.
// backgroundLocationTask.js). GRACEFUL DEGRADATION: arka plan izni
// reddedilirse veya API hata verirse, foreground takip yine de calismaya
// devam eder; sefer baslatma/takip HICBIR ZAMAN bu yuzden engellenmez.
//
// Akis:
//   startTracking(taskId):
//     1. Foreground izni istenir (zorunlu; reddedilirse takip hic
//        baslamaz, eskisi gibi).
//     2. watchPositionAsync ile foreground GPS toplama baslar, periyodik
//        (FLUSH_INTERVAL_MS) sunucuya toplu gonderilir.
//     3. Aktif taskId kalici depoya yazilir (bkz. activeTrackingTaskId.js
//        basligi; arka plan task'inin okuyabilmesi icin).
//     4. Arka plan izni istenir (opsiyonel; reddedilirse sessizce
//        atlanir, foreground takip etkilenmez). Verilirse
//        startLocationUpdatesAsync ile arka plan takibi de baslar.
//   stopTracking(): hem foreground watch'i hem (varsa) arka plan
//     guncellemelerini durdurur, kuyrukta kalani son bir kez senkronize
//     etmeye calisir (best-effort).
//
// Idempotency: her ping'e mobilde uretilen bir clientPingId (UUID)
// atanir; sunucu ayni id'yi ikinci kez gorurse sessizce yok sayar
// (ON CONFLICT DO NOTHING); ag kopmasi sonrasi tekrar gonderim VE
// foreground+background'dan ayni anda gelebilecek ping'ler guvenlidir.
//
// flushQueue artik telemetryFlush.js'te (bkz. o dosyanin basligi;
// backgroundLocationTask.js ile dongusel import'u onlemek icin tasindi);
// burada geriye-donuk uyumluluk icin re-export edilir.
//
// GUNCELLEME (Offline-First dayaniklilik, bu tur): NetInfo ile baglanti
// farkindaligi eklendi. (1) telemetryFlush.js artik kesin offline
// durumunda bosuna fetch denemiyor (batarya). (2) Burada, offline'dan
// online'a gecince FLUSH_INTERVAL_MS'yi beklemeden hemen flush tetiklenir
// (uzun offline donem sonrasi senkronizasyon gecikmesini azaltir).
// Mevcut kalici kuyruk (telemetryQueue.js, AsyncStorage) zaten uygulama
// oldurulse/yeniden baslatilsa bile ping kaybetmiyordu — bu, o mekanizmayi
// DEGISTIRMEZ, sadece ne zaman/ne siklikta denendigini optimize eder.
// ============================================================

import * as Location from "expo-location";
import NetInfo from "@react-native-community/netinfo";
import { generateUuidV4 } from "../utils/uuid";
import { enqueuePing } from "./telemetryQueue";
import { flushQueue } from "./telemetryFlush";
import { BACKGROUND_LOCATION_TASK_NAME } from "./backgroundLocationTask";
import {
  setActiveTrackingTaskId,
  clearActiveTrackingTaskId,
} from "./activeTrackingTaskId";

export { flushQueue };

const FLUSH_INTERVAL_MS = 20000; // 20s; periyodik senkronizasyon
const LOCATION_TIME_INTERVAL_MS = 10000; // GPS guncellemesi: en az 10s'de bir
const LOCATION_DISTANCE_INTERVAL_M = 25; // veya 25m hareket

let watchSubscription = null;
let flushIntervalId = null;
let currentTaskId = null;
let backgroundTrackingActive = false;
let netInfoUnsubscribe = null;

// Arka plan izni iste ve verildiyse startLocationUpdatesAsync baslat.
// Best-effort: hicbir hata/red foreground takibi durdurmamali, bu yuzden
// throw etmez, sadece true/false doner (cagiran taraf sonucu loglar).
async function tryStartBackgroundUpdates() {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== "granted") {
      console.warn(
        "telemetrySync: arka plan konum izni verilmedi, sadece foreground takip devam ediyor"
      );
      return false;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: LOCATION_TIME_INTERVAL_MS,
      distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
      // Android: kullaniciya bildirim gosteren bir foreground service
      // gerektirir (API 34+ icin FOREGROUND_SERVICE_LOCATION iznini de
      // ister; bkz. AndroidManifest.xml, native rebuild notu).
      foregroundService: {
        notificationTitle: "TulipFleet sefer takibi aktif",
        notificationBody: "Sefer devam ederken konumunuz paylasiliyor.",
      },
      // iOS: konum guncellemeleri arasinda uygulamanin askiya alinmasini
      // engelleyen bir gosterge (durum cubugunda mavi seritle belirtilir,
      // kullaniciya seffaf).
      showsBackgroundLocationIndicator: true,
    });

    backgroundTrackingActive = true;
    return true;
  } catch (error) {
    console.warn(
      "telemetrySync: arka plan takibi baslatilamadi, sadece foreground devam ediyor:",
      error?.message || error
    );
    return false;
  }
}

async function stopBackgroundUpdatesIfActive() {
  if (!backgroundTrackingActive) return;
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK_NAME
    );
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
    }
  } catch (error) {
    console.warn(
      "telemetrySync: arka plan takibi durdurulurken hata (yok sayildi):",
      error?.message || error
    );
  } finally {
    backgroundTrackingActive = false;
  }
}

export async function startTracking(taskId) {
  if (!taskId) return false;
  if (currentTaskId === taskId && watchSubscription) {
    return true; // zaten bu sefer icin takip aciksa yeniden baslatma
  }
  if (watchSubscription) {
    await stopTracking();
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.warn("telemetrySync: konum izni verilmedi, takip baslatilamadi");
      return false;
    }

    currentTaskId = taskId;
    await setActiveTrackingTaskId(taskId);

    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_TIME_INTERVAL_MS,
        distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
      },
      (loc) => {
        const ping = {
          clientPingId: generateUuidV4(),
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          accuracy: loc.coords.accuracy ?? null,
          recordedAt: new Date(loc.timestamp).toISOString(),
        };
        enqueuePing(ping);
      }
    );

    flushIntervalId = setInterval(() => {
      flushQueue(currentTaskId);
    }, FLUSH_INTERVAL_MS);

    // Baglanti offline'dan online'a donunce FLUSH_INTERVAL_MS'yi (20s)
    // beklemeden hemen senkronize et — uzun bir offline donemden sonra
    // (tunel, zayif sinyal bolgesi) kuyruktaki ping'lerin dispatcher
    // haritasina daha hizli yansimasi icin. Best-effort: dinleyici
    // kurulamazsa normal interval zaten calismaya devam eder.
    try {
      netInfoUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected && currentTaskId) {
          flushQueue(currentTaskId);
        }
      });
    } catch (error) {
      console.warn(
        "telemetrySync: NetInfo dinleyicisi kurulamadi (yok sayildi, periyodik flush devam ediyor):",
        error?.message || error
      );
    }

    // Arka plan takibi opsiyonel/best-effort; sonucu foreground takibin
    // basarisini ETKILEMEZ (yukaridaki return true zaten verildi say).
    await tryStartBackgroundUpdates();

    return true;
  } catch (error) {
    console.error("telemetrySync.startTracking error:", error);
    return false;
  }
}

export async function stopTracking() {
  const taskId = currentTaskId;

  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
  await stopBackgroundUpdatesIfActive();
  currentTaskId = null;
  await clearActiveTrackingTaskId();

  // Kuyrukta kalani son bir kez senkronize etmeye calis (best-effort).
  if (taskId) {
    await flushQueue(taskId);
  }
}

export function isTracking() {
  return !!watchSubscription;
}

export function isBackgroundTracking() {
  return backgroundTrackingActive;
}
