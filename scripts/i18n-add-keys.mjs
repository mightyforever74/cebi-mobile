#!/usr/bin/env node
/**
 * Idempotent locale key adder.
 * Usage: node scripts/i18n-add-keys.mjs scripts/i18n-patches/<name>.json [--force] [--dry-run]
 *
 * Patch: { "key.path": { "tr": "...", "en": "...", ... } }
 * Never overwrites an existing value without --force.
 * New keys are appended at the end of the deepest existing parent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOCALE_DIR = path.join(ROOT, "src", "locales");
const LANGS = ["tr", "en", "nl", "de", "fr", "es", "it", "bg", "ku"];

const argv = process.argv.slice(2).filter((a) => a !== "--");
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));
const force = flags.has("--force");
const dryRun = flags.has("--dry-run");
const patchPath = positional[0];

if (!patchPath) {
  console.error(
    "Usage: node scripts/i18n-add-keys.mjs scripts/i18n-patches/<name>.json [--force] [--dry-run]"
  );
  process.exit(1);
}

const absPatch = path.resolve(ROOT, patchPath);
if (!fs.existsSync(absPatch)) {
  console.error(`Patch not found: ${absPatch}`);
  process.exit(1);
}

const patch = JSON.parse(fs.readFileSync(absPatch, "utf8"));
if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
  console.error("Patch must be a JSON object of key.path → { lang: value }");
  process.exit(1);
}

function deepestExistingParent(root, parts) {
  let node = root;
  let depth = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = node[parts[i]];
    if (next !== null && typeof next === "object" && !Array.isArray(next)) {
      node = next;
      depth = i + 1;
    } else {
      break;
    }
  }
  return { node, depth };
}

function ensureParents(root, parts, upTo) {
  let node = root;
  for (let i = 0; i < upTo; i++) {
    const p = parts[i];
    if (node[p] === undefined || typeof node[p] !== "object" || Array.isArray(node[p])) {
      node[p] = {};
    }
    node = node[p];
  }
  return node;
}

function applyKey(root, dotted, value) {
  const parts = dotted.split(".");
  if (parts.some((p) => !p)) {
    return { status: "invalid", reason: "empty path segment" };
  }
  const { node: existingParent, depth } = deepestExistingParent(root, parts);
  let parent = existingParent;
  if (depth < parts.length - 1) {
    parent = ensureParents(root, parts, parts.length - 1);
  }
  const leaf = parts[parts.length - 1];
  if (Object.prototype.hasOwnProperty.call(parent, leaf)) {
    if (parent[leaf] === value) return { status: "identical" };
    if (!force) return { status: "skipped_exists", current: parent[leaf] };
    parent[leaf] = value;
    return { status: "overwritten" };
  }
  parent[leaf] = value;
  return { status: "added" };
}

const counts = {
  added: 0,
  skippedExists: 0,
  identical: 0,
  overwritten: 0,
  skippedLang: 0,
  filesTouched: 0,
};
const details = [];

for (const lang of LANGS) {
  const file = path.join(LOCALE_DIR, `${lang}.json`);
  const original = fs.readFileSync(file);
  const hadBom = original[0] === 0xef && original[1] === 0xbb && original[2] === 0xbf;
  const text = hadBom
    ? original.slice(3).toString("utf8")
    : original.toString("utf8");
  const trailingNl = /\r?\n$/.test(text);
  const nl = text.endsWith("\r\n") ? "\r\n" : "\n";
  const data = JSON.parse(text);
  let fileChanged = false;

  for (const [dotted, byLang] of Object.entries(patch)) {
    if (!byLang || typeof byLang !== "object") continue;
    if (!Object.prototype.hasOwnProperty.call(byLang, lang)) {
      counts.skippedLang += 1;
      details.push({ lang, key: dotted, status: "skipped_lang" });
      continue;
    }
    const value = byLang[lang];
    const result = applyKey(data, dotted, value);
    details.push({ lang, key: dotted, status: result.status });
    if (result.status === "added") {
      counts.added += 1;
      fileChanged = true;
    } else if (result.status === "overwritten") {
      counts.overwritten += 1;
      fileChanged = true;
    } else if (result.status === "skipped_exists") {
      counts.skippedExists += 1;
    } else if (result.status === "identical") {
      counts.identical += 1;
    }
  }

  if (fileChanged) {
    counts.filesTouched += 1;
    let out = JSON.stringify(data, null, 2);
    if (trailingNl && !out.endsWith("\n")) out += nl === "\r\n" ? "\r\n" : "\n";
    if (!dryRun) {
      fs.writeFileSync(file, out, { encoding: "utf8" });
    }
  }
}

console.log(`i18n-add-keys  patch=${path.relative(ROOT, absPatch).replace(/\\/g, "/")}`);
console.log(
  `added=${counts.added}  skipped_exists(not overwritten)=${counts.skippedExists}  identical=${counts.identical}  overwritten=${counts.overwritten}  skipped_lang=${counts.skippedLang}  files=${counts.filesTouched}${dryRun ? "  DRY-RUN" : ""}`
);
if (counts.added === 0 && counts.overwritten === 0) {
  console.log("0 değişiklik");
}

if (process.env.I18N_ADD_KEYS_VERBOSE) {
  for (const d of details) {
    if (d.status !== "skipped_lang") console.log(`  ${d.lang}  ${d.key}  ${d.status}`);
  }
}
