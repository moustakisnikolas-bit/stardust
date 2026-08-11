# Phase 2 — Matching (synastry swipe deck + matches)

**Status:** ✅ Done, verified end-to-end (API + web UI).

## What this phase delivers

A user can see a deck of astrologically-compatible candidates (real synastry
score + highlighted aspects), swipe Like/Pass, and mutual Likes produce a
Match visible on a matches list. Chat itself (Phase 3) is not built yet.

## Design

Additive on top of Phase 1. Touches exactly two existing files
(`apps/api/src/server.ts` to mount the new router,
`packages/shared-types/src/matching.ts` to extend existing DTOs) — everything
else below is new.

- **Canonical pair ordering** (`apps/api/src/modules/matching/pairOrdering.ts`)
  — `orderPair(id1, id2)` returns `{userAId, userBId}` via lexicographic
  order on the UUID strings. Single source of truth for the
  `@@unique([userAId, userBId])` constraints on both `CompatibilityScore` and
  `Match` — every read/write of those tables goes through it.
- **`chartMapper.ts`** — `toNatalChart(prismaRow)` casts the `NatalChart`
  table's `placements`/`houses` `Json` columns back to typed arrays.
- **`compatibilityService.ts`** — `getOrComputeCompatibility(userId1, userId2, opts?)`:
  cache-first against `CompatibilityScore` (hit requires
  `synastryVersion === SYNASTRY_VERSION`), else loads/maps both charts and
  calls `scoreSynastry` always in canonical-pair order (`chartOfUserA,
  chartOfUserB`) so there's one stored result per pair regardless of caller.
- **Batch vs on-demand**: on-demand only for this phase — a `node-cron` batch
  job would be pure overhead against a near-zero pre-launch user base, and
  every path already goes through `compatibilityService`, so a future
  `scripts/scoreBatch.ts` (same `loadEnv.js`-first pattern as
  `compare-providers.ts`) needs no rearchitecting later.
- **`candidatePoolService.ts`** — `getCandidateDeck(userId, {cursor?})`:
  keyset-paginated (id cursor, 50/scan) query with hard filters (active,
  onboarded, has a chart, not already swiped by requester, optional
  one-directional gender-preference filter), scores each candidate
  concurrently, filters by `MIN_COMPATIBILITY_SCORE`, sorts the page by score
  descending (page-local only — true global ordering needs the future batch
  job). `nextCursor` tracks the last *scanned* row so pagination always
  progresses.
- **`swipeService.ts`** — `recordSwipe(swiperId, swipeeId, direction)`:
  transactional, takes a Postgres advisory lock keyed on the canonical pair
  to close the near-simultaneous-mutual-LIKE race, upserts the swipe
  (idempotent), and on mutual LIKE upserts a `Match`.
- **`matchesService.ts`** — lists a user's active matches with the other
  user's info and resolved compatibility.
- **`matchingRoutes.ts`** — `GET /deck`, `POST /swipe`, `GET /matches`, all
  behind `authGuard` + `onboardingGuard` (this module is the first real
  caller of `onboardingGuard`, built in Phase 1 but unused until now).
- **Frontend** — `/swipe` (Tinder-style cards, Like/Pass buttons, match
  banner) and `/matches` (list view), following the existing
  `useRequireAuth`/`apiRequest`/stardust-theme conventions from
  `profile/page.tsx`. No new dependencies (no gesture/toast libraries).

Full design rationale and file-by-file breakdown: see the plan history for
this session, or the code itself — this doc is intentionally a summary, not
a duplicate of the implementation.

## Verification (actual results)

Ran a scripted verification against the live API (real Postgres, real Express
server) using 4 synthetic users with hand-crafted `NatalChart` rows (Sun-only
placements at controlled longitudes, so aspect angles are deterministic
instead of relying on real ephemeris data landing near a threshold by
chance) plus one account with no birth data. All 7 scenarios passed:

1. **Threshold filtering**: requester (Sun 0°) vs. a trine partner (Sun
   120°, high score) and a near-trine third party (Sun 125°) both appeared
   in the deck; an opposition partner (Sun 180°) was correctly excluded, and
   its `CompatibilityScore` was still computed and cached at score **0**
   (proving it's filtered, not skipped).
2. **Already-swiped exclusion**: PASSing the third party removed them from
   the next `/api/matching/deck` call.
3. **Self-swipe rejected**: `POST /swipe` with `swipeeId === self` → `400`.
4. **Race-safe mutual match**: fired both directions of a LIKE
   *concurrently* via `Promise.all` — exactly **one** `Match` row exists in
   the DB afterward (the advisory-lock serialization works), and the second
   request to resolve correctly reported `matched: true`.
5. **`/api/matching/matches` correctness**: both users see the match, with
   the correct `otherUser`, and the score matched the trine pair's actual
   synastry result.
6. **One-sided LIKE**: the opposition partner LIKing the requester (never
   reciprocated) produced no match.
7. **`onboardingGuard`**: an account with no completed onboarding got `403
   ONBOARDING_REQUIRED` from `/api/matching/deck`.

**Web UI** (headless Playwright against the real dev servers): logged in as
the synthetic requester — `/matches` rendered the match card with a 100%
compatibility badge and correct date; `/swipe` correctly showed the
"you've seen everyone" empty state (everyone had already been swiped in the
scripted test). Logged in as the third-party user (who hadn't swiped yet) —
`/swipe` rendered a real candidate card with the compatibility badge and the
actual generated highlight text *"Your Sun forms a harmonious trine with
their Sun"*. Zero browser console errors in either session.

`tsc --noEmit` is clean for both `apps/api` and `apps/web` (had to set
`declaration: false` in `apps/api/tsconfig.json` — the base config's
`declaration: true`, meant for the library packages, was producing
non-portable-type errors on every exported Express `Router`; latent from
Phase 1, only surfaced once a real `tsc --noEmit` was run). All prior unit
tests (`astrology-core`, plus new `pairOrdering`/`chartMapper` tests) still
pass.

The verification script and its synthetic test data were removed/cleaned up
after the run — it was a one-off check, not a permanent fixture.
