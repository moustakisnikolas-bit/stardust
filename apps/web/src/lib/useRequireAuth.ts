"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

/** Client-side redirect guard. The real enforcement lives server-side (authGuard/onboardingGuard); this just avoids flashing protected UI. */
export function useRequireAuth(options: { requireOnboarding?: boolean } = {}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (options.requireOnboarding && !user.onboardingCompletedAt) {
      router.replace("/onboarding/birth-data");
    }
  }, [loading, user, router, options.requireOnboarding]);

  return { user, loading };
}
