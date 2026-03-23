// src/services/reportExport.js
// ============================================================
// TulipFleet — Trip Report Export Service
// 23 Mart 2026
//
// Amaç:
// Backend'teki /trips/export endpoint'inden rapor (PDF/CSV)
// indirip cihazın native share sheet'ini açmak.
//
// Özellikler:
// - Authorization header ile secure download
// - Expo FileSystem ile temp dizine kaydetme
// - Expo Sharing ile native paylaşım
// - PDF ve CSV format desteği
//
// Kullanım:
//   import { exportTripReport } from "../../services/reportExport";
//
//   await exportTripReport({
//     vehicleId,
//     plate,
//     from,
//     to,
//     format: "pdf"
//   });
// ============================================================

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { API_BASE_URL } from "../constants/config";
import { getAccessToken } from "../utils/storage";

// ────────────────────────────────────────────────────────────
// Yardımcı Fonksiyonlar
// ────────────────────────────────────────────────────────────

/**
 * Format'a göre MIME type döndürür
 */
const getMimeType = (format) =>
  format === "pdf" ? "application/pdf" : "text/csv";

/**
 * Format'a göre dosya uzantısı döndürür
 */
const getExtension = (format) => (format === "pdf" ? "pdf" : "csv");

/**
 * Plakayı dosya adı için sanitize eder
 * - Özel karakterleri kaldırır
 * - Maks 20 karakter
 */
const sanitizePlate = (value) =>
  String(value || "vehicle")
    .replace(/[^a-zA-Z0-9\-_]/g, "_")
    .substring(0, 20);

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Trip raporunu backend'den indirir ve native share sheet açar.
 *
 * @param {Object} opts
 * @param {string} opts.vehicleId  - Araç UUID
 * @param {string} opts.plate      - Araç plakası (filename için)
 * @param {string} opts.from       - ISO 8601 başlangıç
 * @param {string} opts.to         - ISO 8601 bitiş
 * @param {"pdf"|"csv"} opts.format - Export formatı
 *
 * @returns {Promise<string>} İndirilen dosyanın URI'si
 */
export const exportTripReport = async ({
  vehicleId,
  plate,
  from,
  to,
  format,
}) => {
  // ── Auth Token ────────────────────────────────────────────
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Oturum bilgisi bulunamadı. Lütfen tekrar giriş yapın.");
  }

  // ── Dosya ve URL oluşturma ────────────────────────────────
  const ext = getExtension(format);
  const safePlate = sanitizePlate(plate);
  const fromDate = String(from).slice(0, 10);
  const toDate = String(to).slice(0, 10);

  const url = `${API_BASE_URL}/api/vehicles/${vehicleId}/trips/export?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}&format=${format}`;

  const filename = `trips_${safePlate}_${fromDate}_${toDate}.${ext}`;
  const fileUri = FileSystem.cacheDirectory + filename;

  // ── Dosyayı indir ─────────────────────────────────────────
  const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: getMimeType(format),
    },
  });

  // ── HTTP hata kontrolü ────────────────────────────────────
  if (downloadResult.status !== 200) {
    let errorMessage = `Export başarısız: HTTP ${downloadResult.status}`;

    try {
      const errorText = await FileSystem.readAsStringAsync(downloadResult.uri);
      const errorJson = JSON.parse(errorText);

      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Parse başarısızsa generic mesaj kalır
    }

    throw new Error(errorMessage);
  }

  // ── Paylaşım desteği kontrolü ─────────────────────────────
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Bu cihazda paylaşım desteklenmiyor");
  }

  // ── Native share sheet aç ─────────────────────────────────
  await Sharing.shareAsync(downloadResult.uri, {
    mimeType: getMimeType(format),
    dialogTitle:
      format === "pdf" ? "PDF raporunu paylaş" : "CSV raporunu paylaş",
    UTI:
      format === "pdf" ? "com.adobe.pdf" : "public.comma-separated-values-text",
  });

  return downloadResult.uri;
};
