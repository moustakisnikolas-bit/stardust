import type { CandidateProfile } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { getOrComputeCompatibility, resolveSynastryPerspective } from "./compatibilityService.js";
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
      const compat = await getOrComputeCompatibility(userId, candidate.id, {
        chartRow1: requesterChart,
        chartRow2: candidate.natalChart!,
      });
      const { score, highlights } = resolveSynastryPerspective(compat, userId);
      return { candidate, score, highlights };
    }),
  );

  const candidates: CandidateProfile[] = scored
    .filter(({ score }) => score >= env.MIN_COMPATIBILITY_SCORE)
    .sort((a, b) => b.score - a.score)
    .map(({ candidate, score, highlights }) => ({
      userId: candidate.id,
      displayName: candidate.displayName,
      bio: candidate.bio,
      photoUrls: candidate.photos.map((p) => p.url),
      compatibilityScore: score,
      highlights: highlights as unknown as CandidateProfile["highlights"],
    }));

  // Cursor tracks the last *scanned* row (not last-that-passed-filter) so
  // pagination always advances and correctly signals exhaustion once a scan
  // returns fewer than a full batch.
  const nextCursor = rows.length === DECK_SCAN_BATCH ? rows[rows.length - 1].id : null;

  return { candidates, nextCursor };
}
