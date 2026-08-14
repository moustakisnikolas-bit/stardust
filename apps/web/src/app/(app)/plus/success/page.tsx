"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BillingStatus } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest } from "@/lib/apiClient";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 8;

export default function PlusSuccessPage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();

  const [confirmed, setConfirmed] = useState(false);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!accessToken || confirmed) return;
    if (attempts >= MAX_POLLS) return;

    const timer = setTimeout(async () => {
      try {
        const status = await apiRequest<BillingStatus>("/api/billing/status", { accessToken });
        if (status.isPaid) {
          setConfirmed(true);
        } else {
          setAttempts((a) => a + 1);
        }
      } catch {
        setAttempts((a) => a + 1);
      }
      // Webhook delivery can lag a few seconds behind the redirect, so we
      // poll briefly rather than trusting the redirect alone.
    }, attempts === 0 ? 0 : POLL_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [accessToken, attempts, confirmed]);

  if (loading) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <div className="max-w-sm">
        {confirmed ? (
          <>
            <p className="mb-2 text-2xl">✨</p>
            <h1 className="mb-2 text-xl font-semibold text-stardust-100">You&apos;re a Stardust Plus member</h1>
            <p className="mb-6 text-sm text-stardust-400">All the perks are unlocked now - go find your matches.</p>
            <Link
              href="/swipe"
              className="inline-block rounded-lg bg-stardust-400 px-6 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200"
            >
              Start swiping
            </Link>
          </>
        ) : attempts >= MAX_POLLS ? (
          <>
            <h1 className="mb-2 text-xl font-semibold text-stardust-100">Almost there</h1>
            <p className="mb-6 text-sm text-stardust-400">
              Your payment went through, but confirming it is taking longer than usual. Check{" "}
              <Link href="/plus" className="underline hover:text-stardust-200">
                Stardust Plus
              </Link>{" "}
              again in a moment.
            </p>
          </>
        ) : (
          <p className="text-stardust-400">Confirming your subscription...</p>
        )}
      </div>
    </main>
  );
}
