/**
 * Second codemod pass: user-facing strings that are plain JS literals rather
 * than JSX, which scripts/i18n-wrap.mjs deliberately leaves alone.
 *
 * Only two shapes are touched, both unambiguously display-only:
 *   1. toast({ title, description })          -- always rendered to the user
 *   2. { id|key|value, label: "..." }         -- option/tab descriptors
 *
 * Anything else (object literals sent to the API, analytics payloads, sort
 * fields) is left in English on purpose: translating a value that travels to
 * the backend is a bug, not a feature.
 */
import fs from "fs";
import path from "path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import MagicString from "magic-string";

const traverse = _traverse.default ?? _traverse;
const EXCLUDE = /\/(admin|ui)\/|\/admin-|node_modules|\.d\.ts$/;

const isTranslatable = (s) => {
  const t = s.trim();
  return t.length >= 2 && /[A-Za-z]{2}/.test(t) && !/^https?:\/\//.test(t);
};

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith(".tsx") ? [p] : [];
  });

function componentFor(nodePath) {
  let found = null;
  let p = nodePath;
  while (p) {
    if (p.isFunctionDeclaration() || p.isFunctionExpression() || p.isArrowFunctionExpression()) {
      const name =
        p.node.id?.name ??
        (p.parentPath.isVariableDeclarator() ? p.parentPath.node.id?.name : null) ??
        (p.parentPath.isExportDefaultDeclaration() ? "default" : null);
      if (name && (name === "default" || /^[A-Z]/.test(name))) found = p;
    }
    p = p.parentPath;
  }
  return found;
}

const propName = (prop) =>
  prop.key?.type === "Identifier"
    ? prop.key.name
    : prop.key?.type === "StringLiteral"
      ? prop.key.value
      : null;

function processFile(file) {
  const code = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parse(code, { sourceType: "module", plugins: ["typescript", "jsx"] });
  } catch (err) {
    return { file, error: err.message };
  }

  const s = new MagicString(code);
  const strings = new Set();
  const components = new Set();
  const hasImport = /from ["']react-i18next["']/.test(code);

  const wrap = (valueNode, p) => {
    if (!valueNode || valueNode.type !== "StringLiteral") return;
    if (!isTranslatable(valueNode.value)) return;
    const comp = componentFor(p);
    if (!comp) return;
    s.overwrite(valueNode.start, valueNode.end, `t(${JSON.stringify(valueNode.value)})`);
    strings.add(valueNode.value);
    components.add(comp);
  };

  traverse(ast, {
    // toast({ title: "...", description: "..." })
    CallExpression(p) {
      const callee = p.node.callee;
      const name =
        callee.type === "Identifier"
          ? callee.name
          : callee.type === "MemberExpression" && callee.property.type === "Identifier"
            ? callee.property.name
            : null;
      if (name !== "toast") return;
      for (const arg of p.node.arguments) {
        if (arg.type !== "ObjectExpression") continue;
        for (const prop of arg.properties) {
          if (prop.type !== "ObjectProperty") continue;
          const key = propName(prop);
          if (key === "title" || key === "description") wrap(prop.value, p);
        }
      }
    },

    // { id: "x", label: "Display text" }
    ObjectExpression(p) {
      const props = p.node.properties.filter((x) => x.type === "ObjectProperty");
      const names = props.map(propName);
      if (!names.some((n) => n === "id" || n === "key" || n === "value")) return;
      for (const prop of props) {
        if (propName(prop) === "label") wrap(prop.value, p);
      }
    },
  });

  if (strings.size === 0) return { file, changed: 0 };

  for (const comp of components) {
    if (comp.scope.hasBinding("t", true)) continue;
    const body = comp.node.body;
    if (body.type === "BlockStatement") {
      s.appendLeft(body.start + 1, `\n  const { t } = useTranslation();`);
    } else {
      s.appendLeft(body.start, `{\n  const { t } = useTranslation();\n  return `);
      s.appendRight(body.end, `;\n}`);
    }
  }

  if (!hasImport) {
    const lastImport = ast.program.body.filter((n) => n.type === "ImportDeclaration").pop();
    s.appendLeft(lastImport ? lastImport.end : 0, `\nimport { useTranslation } from "react-i18next";`);
  }

  fs.writeFileSync(file, s.toString());
  return { file, changed: strings.size, strings: [...strings] };
}

const all = new Set();
let touched = 0;
const errors = [];
for (const f of walk("src").filter((x) => !EXCLUDE.test(x))) {
  const r = processFile(f);
  if (r.error) errors.push(`${r.file}: ${r.error}`);
  else if (r.changed) {
    touched++;
    r.strings.forEach((x) => all.add(x));
  }
}
console.log(`files changed: ${touched}`);
console.log(`unique strings: ${all.size}`);
if (errors.length) console.log("errors:\n" + errors.join("\n"));
