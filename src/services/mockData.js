// =============================================================================
// MOCK USERS (2 Kullanıcı - Driver & Admin)
// =============================================================================

export const MOCK_USERS = {
  driver: {
    id: 1,
    email: "driver@tulipfleet.com",
    password: "driver123",
    firstName: "Ahmet",
    lastName: "Yılmaz",
    role: "DRIVER",
    phone: "05551234567",
    vehicleId: 101,
    licenseNumber: "B123456789",
    token: "mock_driver_token_xyz",
    profileImage: null,
  },
  admin: {
    id: 2,
    email: "admin@tulipfleet.com",
    password: "admin123",
    firstName: "Ayşe",
    lastName: "Demir",
    role: "ADMIN",
    phone: "05559876543",
    department: "Fleet Management",
    token: "mock_admin_token_abc",
    profileImage: null,
  },
};

// =============================================================================
// MOCK DRIVER DATA
// =============================================================================

export const MOCK_DRIVER_DATA = {
  activeTasks: [
    {
      id: 1,
      title: "İstanbul → Ankara Teslimat",
      description: "Elektronik malzeme teslimatı",
      status: "IN_PROGRESS",
      priority: "high",
      scheduledStart: "2024-11-09T08:00:00Z",
      scheduledEnd: "2024-11-09T16:00:00Z",
      origin: {
        address: "Maslak, İstanbul",
        lat: 41.1073,
        lon: 29.0198,
      },
      destination: {
        address: "Çankaya, Ankara",
        lat: 39.9185,
        lon: 32.8544,
      },
      plannedDistance: 450,
      actualDistance: 275,
      completionPercentage: 61,
    },
    {
      id: 2,
      title: "Ankara → İzmir Sevkiyat",
      description: "Yedek parça sevkiyatı",
      status: "PENDING",
      priority: "normal",
      scheduledStart: "2024-11-10T06:00:00Z",
      scheduledEnd: "2024-11-10T15:00:00Z",
      origin: {
        address: "Çankaya, Ankara",
        lat: 39.9185,
        lon: 32.8544,
      },
      destination: {
        address: "Konak, İzmir",
        lat: 38.4189,
        lon: 27.1287,
      },
      plannedDistance: 585,
      actualDistance: 0,
      completionPercentage: 0,
    },
  ],

  completedTasks: [
    {
      id: 3,
      title: "Bursa → İstanbul",
      status: "COMPLETED",
      completedAt: "2024-11-08T14:30:00Z",
      distance: 150,
      duration: 180,
    },
  ],

  vehicle: {
    id: 101,
    plate: "34 ABC 123",
    model: "Ford Transit",
    year: 2022,
    fuelLevel: 75,
    fuelCapacity: 80,
    odometer: 45780,
    status: "ACTIVE",
    lastMaintenance: "2024-10-15",
    nextMaintenance: "2024-12-15",
    esp32Status: {
      connected: true,
      lastUpdate: "2024-11-09T12:45:00Z",
      batteryLevel: 98,
      signalStrength: -56,
    },
  },

  stats: {
    totalDistance: 12450,
    totalTasks: 47,
    completedTasks: 45,
    averageScore: 92,
    fuelEfficiency: 12.5,
  },

  recentAlerts: [
    {
      id: 1,
      type: "SPEED",
      message: "Hız limiti aşıldı (125 km/h)",
      timestamp: "2024-11-09T10:30:00Z",
      severity: "warning",
      read: false,
    },
    {
      id: 2,
      type: "FUEL",
      message: "Yakıt seviyesi düşük (%25)",
      timestamp: "2024-11-08T16:15:00Z",
      severity: "info",
      read: true,
    },
  ],
};

// =============================================================================
// MOCK ADMIN DATA
// =============================================================================

export const MOCK_ADMIN_DATA = {
  fleetStats: {
    totalVehicles: 3,
    activeVehicles: 2,
    inactiveVehicles: 1,
    totalDrivers: 5,
    activeDrivers: 3,
    availableDrivers: 2,
    activeTasks: 4,
    completedTasksToday: 8,
    pendingTasks: 3,
  },

  vehicles: [
    {
      id: 101,
      plate: "34 ABC 123",
      model: "Ford Transit",
      status: "ACTIVE",
      driver: "Ahmet Yılmaz",
      location: { lat: 40.1885, lon: 29.061 },
      fuelLevel: 75,
      lastUpdate: "2024-11-09T12:45:00Z",
    },
    {
      id: 102,
      plate: "35 DEF 456",
      model: "Mercedes Sprinter",
      status: "MAINTENANCE",
      driver: null,
      location: { lat: 41.0082, lon: 28.9784 },
      fuelLevel: 45,
      lastUpdate: "2024-11-08T18:20:00Z",
    },
    {
      id: 103,
      plate: "06 GHI 789",
      model: "Volkswagen Crafter",
      status: "ACTIVE",
      driver: "Mehmet Kaya",
      location: { lat: 39.9334, lon: 32.8597 },
      fuelLevel: 88,
      lastUpdate: "2024-11-09T12:48:00Z",
    },
  ],

  drivers: [
    {
      id: 1,
      name: "Ahmet Yılmaz",
      phone: "05551234567",
      status: "ACTIVE",
      vehicleId: 101,
      currentTask: "İstanbul → Ankara",
      score: 92,
      totalTasks: 47,
    },
    {
      id: 2,
      name: "Mehmet Kaya",
      phone: "05559998877",
      status: "ACTIVE",
      vehicleId: 103,
      currentTask: "Ankara → Konya",
      score: 88,
      totalTasks: 38,
    },
    {
      id: 3,
      name: "Ali Demir",
      phone: "05557776655",
      status: "AVAILABLE",
      vehicleId: null,
      currentTask: null,
      score: 95,
      totalTasks: 52,
    },
    {
      id: 4,
      name: "Fatma Şahin",
      phone: "05554443322",
      status: "AVAILABLE",
      vehicleId: null,
      currentTask: null,
      score: 90,
      totalTasks: 41,
    },
    {
      id: 5,
      name: "Zeynep Özkan",
      phone: "05553332211",
      status: "OFF_DUTY",
      vehicleId: null,
      currentTask: null,
      score: 87,
      totalTasks: 29,
    },
  ],

  recentActivities: [
    {
      id: 1,
      type: "TASK_COMPLETED",
      message: "Mehmet Kaya - Ankara teslimatı tamamlandı",
      timestamp: "2024-11-09T12:30:00Z",
    },
    {
      id: 2,
      type: "ALERT",
      message: "Ahmet Yılmaz - Hız limiti aşımı",
      timestamp: "2024-11-09T10:30:00Z",
    },
    {
      id: 3,
      type: "MAINTENANCE",
      message: "35 DEF 456 - Bakıma alındı",
      timestamp: "2024-11-08T14:00:00Z",
    },
  ],

  alerts: [
    {
      id: 1,
      vehicleId: 101,
      type: "SPEED",
      severity: "warning",
      message: "Hız limiti aşıldı",
      timestamp: "2024-11-09T10:30:00Z",
      acknowledged: false,
    },
    {
      id: 2,
      vehicleId: 102,
      type: "MAINTENANCE",
      severity: "high",
      message: "Periyodik bakım zamanı",
      timestamp: "2024-11-08T09:00:00Z",
      acknowledged: true,
    },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Mock login fonksiyonu - email/password kontrolü yapar
 */
export const mockLogin = async (email, password) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Driver check
      if (
        email === MOCK_USERS.driver.email &&
        password === MOCK_USERS.driver.password
      ) {
        resolve({
          success: true,
          user: MOCK_USERS.driver,
          token: MOCK_USERS.driver.token,
        });
        return;
      }

      // Admin check
      if (
        email === MOCK_USERS.admin.email &&
        password === MOCK_USERS.admin.password
      ) {
        resolve({
          success: true,
          user: MOCK_USERS.admin,
          token: MOCK_USERS.admin.token,
        });
        return;
      }

      // Hatalı giriş
      reject({
        success: false,
        error: "Email veya şifre hatalı",
      });
    }, 1000); // 1 saniye gecikme (gerçekçi olması için)
  });
};

/**
 * Role'e göre veri döndür
 */
export const getMockDataByRole = (role) => {
  if (role === "DRIVER") {
    return MOCK_DRIVER_DATA;
  } else if (role === "ADMIN") {
    return MOCK_ADMIN_DATA;
  }
  return null;
};

/**
 * Mock register fonksiyonu
 */
export const mockRegister = async (userData) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: "Kayıt başarılı! Yönetici onayı bekleniyor.",
        user: {
          ...userData,
          id: Math.floor(Math.random() * 1000),
          role: "DRIVER", // Yeni kayıtlar default driver
          token: `mock_token_${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    }, 1500);
  });
};
