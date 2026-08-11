# Phase 4 — Google & Facebook sign-in

**Status:** ✅ Code done and verified in "not configured" mode. **Needs your
Google/Facebook app credentials to actually sign anyone in** - I can't
create those app registrations myself.

## What this delivers

"Continue with Google" / "Continue with Facebook" buttons on login and
signup, alongside the existing email/password flow. Either can create a new
account or link to an existing email/password account with the same email.

## How it works

- Full-page redirect flow (not a fetch call): the button links straight to
  `GET {API}/api/auth/oauth/:provider`, which redirects to Google/Facebook's
  consent screen, which redirects back to
  `GET {API}/api/auth/oauth/:provider/callback`. The API exchanges the code
  for the user's profile, issues our own JWT tokens (same as email/password
  login), and redirects the browser to
  `{WEB_ORIGIN}/oauth/callback#accessToken=...&refreshToken=...` - tokens go
  in the URL **fragment**, not a query string, so they're never sent to any
  server or logged in access logs. The frontend's `/oauth/callback` page
  reads the fragment, stores the tokens, and redirects into the app (which
  sends new users straight into onboarding, same as email signup).
- A signed, short-lived `state` token (10 min) provides CSRF protection for
  the redirect round-trip without needing server-side session storage.
- Account linking: if the OAuth email matches an existing account (e.g.
  someone who signed up with email/password), the provider id gets attached
  to that same account rather than creating a duplicate. Email/password
  login on an OAuth-only account (no password set) returns a clear
  `OAUTH_ACCOUNT` error telling the user which button to use instead.
- Providers are **optional and independent**: `getOAuthProvider()` only
  registers a provider if both its env vars are set. An unconfigured
  provider's button redirects to `/login?error=oauth_unavailable` instead of
  crashing the server or 500ing.

## What you need to do to activate this

### Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) →
   create a project (or use an existing one) → **APIs & Services →
   Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URI**: `http://localhost:4000/api/auth/oauth/google/callback`
   for local dev (must match `API_PUBLIC_URL` in `apps/api/.env` + the
   callback path exactly - update this to your real API domain once
   deployed).
4. You'll also likely need to configure the **OAuth consent screen** (app
   name, support email) the first time - "External" user type is fine for
   testing with any Google account, no verification needed while it's in
   "Testing" mode with your own account added as a test user.
5. Copy the **Client ID** and **Client Secret** into `apps/api/.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

### Facebook

1. Go to [Facebook for Developers](https://developers.facebook.com/) →
   **My Apps → Create App** → choose "Consumer" or "None" type (you just
   need Facebook Login).
2. Add the **Facebook Login** product → Settings.
3. **Valid OAuth Redirect URI**: `http://localhost:4000/api/auth/oauth/facebook/callback`
   (same idea as Google - must match `API_PUBLIC_URL` exactly).
4. Under **App Review → Permissions**, make sure `email` and
   `public_profile` are available (both are default/no-review-needed for
   Development mode - the app only needs App Review before you want
   non-test users signing in once it's public).
5. Copy the **App ID** and **App Secret** into `apps/api/.env`:
   ```
   FACEBOOK_CLIENT_ID=...
   FACEBOOK_CLIENT_SECRET=...
   ```

After adding either, restart the API dev server (env vars are read at
process start) - the corresponding button will start working immediately,
no code changes needed.

## Verification performed (without real credentials)

- `tsc --noEmit` clean for `apps/api` and `apps/web`.
- Confirmed server starts fine with **no** OAuth env vars set (providers
  registry is empty, no crash).
- Confirmed `GET /api/auth/oauth/google` (and `facebook`) redirect to
  `{WEB_ORIGIN}/login?error=oauth_unavailable` when unconfigured, and the
  login page renders "That sign-in method isn't set up yet." from that
  query param.
- Confirmed email/password signup, login, and existing sessions are
  unaffected (`passwordHash` is now nullable in the schema, but every
  existing code path that reads it was checked - only `authRoutes.ts`
  referenced it, and it now guards for null before calling `verifyPassword`).

**Not yet verifiable**: the actual Google/Facebook consent screen → callback
→ account creation/linking round-trip, since that requires real registered
app credentials. Once you add them, the fastest check is: click "Continue
with Google" on `/login`, complete the consent screen, and confirm you land
on `/onboarding/birth-data` (new account) or `/profile` (if the email
already existed) with a valid session.
