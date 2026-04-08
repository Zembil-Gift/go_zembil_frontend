# AGENTS.md

This document is for coding agents working in `go_zembil_frontend`.
Follow these conventions unless the user explicitly asks otherwise.

## Project Snapshot

- Stack: Vite + React 18 + TypeScript + Tailwind CSS + React Query + Zustand.
- Package manager: `npm` (lockfile: `package-lock.json`).
- Source root: `src/`.
- Path aliases (from `tsconfig.json` and `vite.config.ts`):
  - `@/*` -> `src/*`
  - `@shared/*` -> `src/shared/*`
  - `@assets/*` -> `public/attached_assets/*`
- Build output: `dist/`.

## Repository Rules Files

- `.cursorrules`: not found.
- `.cursor/rules/`: not found.
- `.github/copilot-instructions.md`: not found.
- If any of these files are added later, treat them as highest-priority local agent rules.

## Environment and Setup

- Create local env from `env.example` values.
- Primary required env var: `VITE_API_URL` (defaults to `http://localhost:8080` in axios client if unset).
- Additional integrations use env keys for Stripe, Chapa, Google OAuth, and Google Maps.
- Never commit real secrets in `.env` files.

## Commands (Build, Lint, Type Check, Dev)

Run all commands from repo root: `/home/ahavah/code/goGerami/go_zembil_frontend`.

- Install deps: `npm ci`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Build + preview host: `npm run build:version`
- Preview latest build: `npm run preview`
- Lint: `npm run lint`
- Type check: `npm run type-check`
- Asset compression utility: `npm run assets:compress`

## Test Commands (Current State + Single-Test Guidance)

Current repository status:

- There is no `test` script in `package.json`.
- No test framework config files (`vitest`, `jest`, `playwright`) were found.
- CI workflow `node.js.yml` references `npm test`, but this repo currently does not define it.

What to do now:

- For validation, run `npm run type-check`, `npm run lint`, and `npm run build`.
- If you add a test framework, also add explicit scripts in `package.json`.

Recommended script pattern when tests are introduced:

- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"test:single": "vitest run"`

Then run a single test file/case with:

- File: `npm run test:single -- src/path/to/file.test.ts`
- Case name: `npm run test:single -- src/path/to/file.test.ts -t "case name"`

## CI Notes

- GitHub Actions use Node 18/20/22 for CI build job.
- Deploy workflows build with Node 18.
- Keep changes compatible with Node 18+.

## Code Style Guidelines

## 1) TypeScript and Types

- Keep TypeScript `strict` compatibility (enabled in `tsconfig.json`).
- Prefer explicit interfaces/types for API payloads and service responses.
- Avoid introducing new `any`; if unavoidable, keep it narrowly scoped and documented.
- Prefer `unknown` over `any` for external/untrusted data, then refine via checks.
- Use union literals for finite domains (example: role/provider strings).
- Export reusable domain types from `src/types/*` or service modules.

## 2) Imports and Module Structure

- Use path aliases (`@/...`) for cross-feature imports.
- Use relative imports for very local modules in same folder when clearer.
- Keep import groups ordered logically:
  1. React and external libs
  2. Internal aliases (`@/...`, `@shared/...`)
  3. Relative imports
- Keep one import statement per module source; avoid duplicate imports.
- Prefer named imports where practical; default exports are used in some pages/services and are acceptable when established.

## 3) Formatting and General Style

- Match existing file-local quote/format style; do not reformat unrelated lines.
- Keep lines readable; prefer early returns to reduce nesting.
- Use semicolons consistently within edited files.
- Avoid noisy comments; add comments only for non-obvious business rules.
- Keep functions focused; extract helpers for repeated logic.

## 4) Naming Conventions

- React component names: `PascalCase`.
- Hooks: `useXxx` naming and keep in `src/hooks` when shared.
- Store files currently use kebab-case (example: `auth-store.ts`); follow existing folder pattern.
- Service modules use `camelCase` + `Service` suffix (example: `authService.ts`).
- Type/interface names: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` for true constants, otherwise `camelCase`.

## 5) React, State, and Data Fetching

- Prefer functional components and hooks.
- Use React Query (`useQuery`, `useMutation`) for server state.
- Keep stable query keys and invalidate precise keys after mutations.
- Use Zustand for lightweight client state where already established.
- Keep side effects in hooks/effects or service layers, not scattered across UI.

## 6) API and Service Layer

- Centralize HTTP through `src/services/api.ts` and `src/services/apiService.ts`.
- Reuse generic helpers (`getRequest`, `postRequest`, etc.) instead of ad-hoc fetch logic.
- Preserve auth/token refresh flow in axios interceptors.
- Preserve currency header behavior (`X-Currency`) in requests.
- Keep request/response types near service methods.

## 7) Error Handling and User Feedback

- Always surface actionable errors to users (toasts/dialog text) for failed async actions.
- In services, throw `Error` with meaningful messages; preserve backend messages when available.
- For UI mutations/queries, handle both success and error states.
- Do not swallow errors silently; at minimum log with context.
- Avoid exposing sensitive details in UI error text.

## 8) Styling and UI Conventions

- Tailwind is the primary styling approach.
- Reuse shared UI components from `src/components/ui/*`.
- Prefer existing brand color tokens/classes (for example `eagle-green`, `viridian-green`) over raw hex in JSX.
- Follow existing responsive patterns (`sm:`, `md:`, etc.).
- Preserve accessibility basics: labels for form fields, button text clarity, semantic structure.

## 9) Files, Scope, and Safety for Agents

- Keep changes scoped to the request; avoid broad refactors unless asked.
- Do not edit generated/build artifacts in `dist/`.
- Do not commit `.env` or secrets.
- If you discover missing tooling (for example tests), document it in PR/summary and provide minimal setup guidance.

## 10) Pre-Completion Checklist

Before finishing a coding task, run what is relevant:

- `npm run type-check`
- `npm run lint`
- `npm run build`

If a command cannot run due to missing config/tooling, report it clearly and provide the exact fix.
