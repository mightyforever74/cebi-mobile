// src/utils/uuid.js
// ============================================================
// Hafif RFC4122 v4 benzeri UUID uretici — YENI native bagimlilik
// EKLEMEMEK icin bilerek `expo-crypto`/`react-native-get-random-values`
// kullanilmadi (bu proje kapsaminda native rebuild yapilamiyor).
//
// Kullanim alani: mobil telemetri ping'leri icin `clientPingId`
// (idempotency/dedup anahtari, sunucu tarafinda sadece UNIQUE kontrolu
// icin kullaniliyor — kriptografik guvenlik gereksinimi YOK). Math.random
// tabanli oldugu icin kriptografik olarak guclu degildir; guvenlik amacli
// bir kimlik olarak KULLANILMAMALI.
// ============================================================

export function generateUuidV4() {
  // "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" seklinde, y in {8,9,a,b}
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
      continue;
    }
    if (i === 14) {
      uuid += "4";
      continue;
    }
    const r = Math.floor(Math.random() * 16);
    if (i === 19) {
      uuid += ((r & 0x3) | 0x8).toString(16);
    } else {
      uuid += r.toString(16);
    }
  }
  return uuid;
}
