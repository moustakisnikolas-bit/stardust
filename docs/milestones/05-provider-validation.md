# Phase 5 — Astrology provider validation (Prokerala / FreeAstrologyAPI / etc.)

**Status:** ⛔ Blocked on you, by design — see below.

## What this phase is

Per the original plan, this validates whether third-party astrology APIs
agree with the self-hosted Swiss Ephemeris provider (and each other) across
different countries/regions, using `compare-providers.ts` (already built in
Phase 1) plus new provider adapters behind the existing `AstrologyProvider`
interface (`packages/astrology-core/src/providers/`).

## Why it's blocked, specifically

I attempted to start on `ProkeralaProvider`/`FreeAstrologyApiProvider`
adapters and hit two real blockers, the same shape as the OAuth phase:

1. **No API credentials** - both providers require a registered
   app/API key to call anything, same as Google/Facebook did.
2. **Couldn't verify the exact request/response schema.** I looked up
   FreeAstrologyAPI's docs and confirmed the auth header (`x-api-key`) and
   base URL (`https://json.freeastrologyapi.com/`), but the exact endpoint
   path and field names for a natal chart request/response weren't
   reliably available without either an API key (some docs pages 403
   without one) or a Postman collection I don't have access to.

Unlike the Swiss Ephemeris integration in Phase 1 - where I downloaded the
actual npm package and ran real calculations locally to confirm the exact
output shape before writing `SwissEphemerisProvider` - I have no way to run
a real request against Prokerala or FreeAstrologyAPI to verify field names.
Writing an adapter against guessed field names is worse than not writing it:
it would look complete, silently misparse real responses, and produce wrong
astrology data with no obvious failure signal.

## What's needed from you to unblock this

Pick at least one:
- **API credentials** for whichever provider(s) you want validated
  (Prokerala: client ID + secret; FreeAstrologyAPI: an API key), so I can
  make real requests and build the adapter against actual responses (same
  approach as Phase 1's Swiss Ephemeris work).
- Or your own real birth data (as you originally mentioned) plus which
  provider(s) matter most to you / which countries' accuracy you care
  about most - that'll tell me where to prioritize once credentials exist.

## What's already in place, ready to receive the adapters

- `AstrologyProvider` interface, `providerRegistry.ts` (config-driven
  selection, already supports per-country overrides via
  `ASTROLOGY_PROVIDER_BY_COUNTRY`).
- `apps/api/scripts/compare-providers.ts` - already iterates
  `listProviders()`, so a new provider registered in `providerRegistry.ts`
  is automatically included in the comparison CLI with zero changes to the
  script itself.
- `AstrologyProviderRun` table - already logs every comparison run for
  later review.

Once credentials are available, adding a provider is: one new class
implementing `AstrologyProvider` (mirroring `SwissEphemerisProvider.ts`'s
shape), registered conditionally in `providerRegistry.ts` (same
"only-register-if-configured" pattern used for Google/Facebook OAuth), plus
env vars in `.env.example`. No changes needed anywhere else.
