// src/services/mqttService.js
// TulipFleet - MQTT Service (Pure JS - mqtt.js)
//
// SEC (14.10.2026): bu dosya önceden process.env.MQTT_* okuyordu, ama RN/Expo
// bundle'ında çıplak process.env.* hiçbir zaman doldurulmaz (react-native-dotenv
// yalnızca "@env" importlarını derleme zamanında değiştirir — bkz.
// babel.config.js + src/constants/config.js'deki gerçek kullanım). Yani bu
// servis GERÇEKTE .env'den hiçbir değer okuyamıyordu ve sabit kodlanmış
// "Admin2024Pass!" değerine HER ZAMAN düşüyordu — kaynak kodda açık metin
// bir MQTT admin şifresi (CWE-798). Ekran (MQTTTest.js) hiçbir navigator'a
// bağlı değil/ölü kod, ama secret yine de repodan temizlendi: artık diğer
// MQTT_CONFIG (constants/config.js) ile aynı "@env" yolunu kullanıyor ve
// sabit bir şifre fallback'i YOK.
import { createClient } from "mqtt";
import { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_USERNAME } from "@env";

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
  }

  /**
   * MQTT Broker'a bağlan
   */
  connect(options = {}) {
    if (!MQTT_PASSWORD) {
      console.warn(
        "[MQTT] MQTT_PASSWORD .env içinde tanımlı değil — sabit bir şifreye " +
          "ASLA düşülmez, bağlantı kimlik bilgisi eksik kalacak."
      );
    }

    const defaultOptions = {
      // EMQX WebSocket URL (TLS için wss://)
      url: MQTT_HOST
        ? `ws://${MQTT_HOST}:${MQTT_PORT || 8083}/mqtt`
        : "ws://192.168.1.107:8083/mqtt",

      // Credentials — .env'de yoksa undefined kalır, ASLA sabit şifreye düşmez
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,

      // Client ID (unique)
      clientId: `tulipfleet-mobile-${Math.random().toString(16).slice(2)}`,

      // Connection options
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      clean: true,

      // Protocol version
      protocolVersion: 5, // MQTT 5.0
    };

    const config = { ...defaultOptions, ...options };

    console.log("🔌 MQTT Connecting to:", config.url);

    this.client = createClient(config);

    // Connection event
    this.client.on("connect", () => {
      console.log("✅ MQTT Connected");
      this.isConnected = true;
      this.onConnect();
    });

    // Message event
    this.client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log("📨 MQTT Message:", topic, payload);
        this.handleMessage(topic, payload);
      } catch (error) {
        console.error("❌ MQTT Message Parse Error:", error);
      }
    });

    // Error event
    this.client.on("error", (error) => {
      console.error("❌ MQTT Error:", error);
      this.isConnected = false;
    });

    // Disconnect event
    this.client.on("close", () => {
      console.log("🔌 MQTT Disconnected");
      this.isConnected = false;
    });

    // Reconnect event
    this.client.on("reconnect", () => {
      console.log("🔄 MQTT Reconnecting...");
    });

    return this.client;
  }

  /**
   * Bağlantı başarılı olduğunda
   */
  onConnect() {
    // Default subscriptions (örnek)
    this.subscribe("fleet/+/+/telemetry"); // Tüm araç telemetri verileri
    this.subscribe("fleet/+/+/alert"); // Tüm araç alertleri
  }

  /**
   * Topic'e abone ol
   */
  subscribe(topic, callback) {
    if (!this.client || !this.isConnected) {
      console.warn("⚠️ MQTT not connected, queueing subscription:", topic);
      // Bağlantı kurulunca tekrar dene
      setTimeout(() => this.subscribe(topic, callback), 1000);
      return;
    }

    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error("❌ MQTT Subscribe Error:", topic, err);
      } else {
        console.log("✅ MQTT Subscribed to:", topic);

        if (callback) {
          // Callback'i kaydet
          if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, []);
          }
          this.subscribers.get(topic).push(callback);
        }
      }
    });
  }

  /**
   * Topic'ten ayrıl
   */
  unsubscribe(topic) {
    if (!this.client) return;

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        console.error("❌ MQTT Unsubscribe Error:", topic, err);
      } else {
        console.log("✅ MQTT Unsubscribed from:", topic);
        this.subscribers.delete(topic);
      }
    });
  }

  /**
   * Mesaj yayınla
   */
  publish(topic, payload, options = {}) {
    if (!this.client || !this.isConnected) {
      console.warn("⚠️ MQTT not connected, cannot publish");
      return false;
    }

    const message =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    const publishOptions = {
      qos: 1, // Quality of Service
      retain: false,
      ...options,
    };

    this.client.publish(topic, message, publishOptions, (err) => {
      if (err) {
        console.error("❌ MQTT Publish Error:", topic, err);
      } else {
        console.log("✅ MQTT Published to:", topic);
      }
    });

    return true;
  }

  /**
   * Gelen mesajları işle
   */
  handleMessage(topic, payload) {
    // Topic pattern matching
    const subscribers = Array.from(this.subscribers.entries());

    for (const [pattern, callbacks] of subscribers) {
      if (this.matchTopic(pattern, topic)) {
        callbacks.forEach((callback) => callback(topic, payload));
      }
    }
  }

  /**
   * Topic pattern eşleştirme (wildcard desteği)
   */
  matchTopic(pattern, topic) {
    const patternParts = pattern.split("/");
    const topicParts = topic.split("/");

    if (patternParts.length !== topicParts.length && !pattern.includes("#")) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === "#") return true; // Multi-level wildcard
      if (patternParts[i] === "+") continue; // Single-level wildcard
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return true;
  }

  /**
   * Bağlantıyı kes
   */
  disconnect() {
    if (this.client) {
      console.log("🔌 MQTT Disconnecting...");
      this.client.end();
      this.isConnected = false;
      this.subscribers.clear();
    }
  }

  /**
   * Bağlantı durumunu kontrol et
   */
  getStatus() {
    return {
      connected: this.isConnected,
      clientId: this.client?.options?.clientId,
    };
  }
}

// Singleton instance
const mqttService = new MQTTService();

export default mqttService;
