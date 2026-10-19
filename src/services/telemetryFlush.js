// src/services/telemetryFlush.js
// ============================================================
// ADR-CE-02; Mobil Telemetri: kuyruktaki ping'leri sunucuya gonderme
// mantigi. telemetrySync.js (foreground interval + stopTracking'in son
// flush'u) VE backgroundLocationTask.js (arka plan guncellemesinde
// firsatci flush) tarafindan ortak kullanilir.
//
// Bilerek AYRI bir dosyada tutuluyor: telemetrySync.js <-> background
// LocationTask.js arasinda dongusel import (circular dependency)
// olusmasini onler (ikisi de bu modulu import eder, birbirini degil).
// ============================================================

import NetInfo from "@react-native-community/netinfo";
import { telemetryAPI } from "./api";
import { peekQueue, removeFromQueue } from "./telemetryQueue";

const FLUSH_BATCH_SIZE = 300; // tek istekte gonderilecek ust limit (sunucu MAX_BATCH_SIZE=500)

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
// calisir. Ag hatasinda sessizce durur; ping'ler kuyrukta kalir, bir
// sonraki cagrida tekrar denenir. HICBIR ZAMAN throw ETMEZ: ne sefer
// akisini (foreground), ne de arka plan task callback'ini kesintiye
// ugratmali.
export async function flushQueue(taskId) {
  if (!taskId) return;

  // NetInfo kesin "offline" derse hic denemeden cik — zayif sinyal
  // bolgelerinde/uzun offline donemlerde her FLUSH_INTERVAL_MS'de bir
  // bosuna fetch denemesiyle radyo uyandirip batarya tuketmeyi onler.
  // isConnected null/undefined (henuz belirlenmemis) ise YINE DE dene:
  // "bilinmiyor" durumunda senkronizasyon firsatini kacirmamak, zaten
  // var olan graceful-degradation ilkesiyle ayni ("supheli durumda
  // engelleme"). NetInfo'nun kendisi hata verirse de ayni sekilde devam
  // edilir (bu kontrol asla flush'i ENGELLEMEMELI, sadece bosuna deneme
  // sayisini azaltmak icin bir optimizasyon).
  try {
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) return;
  } catch (error) {
    // yok sayilir, asagida normal akisla devam edilir
  }

  // eslenmemis/bosa dongu riskini sinirlamak icin makul bir ust sinir
  for (let i = 0; i < 20; i++) {
    const batch = await peekQueue(FLUSH_BATCH_SIZE);
    if (batch.length === 0) return;
    try {
      await telemetryAPI.sendBatch(taskId, batch.map(toPingPayload));
      await removeFromQueue(batch.map((p) => p.clientPingId));
      if (batch.length < FLUSH_BATCH_SIZE) return; // kuyruk tukendi
    } catch (error) {
      console.warn(
        "telemetryFlush.flushQueue: senkronizasyon basarisiz, kuyrukta birakildi:",
        error?.message || error
      );
      return;
    }
  }
}
