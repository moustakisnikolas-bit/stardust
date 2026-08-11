"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MatchSummary } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";
import { CompatibilityBadge } from "@/components/matching/CompatibilityBadge";

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MatchesPage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ matches: MatchSummary[] }>("/api/matching/matches", { accessToken })
      .then(({ matches }) => setMatches(matches))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load matches"));
  }, [accessToken]);

  if (loading) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stardust-200">Your matches</h1>
          <Link href="/swipe" className="text-sm text-stardust-400 underline hover:text-stardust-200">
            Discover
          </Link>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!matches && !error && <p className="text-stardust-400">Loading...</p>}

        {matches && matches.length === 0 && (
          <p className="text-stardust-400">
            No matches yet, go find your people on{" "}
            <Link href="/swipe" className="underline">
              Discover
            </Link>
            .
          </p>
        )}

        <ul className="space-y-3">
          {matches?.map((match) => {
            const photo = match.otherUser.photoUrls[0];
            return (
              <li
                key={match.matchId}
                className="flex items-center gap-4 rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-stardust-800 to-stardust-600">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={match.otherUser.displayName ?? "Match"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-semibold text-stardust-200">
                      {initials(match.otherUser.displayName)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-medium text-stardust-100">{match.otherUser.displayName ?? "Someone"}</h2>
                    <CompatibilityBadge score={match.compatibilityScore} />
                  </div>
                  <p className="mt-1 truncate text-sm text-stardust-400">{match.lastMessagePreview ?? "Say hello!"}</p>
                  <p className="mt-1 text-xs text-stardust-400">Matched {new Date(match.createdAt).toLocaleDateString()}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
