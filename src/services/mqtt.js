import { Client } from "react-native-mqtt";
import { MQTT_CONFIG, MQTT_TOPICS } from "../constants/config";

class MQTTService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscribers = new Map();
  }

  // MQTT'ye bağlan
  connect(onConnect, onError) {
    try {
      console.log("MQTT: Connecting to broker...", MQTT_CONFIG.host);

      this.client = new Client({
        uri: `${MQTT_CONFIG.useSSL ? "mqtts" : "mqtt"}://${MQTT_CONFIG.host}:${
          MQTT_CONFIG.port
        }`,
        clientId: MQTT_CONFIG.clientId,
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        keepAlive: MQTT_CONFIG.keepAlive,
        clean: MQTT_CONFIG.clean,
      });

      // Connection success
      this.client.on("connect", () => {
        console.log("MQTT: Connected successfully");
        this.isConnected = true;
        if (onConnect) onConnect();

        // Auto-subscribe to topics
        this.subscribeToDefaultTopics();
      });

      // Connection error
      this.client.on("error", (error) => {
        console.error("MQTT: Connection error", error);
        this.isConnected = false;
        if (onError) onError(error);
      });

      // Connection closed
      this.client.on("close", () => {
        console.log("MQTT: Connection closed");
        this.isConnected = false;
      });

      // Message received
      this.client.on("message", (topic, message) => {
        this.handleMessage(topic, message);
      });

      // Connect
      this.client.connect();
    } catch (error) {
      console.error("MQTT: Failed to initialize", error);
      if (onError) onError(error);
    }
  }

  // Bağlantıyı kes
  disconnect() {
    if (this.client && this.isConnected) {
      console.log("MQTT: Disconnecting...");
      this.client.disconnect();
      this.isConnected = false;
      this.subscribers.clear();
    }
  }

  // Topic'e subscribe ol
  subscribe(topic, callback) {
    if (!this.isConnected) {
      console.warn("MQTT: Not connected, cannot subscribe to", topic);
      return;
    }

    console.log("MQTT: Subscribing to", topic);
    this.client.subscribe(topic, 0); // QoS 0

    // Callback'i kaydet
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(callback);
  }

  // Topic'ten unsubscribe ol
  unsubscribe(topic) {
    if (this.isConnected) {
      console.log("MQTT: Unsubscribing from", topic);
      this.client.unsubscribe(topic);
      this.subscribers.delete(topic);
    }
  }

  // Mesaj yayınla
  publish(topic, message, qos = 0, retained = false) {
    if (!this.isConnected) {
      console.warn("MQTT: Not connected, cannot publish to", topic);
      return false;
    }

    try {
      const payload =
        typeof message === "string" ? message : JSON.stringify(message);
      console.log("MQTT: Publishing to", topic, payload);
      this.client.publish(topic, payload, qos, retained);
      return true;
    } catch (error) {
      console.error("MQTT: Publish error", error);
      return false;
    }
  }

  // Gelen mesajı işle
  handleMessage(topic, message) {
    try {
      console.log("MQTT: Message received", topic);
      const payload = JSON.parse(message.toString());

      // Topic'e subscribe olan callback'leri çağır
      this.subscribers.forEach((callbacks, subscribedTopic) => {
        // Wildcard match (+)
        const topicPattern = subscribedTopic.replace(/\+/g, "[^/]+");
        const regex = new RegExp(`^${topicPattern}$`);

        if (regex.test(topic)) {
          callbacks.forEach((callback) => callback(topic, payload));
        }
      });
    } catch (error) {
      console.error("MQTT: Error handling message", error);
    }
  }

  // Default topic'lere subscribe ol
  subscribeToDefaultTopics() {
    // Telemetri verileri
    this.subscribe(MQTT_TOPICS.TELEMETRY, (topic, payload) => {
      console.log("Telemetry data:", payload);
    });

    // Konum verileri
    this.subscribe(MQTT_TOPICS.LOCATION, (topic, payload) => {
      console.log("Location data:", payload);
    });

    // Uyarılar
    this.subscribe(MQTT_TOPICS.ALERTS, (topic, payload) => {
      console.log("Alert received:", payload);
    });
  }

  // Bağlantı durumunu kontrol et
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Singleton instance
const mqttService = new MQTTService();

export default mqttService;

// Helper functions
export const connectMQTT = (onConnect, onError) => {
  mqttService.connect(onConnect, onError);
};

export const disconnectMQTT = () => {
  mqttService.disconnect();
};

export const subscribeTopic = (topic, callback) => {
  mqttService.subscribe(topic, callback);
};

export const unsubscribeTopic = (topic) => {
  mqttService.unsubscribe(topic);
};

export const publishMessage = (topic, message, qos, retained) => {
  return mqttService.publish(topic, message, qos, retained);
};
