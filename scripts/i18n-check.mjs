/**
 * Self-check for the English-as-key i18n setup. Run: node scripts/i18n-check.mjs
 *
 * Guards the two things that would silently break the Amharic UI: the flatten
 * that keeps the legacy nested keys resolving, and the assumption that a
 * sentence key containing "." or ":" is not parsed as a nested path.
 */
import assert from "assert";
import fs from "fs";
import i18n from "i18next";

const am = JSON.parse(fs.readFileSync("src/locales/amharic.json", "utf8"));
const en = JSON.parse(fs.readFileSync("src/locales/english.json", "utf8"));

const flatten = (obj, prefix = "") =>
  Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(acc, flatten(v, key));
    else acc[key] = String(v);
    return acc;
  }, {});

await i18n.init({
  resources: { en: { translation: flatten(en) }, am: { translation: flatten(am) } },
  lng: "am",
  fallbackLng: "en",
  keySeparator: false,
  nsSeparator: false,
  initImmediate: false,
});

// 1. Legacy nested keys still resolve after flattening.
assert.equal(i18n.t("common.loading"), "በመጫን ላይ...", "legacy nested key broke");

// 2. Plain English-source keys resolve.
assert.equal(i18n.t("Add to Cart"), "ወደ ጋሪ ጨምር", "English-source key broke");

// 3. Sentences containing "." and ":" are keys, not nested paths.
assert.equal(
  i18n.t("Please fill in all required fields."),
  "እባክዎ ሁሉንም አስፈላጊ መስኮች ይሙሉ።",
  "sentence key with a period was parsed as a path",
);
assert.equal(i18n.t("Price: Low to High"), "ዋጋ፡ ከዝቅተኛ ወደ ከፍተኛ", "key with a colon broke");

// 4. An untranslated key falls back to readable English, never a key path.
assert.equal(i18n.t("Some String Nobody Translated"), "Some String Nobody Translated");

// 5. English locale renders English, not Amharic.
i18n.changeLanguage("en");
assert.equal(i18n.t("Add to Cart"), "Add to Cart", "en did not fall back to the key");
assert.equal(i18n.t("common.loading"), "Loading...");

// 6. Category names come from the API, so the static scanner cannot see them.
// Check them straight off the backend seeds instead — a new category shipped
// without an Amharic name shows up as English in the middle of an Amharic UI.
// Every seeded row is `(... 'Name', 'slug', ...)`, product and vendor alike.
const MIGRATIONS = "../zembil-gift-backend-service/src/main/resources/db/migration";
if (fs.existsSync(MIGRATIONS)) {
  i18n.changeLanguage("am");
  const seeded = fs
    .readdirSync(MIGRATIONS, { recursive: true })
    .filter((f) => f.endsWith(".sql") && /categor/i.test(f))
    .flatMap((f) => {
      const sql = fs.readFileSync(`${MIGRATIONS}/${f}`, "utf8");
      if (!/INSERT INTO \w*categor/i.test(sql)) return [];
      // Name, then the description right after the slug — both render through t().
      return [...sql.matchAll(/\(\s*(?:\d+,\s*)?'([^']+)',\s*'[a-z0-9-]+',\s*'([^']+)'/g)].flatMap(
        (m) => [m[1], m[2]]
      );
    });
  assert.ok(seeded.length > 60, `seed regex matched only ${seeded.length} — did the SQL change shape?`);
  const untranslated = [...new Set(seeded.filter((name) => i18n.t(name) === name))];
  assert.deepEqual(untranslated, [], `category names missing an Amharic entry: ${untranslated}`);
}

// 7. Same blind spot for EVENT_CATEGORIES: rendered as {cat.name}, never a literal.
i18n.changeLanguage("am");
const eventCats = [
  ...fs
    .readFileSync("src/types/events.ts", "utf8")
    .split("EVENT_CATEGORIES")[1]
    .split("];")[0]
    .matchAll(/name: '([^']+)'/g),
].map((m) => m[1]);
assert.ok(eventCats.length > 5, "EVENT_CATEGORIES regex matched nothing");
const untranslatedEvents = eventCats.filter((name) => i18n.t(name) === name);
assert.deepEqual(untranslatedEvents, [], `event categories missing Amharic: ${untranslatedEvents}`);

console.log("i18n self-check passed");
