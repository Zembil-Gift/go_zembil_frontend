/**
 * Merge a flat {"English": "አማርኛ"} batch file into src/locales/amharic.json.
 *   node scripts/i18n-merge.mjs batch.json
 * Existing entries are never overwritten silently -- conflicts are reported.
 */
import fs from "fs";

const target = "src/locales/amharic.json";
const am = JSON.parse(fs.readFileSync(target, "utf8"));
const batch = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

let added = 0;
const conflicts = [];
for (const [en, translated] of Object.entries(batch)) {
  if (en in am && am[en] !== translated) conflicts.push(en);
  if (!(en in am)) added++;
  am[en] = translated;
}

// Keep the legacy nested sections first, then flat English keys alphabetically.
const nested = {};
const flat = {};
for (const [k, v] of Object.entries(am)) {
  (v && typeof v === "object" ? nested : flat)[k] = v;
}
const sorted = { ...nested };
for (const k of Object.keys(flat).sort()) sorted[k] = flat[k];

fs.writeFileSync(target, JSON.stringify(sorted, null, 2) + "\n");
console.log(`added ${added}, total flat keys ${Object.keys(flat).length}`);
if (conflicts.length) console.log(`overwrote ${conflicts.length}: ${conflicts.slice(0, 5).join(", ")}`);
