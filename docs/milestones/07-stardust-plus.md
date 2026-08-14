# Phase 7 — Stardust Plus (relationship-intent scoring + paid tier)

**Status:** ✅ Built and verified end-to-end against the live API (non-Stripe
paths - see the Stripe section for what's structurally in place but needs
real test-mode keys to exercise).

## What this is

Two connected asks: (1) let users say what kind of connection they're
looking for - casual, passionate, long-term, or a life partner - and have
the synastry engine actually weigh charts differently for that, since real
synastry practice does (Venus/Mars contacts read as attraction/chemistry;
Moon and Saturn contacts read as emotional security and commitment); (2) a
paid tier, "Stardust Plus", monetizing the extra astrological depth and
reach this unlocks, in place of a generic ad-removal upsell.

## Relationship-intent-weighted scoring

`packages/astrology-core/src/synastry/intentWeights.ts` - per-intent
overrides of the existing body-significance table used when scoring
synastry aspects: `casual`/`passionate` boost Venus and Mars; `long_term`/
`life_partner` boost Moon, Saturn, and Sun. `scoreSynastry()` took an
optional `weights` param to carry this (defaults to the original table,
fully backward compatible with every existing call site).

Free for every user to set (`User.relationshipIntent`, profile-edit page) -
it's an expression of intent, not gated itself. What's paid is the engine
actually *using* it: free users always see the neutral score; paid users
see their own intent's weighted score, plus a "you both want the same
thing" badge when it matches the other person's stated intent.

## Caching: a real bug caught before it shipped

`CompatibilityScore` caches one score per pair; intent-weighted scoring
needed an *additional* cached row per (pair, intent) without forking the
whole caching system. First attempt: nullable `intent` column, unique
constraint widened to `(userAId, userBId, intent)`, neutral score stored as
`intent = NULL`. This looked right (Postgres allows multiple NULLs under a
unique constraint, so a neutral row and per-intent rows could coexist) but
was wrong on two counts, both caught by the compiler and a bit of reading
rather than by production behavior:

1. **Type error first**: Prisma's generated compound-unique lookup type
   (`CompatibilityScoreUserAIdUserBIdIntentCompoundUniqueInput`) requires
   `intent: string`, not `string | null` - it rejects `null` for a
   compound-key field entirely, so `findUnique`/`upsert` with `intent: null`
   doesn't type-check.
2. **The deeper problem the type error was flagging**: even if that
   compiled, Postgres doesn't enforce uniqueness across NULLs in a
   composite unique index - each NULL is distinct for that purpose - so
   `intent = NULL` could never have actually guaranteed "exactly one
   neutral row per pair," the exact invariant this cache depends on.

Fixed with a non-null sentinel instead: `intent String @default("")`, empty
string means "neutral." Real DB-level uniqueness now holds, and the compound
key type-checks. New migration backfills any pre-existing `NULL` rows to
`''` and makes the column `NOT NULL`.

## Free vs. paid gating

New `apps/api/src/modules/billing/` module: `entitlementService.isPaidUser()`
is the single source of truth every gated path checks (backed by a new
`Subscription` model, `active`/`trialing` = paid). `paidGuard` middleware
returns `402 UPGRADE_REQUIRED` with a clear message - never partial or
silently-hidden data for free users.

| Feature | Free | Plus |
|---|---|---|
| Deck compatibility bar | ≥65 (`MIN_COMPATIBILITY_SCORE_FREE`) | ≥50 (`MIN_COMPATIBILITY_SCORE_PAID`) - wider pool |
| Compatibility detail | top-3 highlights, neutral score | full aspect list, intent-weighted score, "both want the same thing" badge |
| Daily swipes | capped (`FREE_DAILY_SWIPE_LIMIT`, default 20) | unlimited |
| Rewind last pass | blocked | `POST /api/matching/rewind` - only ever un-does a PASS, never a Match, so there's no "undo a match" edge case to handle |
| See who liked you | blocked | `GET /api/matching/likes` |
| Profile boost | blocked | `POST /api/matching/boost` - `BOOST_DURATION_HOURS` (default 3) of deck-sort priority |

Deck filtering itself always uses the *neutral* score, at whichever
threshold applies to the requester's tier - kept as one simple, consistent
bar rather than forking filtering logic per intent. Only the *display* score
paid users see is intent-weighted.

## Stripe billing

Official `stripe` npm package (not hand-rolled HTTP calls - this is exactly
the payment surface that needs a vetted SDK), hosted Checkout Sessions
(`POST /api/billing/checkout`) so card data never touches this app's
frontend or backend. `GET /api/billing/status` for the frontend to poll
after the Stripe-hosted redirect back to `/plus/success` (webhook delivery
can lag the redirect by a few seconds, so that page polls briefly rather
than trusting the redirect alone).

Webhook (`POST /api/billing/webhook`) needs Stripe's raw request bytes to
verify the signature, which conflicts with the global `express.json()`
middleware already parsing every other route - mounted with `express.raw()`
*before* `express.json()` in `server.ts`, same "specific-path exception
before the general middleware" pattern used nowhere else in this app until
now.

One real API-surface catch, verified against the installed SDK's own type
definitions rather than assumed: in this Stripe API version,
`current_period_end` lives on each subscription *item*
(`sub.items.data[0].current_period_end`), not on the top-level
`Subscription` object where older Stripe docs/tutorials put it.

Like every other optional external integration in this app (OAuth,
third-party astrology providers), billing is graceful-degrading:
`STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_ID` unset simply
means checkout returns `503 BILLING_UNAVAILABLE` and `/plus` shows the perk
list without a working upgrade button - not a crash.

**Not exercised in this pass**: the actual Stripe Checkout click-through
(test card, webhook delivery, `/plus/success` confirmation) needs real
Stripe test-mode keys from the user, the same dependency every third-party
integration in this project has had (Prokerala, OAuth). Structurally
in place and typechecked; genuinely "should work," not yet "verified,"
for that one piece specifically.

## Frontend

`profile/edit` gained a relationship-intent selector. New `/plus` (perk
list + upgrade, or membership status if already paid), `/plus/success`
(post-checkout confirmation, polls billing status), `/likes` (grid of
incoming likers with "like back" - matches inline like the swipe deck
does). `SwipeCard` shows the "same intent" badge and, for paid responses
only (detected by whether `allAspects` is present on the candidate, not by
a separate flag), an expandable full aspect breakdown; free users get an
inline upsell link instead. The swipe page gained Rewind/Boost buttons and
a dedicated upsell screen when the daily cap is hit, rather than silently
failing.

## Verification

Scripted against the live API (temporary `FREE_DAILY_SWIPE_LIMIT` override
to keep the test run's signup count under `authLimiter`'s shared
20-req/15min budget, which every route under `/auth` draws from) - 30/30
assertions passed:

- Free-tier deck: every returned score clears the free threshold; no
  `allAspects` field present.
- Daily cap: exact swipe index where it engages; `UPGRADE_REQUIRED` on the
  next attempt; paid bypasses it.
- Rewind/likes/boost: all three return `402` for free users; all three work
  for paid users. Rewind specifically returns the correct most-recently-passed
  candidate, twice in a row (walks back further each call).
- Paid deck: wider threshold confirmed; `allAspects` present on every
  candidate.
- Intent weighting: a candidate sharing the paid requester's stated intent
  is flagged `bothWantSameIntent: true`; a differing one, `false`.
- Likes → match: a LIKE shows up in the target's incoming-likes list; liking
  back creates a Match; the matched user then disappears from that list.
- Boost: `boostedUntil` persists and is in the future; a boosted user is
  sorted ahead of an *identically-scored* unboosted user in another user's
  deck (birth data deliberately duplicated between the two test accounts so
  the boost, not chart differences, is the only variable in play).

Two failures surfaced on the first run and were run down to their actual
cause before declaring anything fixed - both were bugs in the verification
script's own setup, not the product: one assertion compared against a swipe
limit the script's own process hadn't actually been given (the server got
an env override the script process didn't share); the other boosted an
account that was never granted a paid subscription first, so its "boosted
priority" pass was coincidental ordering rather than real evidence. Fixed
both and reran clean.

`tsc --noEmit` clean across `apps/api`, `apps/web`, `packages/shared-types`,
`packages/astrology-core`. All prior unit tests (`astrology-core`: 14,
`apps/api`: 3) still pass, plus the 4 new `intentWeights.test.ts` cases.
Test data and the verification script itself were removed after the run -
not part of the shipped codebase.
