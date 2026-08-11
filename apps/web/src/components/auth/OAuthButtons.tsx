const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_unavailable: "That sign-in method isn't set up yet.",
  oauth_denied: "Sign-in was cancelled.",
  oauth_invalid_request: "Sign-in did not complete. Please try again.",
  oauth_invalid_state: "Your sign-in session expired. Please try again.",
  oauth_failed: "Something went wrong signing you in. Please try again.",
};

export function describeOAuthError(code: string | null): string | null {
  if (!code) return null;
  return OAUTH_ERROR_MESSAGES[code] ?? "Something went wrong signing you in. Please try again.";
}

export function OAuthButtons() {
  return (
    <div className="space-y-3">
      <a
        href={`${API_BASE_URL}/api/auth/oauth/google`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-stardust-600/50 bg-stardust-950 py-2 font-medium text-stardust-100 transition hover:bg-stardust-800"
      >
        <span aria-hidden>G</span> Continue with Google
      </a>
      <a
        href={`${API_BASE_URL}/api/auth/oauth/facebook`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-stardust-600/50 bg-stardust-950 py-2 font-medium text-stardust-100 transition hover:bg-stardust-800"
      >
        <span aria-hidden>f</span> Continue with Facebook
      </a>
    </div>
  );
}
