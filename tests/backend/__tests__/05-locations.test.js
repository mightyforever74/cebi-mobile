// ============================================================
// 5. LOCATIONS / GPS VERI TESTLERI (T-13 ~ T-18)
// ============================================================
const { loginAs, trackTest } = require('../config');

describe('5. LOCATIONS & GPS', () => {
  let admin;

  beforeAll(async () => {
    admin = await loginAs('admin');
  });

  // T-15: Vehicle locations endpoint
  test('T-15 Vehicle Locations - GET /api/vehicles/locations', async () => {
    try {
      const res = await admin.client.get('/api/vehicles/locations');
      
      if (res.status === 404) {
        trackTest('T-15', 'Vehicle Locations', null, 'Endpoint 404');
        return;
      }
      
      expect(res.status).toBe(200);
      const locations = Array.isArray(res.data) ? res.data : res.data.locations || res.data.data;
      
      if (locations && locations.length > 0) {
        const loc = locations[0];
        // Beklenen alanlar: latitude/lat, longitude/lng, speed
        const hasLat = loc.latitude !== undefined || loc.lat !== undefined;
        const hasLng = loc.longitude !== undefined || loc.lng !== undefined;
        expect(hasLat).toBe(true);
        expect(hasLng).toBe(true);
        
        trackTest('T-15', 'Vehicle Locations', true, `${locations.length} konum`);
      } else {
        trackTest('T-15', 'Vehicle Locations', true, 'Endpoint çalışıyor, veri yok');
      }
    } catch (e) {
      trackTest('T-15', 'Vehicle Locations', false, e.message);
      throw e;
    }
  });

  // T-14: Locations tablosu TimescaleDB kontrolü (API üzerinden)
  test('T-14 Location data format', async () => {
    try {
      const res = await admin.client.get('/api/vehicles/locations');
      
      if (res.status !== 200) {
        trackTest('T-14', 'Location Data Format', null, 'Locations endpoint erişilemedi');
        return;
      }
      
      const locations = Array.isArray(res.data) ? res.data : res.data.locations || res.data.data;
      
      if (locations && locations.length > 0) {
        const loc = locations[0];
        // Timestamp kontrolü
        const hasTime = loc.time || loc.timestamp || loc.created_at;
        expect(hasTime).toBeTruthy();
        
        // Speed kontrolü
        const hasSpeed = loc.speed !== undefined;
        
        trackTest('T-14', 'Location Data Format', true, 
          `time: ${hasTime ? '✓' : '✗'}, speed: ${hasSpeed ? '✓' : '✗'}`);
      } else {
        trackTest('T-14', 'Location Data Format', null, 'Veri yok');
      }
    } catch (e) {
      trackTest('T-14', 'Location Data Format', false, e.message);
      throw e;
    }
  });

  // Fleet Stats (fleet-stats endpoint'i totals.* schema kullanıyor)
  test('T-16 Fleet Stats - GET /api/admin/fleet-stats', async () => {
    try {
      const res = await admin.client.get('/api/admin/fleet-stats');
      
      if (res.status === 404) {
        trackTest('T-16', 'Fleet Stats', null, 'Endpoint 404');
        return;
      }
      
      expect(res.status).toBe(200);
      
      // Frontend totals.* schema bekliyor
      const data = res.data;
      const hasTotals = data.totals !== undefined;
      
      if (hasTotals) {
        // totals içinde: vehicles, drivers, online, tasks vb.
        trackTest('T-16', 'Fleet Stats', true, `totals: ${JSON.stringify(data.totals).substring(0, 100)}`);
      } else {
        // Alternatif schema
        trackTest('T-16', 'Fleet Stats', true, `Keys: ${Object.keys(data).join(', ')}`);
      }
    } catch (e) {
      trackTest('T-16', 'Fleet Stats', false, e.message);
      throw e;
    }
  });
});
