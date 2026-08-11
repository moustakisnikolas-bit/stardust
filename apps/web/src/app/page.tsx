"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.onboardingCompletedAt) {
      router.replace("/onboarding/birth-data");
    } else {
      router.replace("/profile");
    }
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-stardust-200">Loading Stardust...</p>
    </main>
  );
}
