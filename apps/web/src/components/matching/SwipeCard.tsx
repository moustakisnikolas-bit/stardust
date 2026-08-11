import type { CandidateProfile } from "@stardust/shared-types";
import { CompatibilityBadge } from "./CompatibilityBadge";

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
  const photo = candidate.photoUrls[0];

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
      </div>
    </div>
  );
}
