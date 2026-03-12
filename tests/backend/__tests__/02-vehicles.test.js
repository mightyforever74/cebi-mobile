// ============================================================
// 2. VEHICLES & DEVICES TESTLERI
// ============================================================
const { loginAs, trackTest } = require('../config');

describe('2. VEHICLES & DEVICES', () => {
  let admin;

  beforeAll(async () => {
    admin = await loginAs('admin');
  });

  // Araç Listesi
  test('T-11a Araç listesi - GET /api/vehicles', async () => {
    try {
      const res = await admin.client.get('/api/vehicles');
      
      expect(res.status).toBe(200);
      
      const vehicles = Array.isArray(res.data) ? res.data : res.data.vehicles || res.data.data;
      expect(Array.isArray(vehicles)).toBe(true);
      
      if (vehicles.length > 0) {
        const v = vehicles[0];
        // Beklenen alanlar: plate_no, esp32_device_id, status
        expect(v).toHaveProperty('plate_no');
        expect(v).toHaveProperty('status');
      }
      
      trackTest('T-11a', 'Araç Listesi', true, `${vehicles.length} araç`);
    } catch (e) {
      trackTest('T-11a', 'Araç Listesi', false, e.message);
      throw e;
    }
  });

  // Device Listesi
  test('T-11b Device listesi - GET /api/devices', async () => {
    try {
      const res = await admin.client.get('/api/devices');
      
      if (res.status === 404) {
        trackTest('T-11b', 'Device Listesi', null, 'Endpoint yok, SKIP');
        return;
      }
      
      expect(res.status).toBe(200);
      const devices = Array.isArray(res.data) ? res.data : res.data.devices || res.data.data;
      
      if (devices && devices.length > 0) {
        const d = devices[0];
        expect(d).toHaveProperty('device_code');
        expect(d).toHaveProperty('status');
      }
      
      trackTest('T-11b', 'Device Listesi', true, `${devices?.length || 0} cihaz`);
    } catch (e) {
      trackTest('T-11b', 'Device Listesi', false, e.message);
      throw e;
    }
  });

  // Driver Vehicle endpoint (driverAPI.getVehicle() -> .vehicle)
  test('T-30 driverAPI.getVehicle() - .vehicle property kontrolü', async () => {
    try {
      const driver = await loginAs('driver');
      
      // Önce driver'ın atanmış aracını bul
      const profileRes = await driver.client.get('/api/users/profile');
      
      if (profileRes.status !== 200) {
        trackTest('T-30', 'Driver Vehicle', null, 'Profile endpoint yok');
        return;
      }
      
      // Driver'a atanmış araç varsa getVehicle dene
      // Endpoint: GET /api/driver/vehicle veya GET /api/driver/vehicle/:id
      const vRes = await driver.client.get('/api/driver/vehicle');
      
      if (vRes.status === 404) {
        // Alternatif endpoint dene
        trackTest('T-30', 'Driver Vehicle', null, 'Endpoint 404, kontrol gerekli');
        return;
      }
      
      if (vRes.status === 200) {
        // Response .vehicle property'sinde olmalı
        if (vRes.data.vehicle) {
          expect(vRes.data.vehicle).toHaveProperty('plate_no');
          trackTest('T-30', 'Driver Vehicle', true, '.vehicle property mevcut');
        } else {
          trackTest('T-30', 'Driver Vehicle', false, '.vehicle property YOK - response shape hatalı');
        }
      }
    } catch (e) {
      trackTest('T-30', 'Driver Vehicle', false, e.message);
      throw e;
    }
  });
});
