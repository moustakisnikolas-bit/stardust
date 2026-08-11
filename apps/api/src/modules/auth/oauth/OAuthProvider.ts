export interface OAuthProfile {
  /** The provider's own user id (Google `sub`, Facebook `id`). */
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export interface OAuthProvider {
  readonly id: "google" | "facebook";
  getAuthorizationUrl(state: string): string;
  exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
