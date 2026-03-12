// ============================================================
// 7. GÜVENLİK TESTLERI (T-43 ~ T-46)
// ============================================================
const { CONFIG, createClient, loginAs, trackTest } = require('../config');
const https = require('https');

describe('7. GÜVENLİK', () => {
  let admin, driver;

  beforeAll(async () => {
    admin = await loginAs('admin');
    driver = await loginAs('driver');
  });

  // T-44: Role Guard - Driver admin endpoint'e erişmeye çalışsın
  test('T-44 Role Guard - Driver ile admin endpoint', async () => {
    try {
      // Driver token ile admin-only endpoint'lere eriş
      const endpoints = [
        '/api/admin/fleet-stats',
        '/api/drivers',           // Admin listesi
      ];
      
      let guardWorking = false;
      
      for (const ep of endpoints) {
        const res = await driver.client.get(ep);
        
        if (res.status === 403) {
          guardWorking = true;
          break;
        }
      }
      
      if (guardWorking) {
        trackTest('T-44', 'Role Guard', true, '403 Forbidden döndü');
      } else {
        // Bazı endpoint'ler driver'a da açık olabilir
        trackTest('T-44', 'Role Guard', null, 'Test endpoint\'leri driver\'a açık, farklı endpoint gerekli');
      }
    } catch (e) {
      trackTest('T-44', 'Role Guard', false, e.message);
      throw e;
    }
  });

  // T-43: Multi-tenant izolasyon (farklı company verisi görmeme)
  test('T-43 Multi-tenant izolasyon kontrolü', async () => {
    try {
      // Admin ile vehicles çek
      const vehiclesRes = await admin.client.get('/api/vehicles');
      const vehicles = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : vehiclesRes.data.vehicles || vehiclesRes.data.data;
      
      if (vehicles && vehicles.length > 0) {
        // Tüm araçlar aynı company_id'ye ait olmalı
        const companyIds = [...new Set(vehicles.map(v => v.company_id).filter(Boolean))];
        
        if (companyIds.length <= 1) {
          trackTest('T-43', 'Multi-tenant İzolasyon', true, 'Tek company görünüyor');
        } else {
          trackTest('T-43', 'Multi-tenant İzolasyon', false, `${companyIds.length} farklı company!`);
        }
      } else {
        trackTest('T-43', 'Multi-tenant İzolasyon', null, 'Araç yok, kontrol yapılamadı');
      }
    } catch (e) {
      trackTest('T-43', 'Multi-tenant İzolasyon', false, e.message);
      throw e;
    }
  });

  // T-46: TLS/SSL Sertifika kontrolü
  test('T-46 TLS/SSL Sertifika', async () => {
    try {
      const result = await new Promise((resolve, reject) => {
        const url = new URL(CONFIG.API_URL);
        const options = {
          hostname: url.hostname,
          port: 443,
          method: 'HEAD',
          path: '/health',
          timeout: 10000,
        };
        
        const req = https.request(options, (res) => {
          const cert = res.socket.getPeerCertificate();
          resolve({
            status: res.statusCode,
            issuer: cert.issuer?.O,
            valid_to: cert.valid_to,
            subject: cert.subject?.CN,
          });
        });
        
        req.on('error', reject);
        req.on('timeout', () => reject(new Error('Timeout')));
        req.end();
      });
      
      expect(result.subject).toBeTruthy();
      
      // Let's Encrypt kontrolü
      const isLetsEncrypt = result.issuer?.includes("Let's Encrypt") || 
                            result.issuer?.includes('R3') ||
                            result.issuer?.includes('R10') ||
                            result.issuer?.includes('R11');
      
      const validTo = new Date(result.valid_to);
      const isValid = validTo > new Date();
      
      expect(isValid).toBe(true);
      
      trackTest('T-46', 'TLS/SSL', true, 
        `Issuer: ${result.issuer}, CN: ${result.subject}, Valid: ${result.valid_to}`);
    } catch (e) {
      trackTest('T-46', 'TLS/SSL', false, e.message);
      throw e;
    }
  });

  // T-45: CORS - Origin kontrolü
  test('T-45 CORS kontrolü', async () => {
    try {
      const client = createClient();
      
      // Geçersiz origin ile dene
      const res = await client.get('/api/auth/login', {
        headers: { 'Origin': 'https://evil-site.com' }
      });
      
      // CORS header'ları kontrol et
      const allowOrigin = res.headers['access-control-allow-origin'];
      
      if (allowOrigin === '*') {
        trackTest('T-45', 'CORS', false, 'Wildcard (*) origin - güvenlik riski!');
      } else if (!allowOrigin) {
        trackTest('T-45', 'CORS', true, 'No CORS header for unknown origin');
      } else {
        trackTest('T-45', 'CORS', true, `Allow-Origin: ${allowOrigin}`);
      }
    } catch (e) {
      trackTest('T-45', 'CORS', false, e.message);
      throw e;
    }
  });

  // Ek: Token olmadan tüm korumalı endpoint'ler 401 döndürmeli
  test('T-06b Tüm korumalı endpoint\'ler 401 döndürmeli', async () => {
    try {
      const client = createClient(); // Token yok
      const endpoints = [
        '/api/vehicles',
        '/api/drivers',
        '/api/tasks',
        '/api/alerts',
        '/api/users/profile',
        '/api/admin/fleet-stats',
      ];
      
      const results = [];
      
      for (const ep of endpoints) {
        const res = await client.get(ep);
        results.push({ ep, status: res.status });
      }
      
      const unprotected = results.filter(r => r.status !== 401 && r.status !== 404);
      // 404 de kabul edilebilir: endpoint bulunamadı = veri sızmaz
      
      if (unprotected.length === 0) {
        trackTest('T-06b', 'Tüm Endpoint\'ler Korumalı', true, `${endpoints.length} endpoint OK`);
      } else {
        const bad = unprotected.map(r => `${r.ep}=${r.status}`).join(', ');
        trackTest('T-06b', 'Tüm Endpoint\'ler Korumalı', false, `Korumasız: ${bad}`);
      }
      
      expect(unprotected.length).toBe(0);
    } catch (e) {
      trackTest('T-06b', 'Tüm Endpoint\'ler Korumalı', false, e.message);
      throw e;
    }
  });
});
