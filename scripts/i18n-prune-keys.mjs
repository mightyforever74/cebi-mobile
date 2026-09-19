#!/usr/bin/env node
/**
 * Idempotent locale key pruner.
 * Usage: node scripts/i18n-prune-keys.mjs [--dry-run] [--apply]
 *
 * Default: --dry-run (no writes).
 * Delete a key only if ALL three hold:
 *   (a) absent from tr.json
 *   (b) no static t("key") / i18n.t("key") in src JS files
 *   (c) not an allowlisted subkey of scripts/i18n-dynamic-roots.json
 * Otherwise the key is listed as protected (reason: tr'de var / kodda var / manifest altında).
 * Empty parent objects are removed. JSON: 2-space, key order kept, no BOM.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCALE_DIR = path.join(ROOT, "src", "locales");
const SRC_DIR = path.join(ROOT, "src");
const MANIFEST_PATH = path.join(__dirname, "i18n-dynamic-roots.json");
const LANGS = ["tr", "en", "nl", "de", "fr", "es", "it", "bg", "ku"];

const argv = process.argv.slice(2).filter((a) => a !== "--");
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const apply = flags.has("--apply");
const dryRun = !apply;

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
  const used = new Set();
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    staticRe.lastIndex = 0;
    let m;
    while ((m = staticRe.exec(text))) {
      const key = m[2];
      if (!key || key.includes("${")) continue;
      used.add(key);
    }
  }
  return used;
}

function deleteDotted(root, dotted) {
  const parts = dotted.split(".");
  let node = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node?.[parts[i]];
    if (next === null || typeof next !== "object" || Array.isArray(next)) {
      return false;
    }
    node = next;
  }
  const leaf = parts[parts.length - 1];
  if (!node || !Object.prototype.hasOwnProperty.call(node, leaf)) return false;
  delete node[leaf];
  return true;
}

function pruneEmpty(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return false;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      if (pruneEmpty(v)) delete obj[k];
    }
  }
  return Object.keys(obj).length === 0;
}

function underManifest(key, manifest) {
  for (const [root, subkeys] of Object.entries(manifest)) {
    if (key === root) return root;
    if (!key.startsWith(`${root}.`)) continue;
    const rest = key.slice(root.length + 1);
    const first = rest.split(".")[0];
    if (Array.isArray(subkeys) && subkeys.includes(first)) return root;
  }
  return null;
}

function readLocale(lang) {
  const file = path.join(LOCALE_DIR, `${lang}.json`);
  const original = fs.readFileSync(file);
  const hadBom = original[0] === 0xef && original[1] === 0xbb && original[2] === 0xbf;
  const text = hadBom
    ? original.slice(3).toString("utf8")
    : original.toString("utf8");
  const trailingNl = /\r?\n$/.test(text);
  const nl = text.endsWith("\r\n") ? "\r\n" : "\n";
  return { file, data: JSON.parse(text), trailingNl, nl, text };
}

const dicts = {};
const flats = {};
const localeMeta = {};
for (const lang of LANGS) {
  localeMeta[lang] = readLocale(lang);
  dicts[lang] = localeMeta[lang].data;
  flats[lang] = flatten(dicts[lang]);
}

const union = new Set();
for (const lang of LANGS) {
  for (const k of Object.keys(flats[lang])) union.add(k);
}

const trKeys = new Set(Object.keys(flats.tr));
const staticUsed = collectStaticKeys(walkJs(SRC_DIR));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

const candidates = [...union].filter((k) => !trKeys.has(k)).sort();
const protectedList = [];
const toDelete = [];

for (const key of candidates) {
  if (staticUsed.has(key)) {
    protectedList.push({ key, reason: "kodda var" });
    continue;
  }
  const root = underManifest(key, manifest);
  if (root) {
    protectedList.push({ key, reason: `manifest altında (${root})` });
    continue;
  }
  toDelete.push(key);
}

// Keys in tr are never candidates; if something is in tr we do not list it
// as protected (that list would be the whole dictionary). Protected = among
// tr-missing extras that failed (b) or (c).

const beforeCounts = {};
const afterCounts = {};
const deletedPerLang = {};
for (const lang of LANGS) {
  beforeCounts[lang] = Object.keys(flats[lang]).length;
  deletedPerLang[lang] = toDelete.filter((k) => k in flats[lang]);
}

const filesTouched = [];
for (const lang of LANGS) {
  const meta = localeMeta[lang];
  let changed = false;
  for (const key of toDelete) {
    if (deleteDotted(dicts[lang], key)) changed = true;
  }
  if (!changed) {
    afterCounts[lang] = beforeCounts[lang];
    continue;
  }
  pruneEmpty(dicts[lang]);
  const outBody = JSON.stringify(dicts[lang], null, 2);
  const out = meta.trailingNl
    ? outBody + (meta.nl === "\r\n" ? "\r\n" : "\n")
    : outBody;
  afterCounts[lang] = Object.keys(flatten(dicts[lang])).length;
  if (out !== meta.text) {
    filesTouched.push(lang);
    if (!dryRun) {
      fs.writeFileSync(meta.file, out, { encoding: "utf8" });
    }
  }
}

const lines = [];
const push = (s = "") => lines.push(s);
push("TulipFleet i18n prune-keys");
push(apply ? "mode=apply" : "mode=dry-run");
push(
  `union=${union.size}  tr=${trKeys.size}  candidates(tr-missing)=${candidates.length}  delete=${toDelete.length}  protected=${protectedList.length}  files=${filesTouched.length}`
);
push("");
push("lang  before  delete  after");
push("----  ------  ------  -----");
for (const lang of LANGS) {
  push(
    `${lang.padEnd(4)}  ${String(beforeCounts[lang]).padStart(6)}  ${String(deletedPerLang[lang].length).padStart(6)}  ${String(afterCounts[lang]).padStart(5)}`
  );
}
push("");
push(`DELETE (${toDelete.length}):`);
if (toDelete.length) {
  push(["key", ...LANGS.filter((l) => l !== "tr")].join("\t"));
  for (const key of toDelete) {
    const cols = LANGS.filter((l) => l !== "tr").map((l) =>
      key in flats[l] ? l : ""
    );
    push([key, ...cols].join("\t"));
  }
} else {
  push("(none)");
}
push("");
push(`PROTECTED (${protectedList.length}):`);
if (protectedList.length) {
  for (const row of protectedList) push(`  ${row.key}  ${row.reason}`);
} else {
  push("(none)");
}
push("");
if (filesTouched.length === 0) {
  push("0 değişiklik");
} else if (dryRun) {
  push(`would write: ${filesTouched.map((l) => `src/locales/${l}.json`).join(", ")}`);
} else {
  push(`wrote: ${filesTouched.map((l) => `src/locales/${l}.json`).join(", ")}`);
}

process.stdout.write(lines.join("\n") + "\n");
