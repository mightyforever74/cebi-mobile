// src/services/telemetrySync.js
// ============================================================
// ADR-CE-01 / ADR-CE-02 — Mobil Telemetri: foreground GPS toplama +
// periyodik senkronizasyon orkestrasyonu.
//
// KAPSAM (bilerek sinirlandi — bkz. asagidaki not):
//   V1 kapsami SADECE "foreground" (uygulama acik/aktif) takiptir.
//   Gercek arka plan takibi (ekran kapali veya uygulama tamamen
//   kapatilmisken GPS toplama) icin `expo-task-manager` +
//   `expo-background-fetch`/`expo-location`'in background-location
//   API'si gerekir — bu paket bu projede HENUZ YOK ve eklenmesi native
//   bir rebuild (EAS build) gerektirir; bu oturumda cihaz/simulator
//   erisimi olmadigindan test edilemez. Bu nedenle V1, ADR-CE-01'in
//   "sefer basinca takip acilir, sefer boyunca surer, kapaninca durur"
//   kuralini EKRANIN ACIK OLDUGU surece karsilar (DriverRouteMapScreen
//   mount/unmount + sefer baslangic/tamamlanma olaylarina baglanir).
//   Arka plan destegi ayri bir takip maddesi olarak ele alinmali.
//
// Akis:
//   startTracking(taskId) -> expo-location watchPositionAsync baslar,
//     her konum guncellemesi local kuyruga (telemetryQueue) yazilir ve
//     periyodik olarak (FLUSH_INTERVAL_MS) sunucuya toplu gonderilir.
//   stopTracking() -> izlemeyi durdurur, kuyrukta kalani son bir kez
//     senkronize etmeye calisir (best-effort, basarisiz olursa kuyrukta
//     kalir — bir sonraki startTracking/flush'ta tekrar denenir).
//
// Idempotency: her ping'e mobilde uretilen bir clientPingId (UUID)
// atanir; sunucu ayni id'yi ikinci kez gorurse sessizce yok sayar
// (ON CONFLICT DO NOTHING) — bu sayede ag kopmasi sonrasi tekrar
// gonderim guvenlidir.
// ============================================================

import * as Location from "expo-location";
import { telemetryAPI } from "./api";
import { generateUuidV4 } from "../utils/uuid";
import {
  enqueuePing,
  peekQueue,
  removeFromQueue,
} from "./telemetryQueue";

const FLUSH_INTERVAL_MS = 20000; // 20s — periyodik senkronizasyon
const FLUSH_BATCH_SIZE = 300; // tek istekte gonderilecek ust limit (sunucu MAX_BATCH_SIZE=500)
const LOCATION_TIME_INTERVAL_MS = 10000; // GPS guncellemesi: en az 10s'de bir
const LOCATION_DISTANCE_INTERVAL_M = 25; // veya 25m hareket

let watchSubscription = null;
let flushIntervalId = null;
let currentTaskId = null;

function toPingPayload(stored) {
  return {
    clientPingId: stored.clientPingId,
    latitude: stored.latitude,
    longitude: stored.longitude,
    speed: stored.speed,
    heading: stored.heading,
    accuracy: stored.accuracy,
    recordedAt: stored.recordedAt,
  };
}

// Kuyrukta ne varsa (birden fazla parti halinde) sunucuya gondermeye
// calisir. Ag hatasinda sessizce durur — ping'ler kuyrukta kalir, bir
// sonraki cagrida tekrar denenir. Sefer tamamlanmasini ENGELLEMEMELI:
// bu fonksiyon asla throw etmez.
export async function flushQueue(taskId) {
  if (!taskId) return;
  // eslenmemis/bosa dongu riskini sinirlamak icin makul bir ust sinir
  for (let i = 0; i < 20; i++) {
    const batch = await peekQueue(FLUSH_BATCH_SIZE);
    if (batch.length === 0) return;
    try {
      await telemetryAPI.sendBatch(
        taskId,
        batch.map(toPingPayload)
      );
      await removeFromQueue(batch.map((p) => p.clientPingId));
      if (batch.length < FLUSH_BATCH_SIZE) return; // kuyruk tukendi
    } catch (error) {
      console.warn(
        "telemetrySync.flushQueue: senkronizasyon basarisiz, kuyrukta birakildi:",
        error?.message || error
      );
      return;
    }
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
  currentTaskId = null;

  // Kuyrukta kalani son bir kez senkronize etmeye calis (best-effort).
  if (taskId) {
    await flushQueue(taskId);
  }
}

export function isTracking() {
  return !!watchSubscription;
}
