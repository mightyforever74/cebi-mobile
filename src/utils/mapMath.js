/**
 * TulipFleet - Map Mathematics Utilities
 * Paket A: Pro Marker System
 * 
 * Bu dosya harita hesaplamaları için temel fonksiyonları içerir:
 * - Type normalization (A.1)
 * - Smoothing logic (A.2)
 * - Bearing/heading calculations (A.2)
 * - Distance calculations (A.4)
 */

// ============================================================================
// A.1 - TYPE NORMALIZATION
// ============================================================================

/**
 * String veya number'ı float'a çevirir
 * @param {string|number} value - Dönüştürülecek değer
 * @param {number} fallback - Hata durumunda döndürülecek değer
 * @returns {number} Float değer
 */
export const toFloat = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Heading değerini 0-360 aralığına clamp eder
 * @param {number} heading - Ham heading değeri
 * @returns {number} 0-360 aralığında heading
 */
export const clampHeading = (heading) => {
  if (heading === null || heading === undefined || isNaN(heading)) return 0;
  let h = heading % 360;
  if (h < 0) h += 360;
  return h;
};

/**
 * ISO8601 timestamp'i Date objesine çevirir
 * @param {string} timestamp - ISO8601 formatında timestamp
 * @returns {Date|null} Date objesi veya null
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
};

/**
 * Backend vehicle verisini normalize eder
 * @param {Object} vehicle - Backend'den gelen ham veri
 * @returns {Object} Normalize edilmiş veri
 */
export const normalizeVehicle = (vehicle) => {
  if (!vehicle) return null;
  
  return {
    ...vehicle,
    latitude: toFloat(vehicle.latitude),
    longitude: toFloat(vehicle.longitude),
    speed: toFloat(vehicle.speed, 0),
    heading: clampHeading(toFloat(vehicle.heading, null)),
    lastLocationTime: parseTimestamp(vehicle.last_location_time),
    // Original values for reference
    _raw: {
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      heading: vehicle.heading,
      last_location_time: vehicle.last_location_time,
    }
  };
};

// ============================================================================
// A.2 - DISTANCE & BEARING CALCULATIONS
// ============================================================================

/**
 * İki nokta arasındaki mesafeyi metre cinsinden hesaplar (Haversine)
 * @param {number} lat1 - Başlangıç enlemi
 * @param {number} lon1 - Başlangıç boylamı
 * @param {number} lat2 - Bitiş enlemi
 * @param {number} lon2 - Bitiş boylamı
 * @returns {number} Mesafe (metre)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * İki nokta arasındaki bearing (yön) açısını hesaplar
 * @param {number} lat1 - Başlangıç enlemi
 * @param {number} lon1 - Başlangıç boylamı
 * @param {number} lat2 - Bitiş enlemi
 * @param {number} lon2 - Bitiş boylamı
 * @returns {number} Bearing açısı (0-360)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return ((θ * 180) / Math.PI + 360) % 360;
};

// ============================================================================
// A.2 - SMOOTHING LOGIC
// ============================================================================

// Smoothing thresholds
export const SMOOTHING_CONFIG = {
  MAX_DISTANCE_FOR_SMOOTH: 30,    // metre - bunun üstünde teleport
  MAX_TIME_DELTA_FOR_SMOOTH: 1000, // ms - bunun üstünde smooth yok
  TELEPORT_THRESHOLD: 50,          // metre - ani teleport mesafesi
  MIN_DISTANCE_FOR_BEARING: 4,     // metre - bearing hesabı için min hareket
  LERP_FACTOR: 0.15,               // smooth hareket faktörü (0-1)
};

/**
 * Smoothing uygulanmalı mı kontrol eder
 * @param {number} distance - Mevcut ve hedef arasındaki mesafe (metre)
 * @param {number} timeDelta - Zaman farkı (ms)
 * @returns {boolean} Smoothing uygulanmalı mı
 */
export const shouldSmooth = (distance, timeDelta) => {
  // Teleport threshold üstünde → smooth yok
  if (distance > SMOOTHING_CONFIG.TELEPORT_THRESHOLD) {
    return false;
  }
  
  // Normal smooth aralığında mı?
  return (
    distance <= SMOOTHING_CONFIG.MAX_DISTANCE_FOR_SMOOTH &&
    timeDelta <= SMOOTHING_CONFIG.MAX_TIME_DELTA_FOR_SMOOTH
  );
};

/**
 * Linear interpolation (lerp)
 * @param {number} start - Başlangıç değeri
 * @param {number} end - Bitiş değeri
 * @param {number} factor - İnterpolasyon faktörü (0-1)
 * @returns {number} İnterpolasyon sonucu
 */
export const lerp = (start, end, factor) => {
  return start + (end - start) * factor;
};

/**
 * Koordinat için lerp uygular
 * @param {Object} current - Mevcut koordinat {latitude, longitude}
 * @param {Object} target - Hedef koordinat {latitude, longitude}
 * @param {number} factor - İnterpolasyon faktörü
 * @returns {Object} Yeni koordinat
 */
export const lerpCoordinate = (current, target, factor = SMOOTHING_CONFIG.LERP_FACTOR) => {
  return {
    latitude: lerp(current.latitude, target.latitude, factor),
    longitude: lerp(current.longitude, target.longitude, factor),
  };
};

/**
 * Heading için shortest path lerp (açısal interpolasyon)
 * @param {number} current - Mevcut heading (0-360)
 * @param {number} target - Hedef heading (0-360)
 * @param {number} factor - İnterpolasyon faktörü
 * @returns {number} Yeni heading
 */
export const lerpHeading = (current, target, factor = SMOOTHING_CONFIG.LERP_FACTOR) => {
  // Shortest path için delta hesapla
  let delta = target - current;
  
  // -180 ile 180 arasına normalize et
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  
  return clampHeading(current + delta * factor);
};

// ============================================================================
// A.4 - PERFORMANCE HELPERS
// ============================================================================

/**
 * Araç güncellemesi gerekli mi kontrol eder
 * @param {Object} prev - Önceki araç verisi
 * @param {Object} next - Yeni araç verisi
 * @param {number} minDistanceChange - Minimum hareket mesafesi (metre)
 * @returns {boolean} Güncelleme gerekli mi
 */
export const shouldUpdateVehicle = (prev, next, minDistanceChange = 1) => {
  // İlk veri
  if (!prev) return true;
  
  // Timestamp değişmişse
  if (prev.last_location_time !== next.last_location_time) {
    return true;
  }
  
  // Konum değişikliği kontrolü
  const distance = calculateDistance(
    toFloat(prev.latitude),
    toFloat(prev.longitude),
    toFloat(next.latitude),
    toFloat(next.longitude)
  );
  
  return distance >= minDistanceChange;
};

/**
 * Araç listesini filtreler - sadece değişenler
 * @param {Array} prevVehicles - Önceki araç listesi
 * @param {Array} nextVehicles - Yeni araç listesi
 * @returns {Object} { updated: [...], unchanged: [...] }
 */
export const filterUpdatedVehicles = (prevVehicles, nextVehicles) => {
  const prevMap = new Map(prevVehicles.map(v => [v.id, v]));
  
  const updated = [];
  const unchanged = [];
  
  nextVehicles.forEach(vehicle => {
    const prev = prevMap.get(vehicle.id);
    if (shouldUpdateVehicle(prev, vehicle)) {
      updated.push(vehicle);
    } else {
      unchanged.push(vehicle);
    }
  });
  
  return { updated, unchanged };
};

// ============================================================================
// A.3 - FOLLOW MODE HELPERS
// ============================================================================

/**
 * Follow mode için kamera ayarları
 */
export const FOLLOW_CONFIG = {
  ZOOM_LEVEL: 16,           // Follow mode zoom seviyesi
  ANIMATION_DURATION: 500,   // Kamera animasyon süresi (ms)
  HEADING_ENABLED: true,     // Kamera aracın yönüne dönsün mü
};

/**
 * Follow mode kamera region'ı oluşturur
 * @param {Object} vehicle - Takip edilecek araç
 * @returns {Object} MapView region objesi
 */
export const createFollowRegion = (vehicle) => {
  if (!vehicle) return null;
  
  const lat = toFloat(vehicle.latitude);
  const lng = toFloat(vehicle.longitude);
  
  // Zoom level → delta dönüşümü (yaklaşık)
  const delta = 360 / Math.pow(2, FOLLOW_CONFIG.ZOOM_LEVEL);
  
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
};

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

export default {
  // A.1 Type
  toFloat,
  clampHeading,
  parseTimestamp,
  normalizeVehicle,
  
  // A.2 Distance & Bearing
  calculateDistance,
  calculateBearing,
  
  // A.2 Smoothing
  SMOOTHING_CONFIG,
  shouldSmooth,
  lerp,
  lerpCoordinate,
  lerpHeading,
  
  // A.4 Performance
  shouldUpdateVehicle,
  filterUpdatedVehicles,
  
  // A.3 Follow
  FOLLOW_CONFIG,
  createFollowRegion,
};
