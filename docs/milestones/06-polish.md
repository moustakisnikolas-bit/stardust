# Phase 6 — Polish

**Status:** 🚧 In progress. Refresh-token rotation and rate limiting done and
verified; photo upload and push notifications not started (both need an
external service - see below).

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

## Not started (needs an external service, same pattern as OAuth/Phase 5)

- **Photo upload**: needs an object storage provider (S3, Cloudinary,
  etc.) - the `Photo` table already exists and `SwipeCard`/match cards
  already render `photoUrls[0]` when present, so this is purely "add an
  upload endpoint + storage config" once you pick a provider and I have
  credentials.
- **Push notifications**: needs Firebase Cloud Messaging (mobile) or Web
  Push credentials - groundwork (the `match:new`/`message:new` WS events
  already exist as the trigger points) but no push integration yet.
