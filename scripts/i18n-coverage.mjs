/**
 * Reports every t("...") key used in src/ that has no Amharic translation.
 *   node scripts/i18n-coverage.mjs          # summary + write missing list
 *   node scripts/i18n-coverage.mjs --list   # print the missing keys
 */
import fs from "fs";
import path from "path";

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });

const flatten = (obj, prefix = "") =>
  Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(acc, flatten(v, key));
    else acc[key] = v;
    return acc;
  }, {});

const am = flatten(JSON.parse(fs.readFileSync("src/locales/amharic.json", "utf8")));

const used = new Set();
const byFile = {};
for (const f of walk("src")) {
  const code = fs.readFileSync(f, "utf8");
  for (const m of code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
    const key = JSON.parse(`"${m[1]}"`);
    used.add(key);
    (byFile[f] ||= new Set()).add(key);
  }
}

const missing = [...used].filter((k) => !am[k]).sort();
const covered = used.size - missing.length;

console.log(`keys used:       ${used.size}`);
console.log(`translated (am): ${covered}`);
console.log(`missing (am):    ${missing.length}`);
console.log(`coverage:        ${((covered / used.size) * 100).toFixed(1)}%`);

if (process.argv.includes("--list")) missing.forEach((k) => console.log(k));

fs.writeFileSync("scripts/i18n-missing.json", JSON.stringify(missing, null, 2));

const filesWithGaps = Object.entries(byFile)
  .map(([f, keys]) => [f, [...keys].filter((k) => !am[k]).length])
  .filter(([, n]) => n > 0)
  .sort((a, b) => b[1] - a[1]);
if (filesWithGaps.length) {
  console.log(`\nfiles with untranslated keys: ${filesWithGaps.length}`);
  filesWithGaps.slice(0, 15).forEach(([f, n]) => console.log(`  ${String(n).padStart(4)} ${f}`));
}

// Guard: a new t("...") with no Amharic entry fails CI rather than silently
// shipping an English string into the Amharic UI.
if (missing.length) process.exit(1);
