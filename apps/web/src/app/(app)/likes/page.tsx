"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IncomingLike, SwipeResult } from "@stardust/shared-types";
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

export default function LikesPage() {
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { accessToken } = useAuth();

  const [likes, setLikes] = useState<IncomingLike[] | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedBack, setLikedBack] = useState<Record<string, "pending" | "matched" | "done">>({});
  const [matchBanner, setMatchBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ likes: IncomingLike[] }>("/api/matching/likes", { accessToken })
      .then((res) => setLikes(res.likes))
      .catch((err) => {
        if (err instanceof ApiError && err.code === "UPGRADE_REQUIRED") {
          setUpgradeRequired(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load likes");
        }
      });
  }, [accessToken]);

  async function handleLikeBack(userId: string) {
    setLikedBack((prev) => ({ ...prev, [userId]: "pending" }));
    try {
      const result = await apiRequest<SwipeResult>("/api/matching/swipe", {
        method: "POST",
        accessToken,
        body: { swipeeId: userId, direction: "LIKE" },
      });
      setLikedBack((prev) => ({ ...prev, [userId]: result.matched ? "matched" : "done" }));
      if (result.matched) setMatchBanner("It's a match! ✨");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to like back");
      setLikedBack((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  }

  if (loading) return null;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-stardust-200">Who liked you</h1>
          <Link href="/swipe" className="text-sm text-stardust-400 underline hover:text-stardust-200">
            Back
          </Link>
        </div>

        {matchBanner && (
          <div className="mb-6 rounded-xl border border-stardust-400/60 bg-stardust-800/80 p-4 text-center">
            <p className="mb-2 text-stardust-100">{matchBanner}</p>
            <Link href="/matches" className="text-sm font-medium text-stardust-200 underline">
              View match
            </Link>
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {upgradeRequired ? (
          <div className="rounded-2xl border border-stardust-600/40 bg-stardust-900/60 p-6 text-center">
            <p className="mb-4 text-stardust-200">Seeing who liked you is a Stardust Plus feature.</p>
            <Link
              href="/plus"
              className="inline-block rounded-lg bg-stardust-400 px-6 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200"
            >
              Upgrade to Stardust Plus
            </Link>
          </div>
        ) : likes === null ? (
          <p className="text-stardust-400">Loading...</p>
        ) : likes.length === 0 ? (
          <p className="text-stardust-400">No one yet - check back later.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {likes.map((like) => {
              const state = likedBack[like.userId];
              return (
                <div key={like.userId} className="overflow-hidden rounded-2xl border border-stardust-600/40 bg-stardust-900/60">
                  <div className="relative aspect-square w-full">
                    {like.photoUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={like.photoUrls[0]} alt={like.displayName ?? "Someone"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stardust-800 to-stardust-600">
                        <span className="text-2xl font-semibold text-stardust-200">{initials(like.displayName)}</span>
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <CompatibilityBadge score={like.compatibilityScore} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="mb-2 truncate text-sm font-medium text-stardust-100">{like.displayName ?? "Someone"}</p>
                    {state === "matched" ? (
                      <p className="text-center text-xs font-medium text-stardust-200">Matched ✨</p>
                    ) : state === "done" ? (
                      <p className="text-center text-xs text-stardust-400">Liked</p>
                    ) : (
                      <button
                        onClick={() => handleLikeBack(like.userId)}
                        disabled={state === "pending"}
                        className="w-full rounded-lg bg-stardust-400 py-1.5 text-xs font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
                      >
                        {state === "pending" ? "..." : "Like back"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
