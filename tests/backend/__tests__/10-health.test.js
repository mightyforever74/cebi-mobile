// ============================================================
// 10. HEALTH CHECK & ENDPOINT DISCOVERY
// ============================================================
const { CONFIG, createClient, loginAs, trackTest, printSummary } = require('../config');

describe('10. HEALTH & ENDPOINT DISCOVERY', () => {
  
  // Health check
  test('T-00 API Health Check', async () => {
    try {
      const client = createClient();
      const res = await client.get('/health');
      
      if (res.status === 200) {
        trackTest('T-00', 'API Health', true, `Response: ${JSON.stringify(res.data).substring(0, 100)}`);
      } else {
        trackTest('T-00', 'API Health', false, `Status: ${res.status}`);
      }
      
      expect(res.status).toBe(200);
    } catch (e) {
      trackTest('T-00', 'API Health', false, e.message);
      throw e;
    }
  });

  // Endpoint discovery - tüm beklenen endpoint'leri kontrol et
  test('T-99 Endpoint Discovery', async () => {
    try {
      const admin = await loginAs('admin');
      
      const endpoints = [
        { method: 'GET', path: '/api/vehicles', name: 'Vehicles List' },
        { method: 'GET', path: '/api/drivers', name: 'Drivers List' },
        { method: 'GET', path: '/api/tasks', name: 'Tasks List' },
        { method: 'GET', path: '/api/alerts', name: 'Alerts List' },
        { method: 'GET', path: '/api/vehicles/locations', name: 'Vehicle Locations' },
        { method: 'GET', path: '/api/admin/fleet-stats', name: 'Fleet Stats' },
        { method: 'GET', path: '/api/users/profile', name: 'User Profile' },
        { method: 'GET', path: '/api/geofences', name: 'Geofences' },
        { method: 'GET', path: '/api/devices', name: 'Devices' },
      ];
      
      const results = [];
      
      for (const ep of endpoints) {
        const res = await admin.client.get(ep.path);
        const status = res.status;
        const icon = status === 200 ? '✅' : status === 404 ? '❌' : `⚠️ ${status}`;
        results.push(`${icon} ${ep.name} (${ep.path})`);
      }
      
      console.log('\n📋 ENDPOINT MAP:');
      results.forEach(r => console.log(`   ${r}`));
      
      trackTest('T-99', 'Endpoint Discovery', true, `${endpoints.length} endpoint kontrol edildi`);
    } catch (e) {
      trackTest('T-99', 'Endpoint Discovery', false, e.message);
      throw e;
    }
  });
});

// Test suite bittikten sonra özet yazdır
afterAll(() => {
  printSummary();
});
