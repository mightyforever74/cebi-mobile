// src/screens/MQTTTest.js
import { useEffect, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import mqttService from "../services/mqttService";

export default function MQTTTest() {
  const [status, setStatus] = useState("Disconnected");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // MQTT'ye bağlan
    mqttService.connect();

    // Telemetry mesajlarını dinle
    mqttService.subscribe("fleet/+/+/telemetry", (topic, payload) => {
      const newMessage = {
        timestamp: new Date().toLocaleTimeString(),
        topic,
        data: payload,
      };
      setMessages((prev) => [newMessage, ...prev].slice(0, 20)); // Son 20 mesaj
    });

    // Durum güncellemeleri
    const interval = setInterval(() => {
      const mqttStatus = mqttService.getStatus();
      setStatus(mqttStatus.connected ? "Connected ✅" : "Disconnected ❌");
    }, 1000);

    return () => {
      clearInterval(interval);
      mqttService.disconnect();
    };
  }, []);

  const sendTestMessage = () => {
    mqttService.publish("fleet/test/mobile", {
      source: "mobile-app",
      timestamp: Date.now(),
      test: true,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MQTT Test Screen</Text>
        <Text style={styles.status}>Status: {status}</Text>
        <Button title="Send Test Message" onPress={sendTestMessage} />
      </View>

      <View style={styles.messagesContainer}>
        <Text style={styles.subtitle}>
          Received Messages ({messages.length})
        </Text>
        {messages.map((msg, index) => (
          <View key={index} style={styles.message}>
            <Text style={styles.messageTime}>{msg.timestamp}</Text>
            <Text style={styles.messageTopic}>{msg.topic}</Text>
            <Text style={styles.messageData}>
              {JSON.stringify(msg.data, null, 2)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  status: {
    fontSize: 18,
    marginBottom: 10,
  },
  messagesContainer: {
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#5e72e4",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
  },
  messageTopic: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
  },
  messageData: {
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 5,
    color: "#333",
  },
});
