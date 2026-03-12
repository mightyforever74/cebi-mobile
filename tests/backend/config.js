// TulipFleet Backend API Test Suite - Configuration
// Target: https://api.tulipfleet.com (Production)
// Usage: npm test (all) | npm run test:auth (category)

const axios = require('axios');

// ============================================================
// CONFIG - Bu değerleri kendi ortamına göre düzenle
// ============================================================
const CONFIG = {
  API_URL: 'https://api.tulipfleet.com',
  
  // Test hesapları (memory'den)
  DRIVER: { email: 'test@tulipfleet.com', password: 'test123' },
  ADMIN:  { email: 'admin@fleet.com', password: 'test123' },
  // SuperAdmin login farklı olabilir, endpoint'e göre ayarla
  
  // MQTT (T-36..T-42 testleri için)
  MQTT_HOST: 'mqtt.tulipfleet.com',
  MQTT_PORT: 8883,
  MQTT_USER: 'fleet_esp32',
  MQTT_PASS: 'ESP32Fleet2026SecureKey!',
};

// ============================================================
// HTTP CLIENT
// ============================================================
function createClient(token = null) {
  const client = axios.create({
    baseURL: CONFIG.API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true, // Hata fırlatmasın, status'u biz kontrol edelim
  });
  
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  return client;
}

// ============================================================
// AUTH HELPERS
// ============================================================
async function loginAs(role) {
  const creds = role === 'driver' ? CONFIG.DRIVER : CONFIG.ADMIN;
  const client = createClient();
  const res = await client.post('/api/auth/login', {
    email: creds.email,
    password: creds.password,
  });
  
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`Login failed for ${role}: ${res.status} - ${JSON.stringify(res.data)}`);
  }
  
  return {
    token: res.data.token,
    refreshToken: res.data.refreshToken,
    user: res.data.user,
    client: createClient(res.data.token),
  };
}

// ============================================================
// TEST RESULT TRACKER
// ============================================================
const results = {};

function trackTest(id, name, passed, note = '') {
  results[id] = { name, passed, note };
}

function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('  TULIPFLEET TEST SONUÇLARI');
  console.log('='.repeat(70));
  
  let pass = 0, fail = 0, skip = 0;
  
  for (const [id, r] of Object.entries(results)) {
    const icon = r.passed === true ? '✅' : r.passed === false ? '❌' : '⏭️';
    if (r.passed === true) pass++;
    else if (r.passed === false) fail++;
    else skip++;
    
    const noteStr = r.note ? ` (${r.note})` : '';
    console.log(`  ${icon} ${id} - ${r.name}${noteStr}`);
  }
  
  console.log('='.repeat(70));
  console.log(`  TOPLAM: ${pass + fail + skip} | ✅ PASS: ${pass} | ❌ FAIL: ${fail} | ⏭️ SKIP: ${skip}`);
  console.log('='.repeat(70));
}

module.exports = { CONFIG, createClient, loginAs, trackTest, printSummary };
