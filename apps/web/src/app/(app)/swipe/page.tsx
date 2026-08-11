"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CandidateProfile, DeckResponse, SwipeDirection, SwipeResult } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";
import { SwipeCard } from "@/components/matching/SwipeCard";

export default function SwipePage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();

  const [deck, setDeck] = useState<CandidateProfile[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [matchBanner, setMatchBanner] = useState<{ matchId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(afterCursor: string | null) {
    if (!accessToken) return;
    const query = afterCursor ? `?cursor=${afterCursor}` : "";
    const result = await apiRequest<DeckResponse>(`/api/matching/deck${query}`, { accessToken });
    setDeck((prev) => [...prev, ...result.candidates]);
    setCursor(result.nextCursor);
  }

  useEffect(() => {
    if (!accessToken) return;
    loadPage(null)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load your deck"))
      .finally(() => setInitialLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (initialLoad) return;
    if (index < deck.length) return;
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    loadPage(cursor)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load more candidates"))
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, deck.length, cursor, initialLoad]);

  async function handleSwipe(direction: SwipeDirection) {
    if (swiping || index >= deck.length) return;
    const candidate = deck[index];
    setSwiping(true);
    setError(null);
    try {
      const result = await apiRequest<SwipeResult>("/api/matching/swipe", {
        method: "POST",
        accessToken,
        body: { swipeeId: candidate.userId, direction },
      });
      if (result.matched && result.matchId) {
        setMatchBanner({ matchId: result.matchId });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong recording your swipe");
    } finally {
      setIndex((i) => i + 1);
      setSwiping(false);
    }
  }

  if (loading || initialLoad) return null;

  const current = deck[index];
  const deckExhausted = !current && !cursor && !loadingMore;

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-12">
      <div className="mb-6 flex w-full max-w-sm items-center justify-between">
        <h1 className="text-xl font-semibold text-stardust-200">Discover</h1>
        <Link href="/matches" className="text-sm text-stardust-400 underline hover:text-stardust-200">
          Matches
        </Link>
      </div>

      {matchBanner && (
        <div className="mb-6 w-full max-w-sm rounded-xl border border-stardust-400/60 bg-stardust-800/80 p-4 text-center">
          <p className="mb-2 text-stardust-100">It&apos;s a match! ✨</p>
          <div className="flex justify-center gap-3">
            <Link href="/matches" className="text-sm font-medium text-stardust-200 underline">
              View match
            </Link>
            <button onClick={() => setMatchBanner(null)} className="text-sm text-stardust-400">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {current ? (
        <>
          <SwipeCard candidate={current} />
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleSwipe("PASS")}
              disabled={swiping}
              className="rounded-full border border-stardust-600/50 px-8 py-3 font-medium text-stardust-300 transition hover:bg-stardust-900 disabled:opacity-50"
            >
              Pass
            </button>
            <button
              onClick={() => handleSwipe("LIKE")}
              disabled={swiping}
              className="rounded-full bg-stardust-400 px-8 py-3 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
            >
              Like
            </button>
          </div>
        </>
      ) : deckExhausted ? (
        <p className="mt-16 text-center text-stardust-400">
          You&apos;ve seen everyone compatible with you for now - check back later.
        </p>
      ) : (
        <p className="mt-16 text-stardust-400">Loading more candidates...</p>
      )}
    </main>
  );
}
