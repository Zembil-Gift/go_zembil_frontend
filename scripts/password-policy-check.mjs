/**
 * Self-check for the password policy. Run: node scripts/password-policy-check.mjs
 *
 * Guards the one thing that breaks quietly: the frontend accepting a password
 * the backend then rejects. The user sees a server error on submit instead of
 * inline validation, and it looks like the form is broken rather than like the
 * password is weak.
 *
 * Two halves. The behavioural half runs a fixed table of passwords through the
 * frontend rules and is always checked. The drift half compares the character
 * classes against ValidPassword.java when the backend is checked out beside
 * this repo, and is skipped when it is not.
 */
import assert from "assert";
import fs from "fs";
import path from "path";

const SCHEMA = "src/lib/passwordSchema.ts";
const BACKEND = path.join(
  "..",
  "zembil-gift-backend-service",
  "src/main/java/com/gogerami/backend/validation/ValidPassword.java"
);

const source = fs.readFileSync(SCHEMA, "utf8");

// -- the rules, read out of the schema rather than restated here -------------

const minLength = Number(/\.min\((\d+)/.exec(source)?.[1]);
assert.ok(minLength >= 8, `${SCHEMA} must require at least 8 characters, found ${minLength}`);

const lookaheads = [...source.matchAll(/\.regex\(\s*\/\^\(\?=(.+?)\)\/,/gs)].map((m) => m[1]);
assert.strictEqual(
  lookaheads.length,
  4,
  `${SCHEMA} must require exactly 4 character classes (lower, upper, digit, special), found ${lookaheads.length}`
);

const accepts = (password) =>
  password.length >= minLength &&
  lookaheads.every((lookahead) => new RegExp(`^(?=${lookahead})`).test(password));

// -- behaviour ---------------------------------------------------------------

const mustReject = [
  "12345678",   // digits only
  "aaaaaaa1",   // letters and a digit, no special character
  "Passw0rd",   // upper, lower, digit, still no special character
  "P@ss1",      // right character classes, too short
  "password!",  // no upper case, no digit
  "PASSWORD1!", // no lower case
];

const mustAccept = [
  "P@ssw0rd123",
  "NewP@ssw0rd123",
  "Str0ng-Enough!",
  "aB3;xyzq",    // exactly the minimum length
];

for (const password of mustReject) {
  assert.ok(!accepts(password), `weak password "${password}" is accepted by ${SCHEMA}`);
}
for (const password of mustAccept) {
  assert.ok(accepts(password), `compliant password "${password}" is rejected by ${SCHEMA}`);
}

// Every special character the backend permits must be usable here too.
for (const special of "!@#$%^&*-_=+?;:,.~".split("")) {
  const password = `Passw0rd${special}`;
  assert.ok(accepts(password), `${SCHEMA} rejects "${password}", which the backend accepts`);
}

// -- drift against the backend, when it is available -------------------------

if (fs.existsSync(BACKEND)) {
  const java = fs.readFileSync(BACKEND, "utf8");

  const javaMin = Number(/@Size\(min = (\d+)/.exec(java)?.[1]);
  assert.strictEqual(
    minLength,
    javaMin,
    `minimum length differs: ${SCHEMA} requires ${minLength}, ValidPassword.java requires ${javaMin}`
  );

  // The special-character class, normalised past Java's doubled backslashes.
  const javaSpecials = /\(\?=\.\*\[(@\$!.*?)\]\)/s.exec(java.replace(/\\\\/g, "\\"))?.[1];
  const frontendSpecials = /\(\?=\.\*\[(@\$!.*?)\]\)/s.exec(source)?.[1];
  assert.ok(javaSpecials, "could not read the special-character class from ValidPassword.java");
  assert.strictEqual(
    frontendSpecials,
    javaSpecials,
    `special-character class differs.\n  ${SCHEMA}: ${frontendSpecials}\n  ValidPassword.java: ${javaSpecials}`
  );

  console.log("password-policy-check: frontend and backend policies agree");
} else {
  console.log(`password-policy-check: backend not found at ${BACKEND}, skipped drift comparison`);
}

console.log(`password-policy-check: ${mustReject.length + mustAccept.length} cases OK`);
