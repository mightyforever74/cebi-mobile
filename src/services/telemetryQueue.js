// src/services/telemetryQueue.js
// ============================================================
// ADR-CE-02 — Mobil Telemetri local queue.
//
// GPS ping'leri once bu kalici (AsyncStorage) kuyruga yazilir, sonra
// senkronizasyon ayri bir asamada sunucuya gonderilir. Bu ayrim onemli:
// uygulama arka plana atilsa/oldurulse/ag kesilse bile, bir sonraki
// acilista kuyrukta duran ping'ler kaybolmaz — `expo-task-manager`
// gerektirmeden (gercek arka plan toplama degil, sadece "toplanani
// guvenle sakla") kalici bir tampon saglar.
//
// Depolama: tek bir JSON anahtari altinda dizi (src/utils/storage.js'in
// generic storeData/getData kalibi). Beklenen hacim (foreground-only
// toplama, tipik sefer suresi) icin tek-anahtar + tam-liste
// oku/yaz yeterli; kuyruk cok buyurse (ag uzun sure kesikse) MAX_QUEUE_SIZE
// ile en eski ping'ler atilir (sinirsiz buyumeyi/depolama tasmasini
// onlemek icin bir veri kaybi tercih edilir).
// ============================================================

import { getData, storeData } from "../utils/storage";

const QUEUE_KEY = "telemetryPingQueue";
const MAX_QUEUE_SIZE = 2000; // guvenlik siniri — bkz. yukaridaki not

export async function enqueuePing(ping) {
  try {
    const queue = (await getData(QUEUE_KEY)) || [];
    queue.push(ping);
    const trimmed =
      queue.length > MAX_QUEUE_SIZE
        ? queue.slice(queue.length - MAX_QUEUE_SIZE)
        : queue;
    await storeData(QUEUE_KEY, trimmed);
    return true;
  } catch (error) {
    console.error("telemetryQueue.enqueuePing error:", error);
    return false;
  }
}

export async function peekQueue(limit = 200) {
  try {
    const queue = (await getData(QUEUE_KEY)) || [];
    return queue.slice(0, limit);
  } catch (error) {
    console.error("telemetryQueue.peekQueue error:", error);
    return [];
  }
}

export async function getQueueLength() {
  try {
    const queue = (await getData(QUEUE_KEY)) || [];
    return queue.length;
  } catch (error) {
    console.error("telemetryQueue.getQueueLength error:", error);
    return 0;
  }
}

// Basariyla sunucuya kabul edilen (veya sunucunun zaten biliyor olmasi
// nedeniyle "duplicate" sayilan — ikisi de kuyruktan dusurulmeli) ping'leri
// clientPingId kumesine gore kuyruktan cikarir. Araya yeni ping'ler
// eklenmis olabilecegi icin (flush sirasinda es zamanli watchPosition
// callback'i), tam liste degil sadece verilen id'ler cikarilir.
export async function removeFromQueue(clientPingIds) {
  try {
    const idSet = new Set(clientPingIds);
    const queue = (await getData(QUEUE_KEY)) || [];
    const remaining = queue.filter((p) => !idSet.has(p.clientPingId));
    await storeData(QUEUE_KEY, remaining);
    return true;
  } catch (error) {
    console.error("telemetryQueue.removeFromQueue error:", error);
    return false;
  }
}

export async function clearQueue() {
  try {
    await storeData(QUEUE_KEY, []);
    return true;
  } catch (error) {
    console.error("telemetryQueue.clearQueue error:", error);
    return false;
  }
}
