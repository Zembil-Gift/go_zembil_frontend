/**
 * Codemod: wrap user-facing JSX text and string attributes in t("English source").
 *
 * Keys are the English string itself, so an untranslated key still renders as
 * English (see src/i18n.ts). Run with a path glob:
 *   node scripts/i18n-wrap.mjs src/pages/cart.tsx
 *   node scripts/i18n-wrap.mjs --all
 *   node scripts/i18n-wrap.mjs --all --dry
 */
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import MagicString from "magic-string";

const traverse = _traverse.default ?? _traverse;

// Attributes whose string value is shown to (or read out to) the user.
const TEXT_ATTRS = new Set([
  "placeholder",
  "title",
  "aria-label",
  "alt",
  "label",
  "description",
  "emptyMessage",
  "loadingMessage",
]);

// Out of scope: internal admin, shadcn primitives, generated/vendored code.
const EXCLUDE = /\/(admin|ui)\/|\/admin-|node_modules|\.d\.ts$/;

// A JSX text node worth translating: has letters, is not a lone symbol, and is
// not obviously code or markup that slipped through.
const isTranslatable = (s) => {
  const t = s.trim();
  if (t.length < 2) return false;
  if (!/[A-Za-z]/.test(t)) return false; // pure numbers, currency, arrows, emoji
  if (!/[A-Za-z]{2}/.test(t)) return false; // single stray letters
  if (/^[A-Z_]+$/.test(t) && t.length > 12) return false; // SCREAMING_CONSTANTS
  if (/^https?:\/\//.test(t)) return false;
  if (/^[\d.,\s%+-]+$/.test(t)) return false;
  return true;
};

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith(".tsx") ? [p] : [];
  });

/** Nearest enclosing function that looks like a React component. */
function componentFor(nodePath) {
  let found = null;
  let p = nodePath;
  while (p) {
    if (p.isFunctionDeclaration() || p.isFunctionExpression() || p.isArrowFunctionExpression()) {
      const name =
        p.node.id?.name ??
        (p.parentPath.isVariableDeclarator() ? p.parentPath.node.id?.name : null) ??
        (p.parentPath.isExportDefaultDeclaration() ? "default" : null);
      // Capitalized name (or the default export) => component. Keep climbing so
      // we land on the OUTERMOST one; a hook inside a callback would be
      // conditionally called.
      if (name && (name === "default" || /^[A-Z]/.test(name))) found = p;
    }
    p = p.parentPath;
  }
  return found;
}

function processFile(file, { dry }) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    });
  } catch (err) {
    return { file, error: `parse: ${err.message}` };
  }

  const s = new MagicString(code);
  const strings = new Set();
  const components = new Set();
  let hasImport = /from ["']react-i18next["']/.test(code);

  traverse(ast, {
    JSXText(p) {
      const raw = p.node.value;
      if (!isTranslatable(raw)) return;
      const comp = componentFor(p);
      if (!comp) return;

      // Replace only the trimmed span so surrounding JSX whitespace survives.
      const lead = raw.length - raw.trimStart().length;
      const trail = raw.length - raw.trimEnd().length;
      const text = raw.trim().replace(/\s+/g, " ");
      const start = p.node.start + lead;
      const end = p.node.end - trail;

      s.overwrite(start, end, `{t(${JSON.stringify(text)})}`);
      strings.add(text);
      components.add(comp);
    },

    JSXAttribute(p) {
      const name = p.node.name;
      const attr = name.type === "JSXIdentifier" ? name.name : null;
      if (!attr || !TEXT_ATTRS.has(attr)) return;
      const value = p.node.value;
      if (!value || value.type !== "StringLiteral") return;
      if (!isTranslatable(value.value)) return;
      const comp = componentFor(p);
      if (!comp) return;

      const text = value.value;
      s.overwrite(value.start, value.end, `{t(${JSON.stringify(text)})}`);
      strings.add(text);
      components.add(comp);
    },
  });

  if (strings.size === 0) return { file, changed: 0 };

  // Inject `const { t } = useTranslation();` into each touched component that
  // does not already destructure it.
  for (const comp of components) {
    const body = comp.node.body;
    const hasT = comp.scope.hasBinding("t", true);
    if (hasT) continue;

    if (body.type === "BlockStatement") {
      s.appendLeft(body.start + 1, `\n  const { t } = useTranslation();`);
    } else {
      // Concise arrow body: `() => (<div/>)` -> `() => { const {t}=...; return (<div/>); }`
      s.appendLeft(body.start, `{\n  const { t } = useTranslation();\n  return `);
      s.appendRight(body.end, `;\n}`);
    }
  }

  if (!hasImport) {
    // Place the import after the final existing import statement.
    const lastImport = ast.program.body.filter((n) => n.type === "ImportDeclaration").pop();
    const at = lastImport ? lastImport.end : 0;
    s.appendLeft(at, `\nimport { useTranslation } from "react-i18next";`);
  }

  if (!dry) fs.writeFileSync(file, s.toString());
  return { file, changed: strings.size, strings: [...strings] };
}

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const targets = args.includes("--all")
  ? walk("src").filter((f) => !EXCLUDE.test(f))
  : args.filter((a) => !a.startsWith("--"));

const all = new Set();
let touched = 0;
const errors = [];
for (const f of targets) {
  const r = processFile(f, { dry });
  if (r.error) {
    errors.push(`${r.file}: ${r.error}`);
    continue;
  }
  if (r.changed) {
    touched++;
    r.strings.forEach((x) => all.add(x));
  }
}

console.log(`files changed: ${touched}/${targets.length}`);
console.log(`unique strings: ${all.size}`);
if (errors.length) console.log("errors:\n" + errors.join("\n"));
fs.writeFileSync(
  "scripts/i18n-extracted.json",
  JSON.stringify([...all].sort(), null, 2),
);
