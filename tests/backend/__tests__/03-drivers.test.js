// ============================================================
// 3. DRIVERS TESTLERI
// ============================================================
const { loginAs, trackTest } = require('../config');

describe('3. DRIVERS', () => {
  let admin;

  beforeAll(async () => {
    admin = await loginAs('admin');
  });

  test('T-15a Sürücü listesi - GET /api/drivers', async () => {
    try {
      const res = await admin.client.get('/api/drivers');
      
      expect(res.status).toBe(200);
      const drivers = Array.isArray(res.data) ? res.data : res.data.drivers || res.data.data;
      expect(Array.isArray(drivers)).toBe(true);
      
      if (drivers.length > 0) {
        const d = drivers[0];
        expect(d).toHaveProperty('user_id');
        expect(d).toHaveProperty('status');
        // Status değerleri: available, on_task, task_pending, on_leave, offline
        const validStatuses = ['available', 'on_task', 'task_pending', 'on_leave', 'offline'];
        expect(validStatuses).toContain(d.status);
      }
      
      trackTest('T-15a', 'Sürücü Listesi', true, `${drivers.length} sürücü`);
    } catch (e) {
      trackTest('T-15a', 'Sürücü Listesi', false, e.message);
      throw e;
    }
  });

  test('T-15b Driver profil - GET /api/users/profile', async () => {
    try {
      const driver = await loginAs('driver');
      
      // Birden fazla path dene
      const paths = ['/api/users/profile', '/api/user/profile', '/api/auth/me', '/api/driver/profile'];
      let found = false;
      
      for (const path of paths) {
        const res = await driver.client.get(path);
        
        if (res.status === 200) {
          const data = res.data.user || res.data;
          expect(data).toHaveProperty('email');
          trackTest('T-15b', 'Driver Profil', true, `Path: ${path}`);
          found = true;
          break;
        }
      }
      
      if (!found) {
        trackTest('T-15b', 'Driver Profil', false, `Tüm path\'ler 404: ${paths.join(', ')}`);
      }
    } catch (e) {
      trackTest('T-15b', 'Driver Profil', false, e.message);
      throw e;
    }
  });
});
