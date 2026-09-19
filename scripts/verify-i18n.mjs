#!/usr/bin/env node
/**
 * TulipFleet i18n verifier.
 * Usage: node scripts/verify-i18n.mjs [--json] [--strict]
 *
 * Reference = tr.json (fallbackLng). UNION/intersection are reported for info.
 * Extra keys (in a locale but not in tr) are warnings unless --strict.
 * Keys in tr but missing from ku.json are KU_OMITTED warnings (not errors).
 * --strict is opt-in (not the default). It promotes extra_key to errors.
 * Also errors if a static t() key is missing from tr.json (fallbackLng).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCALE_DIR = path.join(ROOT, "src", "locales");
const SRC_DIR = path.join(ROOT, "src");
const LANGS = ["tr", "en", "nl", "de", "fr", "es", "it", "bg", "ku"];
const MANIFEST_PATH = path.join(__dirname, "i18n-dynamic-roots.json");

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const strict = args.has("--strict");

function flatten(obj, prefix = "", out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function getNested(obj, dotted) {
  return dotted.split(".").reduce((acc, k) => {
    if (acc === undefined || acc === null || typeof acc !== "object") {
      return undefined;
    }
    return acc[k];
  }, obj);
}

function paramsOf(value) {
  if (typeof value !== "string") return [];
  const found = [];
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(value))) found.push(m[1]);
  return [...new Set(found)].sort();
}

function walkJs(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "locales") continue;
      walkJs(p, acc);
    } else if (ent.name.endsWith(".js")) {
      acc.push(p);
    }
  }
  return acc;
}

function collectStaticKeys(files) {
  const staticRe = /\b(?:i18n\.)?t\(\s*(['"])([^'"]+)\1/g;
  const used = new Map();
  const defaults = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    staticRe.lastIndex = 0;
    let m;
    while ((m = staticRe.exec(text))) {
      const key = m[2];
      if (!key || key.includes("${")) continue;
      if (!used.has(key)) used.set(key, []);
      const line = text.slice(0, m.index).split(/\n/).length;
      used.get(key).push(`${rel}:${line}`);
      if (!defaults.has(key)) {
        const after = text.slice(m.index + m[0].length);
        const defM = after.match(/^\s*,\s*(['"])([^'"]*)\1/);
        if (defM) defaults.set(key, defM[2]);
      }
    }
  }
  return { used, defaults };
}

function collectDynamicRoots(files) {
  // t(`root.${var}`) or t(`root.${var}.suffix`)
  const dynRe = /\b(?:i18n\.)?t\(\s*`([^`$]+)\.\$\{[^}]+\}[^`]*`/g;
  const roots = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    dynRe.lastIndex = 0;
    let m;
    while ((m = dynRe.exec(text))) {
      const root = m[1];
      if (!roots.has(root)) roots.set(root, []);
      const line = text.slice(0, m.index).split(/\n/).length;
      roots.get(root).push({ file: rel, line, sample: m[0] });
    }
  }
  return roots;
}

function mojibakeHits(flat, lang) {
  const hits = [];
  for (const [key, val] of Object.entries(flat)) {
    if (typeof val !== "string") continue;
    if (val.includes("Ã") || val.includes("Â") || val.includes("â€")) {
      hits.push({ lang, key, preview: val.slice(0, 80) });
    }
  }
  return hits;
}

const dicts = {};
const flats = {};
for (const lang of LANGS) {
  const raw = fs.readFileSync(path.join(LOCALE_DIR, `${lang}.json`), "utf8");
  dicts[lang] = JSON.parse(raw);
  flats[lang] = flatten(dicts[lang]);
}

const union = new Set();
for (const lang of LANGS) {
  for (const k of Object.keys(flats[lang])) union.add(k);
}
const intersection = [...union].filter((k) =>
  LANGS.every((lang) => k in flats[lang])
);
const unionList = [...union].sort();
const trKeySet = new Set(Object.keys(flats.tr));
const trList = [...trKeySet].sort();

const symmetry = {};
for (const lang of LANGS) {
  const keys = Object.keys(flats[lang]);
  const keySet = new Set(keys);
  const missing = trList.filter((k) => !keySet.has(k));
  const extra = keys.filter((k) => !trKeySet.has(k)).sort();
  symmetry[lang] = {
    count: keys.length,
    missingCount: missing.length,
    extraCount: extra.length,
    missing,
    extra,
  };
}

const interp = [];
for (const key of unionList) {
  const byLang = {};
  const signatures = new Set();
  for (const lang of LANGS) {
    if (!(key in flats[lang])) continue;
    const params = paramsOf(flats[lang][key]);
    byLang[lang] = params;
    signatures.add(params.join(","));
  }
  if (signatures.size > 1) {
    interp.push({ key, byLang });
  }
}

const jsFiles = walkJs(SRC_DIR);
const { used: staticUsed, defaults: staticDefaults } = collectStaticKeys(jsFiles);
const codeMissingInUnion = [...staticUsed.keys()]
  .filter((k) => !union.has(k))
  .sort();
const codeMissingInTr = [...staticUsed.keys()]
  .filter((k) => !trKeySet.has(k))
  .sort();

const dynamicRoots = collectDynamicRoots(jsFiles);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const unmanifestedRoots = [...dynamicRoots.keys()]
  .filter((r) => !(r in manifest))
  .sort();

const manifestMissing = [];
for (const [root, subkeys] of Object.entries(manifest)) {
  for (const lang of LANGS) {
    const node = getNested(dicts[lang], root);
    for (const sub of subkeys) {
      const present =
        node !== undefined &&
        node !== null &&
        typeof node === "object" &&
        Object.prototype.hasOwnProperty.call(node, sub);
      if (!present) {
        manifestMissing.push({ root, sub, lang, key: `${root}.${sub}` });
      }
    }
  }
}

const encoding = [];
for (const lang of LANGS) {
  encoding.push(...mojibakeHits(flats[lang], lang));
}

const errors = [];
const warnings = [];

for (const lang of LANGS) {
  for (const k of symmetry[lang].missing) {
    const item = { type: "missing_key", lang, key: k };
    if (lang === "ku") {
      warnings.push({ ...item, type: "omitted_key", hint: "KU_OMITTED" });
    } else {
      errors.push(item);
    }
  }
  for (const k of symmetry[lang].extra) {
    const item = { type: "extra_key", lang, key: k };
    if (strict) errors.push(item);
    else warnings.push(item);
  }
}
for (const row of interp) {
  errors.push({ type: "interp_mismatch", key: row.key, byLang: row.byLang });
}
for (const k of codeMissingInUnion) {
  errors.push({
    type: "code_key_missing",
    key: k,
    usages: staticUsed.get(k).slice(0, 5),
  });
}
for (const k of codeMissingInTr) {
  errors.push({
    type: "code_key_missing_tr",
    key: k,
    usages: staticUsed.get(k).slice(0, 5),
    defaultValue: staticDefaults.get(k) || null,
  });
}
for (const r of unmanifestedRoots) {
  warnings.push({
    type: "unmanifested_root",
    root: r,
    hint: "manifest'e ekle",
    usages: dynamicRoots.get(r).slice(0, 5),
  });
}
for (const row of manifestMissing) {
  errors.push({ type: "manifest_missing", ...row });
}
for (const row of encoding) {
  errors.push({ type: "encoding", lang: row.lang, key: row.key, preview: row.preview });
}

const report = {
  langs: LANGS,
  unionCount: union.size,
  intersectionCount: intersection.length,
  trCount: trKeySet.size,
  reference: "tr",
  symmetry,
  interpMismatchCount: interp.length,
  interp,
  staticUsedCount: staticUsed.size,
  codeMissingInUnionCount: codeMissingInUnion.length,
  codeMissingInUnion,
  codeMissingInTrCount: codeMissingInTr.length,
  codeMissingInTr,
  codeMissingInTrDetail: codeMissingInTr.map((k) => ({
    key: k,
    usages: staticUsed.get(k),
    defaultValue: staticDefaults.get(k) || null,
    inUnion: union.has(k),
  })),
  dynamicRoots: Object.fromEntries(
    [...dynamicRoots.entries()].map(([r, usages]) => [
      r,
      usages.map((u) => `${u.file}:${u.line}`),
    ])
  ),
  unmanifestedRoots,
  manifestMissingCount: manifestMissing.length,
  manifestMissing,
  encodingCount: encoding.length,
  encoding,
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings,
  strict,
};

function printTable() {
  const lines = [];
  const push = (s = "") => lines.push(s);
  push("TulipFleet i18n verify");
  push(
    `reference=tr (${trKeySet.size} keys)  union=${union.size}  intersection=${intersection.length}  strict=${strict}`
  );
  push("");
  push("lang  keys  missing  extra");
  push("----  ----  -------  -----");
  for (const lang of LANGS) {
    const s = symmetry[lang];
    push(
      `${lang.padEnd(4)}  ${String(s.count).padStart(4)}  ${String(s.missingCount).padStart(7)}  ${String(s.extraCount).padStart(5)}`
    );
  }
  push("");
  push(`interp mismatches: ${interp.length}`);
  for (const row of interp) {
    const sig = LANGS.filter((l) => row.byLang[l])
      .map((l) => `${l}=[${row.byLang[l].join(",")}]`)
      .join(" ");
    push(`  ${row.key}  ${sig}`);
  }
  push("");
  push(`code static keys not in union: ${codeMissingInUnion.length}`);
  for (const k of codeMissingInUnion) push(`  ${k}`);
  push("");
  push(`code static keys missing in tr (fallbackLng): ${codeMissingInTr.length}`);
  for (const k of codeMissingInTr) {
    const def = staticDefaults.get(k);
    const extra = def ? `  default=${JSON.stringify(def)}` : union.has(k) ? "  (in union, not tr)" : "";
    push(`  ${k}${extra}`);
  }
  push("");
  push("dynamic roots in code:");
  for (const [root, usages] of [...dynamicRoots.entries()].sort()) {
    const flag = root in manifest ? "ok" : "WARN manifest'e ekle";
    push(`  ${root}  (${usages.length})  ${flag}`);
  }
  push("");
  push(`manifest subkey missing: ${manifestMissing.length}`);
  const grouped = new Map();
  for (const row of manifestMissing) {
    const id = `${row.root}.${row.sub}`;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(row.lang);
  }
  for (const [id, langs] of grouped) push(`  ${id}  [${langs.join(",")}]`);
  push("");
  push(`encoding mojibake: ${encoding.length}`);
  for (const row of encoding) {
    push(`  src/locales/${row.lang}.json  ${row.key}  ${JSON.stringify(row.preview)}`);
  }
  push("");
  for (const lang of LANGS) {
    if (symmetry[lang].missing.length) {
      const kuTag = lang === "ku" ? " KU_OMITTED" : "";
      push(`[${lang}] missing vs tr (${symmetry[lang].missingCount})${kuTag}:`);
      for (const k of symmetry[lang].missing) push(`  - ${k}`);
    }
    if (symmetry[lang].extra.length) {
      push(`[${lang}] extra vs tr (${symmetry[lang].extraCount}):`);
      for (const k of symmetry[lang].extra) push(`  - ${k}`);
    }
  }
  push("");
  push(
    errors.length
      ? `FAIL  errors=${errors.length}  warnings=${warnings.length}`
      : `PASS  errors=0  warnings=${warnings.length}`
  );
  return lines.join("\n");
}

if (asJson) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  process.stdout.write(printTable() + "\n");
}

if (errors.length) process.exitCode = 1;
else process.exitCode = 0;
