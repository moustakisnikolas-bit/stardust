import type { OAuthCallbackContext, OAuthProfile, OAuthProvider } from "./OAuthProvider.js";

const AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const USERINFO_URL = "https://graph.facebook.com/me";

interface FacebookTokenResponse {
  access_token: string;
}

interface FacebookUserInfo {
  id: string;
  email?: string;
  name?: string;
}

export class FacebookOAuthProvider implements OAuthProvider {
  readonly id = "facebook" as const;
  readonly usesPKCE = false;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly redirectUri: string,
  ) {}

  getAuthorizationUrl({ state }: { state: string }): string {
    const url = new URL(AUTH_URL);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "email public_profile");
    return url.toString();
  }

  async exchangeCodeForProfile({ code }: OAuthCallbackContext): Promise<OAuthProfile> {
    const tokenUrl = new URL(TOKEN_URL);
    tokenUrl.searchParams.set("client_id", this.clientId);
    tokenUrl.searchParams.set("client_secret", this.clientSecret);
    tokenUrl.searchParams.set("redirect_uri", this.redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      throw new Error(`Facebook token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    const { access_token: accessToken } = (await tokenRes.json()) as FacebookTokenResponse;

    const profileUrl = new URL(USERINFO_URL);
    profileUrl.searchParams.set("fields", "id,name,email");
    profileUrl.searchParams.set("access_token", accessToken);
    const profileRes = await fetch(profileUrl);
    if (!profileRes.ok) {
      throw new Error(`Facebook profile request failed: ${profileRes.status}`);
    }
    const profile = (await profileRes.json()) as FacebookUserInfo;

    if (!profile.email) {
      throw new Error("Facebook did not share an email for this account - email permission is required to sign in");
    }

    return {
      providerId: profile.id,
      email: profile.email,
      emailVerified: true,
      name: profile.name ?? null,
    };
  }
}
