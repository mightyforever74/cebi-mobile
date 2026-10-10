// src/hooks/usePushNotifications.js
// TulipFleet - Push Notification Hook (expo-notifications only)
// Fixed for Expo SDK 54

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { APP_CONFIG } from "../constants/config";
import { pushAPI } from "../services/api";

// Bildirim gösterim ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [error, setError] = useState(null);

  const notificationListener = useRef();
  const responseListener = useRef();

  // Push token al
  async function registerForPushNotifications() {
    let token = null;

    // 1) Feature flag
    if (!APP_CONFIG.enablePushNotifications) {
      console.log("[push] skipped: APP_CONFIG.enablePushNotifications=false");
      return null;
    }

    // 2) Fiziksel cihaz (emülatörde sessiz çıkış — toast yok)
    if (!Device.isDevice) {
      console.log("[push] skipped: not a physical device");
      return null;
    }

    // Android için kanal oluştur
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Varsayılan",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5E72E4",
        sound: "default",
      });

      // Görev bildirimleri için ayrı kanal
      await Notifications.setNotificationChannelAsync("tasks", {
        name: "Görev Bildirimleri",
        description: "Yeni görev teklifleri ve güncellemeler",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#2DCE89",
        sound: "default",
      });
    }

    // 3) İzin
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[push] permission denied");
      setError("Bildirim izni verilmedi");
      return null;
    }

    // Expo Push Token al
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId;

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      token = tokenResponse.data;
      console.log("✅ Expo Push Token:", token);
      setExpoPushToken(token);

      // Backend'e kaydet
      try {
        await pushAPI.register(token);
        console.log("✅ Push token registered to backend");
      } catch (apiError) {
        console.error("❌ Failed to register token to backend:", apiError);
        // Token alındı ama backend'e kaydedilemedi - kritik değil
      }
    } catch (err) {
      console.error("❌ Failed to get push token:", err);
      setError("Push token alınamadı: " + err.message);
      return null;
    }

    return token;
  }

  // Token'ı backend'den kaldır (logout için)
  async function unregisterPushToken() {
    try {
      await pushAPI.unregister();
      setExpoPushToken(null);
      console.log("✅ Push token unregistered");
    } catch (err) {
      console.error("❌ Failed to unregister token:", err);
    }
  }

  // Hook mount olduğunda
  useEffect(() => {
    // Token al ve kaydet
    registerForPushNotifications();

    // Bildirim geldiğinde (app açıkken)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("📬 Notification received:", notification);
        setNotification(notification);
      });

    // Bildirime tıklandığında
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification tapped:", response);
        const data = response.notification.request.content.data;

        // Bildirim türüne göre yönlendir
        if (data?.type === "TASK_OFFER") {
          console.log("Navigate to task offer:", data.offerId);
        } else if (data?.type === "ALERT") {
          console.log("Navigate to alert:", data.alertId);
        }
      });

    // Cleanup - SDK 54 için düzeltildi
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    notification,
    error,
    registerForPushNotifications,
    unregisterPushToken,
  };
}

export default usePushNotifications;
