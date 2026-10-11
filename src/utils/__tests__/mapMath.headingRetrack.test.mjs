/**
 * src/utils/__tests__/mapMath.headingRetrack.test.mjs
 *
 * Harita Dokümanı v2 §9.7 — "Marker heading rotation iOS/Android
 * farklılıklarına karşı test edilmeli".
 *
 * Kök neden (kod incelemesiyle tespit edildi, 11 Ekim 2026): react-native-maps
 * Android'de custom marker child view'larını bitmap'e snapshot'lar;
 * tracksViewChanges=false iken bu snapshot yenilenmez, CSS transform
 * (rotate) güncellemesi ekrana yansımaz. VehicleMarker.js, heading yeterince
 * değiştiğinde tracksViewChanges'i kısa süreli true'ya çekerek ("pulse")
 * snapshot'ı yeniden tetikler. Bu dosya, o pulse kararını veren SAF mantığı
 * (angleDiff / shouldRetrackForHeadingChange) test eder — React Native
 * render/native davranışı bu testlerin kapsamı dışındadır (cihaz testi
 * Cem'in sorumluluğunda, bu PR'da bilinçli olarak atlandı).
 *
 * Çalıştırma: node --test src/utils/__tests__/mapMath.headingRetrack.test.mjs
 * (repo'da Jest yok; mapMath.js saf ESM/JS olduğu için düz Node ile çalışır)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  angleDiff,
  HEADING_RETRACK_THRESHOLD_DEG,
  shouldRetrackForHeadingChange,
} from "../mapMath.js";

// ── angleDiff ────────────────────────────────────────────────────────────

test("angleDiff: ayni heading -> 0", () => {
  assert.equal(angleDiff(90, 90), 0);
});

test("angleDiff: normal fark (wraparound yok)", () => {
  assert.equal(angleDiff(10, 30), 20);
  assert.equal(angleDiff(30, 10), -20);
});

test("angleDiff: 360/0 sinirini dogru gecer (359 -> 1 = 2 derece, 358 degil)", () => {
  assert.equal(angleDiff(359, 1), 2);
  assert.equal(angleDiff(1, 359), -2);
});

test("angleDiff: tam ters yon (180 fark) siniri", () => {
  const d = angleDiff(0, 180);
  assert.ok(d === 180 || d === -180);
});

test("angleDiff: negatif/360-ustu girdi normalize edilir", () => {
  assert.equal(angleDiff(-10, 10), 20);
  assert.equal(angleDiff(370, 10), 0);
});

// ── shouldRetrackForHeadingChange ───────────────────────────────────────

test("shouldRetrackForHeadingChange: esigin altinda degisim -> false", () => {
  assert.equal(
    shouldRetrackForHeadingChange(100, 102, HEADING_RETRACK_THRESHOLD_DEG),
    false
  );
});

test("shouldRetrackForHeadingChange: esigin ustunde degisim -> true", () => {
  assert.equal(
    shouldRetrackForHeadingChange(100, 110, HEADING_RETRACK_THRESHOLD_DEG),
    true
  );
});

test("shouldRetrackForHeadingChange: esige tam esit -> true (>=)", () => {
  assert.equal(
    shouldRetrackForHeadingChange(100, 105, HEADING_RETRACK_THRESHOLD_DEG),
    true
  );
});

test("shouldRetrackForHeadingChange: 360/0 siniri uzerinden kucuk donus esigin altinda kalir", () => {
  assert.equal(shouldRetrackForHeadingChange(359, 2, 5), false);
});

test("shouldRetrackForHeadingChange: lastSnapshotHeading null/undefined ise guvenli taraf true", () => {
  assert.equal(shouldRetrackForHeadingChange(null, 50), true);
  assert.equal(shouldRetrackForHeadingChange(undefined, 50), true);
});

test("shouldRetrackForHeadingChange: newHeading null/undefined/NaN ise false (pulse tetiklenmez)", () => {
  assert.equal(shouldRetrackForHeadingChange(50, null), false);
  assert.equal(shouldRetrackForHeadingChange(50, undefined), false);
  assert.equal(shouldRetrackForHeadingChange(50, NaN), false);
});

test("shouldRetrackForHeadingChange: ozel esik parametresi kullanilabilir", () => {
  assert.equal(shouldRetrackForHeadingChange(0, 1, 2), false);
  assert.equal(shouldRetrackForHeadingChange(0, 3, 2), true);
});
