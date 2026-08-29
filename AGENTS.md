# AGENTS.md

## Cursor Cloud specific instructions

This repo is a monorepo with two apps:
- Backend API (repo root): Fastify + TypeScript, run with `tsx`/`vitest`. This is the only service that MUST run for end-to-end testing.
- Mobile app (`mobile/`): Expo / React Native client. Optional — it targets an iOS Simulator / Android emulator (a Mac + Xcode is needed for a full UI run), so it can't fully launch in the Linux cloud VM.

Standard install/lint/test/build/run commands live in `README.md` and the `scripts` blocks of `package.json` (root) and `mobile/package.json`. Prefer those instead of duplicating them. Notes below are the non-obvious caveats.

### Startup / run caveats
- The backend runs standalone with no external services. Persistence is in-memory (`src/store/inMemoryStore.ts`); the Postgres schema in `db/schema.sql` is NOT wired up, so no database is needed to run or test.
- `GOOGLE_PLACES_API_KEY` is optional. When empty, `googlePlacesService` returns built-in mock restaurants, so the full swipe→match flow works with zero external credentials. Set the key in `.env` only to hit real Google Places.
- A `.env` is required for the backend (`cp .env.example .env`); `src/config/env.ts` validates it with Zod. The mobile app also reads `mobile/.env` (`EXPO_PUBLIC_API_URL`, default `http://localhost:3000`).
- Backend dev server listens on port `3000`; health check is `GET /health` → `{"ok":true}`.
- There is NO linter configured in either package (no ESLint/Prettier). "Lint" == `npm run typecheck` (`tsc --noEmit`) in each package. `npm test` (root, Vitest) is the only automated test suite; `mobile/` has no tests.
- Mobile: to verify it builds without a simulator, start Metro with `CI=1 npx expo start --port 8081` (from `mobile/`) and request a native bundle, e.g. `curl "http://localhost:8081/index.bundle?platform=ios&dev=true"` (expect HTTP 200). Expo **web** is not supported out of the box — it requires `react-dom` + `react-native-web`, which are intentionally not in `mobile/package.json`; do not add them just to preview.

### Backend end-to-end smoke flow (core functionality)
With the dev server running, the core "decide where to eat" flow is: `POST /v1/auth/login` (per user) → `POST /v1/sessions` → `POST /v1/sessions/:id/join` → `GET /v1/sessions/:id/candidates` → `POST /v1/sessions/:id/votes` (all members vote the same restaurant to reach consensus) → `GET /v1/sessions/:id/match`. `POST /v1/sessions/:id/auto-pick` forces a pick. See `README.md` for full request bodies.
