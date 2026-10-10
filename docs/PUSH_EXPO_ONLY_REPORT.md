# Push Expo-only — `chore/push-expo-only`

Branch: `chore/push-expo-only` (from `main` `2ea5cc8`).  
Native dependency change. **OTA ile yayınlanmaz.** main’e push yok. Sunucuya dokunulmadı.

## Amaç

Tek push yolu: `expo-notifications` → Expo Push Token → backend `users.expo_push_token` + Expo Push API (`core/internalBridge.js`).  
`@react-native-firebase/messaging` yolu ölü kod olarak kaldırıldı.

## Kaldırmadan önce grep (kanıt)

JS/TS `@react-native-firebase` / `messaging()` / `crashlytics()`:

- Yalnız `services/pushNotificationService.js` → `messaging`
- `@react-native-firebase/app` ve `@react-native-firebase/crashlytics`: **JS import 0** → package.json’dan üç paket birlikte çıkarıldı

## Kaldırılanlar

| Öğe | Not |
|---|---|
| `services/pushNotificationService.js` | `messaging().getToken()` / `"FCM Token alınamadı"` |
| `App.js` import + `PushNotificationService.initialize()` | Açılışta FCM init |
| `@react-native-firebase/messaging` | package.json |
| `@react-native-firebase/app` | JS’te kullanılmıyordu |
| `@react-native-firebase/crashlytics` | JS’te kullanılmıyordu |
| `app.json` plugins: `@react-native-firebase/app`, `./plugins/withFirebaseFix` | iOS managed; `plugins/withFirebaseFix.js` silindi |
| `android/build.gradle` `firebase-crashlytics-gradle` classpath | paket gittiği için |
| `android/app/build.gradle` `apply plugin: 'com.google.firebase.crashlytics'` | aynı |

## Kalanlar ve neden

| Öğe | Neden |
|---|---|
| `expo-notifications` + `src/hooks/usePushNotifications.js` | Tek istemci yolu; `getExpoPushTokenAsync` |
| `APP_CONFIG.enablePushNotifications: true` (`src/constants/config.js`) | Hook sırası: bayrak → `Device.isDevice` → izin |
| `google-services.json` (kök + `android/app/`) | Android FCM kaydı |
| `com.google.gms:google-services` classpath + `apply plugin` | Expo Android FCM bu plugin ile `google-services.json` okur |
| Manifest `com.google.firebase.messaging.default_notification_*` | Expo notifications varsayılan ikon/renk |

Referans: [Expo — FCM V1 / google-services.json](https://docs.expo.dev/push-notifications/fcm-credentials/)  
> *“Configure the google-services.json file… This file is required for your Android app to be registered with FCM.”*  
Gönderim Expo Push API + EAS FCM V1 service account; RN Firebase Messaging SDK gerekmez.

## Hook davranışı

1. `APP_CONFIG.enablePushNotifications` false → sessiz `return` (toast yok)
2. `!Device.isDevice` → sessiz `return` (toast yok) — AVD’de bu dal
3. İzin → `getExpoPushTokenAsync` → `pushAPI.register`

## OTA / mağaza

Native (npm + android gradle). **OTA ile gitmez.**  
**2.0.8 mağaza build**’inde (EAS, R8/minify ile birlikte) yayınlanacak.

## AVD

| | |
|---|---|
| Ad | `tulipfleet-play` |
| Image | `system-images;android-36.1;google_apis_playstore;x86_64` |
| Play Store | `com.android.vending` (`Phonesky.apk`) |
| GMS | `com.google.android.gms` |

## Kanıt — statik

```
npm test                     → exit 0
  (scripts: node --check App.js + usePushNotifications + config)
node scripts/verify-i18n.mjs → PASS errors=0 warnings=670
rg react-native-firebase src android app.json package.json → 0
rg pushNotificationService src → 0
google-services plugin       → android/build.gradle + android/app/build.gradle KALDI
```

## Kanıt — debug APK + logcat + ekran

- APK: `android/app/build/outputs/apk/debug/app-debug.apk` → `adb install -r` on `tulipfleet-play`
- Metro: `npx expo start --port 8081`
- Logcat (JS):
  - `"FCM Token alınamadı"` → **0**
  - `react-native-firebase` / `pushNotificationService` → **0**
  - `[push] skipped: not a physical device` → **1** (DriverDashboard mount, emülatör)
- Ekran: LogBox yok — `docs/screenshots/push-expo-only/`
  - `04-login-clean.png` — splash/onboarding, overlay yok
  - `05-driver-dashboard.png` — sürücü oturumu

### Native `E FirebaseMessaging` notu

`google-services` + Expo Notifications altında Play Services hâlâ FCM token senkronu dener. Bu AVD’de `FirebaseMessaging: Failed to get FIS auth token` (stack) görülebilir; bu **silinen RN Firebase JS yolu değil**, Expo’nun Android FCM kaydının native gürültüsü. Kabul ölçütü olan uygulama metni `"FCM Token alınamadı"` ve LogBox **yok**.

## Yerel not

Kanıt oturumunda `.env` içine (commit edilmedi) `EXPO_PUBLIC_API_URL=https://api.tulipfleet.com` eklendi; aksi halde Config `console.error` LogBox üretiyordu. Gradle için kısa cache: `GRADLE_USER_HOME=C:\g2` (Windows 260 char / sandbox path).
