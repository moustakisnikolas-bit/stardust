import type { CandidateProfile, RelationshipIntent } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { getOrComputeCompatibility, resolveSynastryPerspective } from "./compatibilityService.js";
import { isPaidUser } from "../billing/entitlementService.js";
import type { NatalChartRow } from "./chartMapper.js";

const DECK_SCAN_BATCH = 50;

export interface DeckResult {
  candidates: CandidateProfile[];
  nextCursor: string | null;
}

export async function getCandidateDeck(userId: string, opts: { cursor?: string | null } = {}): Promise<DeckResult> {
  const requester = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { natalChart: { select: { providerId: true, computedAt: true, placements: true, houses: true } } },
  });

  if (!requester.natalChart) {
    // Guarded against in practice by onboardingGuard, but fail clearly if it's ever missing.
    throw new Error(`User ${userId} has no natal chart - onboarding incomplete`);
  }
  const requesterChart: NatalChartRow = requester.natalChart;
  const requesterIntent = requester.relationshipIntent as RelationshipIntent | null;

  const paid = await isPaidUser(userId);
  // Paid users see a wider pool (lower bar) - "extra possibilities" is the
  // whole point of the paid tier. Filtering always uses the neutral score
  // (below) so this stays a single, consistent bar regardless of intent.
  const threshold = paid ? env.MIN_COMPATIBILITY_SCORE_PAID : env.MIN_COMPATIBILITY_SCORE_FREE;
  const now = new Date();

  const rows = await prisma.user.findMany({
    where: {
      id: { not: userId, ...(opts.cursor ? { gt: opts.cursor } : {}) },
      isActive: true,
      onboardingCompletedAt: { not: null },
      natalChart: { isNot: null },
      swipesReceived: { none: { swiperId: userId } },
      ...(requester.genderPreference && requester.genderPreference !== "any" ? { gender: requester.genderPreference } : {}),
    },
    orderBy: { id: "asc" },
    take: DECK_SCAN_BATCH,
    include: {
      natalChart: { select: { providerId: true, computedAt: true, placements: true, houses: true } },
      photos: { orderBy: { position: "asc" }, select: { url: true } },
    },
  });

  if (rows.length === 0) {
    return { candidates: [], nextCursor: null };
  }

  const scored = await Promise.all(
    rows.map(async (candidate) => {
      // Filtering/sorting always uses the neutral (intent: null) score, kept
      // simple and consistent for everyone regardless of tier or intent.
      const neutral = await getOrComputeCompatibility(userId, candidate.id, {
        chartRow1: requesterChart,
        chartRow2: candidate.natalChart!,
      });
      const { score, highlights: neutralHighlights, aspects: neutralAspects } = resolveSynastryPerspective(neutral, userId);

      let highlights = neutralHighlights as unknown as CandidateProfile["highlights"];
      let allAspects: CandidateProfile["allAspects"];
      let bothWantSameIntent: boolean | undefined;

      if (paid) {
        // Full breakdown is always available; the intent-weighted lens only
        // when the paid viewer has actually set an intent.
        if (requesterIntent) {
          const intentScored = await getOrComputeCompatibility(userId, candidate.id, {
            chartRow1: requesterChart,
            chartRow2: candidate.natalChart!,
            intent: requesterIntent,
          });
          const perspective = resolveSynastryPerspective(intentScored, userId);
          highlights = perspective.highlights as unknown as CandidateProfile["highlights"];
          allAspects = perspective.aspects as unknown as CandidateProfile["allAspects"];
          bothWantSameIntent = candidate.relationshipIntent === requesterIntent;
        } else {
          allAspects = neutralAspects as unknown as CandidateProfile["allAspects"];
        }
      }

      return { candidate, score, highlights, allAspects, bothWantSameIntent };
    }),
  );

  const candidates: CandidateProfile[] = scored
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => {
      const aBoosted = !!a.candidate.boostedUntil && a.candidate.boostedUntil > now;
      const bBoosted = !!b.candidate.boostedUntil && b.candidate.boostedUntil > now;
      if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
      return b.score - a.score;
    })
    .map(({ candidate, score, highlights, allAspects, bothWantSameIntent }) => ({
      userId: candidate.id,
      displayName: candidate.displayName,
      bio: candidate.bio,
      photoUrls: candidate.photos.map((p) => p.url),
      compatibilityScore: score,
      highlights,
      ...(allAspects ? { allAspects } : {}),
      ...(bothWantSameIntent !== undefined ? { bothWantSameIntent } : {}),
    }));

  // Cursor tracks the last *scanned* row (not last-that-passed-filter) so
  // pagination always advances and correctly signals exhaustion once a scan
  // returns fewer than a full batch.
  const nextCursor = rows.length === DECK_SCAN_BATCH ? rows[rows.length - 1].id : null;

  return { candidates, nextCursor };
}
