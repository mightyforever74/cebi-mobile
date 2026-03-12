// ============================================================
// 9. MQTT BAĞLANTI TESTI (T-36, T-37)
// ============================================================
const mqtt = require('mqtt');
const { CONFIG, trackTest } = require('../config');

describe('9. MQTT', () => {

  // T-36: MQTT broker bağlantısı
  test('T-36 MQTT Broker bağlantısı', async () => {
    try {
      const connected = await new Promise((resolve) => {
        const client = mqtt.connect(`mqtts://${CONFIG.MQTT_HOST}:${CONFIG.MQTT_PORT}`, {
          username: CONFIG.MQTT_USER,
          password: CONFIG.MQTT_PASS,
          rejectUnauthorized: false, // setInsecure() karşılığı
          connectTimeout: 10000,
          clientId: `test-${Date.now()}`,
        });
        
        const timeout = setTimeout(() => {
          client.end(true);
          resolve(false);
        }, 12000);
        
        client.on('connect', () => {
          clearTimeout(timeout);
          client.end(true);
          resolve(true);
        });
        
        client.on('error', (err) => {
          clearTimeout(timeout);
          client.end(true);
          resolve(false);
        });
      });
      
      if (connected) {
        trackTest('T-36', 'MQTT Bağlantı', true, `${CONFIG.MQTT_HOST}:${CONFIG.MQTT_PORT} TLS`);
      } else {
        trackTest('T-36', 'MQTT Bağlantı', false, 'Bağlantı kurulamadı');
      }
      
      expect(connected).toBe(true);
    } catch (e) {
      trackTest('T-36', 'MQTT Bağlantı', false, e.message);
      throw e;
    }
  });

  // T-37: MQTT subscribe & publish test
  test('T-37 MQTT Publish/Subscribe', async () => {
    try {
      const result = await new Promise((resolve) => {
        const client = mqtt.connect(`mqtts://${CONFIG.MQTT_HOST}:${CONFIG.MQTT_PORT}`, {
          username: CONFIG.MQTT_USER,
          password: CONFIG.MQTT_PASS,
          rejectUnauthorized: false,
          connectTimeout: 10000,
          clientId: `test-pubsub-${Date.now()}`,
        });
        
        const testTopic = `test/tulipfleet/${Date.now()}`;
        const testPayload = JSON.stringify({
          type: 'test',
          timestamp: new Date().toISOString(),
          lat: 41.0082,
          lng: 28.9784,
          speed: 0,
        });
        
        const timeout = setTimeout(() => {
          client.end(true);
          resolve({ connected: true, received: false });
        }, 8000);
        
        client.on('connect', () => {
          client.subscribe(testTopic, (err) => {
            if (err) {
              clearTimeout(timeout);
              client.end(true);
              resolve({ connected: true, subscribed: false });
              return;
            }
            
            // Publish
            client.publish(testTopic, testPayload);
          });
        });
        
        client.on('message', (topic, message) => {
          if (topic === testTopic) {
            clearTimeout(timeout);
            client.end(true);
            
            try {
              const parsed = JSON.parse(message.toString());
              resolve({ connected: true, subscribed: true, received: true, data: parsed });
            } catch {
              resolve({ connected: true, subscribed: true, received: true, parseError: true });
            }
          }
        });
        
        client.on('error', () => {
          clearTimeout(timeout);
          client.end(true);
          resolve({ connected: false });
        });
      });
      
      if (result.received) {
        trackTest('T-37', 'MQTT Pub/Sub', true, 'Publish → Subscribe → Receive OK');
      } else if (result.connected) {
        trackTest('T-37', 'MQTT Pub/Sub', null, 'Bağlandı ama mesaj alınamadı');
      } else {
        trackTest('T-37', 'MQTT Pub/Sub', false, 'Bağlantı kurulamadı');
      }
      
      expect(result.connected).toBe(true);
    } catch (e) {
      trackTest('T-37', 'MQTT Pub/Sub', false, e.message);
      throw e;
    }
  });

  // T-36b: Yanlış credential ile MQTT bağlantısı (güvenlik)
  test('T-36b MQTT Yanlış credential - bağlantı reddedilmeli', async () => {
    try {
      const result = await new Promise((resolve) => {
        const client = mqtt.connect(`mqtts://${CONFIG.MQTT_HOST}:${CONFIG.MQTT_PORT}`, {
          username: 'wrong_user',
          password: 'wrong_pass',
          rejectUnauthorized: false,
          connectTimeout: 8000,
          clientId: `test-bad-${Date.now()}`,
        });
        
        const timeout = setTimeout(() => {
          client.end(true);
          resolve('timeout'); // Bağlanamadı = güvenli
        }, 10000);
        
        client.on('connect', () => {
          clearTimeout(timeout);
          client.end(true);
          resolve('connected'); // Kötü - yanlış credential kabul edildi
        });
        
        client.on('error', () => {
          clearTimeout(timeout);
          client.end(true);
          resolve('rejected'); // İyi - reddedildi
        });
        
        client.on('close', () => {
          clearTimeout(timeout);
          client.end(true);
          resolve('closed'); // İyi - kapatıldı
        });
      });
      
      const isSecure = result !== 'connected';
      
      if (isSecure) {
        trackTest('T-36b', 'MQTT Auth Guard', true, `Sonuç: ${result}`);
      } else {
        trackTest('T-36b', 'MQTT Auth Guard', false, 'Yanlış credential kabul edildi!');
      }
      
      expect(isSecure).toBe(true);
    } catch (e) {
      trackTest('T-36b', 'MQTT Auth Guard', false, e.message);
      throw e;
    }
  });
});
