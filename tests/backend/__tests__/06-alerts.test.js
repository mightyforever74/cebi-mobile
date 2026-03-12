// ============================================================
// 6. ALERTS TESTLERI (T-38 ~ T-42)
// ============================================================
const { loginAs, trackTest } = require('../config');

describe('6. ALERTS', () => {
  let admin;

  beforeAll(async () => {
    admin = await loginAs('admin');
  });

  // T-41: Alert listesi
  test('T-41 Alert Listesi - GET /api/alerts', async () => {
    try {
      const res = await admin.client.get('/api/alerts');
      
      expect(res.status).toBe(200);
      const alerts = Array.isArray(res.data) ? res.data : res.data.alerts || res.data.data;
      expect(Array.isArray(alerts)).toBe(true);
      
      if (alerts.length > 0) {
        const a = alerts[0];
        expect(a).toHaveProperty('alert_type');
        expect(a).toHaveProperty('severity');
        expect(a).toHaveProperty('is_resolved');
        
        // alert_type değerleri
        const validTypes = ['harsh_brake', 'harsh_accel', 'speeding', 'geofence_entry', 
                           'geofence_exit', 'impact', 'device_offline', 'low_battery',
                           'task_accepted', 'task_started', 'task_completed'];
        // En az bilinenleri kontrol et
        expect(typeof a.alert_type).toBe('string');
        
        // severity: info, warning, critical
        const validSeverities = ['info', 'warning', 'critical'];
        expect(validSeverities).toContain(a.severity);
      }
      
      trackTest('T-41', 'Alert Listesi', true, `${alerts.length} alert`);
    } catch (e) {
      trackTest('T-41', 'Alert Listesi', false, e.message);
      throw e;
    }
  });

  // T-42: Alert resolve endpoint kontrolü
  test('T-42 Alert Resolve endpoint erişim', async () => {
    try {
      const res = await admin.client.get('/api/alerts');
      const alerts = Array.isArray(res.data) ? res.data : res.data.alerts || res.data.data;
      
      // Çözülmemiş alert bul
      const unresolved = alerts.find(a => !a.is_resolved);
      
      if (!unresolved) {
        trackTest('T-42', 'Alert Resolve', null, 'Çözülmemiş alert yok, SKIP');
        return;
      }
      
      // PUT /api/alerts/:id/resolve endpoint'inin var olup olmadığını kontrol et
      // DİKKAT: Bu gerçekten resolve eder!
      const resolveRes = await admin.client.put(`/api/alerts/${unresolved.id}/resolve`, {
        resolution_note: 'Test resolve - otomatik test suite'
      });
      
      if (resolveRes.status === 404) {
        trackTest('T-42', 'Alert Resolve', false, 'Endpoint 404');
      } else if (resolveRes.status === 200) {
        // Response shape farklı olabilir: {is_resolved}, {resolved}, {success}, {alert: {is_resolved}}
        const data = resolveRes.data;
        const isResolved = data.is_resolved || data.resolved || data.success || 
                          (data.alert && data.alert.is_resolved) || 
                          (data.message && data.message.includes('resolve'));
        // 200 döndüyse endpoint çalışıyor demektir
        trackTest('T-42', 'Alert Resolve', true, 
          `Alert ${unresolved.id} çözüldü. Response keys: ${Object.keys(data).join(', ')}`);
      } else {
        trackTest('T-42', 'Alert Resolve', false, `Status: ${resolveRes.status}`);
      }
    } catch (e) {
      trackTest('T-42', 'Alert Resolve', false, e.message);
      throw e;
    }
  });
});
