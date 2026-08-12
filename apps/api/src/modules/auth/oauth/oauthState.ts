import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";

interface OAuthStatePayload {
  nonce: string;
  typ: "oauth_state";
  /** Carried through the redirect round-trip for PKCE-using providers - there's no server-side session to stash it in. */
  codeVerifier?: string;
}

/** Short-lived, self-contained CSRF token for the OAuth redirect round-trip - no server-side session storage needed. */
export function signOAuthState(codeVerifier?: string): string {
  const payload: OAuthStatePayload = { nonce: randomUUID(), typ: "oauth_state", codeVerifier };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const payload = jwt.verify(state, env.JWT_ACCESS_SECRET) as OAuthStatePayload;
  if (payload.typ !== "oauth_state") {
    throw new Error("Invalid OAuth state token");
  }
  return payload;
}
