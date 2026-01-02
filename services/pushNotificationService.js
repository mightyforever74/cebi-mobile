// C:\argon\services\pushNotificationService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from "@react-native-firebase/messaging";
import { Alert, Platform } from "react-native";

const API_URL = "https://api.tulipfleet.com";

class PushNotificationService {
  // İzin iste
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log("Push notification izni verildi");
      return true;
    }
    console.log("Push notification izni reddedildi");
    return false;
  }

  // FCM Token al
  async getToken() {
    try {
      const token = await messaging().getToken();
      console.log("FCM Token:", token);
      return token;
    } catch (error) {
      console.error("FCM Token alınamadı:", error);
      return null;
    }
  }

  // Token'ı backend'e kaydet
  async registerToken(fcmToken) {
    try {
      const authToken = await AsyncStorage.getItem("token");
      if (!authToken) {
        console.log("Auth token yok, push kaydı yapılamadı");
        return;
      }

      const response = await fetch(`${API_URL}/api/push/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: Platform.OS,
        }),
      });

      if (response.ok) {
        console.log("Push token kaydedildi");
        await AsyncStorage.setItem("fcmToken", fcmToken);
      }
    } catch (error) {
      console.error("Push token kayıt hatası:", error);
    }
  }

  // Notification handler'ları kur
  setupHandlers() {
    // Foreground mesajları
    messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground mesaj:", remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || "Bildirim",
        remoteMessage.notification?.body || ""
      );
    });

    // Background'dan açılan mesajlar
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log("Background'dan açıldı:", remoteMessage);
    });

    // Uygulama kapalıyken gelen mesaj
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log("Kapalı uygulamadan açıldı:", remoteMessage);
        }
      });
  }

  // Ana başlatma fonksiyonu
  async initialize() {
    const hasPermission = await this.requestPermission();
    if (hasPermission) {
      const token = await this.getToken();
      if (token) {
        await this.registerToken(token);
      }
      this.setupHandlers();
    }
  }
}

export default new PushNotificationService();
