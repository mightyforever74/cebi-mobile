// scripts/pr-gen.mjs
import { execSync } from "node:child_process";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const base = process.env.PR_BASE || "main";

const filesRaw = sh(`git diff --name-only ${base}...HEAD`);
const files = filesRaw ? filesRaw.split("\n").filter(Boolean) : [];

const stats = sh(`git diff --stat ${base}...HEAD`);
const diff = sh(`git diff ${base}...HEAD --unified=2`);

const context = {
  base,
  branch: sh("git rev-parse --abbrev-ref HEAD"),
  files,
  stats,
  diff_excerpt: diff.slice(0, 12000),
};

console.log(JSON.stringify(context, null, 2));
