import * as client from "openid-client";
import type { OAuthCallbackContext, OAuthProfile, OAuthProvider } from "./OAuthProvider.js";

/**
 * Backed by `openid-client` (OpenID Foundation certified, actively
 * maintained by panva) rather than hand-rolled fetch calls to Google's
 * token/userinfo endpoints. This also gets us real ID-token verification
 * (signature, issuer, audience) instead of just trusting the userinfo
 * endpoint over TLS, which the previous hand-rolled version did.
 */
export class GoogleOAuthProvider implements OAuthProvider {
  readonly id = "google" as const;
  readonly usesPKCE = true;

  private configPromise: Promise<client.Configuration> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  private getConfig(): Promise<client.Configuration> {
    // Discovery hits Google's /.well-known/openid-configuration over the
    // network - memoized so it only happens once per process, not per request.
    if (!this.configPromise) {
      this.configPromise = client.discovery(
        new URL("https://accounts.google.com"),
        this.clientId,
        undefined,
        client.ClientSecretPost(this.clientSecret),
      );
    }
    return this.configPromise;
  }

  async getAuthorizationUrl({ state, codeChallenge }: { state: string; codeChallenge?: string }): Promise<string> {
    if (!codeChallenge) {
      throw new Error("GoogleOAuthProvider requires a PKCE code challenge");
    }
    const config = await this.getConfig();
    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: this.redirectUri,
      scope: "openid email profile",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return url.href;
  }

  async exchangeCodeForProfile({ callbackUrl, codeVerifier, state }: OAuthCallbackContext): Promise<OAuthProfile> {
    const config = await this.getConfig();
    const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState: state,
    });

    const claims = tokens.claims();
    const email = claims?.email;
    if (!claims || typeof email !== "string") {
      throw new Error("Google did not return an email claim");
    }

    return {
      providerId: String(claims.sub),
      email,
      emailVerified: claims.email_verified === true,
      name: typeof claims.name === "string" ? claims.name : null,
    };
  }
}
