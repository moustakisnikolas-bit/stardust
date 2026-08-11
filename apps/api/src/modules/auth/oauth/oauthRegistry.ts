import { env } from "../../../config/env.js";
import type { OAuthProvider } from "./OAuthProvider.js";
import { GoogleOAuthProvider } from "./GoogleOAuthProvider.js";
import { FacebookOAuthProvider } from "./FacebookOAuthProvider.js";

const providers = new Map<string, OAuthProvider>();

// Only registered when credentials are configured, so a missing provider
// fails with a clear "not configured" redirect instead of crashing startup.
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.set(
    "google",
    new GoogleOAuthProvider(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${env.API_PUBLIC_URL}/api/auth/oauth/google/callback`),
  );
}
if (env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET) {
  providers.set(
    "facebook",
    new FacebookOAuthProvider(
      env.FACEBOOK_CLIENT_ID,
      env.FACEBOOK_CLIENT_SECRET,
      `${env.API_PUBLIC_URL}/api/auth/oauth/facebook/callback`,
    ),
  );
}

export function getOAuthProvider(id: string): OAuthProvider | null {
  return providers.get(id) ?? null;
}
