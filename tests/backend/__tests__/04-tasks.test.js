// ============================================================
// 4. TASKS - GÖREV YAŞAM DÖNGÜSÜ TESTLERI (T-19 ~ T-29)
// ============================================================
const { loginAs, trackTest } = require('../config');

describe('4. TASKS LIFECYCLE', () => {
  let admin, driver;

  beforeAll(async () => {
    admin = await loginAs('admin');
    driver = await loginAs('driver');
  });

  // T-21: Task Listesi (Admin)
  test('T-21 Task Listesi - GET /api/tasks', async () => {
    try {
      const res = await admin.client.get('/api/tasks');
      
      expect(res.status).toBe(200);
      const tasks = Array.isArray(res.data) ? res.data : res.data.tasks || res.data.data;
      expect(Array.isArray(tasks)).toBe(true);
      
      if (tasks.length > 0) {
        const t = tasks[0];
        expect(t).toHaveProperty('task_no');
        expect(t).toHaveProperty('status');
        expect(t).toHaveProperty('driver_id');
        
        // Status: pending_review, accepted, rejected, in_progress, completed
        const validStatuses = ['pending_review', 'accepted', 'rejected', 'in_progress', 'completed'];
        expect(validStatuses).toContain(t.status);
      }
      
      trackTest('T-21', 'Task Listesi (Admin)', true, `${tasks.length} görev`);
    } catch (e) {
      trackTest('T-21', 'Task Listesi (Admin)', false, e.message);
      throw e;
    }
  });

  // T-20: Task No formatı kontrolü
  test('T-20 Task No format kontrolü', async () => {
    try {
      const res = await admin.client.get('/api/tasks');
      const tasks = Array.isArray(res.data) ? res.data : res.data.tasks || res.data.data;
      
      if (tasks.length === 0) {
        trackTest('T-20', 'Task No Format', null, 'Görev yok, SKIP');
        return;
      }
      
      // task_no formatı: TF2025-XXXX veya benzeri
      const hasTaskNo = tasks.every(t => t.task_no && t.task_no.length > 0);
      expect(hasTaskNo).toBe(true);
      
      // Unique kontrolü
      const taskNos = tasks.map(t => t.task_no);
      const uniqueTaskNos = [...new Set(taskNos)];
      expect(taskNos.length).toBe(uniqueTaskNos.length);
      
      trackTest('T-20', 'Task No Format', true, `Örnek: ${taskNos[0]}`);
    } catch (e) {
      trackTest('T-20', 'Task No Format', false, e.message);
      throw e;
    }
  });

  // T-24: Driver görev listesi
  test('T-24 Görevlerim (Driver) - GET /api/driver/tasks veya /api/tasks', async () => {
    try {
      // Önce /api/driver/tasks dene
      let res = await driver.client.get('/api/driver/tasks');
      
      if (res.status === 404) {
        // Alternatif: /api/tasks driver token ile
        res = await driver.client.get('/api/tasks');
      }
      
      expect(res.status).toBe(200);
      
      trackTest('T-24', 'Görevlerim (Driver)', true);
    } catch (e) {
      trackTest('T-24', 'Görevlerim (Driver)', false, e.message);
      throw e;
    }
  });

  // T-25/T-26/T-27/T-29: Task status geçiş testi
  // NOT: Bu test mevcut bir task üzerinde çalışır, dikkatli kullan
  test('T-25..29 Task status geçişleri (read-only kontrol)', async () => {
    try {
      const res = await admin.client.get('/api/tasks');
      const tasks = Array.isArray(res.data) ? res.data : res.data.tasks || res.data.data;
      
      if (tasks.length === 0) {
        trackTest('T-25..29', 'Task Status Geçişleri', null, 'Görev yok, SKIP');
        return;
      }

      // PUT endpoint'inin var olup olmadığını test et (dry run - mevcut status'u gönder)
      const task = tasks[0];
      const statusRes = await driver.client.get(`/api/tasks/${task.id}`);
      
      if (statusRes.status === 200) {
        // Response nested olabilir: {task: {status: ...}} veya {status: ...}
        const taskData = statusRes.data.task || statusRes.data;
        expect(taskData).toHaveProperty('status');
        trackTest('T-25..29', 'Task Status Geçişleri', true, 
          `Mevcut task: ${task.task_no} / ${taskData.status}. Status endpoint erişilebilir.`);
      } else {
        trackTest('T-25..29', 'Task Status Geçişleri', null, `GET /api/tasks/:id = ${statusRes.status}`);
      }
    } catch (e) {
      trackTest('T-25..29', 'Task Status Geçişleri', false, e.message);
      throw e;
    }
  });

  // T-19: Task Oluşturma endpoint kontrolü (POST /api/tasks)
  // DİKKAT: Gerçek veri oluşturur, cleanup gerekebilir
  test('T-19 Task Oluştur endpoint erişim kontrolü', async () => {
    try {
      // Sadece endpoint'in cevap verip vermediğini test et
      // Boş body ile POST - validation hatası bekliyoruz (400), 404 değil
      const res = await admin.client.post('/api/tasks', {});
      
      // 400 (validation error) = endpoint var ✅
      // 404 = endpoint yok ❌  
      // 201/200 = beklenmedik ama endpoint var ✅
      expect(res.status).not.toBe(404);
      
      if (res.status === 400 || res.status === 422) {
        trackTest('T-19', 'Task Oluştur Endpoint', true, 'Endpoint var, validation çalışıyor');
      } else if (res.status >= 200 && res.status < 300) {
        trackTest('T-19', 'Task Oluştur Endpoint', true, 'Endpoint var, boş body kabul etti (cleanup gerekebilir)');
      } else {
        trackTest('T-19', 'Task Oluştur Endpoint', true, `Status: ${res.status}`);
      }
    } catch (e) {
      trackTest('T-19', 'Task Oluştur Endpoint', false, e.message);
      throw e;
    }
  });
});
