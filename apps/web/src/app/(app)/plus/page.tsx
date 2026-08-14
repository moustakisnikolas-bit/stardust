"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BillingStatus, CheckoutSessionResponse } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";

const PERKS = [
  "See a wider pool of matches - a lower compatibility bar than the free tier",
  "Full aspect-by-aspect compatibility breakdown, not just the top highlights",
  "Matching weighted for what you're actually looking for - casual, passionate, long-term, or a life partner",
  "See who's already liked you",
  "Unlimited swipes - no daily limit",
  "Rewind your last pass",
  "Boost your profile to the top of decks for 3 hours",
];

export default function PlusPage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<BillingStatus>("/api/billing/status", { accessToken })
      .then(setStatus)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load billing status"));
  }, [accessToken]);

  async function handleUpgrade() {
    setError(null);
    setCheckingOut(true);
    try {
      const { url } = await apiRequest<CheckoutSessionResponse>("/api/billing/checkout", {
        method: "POST",
        accessToken,
      });
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start checkout");
      setCheckingOut(false);
    }
  }

  if (loading) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stardust-200">Stardust Plus</h1>
          <Link href="/swipe" className="text-sm text-stardust-400 underline hover:text-stardust-200">
            Back
          </Link>
        </div>

        <div className="rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-6">
          {status?.isPaid ? (
            <div>
              <p className="mb-1 text-stardust-100">✨ You&apos;re a Stardust Plus member.</p>
              {status.currentPeriodEnd && (
                <p className="mb-4 text-sm text-stardust-400">
                  Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-3">
                <Link
                  href="/likes"
                  className="rounded-lg bg-stardust-400 px-4 py-2 text-sm font-medium text-stardust-950 transition hover:bg-stardust-200"
                >
                  See who liked you
                </Link>
                <Link
                  href="/swipe"
                  className="rounded-lg border border-stardust-600/50 px-4 py-2 text-sm text-stardust-300 transition hover:bg-stardust-800"
                >
                  Back to swiping
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="mb-6 space-y-2">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex gap-2 text-sm text-stardust-200">
                    <span className="text-stardust-400">✦</span>
                    {perk}
                  </li>
                ))}
              </ul>

              {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

              <button
                onClick={handleUpgrade}
                disabled={checkingOut}
                className="w-full rounded-lg bg-stardust-400 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
              >
                {checkingOut ? "Redirecting..." : "Upgrade to Stardust Plus"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
