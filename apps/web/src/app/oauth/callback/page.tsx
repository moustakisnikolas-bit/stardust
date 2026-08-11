"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

export default function OAuthCallbackPage() {
  const { completeOAuth } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setError("Sign-in did not complete. Please try again.");
      return;
    }

    completeOAuth({ accessToken, refreshToken })
      .then(() => router.replace("/"))
      .catch(() => setError("Sign-in did not complete. Please try again."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="mb-4 text-red-400">{error}</p>
            <a href="/login" className="text-stardust-200 underline">
              Back to login
            </a>
          </>
        ) : (
          <p className="text-stardust-400">Signing you in...</p>
        )}
      </div>
    </main>
  );
}
