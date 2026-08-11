# Phase 1 — Foundations

**Status:** ✅ Done, verified end-to-end in a real browser.

## What this phase delivers

A user can sign up, enter their real birth date/time/location, and see their
own computed natal chart — the prerequisite for everything else in the app.

## What was built

**Monorepo** (pnpm + Turborepo): `apps/web` (Next.js 14 App Router),
`apps/api` (Express + Prisma), `packages/astrology-core` (pure chart/synastry
logic, no HTTP/DB deps), `packages/shared-types` (Zod schemas + DTOs shared
across web/api).

**`packages/astrology-core`**:
- `AstrologyProvider` interface (`src/providers/AstrologyProvider.ts`) —
  `getNatalChart(BirthInput): Promise<NatalChart>`, provider-agnostic.
- `SwissEphemerisProvider` (`src/providers/SwissEphemerisProvider.ts`) — wraps
  `circular-natal-horoscope-js` (self-hosted, no API key or rate limit).
  Chosen over native `swisseph` bindings to avoid node-gyp build pain on
  Windows dev machines.
- `providerRegistry.ts` — resolves the active provider from
  `ASTROLOGY_PROVIDER_DEFAULT` / `ASTROLOGY_PROVIDER_BY_COUNTRY` env config,
  so business logic never imports a concrete provider directly. Only
  `swiss-ephemeris` is registered so far — Phase 4 adds third-party API
  providers behind the same interface once keys are available.
- `src/synastry/` — full synastry scoring: `aspects.ts` (classical
  aspect/orb table + per-body significance weights), `aspectDescriptions.ts`
  (curated + generated plain-language descriptions), `scoreSynastry.ts`
  (chart pair → 0–100 score + ranked highlights). **10 passing unit tests**
  covering exact trine/opposition/square boundaries and highlight ranking.
- `scripts/compare-providers.ts` (in `apps/api`) — CLI to run one birth input
  through every registered provider side-by-side, logging each run to
  `AstrologyProviderRun`. Only one provider exists today, so this is mostly
  scaffolding for Phase 4.

**`apps/api`**:
- Prisma schema (`prisma/schema.prisma`) — full data model migrated,
  including tables not used until later phases (`CompatibilityScore`,
  `Swipe`, `Match`, `Message`) to avoid migration churn.
- Auth (`src/modules/auth/`) — signup/login/refresh/me, argon2id password
  hashing, JWT access (15m) + refresh (30d) tokens.
- Onboarding (`src/modules/onboarding/`) — `GET /geocode` (OpenStreetMap
  Nominatim, no API key required for MVP), `POST /birth-data` (resolves IANA
  timezone + **historical** UTC offset via `geo-tz` + `luxon` — DST rules and
  timezone boundaries have shifted over the decades, so this is computed per
  birth-instant, not assumed from today's rules — then computes and stores
  the natal chart, sets `onboardingCompletedAt`), `GET /chart`.
- Middleware: `authGuard` (JWT verification), `onboardingGuard` (blocks
  routes until onboarding is complete — built but not yet used by any route;
  Phase 2 is its first consumer), `errorHandler` (+ `HttpError`).

**`apps/web`**: signup, login, onboarding birth-data form (with live location
autocomplete), and a profile page rendering the full computed chart
(placements table: body, sign, degree, house, retrograde). Dark purple
"stardust" Tailwind theme established here and reused by later phases.

## Key decisions / gotchas hit

- **Birth location is required, not optional** — natal charts need
  lat/lon + historical timezone offset, not just date/time/year.
- **ESM import hoisting**: `.env` loading must live in its own module
  (`src/lib/loadEnv.ts`) imported *first* in any entrypoint — Node hoists all
  `import` statements above a module's own top-level code, so inlining the
  load before other imports in the same file does not guarantee it runs
  first relative to modules those imports transitively pull in.
- **`circular-natal-horoscope-js` is a webpack CJS bundle** — named ESM
  imports aren't reliably statically analyzable, so `SwissEphemerisProvider`
  unwraps via the namespace import's `.default` instead of
  `import { Origin, Horoscope }` directly.
- Local Postgres runs in Docker on **port 5433**, not 5432 (another local
  project already had 5432 bound) — see `docker-compose.yml`.
- `DATABASE_URL` uses `127.0.0.1`, not `localhost` — this machine resolves
  `localhost` to `::1` first, and Docker Desktop only forwards the port on
  IPv4, so `localhost` connections timed out while `127.0.0.1` worked.
- Next.js route groups (`(app)`, `(auth)`) do **not** appear in the URL —
  only real folder segments do. `onboarding/birth-data` is a real segment
  (so the route is `/onboarding/birth-data`); `(app)/profile` and
  `(auth)/login` map to `/profile` and `/login`.

## Verification performed

Full signup → onboarding → chart-display flow driven with a headless
Playwright browser against the real running dev servers (API on :4000, web
on :3002, Postgres in Docker): signup succeeded, location autocomplete
returned real Nominatim results for "Athens, Greece", birth-data submission
computed a real chart (Sun in Gemini 24.1°, house 9, etc. — verified
manually plausible for June 15 1990 14:30 Athens), and the profile page
rendered all 12 placements correctly. Screenshots captured at each step.
`astrology-core`'s 10 unit tests pass (`pnpm --filter @stardust/astrology-core test`).
