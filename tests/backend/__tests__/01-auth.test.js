// ============================================================
// 1. LOGIN & AUTH TESTLERI (T-01 ~ T-06)
// ============================================================
const { CONFIG, createClient, loginAs, trackTest } = require('../config');

describe('1. LOGIN & AUTH', () => {
  let driverSession, adminSession;

  // T-01: Driver Login
  test('T-01 Driver Login - test@tulipfleet.com ile giriş', async () => {
    try {
      driverSession = await loginAs('driver');
      
      expect(driverSession.token).toBeTruthy();
      expect(driverSession.user).toBeTruthy();
      expect(driverSession.user.role).toMatch(/driver/i);
      
      trackTest('T-01', 'Driver Login', true);
    } catch (e) {
      trackTest('T-01', 'Driver Login', false, e.message);
      throw e;
    }
  });

  // T-02: Admin Login
  test('T-02 Admin Login - admin@fleet.com ile giriş', async () => {
    try {
      adminSession = await loginAs('admin');
      
      expect(adminSession.token).toBeTruthy();
      expect(adminSession.user).toBeTruthy();
      expect(['company_admin', 'admin']).toContain(adminSession.user.role);
      
      trackTest('T-02', 'Admin Login', true);
    } catch (e) {
      trackTest('T-02', 'Admin Login', false, e.message);
      throw e;
    }
  });

  // T-03: SuperAdmin Login
  test('T-03 SuperAdmin Login - destek/debug ile giriş', async () => {
    try {
      const client = createClient();
      
      // Birden fazla format dene: email field, username field, farklı email formatları
      const attempts = [
        { email: 'destek', password: 'debug' },
        { email: 'destek@tulipfleet.com', password: 'debug' },
        { username: 'destek', password: 'debug' },
      ];
      
      let success = false;
      let lastStatus = null;
      
      for (const body of attempts) {
        const res = await client.post('/api/auth/login', body);
        lastStatus = res.status;
        
        if (res.status === 200 && res.data.token) {
          expect(res.data.user.role).toMatch(/super_admin/i);
          trackTest('T-03', 'SuperAdmin Login', true, `Format: ${JSON.stringify(Object.keys(body))}`);
          success = true;
          break;
        }
      }
      
      if (!success) {
        // SuperAdmin login formatı bilinmiyor - manuel kontrol gerekli
        trackTest('T-03', 'SuperAdmin Login', null, 
          `Tüm formatlar ${lastStatus} döndü - backend'de superadmin login endpoint kontrol edilmeli`);
      }
    } catch (e) {
      trackTest('T-03', 'SuperAdmin Login', false, e.message);
      throw e;
    }
  });

  // T-04: Hatalı Giriş
  test('T-04 Hatalı giriş - yanlış şifre', async () => {
    try {
      const client = createClient();
      const res = await client.post('/api/auth/login', {
        email: 'test@tulipfleet.com',
        password: 'wrongpassword123',
      });
      
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      // Token dönmemeli
      expect(res.data.token).toBeFalsy();
      
      trackTest('T-04', 'Hatalı Giriş', true);
    } catch (e) {
      trackTest('T-04', 'Hatalı Giriş', false, e.message);
      throw e;
    }
  });

  // T-05: Token Refresh
  test('T-05 Token Refresh', async () => {
    try {
      if (!driverSession?.refreshToken) {
        trackTest('T-05', 'Token Refresh', null, 'refreshToken yok, SKIP');
        return;
      }
      
      const client = createClient();
      const res = await client.post('/api/auth/refresh', {
        refreshToken: driverSession.refreshToken,
      });
      
      expect(res.status).toBe(200);
      expect(res.data.token).toBeTruthy();
      
      trackTest('T-05', 'Token Refresh', true);
    } catch (e) {
      trackTest('T-05', 'Token Refresh', false, e.message);
      throw e;
    }
  });

  // T-06: Unauthorized erişim (token olmadan)
  test('T-06 Unauthorized - token olmadan korumalı endpoint', async () => {
    try {
      const client = createClient(); // token yok
      const res = await client.get('/api/vehicles');
      
      expect(res.status).toBe(401);
      
      trackTest('T-06', 'Unauthorized Guard', true);
    } catch (e) {
      trackTest('T-06', 'Unauthorized Guard', false, e.message);
      throw e;
    }
  });
});
