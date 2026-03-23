// src/services/geocoding.js
// ============================================================
// TulipFleet Geocoding Service  v1.0
// Mart 2026
//
// Ortak geocoding client — backend endpoint üzerinden çalışır.
// Google Maps API key mobile'da YOKTUR; tüm istekler backend'e gider.
//
// Kullanım:
//   import { geocodingAPI } from '../services/geocoding';
//
//   const address = await geocodingAPI.reverseGeocode(41.015, 28.979);
//   // → "Sultanahmet, Fatih/İstanbul, Türkiye"
//
//   const results = await geocodingAPI.reverseGeocodeBatch([
//     { lat: 41.015, lng: 28.979 },
//     { lat: 52.370, lng: 4.895 },
//   ]);
//
// Kullanıcılar:
//   - VehicleTrackScreen (idle stop popup adresi)
//   - İleride: DriverRouteMapScreen, FleetMapScreen vb.
// ============================================================

import api from './api';

// ── Client-side in-memory cache ─────────────────────────────
// Backend de cache tutar ama client tarafında da tutuyoruz:
//   - Aynı stop'a tekrar tıklayınca network'e çıkmaz
//   - Offline durumda son bilinen adresi gösterir
const clientCache = new Map();
const CLIENT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika

function getCacheKey(lat, lng) {
  return `${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}`;
}

function getClientCached(lat, lng) {
  const key = getCacheKey(lat, lng);
  const entry = clientCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CLIENT_CACHE_TTL_MS) {
    clientCache.delete(key);
    return null;
  }
  return entry.address;
}

function setClientCache(lat, lng, address) {
  if (!address) return;
  const key = getCacheKey(lat, lng);
  // Max 200 entry — basit eviction
  if (clientCache.size >= 200) {
    const firstKey = clientCache.keys().next().value;
    if (firstKey) clientCache.delete(firstKey);
  }
  clientCache.set(key, { address, ts: Date.now() });
}

// ── API methods ─────────────────────────────────────────────

export const geocodingAPI = {
  /**
   * Senkron cache kontrolü — loading flicker önlemek için.
   * Cache'de varsa adres döner, yoksa null.
   * Async çağrı yapmaz, network'e çıkmaz.
   * @param {number} lat
   * @param {number} lng
   * @returns {string|null}
   */
  peekCache: (lat, lng) => {
    return getClientCached(lat, lng);
  },

  /**
   * Tek koordinat için reverse geocode
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<string|null>} Adres string veya null
   */
  reverseGeocode: async (lat, lng) => {
    // Client cache check
    const cached = getClientCached(lat, lng);
    if (cached) return cached;

    try {
      const response = await api.get('/api/geocode/reverse', {
        params: { lat, lng },
      });

      const address = response.data?.address || null;
      setClientCache(lat, lng, address);
      return address;
    } catch (err) {
      console.warn('[Geocoding] reverseGeocode failed:', err?.message);
      return null;
    }
  },

  /**
   * Birden fazla koordinat için toplu reverse geocode (max 10)
   * @param {Array<{lat: number, lng: number}>} points
   * @returns {Promise<Array<{lat, lng, address}>>}
   */
  reverseGeocodeBatch: async (points) => {
    if (!points || points.length === 0) return [];

    // Önce client cache'den çözebildiklerini ayır
    const needsApi = [];
    const results = new Map();

    for (const p of points) {
      const cached = getClientCached(p.lat, p.lng);
      if (cached) {
        results.set(getCacheKey(p.lat, p.lng), { ...p, address: cached });
      } else {
        needsApi.push(p);
      }
    }

    // Tümü cache'de ise API'ye gitme
    if (needsApi.length === 0) {
      return points.map((p) => results.get(getCacheKey(p.lat, p.lng)));
    }

    try {
      const response = await api.post('/api/geocode/reverse/batch', {
        points: needsApi,
      });

      const apiResults = response.data?.results || [];
      for (const r of apiResults) {
        if (r.address) {
          setClientCache(r.lat, r.lng, r.address);
        }
        results.set(getCacheKey(r.lat, r.lng), r);
      }
    } catch (err) {
      console.warn('[Geocoding] reverseGeocodeBatch failed:', err?.message);
      // Cache'de olanları döndür, olmayanlar null
      for (const p of needsApi) {
        const key = getCacheKey(p.lat, p.lng);
        if (!results.has(key)) {
          results.set(key, { ...p, address: null });
        }
      }
    }

    // Orijinal sırayı koru
    return points.map(
      (p) => results.get(getCacheKey(p.lat, p.lng)) || { ...p, address: null }
    );
  },

  /**
   * Client cache'i temizle (debug/test için)
   */
  clearCache: () => {
    clientCache.clear();
  },
};

export default geocodingAPI;
