// src/screens/MQTTTest.js
// TulipFleet - MQTT Test Ekranı
// Updated: UI System Guide v3 uyumlu

import { useEffect, useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import mqttService from "../services/mqttService";

export default function MQTTTest() {
  const { COLORS } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [status, setStatus] = useState("Disconnected");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    mqttService.connect();
    mqttService.subscribe("fleet/+/+/telemetry", (topic, payload) => {
      const newMessage = {
        timestamp: new Date().toLocaleTimeString(),
        topic,
        data: payload,
      };
      setMessages((prev) => [newMessage, ...prev].slice(0, 20));
    });
    const interval = setInterval(() => {
      const mqttStatus = mqttService.getStatus();
      setStatus(mqttStatus.connected ? "Connected" : "Disconnected");
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
        <Button
          title="Send Test Message"
          onPress={sendTestMessage}
          color={COLORS.PRIMARY}
        />
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

const makeStyles = (COLORS) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.BACKGROUND },
    header: {
      padding: COLORS.SPACING.lg,
      backgroundColor: COLORS.SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.DIVIDER,
    },
    title: {
      ...COLORS.TYPOGRAPHY.styles.h3,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    status: {
      ...COLORS.TYPOGRAPHY.styles.body,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    messagesContainer: { padding: COLORS.SPACING.lg },
    subtitle: {
      ...COLORS.TYPOGRAPHY.styles.body,
      fontWeight: COLORS.TYPOGRAPHY.weights.bold,
      color: COLORS.TEXT_PRIMARY,
      marginBottom: COLORS.SPACING.sm,
    },
    message: {
      backgroundColor: COLORS.CARD,
      padding: COLORS.SPACING.md,
      borderRadius: COLORS.RADIUS.sm,
      marginBottom: COLORS.SPACING.sm,
      borderLeftWidth: COLORS.SPACING.xs,
      borderLeftColor: COLORS.PRIMARY,
      ...COLORS.SHADOWS.xs,
    },
    messageTime: { ...COLORS.TYPOGRAPHY.styles.caption, color: COLORS.MUTED },
    messageTopic: {
      ...COLORS.TYPOGRAPHY.styles.label,
      color: COLORS.TEXT_PRIMARY,
      marginTop: COLORS.SPACING.xs,
    },
    messageData: {
      ...COLORS.TYPOGRAPHY.styles.caption,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      marginTop: COLORS.SPACING.xs,
      color: COLORS.TEXT_SECONDARY,
    },
  });
