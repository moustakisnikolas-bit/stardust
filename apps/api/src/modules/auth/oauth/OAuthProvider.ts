export interface OAuthProfile {
  /** The provider's own user id (Google `sub`, Facebook `id`). */
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface OAuthCallbackContext {
  code: string;
  state: string;
  /** Full request URL including query string - only PKCE/OIDC-based providers (openid-client) need this. */
  callbackUrl: URL;
  /** Only present for providers where usesPKCE is true. */
  codeVerifier?: string;
}

export interface OAuthProvider {
  readonly id: "google" | "facebook";
  /** Whether the authorize/callback routes must generate and carry a PKCE code_verifier for this provider. */
  readonly usesPKCE: boolean;
  getAuthorizationUrl(params: { state: string; codeChallenge?: string }): string | Promise<string>;
  exchangeCodeForProfile(ctx: OAuthCallbackContext): Promise<OAuthProfile>;
}
