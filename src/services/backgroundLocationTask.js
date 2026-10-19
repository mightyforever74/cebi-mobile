// src/services/backgroundLocationTask.js
// ============================================================
// ADR-CE-02 §4.2 — gercek arka plan GPS takibi (ekran kapali veya
// uygulama arka plandayken konum toplama).
//
// ONEMLI — bu dosya index.js'in EN BASINDA, herhangi bir component
// render edilmeden once import edilmelidir (bkz. index.js). expo-location
// ve expo-task-manager, TaskManager.defineTask'in component agaci
// DISINDA, modul yuklenirken calismasini sart kosar; aksi halde native
// taraf (uygulama arka planda/kapaliyken tetiklenen guncellemeler, veya
// OS tarafindan JS motoru yeniden baslatildiginda) bu task'i bulamaz.
//
// KAPSAM: bu task SADECE konum guncellemelerini kalici local kuyruga
// (telemetryQueue) yazar, sonra firsatci bir flush dener (ag/JS context
// o an ne kadar surer bilinmedigi icin "sonra gonderilir" degil "simdi
// dene, olmazsa kuyrukta kalsin" yaklasimi). Ayni idempotency/dedup
// garantisi (clientPingId UUID, sunucu ON CONFLICT DO NOTHING) foreground
// akisiyla (telemetrySync.js) birebir aynidir — iki kaynaktan gelen
// ping'ler kuyrukta ve sunucuda sorunsuz karisir.
//
// TEST DURUMU (onemli, Cem icin): bu kod expo-location@19.0.8 /
// expo-task-manager@14.0.9'un dokumante edilen ve kaynagindan dogrulanan
// API'sine gore yazildi (bkz. commit mesaji — paket kaynagi indirilip
// AndroidManifest.xml + config-plugin kodu okunarak dogrulandi). AMA bu
// oturumda gercek cihaz/simulator erisimi YOK; native rebuild (EAS build)
// ve GERCEK CIHAZDA test edilmeden canliya guvenilmemeli. Ozellikle:
//   - Android'de OEM-spesifik agresif pil optimizasyonu (Xiaomi/Huawei/
//     Samsung'un kendi "arka plan uygulamalarini oldur" davranisi)
//     foreground service'e ragmen takibi kesebilir — cihazda dogrulanmali.
//   - iOS'ta kullanici "Her Zaman" yerine "Uygulamayi Kullanirken" secerse
//     arka plan guncellemesi hic gelmez; kod bunu status kontrolu ile
//     ele aliyor (startBackgroundTracking status!=='granted' ise sessizce
//     foreground-only'ye duser) ama gercek davranis dogrulanmadi.
//   - Google Play: ACCESS_BACKGROUND_LOCATION, Play Console'da ayri bir
//     "Permissions Declaration" + uygulama-ici "prominent disclosure"
//     gerektirir (cebi-mobile henuz Play Store'da yayinlanmadigi icin
//     su an bloklayici degil, ama yayinlanmadan once ele alinmali).
// ============================================================

import * as TaskManager from "expo-task-manager";
import { getActiveTrackingTaskId } from "./activeTrackingTaskId";
import { flushQueue } from "./telemetryFlush";
import { enqueuePing } from "./telemetryQueue";
import { generateUuidV4 } from "../utils/uuid";

export const BACKGROUND_LOCATION_TASK_NAME = "cebi-background-location-task";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("backgroundLocationTask: TaskManager hatasi:", error.message || error);
    return;
  }
  if (!data) return;

  // expo-location'in background task callback'ine verdigi data sekli:
  // { locations: LocationObject[] }
  const locations = data.locations;
  if (!Array.isArray(locations) || locations.length === 0) return;

  for (const loc of locations) {
    await enqueuePing({
      clientPingId: generateUuidV4(),
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed ?? null,
      heading: loc.coords.heading ?? null,
      accuracy: loc.coords.accuracy ?? null,
      recordedAt: new Date(loc.timestamp).toISOString(),
    });
  }

  // Firsatci flush: hangi sefer icin takip aciksa kalici depodan okunur
  // (bkz. activeTrackingTaskId.js basligi — in-memory state'e guvenilemez).
  const taskId = await getActiveTrackingTaskId();
  if (taskId) {
    await flushQueue(taskId);
  }
});
