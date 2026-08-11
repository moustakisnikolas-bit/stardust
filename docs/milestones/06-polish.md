# Phase 6 — Polish

**Status:** 🚧 In progress. Refresh-token rotation, rate limiting, profile
editing, and photo upload (local-disk storage) done and verified. Push
notifications not started (needs an external service - see below).

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

## Not started (needs an external service, same pattern as OAuth/Phase 5)

- **Push notifications**: needs Firebase Cloud Messaging (mobile) or Web
  Push credentials - groundwork (the `match:new`/`message:new` WS events
  already exist as the trigger points) but no push integration yet.
