"use client";

import { useState } from "react";
import Link from "next/link";
import type { AspectType, CandidateProfile } from "@stardust/shared-types";
import { CompatibilityBadge } from "./CompatibilityBadge";

const ASPECT_SYMBOLS: Record<AspectType, string> = {
  conjunction: "☌",
  sextile: "✶",
  square: "□",
  trine: "△",
  opposition: "☍",
};

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SwipeCard({ candidate }: { candidate: CandidateProfile }) {
  const [showAll, setShowAll] = useState(false);
  const photo = candidate.photoUrls[0];
  const isPlus = candidate.allAspects !== undefined;

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-stardust-600/40 bg-stardust-900/60 shadow-2xl">
      <div className="relative aspect-[3/4] w-full">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={candidate.displayName ?? "Candidate"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stardust-800 to-stardust-600">
            <span className="text-5xl font-semibold text-stardust-200">{initials(candidate.displayName)}</span>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <CompatibilityBadge score={candidate.compatibilityScore} />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <h2 className="text-xl font-semibold text-stardust-100">{candidate.displayName ?? "Someone"}</h2>
          {candidate.bio && <p className="mt-1 text-sm text-stardust-400">{candidate.bio}</p>}
        </div>

        {candidate.bothWantSameIntent && (
          <p className="rounded-lg bg-stardust-400/10 px-3 py-1.5 text-xs font-medium text-stardust-200">
            ✨ You&apos;re both looking for the same kind of connection
          </p>
        )}

        {candidate.highlights.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {candidate.highlights.slice(0, 3).map((h, i) => (
              <li
                key={i}
                className="rounded-full border border-stardust-600/40 bg-stardust-950 px-3 py-1 text-xs text-stardust-200"
              >
                {h.description}
              </li>
            ))}
          </ul>
        )}

        {isPlus ? (
          candidate.allAspects && candidate.allAspects.length > 3 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="text-xs font-medium text-stardust-400 underline hover:text-stardust-200"
              >
                {showAll ? "Hide full breakdown" : `See full breakdown (${candidate.allAspects.length} aspects)`}
              </button>
              {showAll && (
                <ul className="mt-2 space-y-1">
                  {candidate.allAspects.map((a, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-stardust-400">
                      <span>
                        {a.bodyA} {ASPECT_SYMBOLS[a.aspectType]} {a.bodyB}
                      </span>
                      <span className="text-stardust-500">{a.aspectType}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : (
          <Link href="/plus" className="block text-xs text-stardust-400 underline hover:text-stardust-200">
            Unlock the full compatibility breakdown with Stardust Plus
          </Link>
        )}
      </div>
    </div>
  );
}
