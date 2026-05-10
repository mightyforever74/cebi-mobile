#!/usr/bin/env node
/**
 * TulipFleet — Eksik i18n anahtarlarını ekler.
 *
 * Üç anahtar:
 *   - dashboard.todayKm   (DriverDashboard "İstatistiklerim" kartı)
 *   - dashboard.monthKm   (DriverDashboard "İstatistiklerim" kartı)
 *   - vehicle.noRefuelRecord  (Aracım ekranı yakıt kaydı yok mesajı)
 *
 * Davranış:
 *   - Idempotent: anahtar varsa dokunmaz, sadece eksikleri ekler.
 *   - Mevcut JSON yapısını bozmaz, sıralamayı korur (yeni anahtar namespace sonuna eklenir).
 *   - 2-space indent + LF line ending ile yazar (mevcut dosyalarla uyumlu).
 *   - Hangi anahtarın hangi dile eklendiğini stdout'a basar.
 *
 * Çalıştırma (argon dizini içinde):
 *   node tools/add-missing-i18n-keys.js
 *
 * Sonra:
 *   git diff src/locales/
 *   # gözle kontrol et, sonra:
 *   git add src/locales/ && git commit -m "i18n: add dashboard.todayKm, monthKm, vehicle.noRefuelRecord"
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../src/locales');

// Çeviriler — kısa stat kartı etiketleri için tutarlı stil
const TRANSLATIONS = {
  tr: {
    'dashboard.todayKm':       'Bugün KM',
    'dashboard.monthKm':       'Bu Ay KM',
    'vehicle.noRefuelRecord':  'Yakıt kaydı yok',
  },
  en: {
    'dashboard.todayKm':       'Today KM',
    'dashboard.monthKm':       'Month KM',
    'vehicle.noRefuelRecord':  'No refuel record',
  },
  nl: {
    'dashboard.todayKm':       'Vandaag KM',
    'dashboard.monthKm':       'Maand KM',
    'vehicle.noRefuelRecord':  'Geen tankregistratie',
  },
  de: {
    'dashboard.todayKm':       'Heute KM',
    'dashboard.monthKm':       'Monat KM',
    'vehicle.noRefuelRecord':  'Keine Tankaufzeichnung',
  },
  fr: {
    'dashboard.todayKm':       "Aujourd'hui KM",
    'dashboard.monthKm':       'Mois KM',
    'vehicle.noRefuelRecord':  'Aucun ravitaillement enregistré',
  },
  es: {
    'dashboard.todayKm':       'Hoy KM',
    'dashboard.monthKm':       'Mes KM',
    'vehicle.noRefuelRecord':  'Sin registros de repostaje',
  },
  it: {
    'dashboard.todayKm':       'Oggi KM',
    'dashboard.monthKm':       'Mese KM',
    'vehicle.noRefuelRecord':  'Nessun rifornimento registrato',
  },
  bg: {
    'dashboard.todayKm':       'Днес KM',
    'dashboard.monthKm':       'Месец KM',
    'vehicle.noRefuelRecord':  'Няма запис за зареждане',
  },
  ku: {
    'dashboard.todayKm':       'Îro KM',
    'dashboard.monthKm':       'Meh KM',
    'vehicle.noRefuelRecord':  'Tu tomarkirina sotemeniyê tune',
  },
};

const LANG_LIST = Object.keys(TRANSLATIONS);

function ensureKey(obj, dottedPath, value) {
  const parts = dottedPath.split('.');
  const lastKey = parts.pop();
  let cursor = obj;
  for (const part of parts) {
    if (typeof cursor[part] !== 'object' || cursor[part] === null) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  if (Object.prototype.hasOwnProperty.call(cursor, lastKey)) {
    return false; // zaten var, dokunma
  }
  cursor[lastKey] = value;
  return true;
}

function processLang(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ ${lang}.json bulunamadı — atlanıyor`);
    return { lang, added: [], skipped: [] };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  const added = [];
  const skipped = [];

  for (const [keyPath, value] of Object.entries(TRANSLATIONS[lang])) {
    if (ensureKey(data, keyPath, value)) {
      added.push(`${keyPath} = "${value}"`);
    } else {
      skipped.push(keyPath);
    }
  }

  if (added.length > 0) {
    // 2-space indent + son satırda newline + LF
    const output = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(filePath, output, 'utf8');
  }

  return { lang, added, skipped };
}

function main() {
  console.log(`TulipFleet i18n key updater`);
  console.log(`Locales dir: ${LOCALES_DIR}\n`);

  if (!fs.existsSync(LOCALES_DIR)) {
    console.error(`HATA: ${LOCALES_DIR} bulunamadı.`);
    console.error(`Bu script'i argon proje kökünden çalıştırın (tools/ alt klasöründe).`);
    process.exit(1);
  }

  const results = LANG_LIST.map(processLang);

  console.log('=== Sonuç ===\n');
  let totalAdded = 0;
  for (const { lang, added, skipped } of results) {
    if (added.length === 0 && skipped.length === 0) continue;
    console.log(`[${lang}.json]`);
    if (added.length > 0) {
      console.log(`  + Eklendi (${added.length}):`);
      added.forEach(a => console.log(`      ${a}`));
      totalAdded += added.length;
    }
    if (skipped.length > 0) {
      console.log(`  · Zaten var (${skipped.length}): ${skipped.join(', ')}`);
    }
    console.log('');
  }

  console.log(`Toplam ${totalAdded} anahtar eklendi.`);
  console.log('\nSonraki adım:');
  console.log('  git diff src/locales/');
  console.log('  # kontrol et, sonra:');
  console.log('  git add src/locales/ && git commit -m "i18n: add dashboard.todayKm/monthKm + vehicle.noRefuelRecord"');
}

main();
