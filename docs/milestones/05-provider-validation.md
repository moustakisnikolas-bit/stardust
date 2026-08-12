# Phase 5 — Astrology provider validation (Prokerala / FreeAstrologyAPI / etc.)

**Status:** ✅ Prokerala live and cross-validated against real credentials.
FreeAstrologyAPI still blocked (see below) - not required, Prokerala alone
already delivers the validation this phase was for.

## No-signup cross-validation against the real Swiss Ephemeris

Before any third-party credentials existed, the user asked whether a
verified open-source option exists that doesn't need any signup. Found one:
[`sweph`](https://www.npmjs.com/package/sweph), an actively maintained Node
binding for the actual Swiss Ephemeris C library - installs cleanly on
Windows via prebuilt binaries, no node-gyp compilation needed (unlike the
native `swisseph` package avoided in Phase 1).

**Used it once, locally, purely to validate our numbers - not integrated
into the app.** Downloaded the real high-precision ephemeris data files
(`sepl_18.se1`, `semo_18.se1` - freely available from the Swiss Ephemeris
GitHub repo, no signup) and recomputed the same June 1990 Athens chart
already used as the Phase 1 verification fixture. Every planet matched our
existing `SwissEphemerisProvider` (which uses `circular-natal-horoscope-js`'s
Moshier algorithm) to within **32 arcseconds** - the Moon had the largest
gap, still over 300x smaller than the tightest orb (6°) used anywhere in
`scoreSynastry`. For every practical astrological purpose, our existing
self-hosted provider is indistinguishable from the authoritative
high-precision ephemeris.

**Why `sweph` isn't a live provider despite this**: licensing, not accuracy.
It's AGPL-3.0 by default (LGPL only with a purchased professional Swiss
Ephemeris license from Astrodienst/astro.com) - since Stardust's backend is
a network-accessed service, AGPL's network-use clause would very likely
require publishing the backend's full source to all users unless that
commercial license is bought. `circular-natal-horoscope-js` (Unlicense -
public domain) has no such issue, which is why it remains the shipped
provider. Using `sweph` once, locally, to cross-check numbers doesn't
trigger AGPL's network clause; shipping it in the running service would.

## Prokerala - live, real credentials, real verification

You created a Prokerala API client and provided the Client ID/Secret. Used
them immediately to reverse-engineer the real API (rather than guess, same
principle as everything else in this project) before writing any adapter
code:

- **Token endpoint**: `POST https://api.prokerala.com/token`,
  `grant_type=client_credentials` - confirmed working, returns a Bearer
  token (1hr expiry, cached and refreshed a minute early by
  `ProkeralaProvider`).
- **First finding**: Prokerala's `/v2/astrology/planet-position` endpoint
  is sidereal/Vedic-only (rejects `ayanamsa=0`, the tropical setting -
  "Allowed values are 1, 3, 5 & 45"). Not usable for this app's tropical
  Western astrology.
- **Second finding**: `/v2/astrology/natal-planet-position` *does* support
  tropical (no ayanamsa parameter at all) and returns a complete chart:
  houses, planets (+ Chiron/Lilith/Lunar Nodes, which we filter out - not
  in our `ChartBody` set), angles (Ascendant/Nadir/Descendant/MC), and
  aspects/declinations we don't need since `scoreSynastry` computes its own.
- **Third finding, a real constraint**: this sandbox/free-tier key only
  accepts **January 1st** as the date (any year, any time) -
  `"In sandbox mode, only January 1st is allowed"`. Verification below
  used `1990-01-01` instead of the Phase 1 fixture's `1990-06-15` for this
  reason. Worth knowing before relying on this key for anything beyond
  validation - a paid/verified plan would presumably lift this.

`ProkeralaProvider` (`packages/astrology-core/src/providers/ProkeralaProvider.ts`)
implements the standard `AstrologyProvider` interface against this verified
shape, registered conditionally in `providerRegistry.ts` exactly like the
OAuth providers (present only when `PROKERALA_CLIENT_ID`/`SECRET` are set).

### Verification result

Ran `compare-providers.ts` for real (Jan 1 1990, 14:30, Athens) against
both registered providers:

```
Body        swiss-ephemeris          prokerala
Sun         Capricorn 10.83°         Capricorn 10.84°
Moon        Pisces 3.54°             Pisces 3.55°
Mercury     Capricorn 25.67°         Capricorn 25.67°
Venus       Aquarius 6.22°           Aquarius 6.22°
Mars        Sagittarius 10.01°       Sagittarius 10.01°
Jupiter     Cancer 5.15°             Cancer 5.15°
Saturn      Capricorn 15.66°         Capricorn 15.66°
Uranus      Capricorn 5.79°          Capricorn 5.79°
Neptune     Capricorn 12.04°         Capricorn 12.04°
Pluto       Scorpio 17.09°           Scorpio 17.09°
Ascendant   Gemini 1.12°             Gemini 1.13°
MC          Aquarius 9.69°           Aquarius 9.69°
```

**Zero sign divergences, degree differences all ≤0.01°.** Two
independently-built systems - our self-hosted Moshier calculation and a
real third-party commercial API - agree almost exactly. Combined with the
`sweph` cross-check above, the core chart math now has three independent
confirmations. All four runs (including one deliberate failure while
debugging the timezone requirement) logged to `AstrologyProviderRun` for
audit.

`compare-providers.ts` gained a `--tz` override / auto-resolve-via-`geo-tz`
default in the process, since `ProkeralaProvider` needs an explicit IANA
zone (Swiss Ephemeris derives it internally, so this requirement didn't
exist before Prokerala).

### Not done

- **`ASTROLOGY_PROVIDER_BY_COUNTRY`** isn't populated yet - would need
  comparison runs across multiple real regions/dates to have a basis for
  per-country overrides, and the sandbox key's Jan-1-only restriction makes
  that impractical right now. Swiss Ephemeris remains the default for
  everyone; Prokerala is registered and available but not selected anywhere
  yet.
- **No automated test** for `ProkeralaProvider` in the standard vitest
  suite - it needs live credentials and network access (and would burn
  free-tier request budget on every CI run), unlike `SwissEphemerisProvider`
  which is fully self-hosted. The manual `compare-providers.ts` run above
  is the verification record for this provider.
- **FreeAstrologyAPI** still unbuilt - not needed right now since Prokerala
  already provides the cross-validation this phase was for, but the same
  "no guessing field names" approach applies if you want it added later:
  send credentials and I'll verify the real API before writing code.
