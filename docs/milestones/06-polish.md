# Phase 6 — Polish

**Status:** 🚧 In progress. Refresh-token rotation, rate limiting, profile
editing, photo upload, and web push notifications built and verified as far
as this environment allows (see the push notifications section for the one
piece that needs testing in a real Chrome install).

## Starfield background

Global animated starfield (`apps/web/src/components/effects/Starfield.tsx`),
applied once in the root layout so it's behind every page. Deliberately no
`<canvas>` and no `requestAnimationFrame` loop - everything is CSS
animation running on the compositor thread (near-zero CPU/battery cost,
important since this needs to stay cheap on mobile browsers per the user's
"lightweight" requirement):

- Two "dust" layers, each a single element with hundreds of `box-shadow`
  dots (one paint operation, not one DOM node per star), drifting slowly
  at different speeds via `transform` (GPU-accelerated) for parallax.
- ~20 individually-positioned twinkling stars with staggered CSS opacity
  animations.
- An occasional shooting star, re-triggered on a random interval by
  toggling a class on a single reused element (no DOM churn).
- Star positions are generated with a seeded PRNG (`mulberry32`), not
  `Math.random()` - this component server-renders too (Next.js SSRs
  Client Components on first load), so positions must be identical
  between server and client or React throws a hydration mismatch.
- Respects `prefers-reduced-motion` - animations disabled entirely for
  users who've set that preference (accessibility, and it happens to save
  battery too).

**On "mobile app" scope**: the user confirmed no separate mobile app
exists yet or is being built now - just keep the web app's general
structure migration-friendly for when one eventually shares the same
backend/DB. This CSS-based starfield won't port directly to a future
React Native app (RN doesn't have CSS/DOM), but the *design* - lightweight
dot layers + sparse twinkle + occasional shooting star, no continuous JS
render loop - is the right reference to reimplement against (e.g. with
`react-native-reanimated` or a native particle view) when that day comes.

Verified in a real headless browser at both desktop and mobile (390×844)
viewport sizes, including a 9-second wait to confirm the shooting-star
timer fires without errors. Zero console errors either time.

## Refresh-token rotation with reuse detection

Previously `/api/auth/refresh` just re-verified the same long-lived (30-day)
refresh token forever - a leaked token stayed valid until natural expiry
with no way to detect or stop misuse. Now:

- Every refresh token is tracked in a new `RefreshToken` table (id, userId,
  revokedAt, replacedByTokenId) rather than being a bare stateless JWT.
- `POST /api/auth/refresh` **rotates**: the presented token is revoked and a
  new one issued in its place (`sessionService.rotateSession`).
- **Reuse detection**: if an already-revoked token is presented again (a
  sign of theft - the thief and the legitimate user both have a copy and
  one races to use it after the other already rotated), every session for
  that user is revoked, forcing a fresh login everywhere.
- A Postgres advisory lock (same pattern as `swipeService`'s match-race
  fix) closes the narrower race of the same token being presented twice
  near-simultaneously (e.g. a client retry).
- `POST /api/auth/logout` (new) revokes the current session's refresh token
  server-side - previously "logout" only cleared the browser's local
  storage, leaving the token itself valid until expiry.

**Known gap, not addressed here**: the web app doesn't yet silently
refresh an expired access token mid-session (no 401-triggers-refresh
interceptor in `apiClient.ts`) - a user's access token simply expires after
15 minutes and they need to re-login. Worth doing before this becomes a
real product, flagged here rather than scope-creeped into this pass.

## Rate limiting

- `apiLimiter`: 300 req/15min per IP across all of `/api/*` - abuse/DoS
  backstop.
- `authLimiter`: 20 req/15min per IP, shared across `/signup`, `/login`,
  `/refresh` specifically - the actual brute-force/credential-stuffing
  surface. Deliberately a *shared* budget across all three (not per-route)
  since they're all password/credential-adjacent attack surface.

## Verification (actual results)

Scripted, against the live API:
1. Signup creates exactly one `RefreshToken` row.
2. `/refresh` rotates: returns a different token, and the DB row's old
   token flips to revoked.
3. Re-presenting the just-rotated (old) token → `401 REFRESH_TOKEN_REUSED`.
4. The *new* token issued right before the reuse was detected also stops
   working immediately after (whole chain revoked, not just the reused
   one).
5. `/logout` → `204`, then `/refresh` with that token → `401`.
6. Repeated login attempts with a wrong password hit `429` after the
   shared auth budget was exhausted (confirmed the limiter counts
   signup/refresh/login calls together, not separately).

`tsc --noEmit` clean for both `apps/api` and `apps/web`. All prior unit
tests still pass.

**Profile editing + photo upload**, browser-driven end-to-end: set display
name/bio/gender/gender-preference, uploaded a photo, saved, reloaded the
page and confirmed every field (including the photo) persisted correctly,
then deleted the photo and confirmed it was gone. Zero console errors
throughout.

## Profile editing + photo upload

Users previously had no UI to set `displayName`, `bio`, `gender`, or
`genderPreference` anywhere - a real gap, since `genderPreference` is
actually read by `candidatePoolService`'s deck filter and was silently a
no-op for every user. New `/profile/edit` page (`PUT /api/users/me`) covers
all four, plus a photo grid (up to 6 photos) wired to real upload/delete
endpoints.

Photo upload didn't actually need to wait on picking a cloud provider: a
`PhotoStorage` interface (`modules/users/storage/`) with a `LocalDiskStorage`
implementation - saves to `apps/api/uploads/photos/`, served via
`express.static` - works out of the box for dev/MVP with zero external
credentials, following the same provider-abstraction pattern as astrology
providers and OAuth. Swapping in S3/Cloudinary later is a new class
implementing the same interface plus an env-gated switch in
`storageRegistry.ts`, no call-site changes.

One cross-origin subtlety: helmet's default `Cross-Origin-Resource-Policy:
same-origin` would silently block the web app (a different origin) from
loading `<img src>` pointing at the API's `/uploads/photos/*` - explicitly
set to `cross-origin` for just that path.

**A real bug found and fixed along the way**: this profile edit page was
the first place in `apps/web` to import a *runtime value* (not just a
type) from `@stardust/shared-types` - every earlier page only ever imported
types, which get erased before bundling. That exposed a latent module
resolution conflict: `shared-types` ships raw `.ts` source with no build
step, so whichever consumer's `tsc` type-checks it applies *that
consumer's* `moduleResolution` setting to those files too. `apps/api`
declared `NodeNext` (requires explicit `.js` extensions on relative
imports) while `apps/web`'s webpack needs them extensionless - directly
conflicting requirements on the same source files. Fixed by dropping the
unnecessary `NodeNext` override from `apps/api/tsconfig.json` (it runs via
`tsx`, which resolves either style at runtime regardless of the tsconfig
setting - the override was only ever a type-checking constraint, not a
real runtime requirement) and removing the `.js` suffixes from
`shared-types`' own internal imports to match its declared `Bundler`
resolution mode. Also added `transpilePackages: ["@stardust/shared-types"]`
to `next.config.mjs` so webpack applies proper TS transforms to it.

## Web push notifications

Corrected an earlier assumption: unlike OAuth or the astrology providers,
this genuinely does **not** need an external account/service. Web Push is a
browser standard - a VAPID keypair (public/private, generated locally with
the `web-push` package, no registration anywhere) is enough to send
notifications through the browser vendor's push infrastructure.

- `PushSubscription` table (userId, endpoint, p256dh, auth keys) - one row
  per device/browser a user has granted permission on.
- `POST` / `DELETE /api/users/me/push-subscription` to save/remove a
  subscription.
- `pushService.sendPushToUser(userId, payload)` - best-effort (never
  throws into the caller), auto-cleans up subscriptions the browser has
  expired (404/410 responses), and silently no-ops entirely if VAPID keys
  aren't configured - same graceful-degradation pattern as every other
  optional integration in this app.
- Wired into the two places that matter: `swipeService` (on match) and
  `socketHandlers`' `message:send` (to the *other* participant, not the
  sender) - both calls are fire-and-forget so a push failure can never
  block the actual match/message from succeeding.
- Frontend: `apps/web/public/sw.js` (service worker - shows the
  notification, focuses/opens the app on click), `lib/push.ts`
  (subscribe/unsubscribe, VAPID key conversion), and a `NotificationToggle`
  component on `/profile/edit`.

**Verification, and its real boundary**: browser-driven end-to-end testing
got as far as the service worker registering and the permission prompt
being granted correctly, then hit a wall specific to this environment -
Playwright's bundled Chromium build doesn't ship the official Google API
key that Chrome needs to authenticate with its real push service, so
`pushManager.subscribe()` fails with "push service not available" here.
This is a property of the test browser binary, not the application code -
confirmed by testing the parts that *are* verifiable in this environment:
the UI flow up to that point works, and a full match-creation +
live-message-delivery regression script confirmed the fire-and-forget push
calls never block or break those flows (both still succeeded end-to-end
with real Socket.IO connections). **The subscribe → receive round-trip
itself still needs a real Chrome/Edge/Firefox install to confirm** - it
should work (the client/server code matches the standard Web Push spec
exactly), but "should" isn't "verified" for that one piece.
