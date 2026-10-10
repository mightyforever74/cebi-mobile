// src/locales/syncLanguage.js
//
// P1-3b (10 Eki, TODO_ACTIVE §4 "FCM/push sablonu ... kullanici diline gore"):
// dil degisince (i18n.changeLanguage) backend'e de yazar (users.language),
// boylece push bildirimleri (ve ileride baska sunucu-taraf TR/EN/NL metinleri)
// kullanicinin SECTIGI dili kullanabilir - su ana kadar bu deger yalniz kayit
// anindaki varsayilanda donup kaliyordu, hicbir ekrandan backend'e yansimiyordu.
//
// Best-effort, no-throw (ayni desen: routes/internalBridge.js sendPushNotification):
// UI dil degisimini bu cagriya bagimli kilmiyoruz - cevrimdisi, 401 (henuz
// giris yapilmamis) ya da sunucu hatasinda da dil anlik degisir, kullanici
// hicbir hata gormez. userAPI zaten PUT /api/user/profile'i cagiriyor.
import { userAPI } from "../services/api";

export function syncLanguageToBackend(langCode) {
  try {
    userAPI.updateProfile({ language: langCode }).catch(() => {});
  } catch {
    // senkron atma (ag/istemci hatasi) - UI dil degisimini asla engellemez
  }
}
