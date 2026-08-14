import { resolveWeights, scoreSynastry, SYNASTRY_VERSION } from "@stardust/astrology-core";
import type { RelationshipIntent } from "@stardust/shared-types";
import type { CompatibilityScore } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { orderPair } from "./pairOrdering.js";
import { toNatalChart, type NatalChartRow } from "./chartMapper.js";

/** DB sentinel for "no intent" - see the CompatibilityScore.intent doc comment in schema.prisma for why not NULL. */
const NEUTRAL_INTENT = "";

export interface GetOrComputeOpts {
  chartRow1?: NatalChartRow;
  chartRow2?: NatalChartRow;
  /**
   * When provided, computes/caches an *additional* row scored with that
   * relationship-intent's weight profile (Stardust Plus), alongside - not
   * instead of - the neutral row deck filtering always uses.
   * Whose intent this is doesn't matter for the pair-symmetric cache key;
   * it's just "the weighting to apply", scored in canonical-pair order like
   * the neutral row always is.
   */
  intent?: RelationshipIntent | null;
}

async function loadChartRow(userId: string): Promise<NatalChartRow> {
  return prisma.natalChart.findUniqueOrThrow({
    where: { userId },
    select: { providerId: true, computedAt: true, placements: true, houses: true },
  });
}

/**
 * Cache-first synastry lookup: the one place in apps/api that calls
 * scoreSynastry. Both the on-demand deck path and any future batch job go
 * through here so there is exactly one stored CompatibilityScore per
 * (pair, intent) combination.
 */
export async function getOrComputeCompatibility(
  userId1: string,
  userId2: string,
  opts: GetOrComputeOpts = {},
): Promise<CompatibilityScore> {
  const { userAId, userBId } = orderPair(userId1, userId2);
  const intent = opts.intent ?? NEUTRAL_INTENT; // DB sentinel, used for the where/upsert key below

  const existing = await prisma.compatibilityScore.findUnique({
    where: { userAId_userBId_intent: { userAId, userBId, intent } },
  });
  if (existing && existing.synastryVersion === SYNASTRY_VERSION) {
    return existing;
  }

  const rowForUserA = userAId === userId1 ? opts.chartRow1 : opts.chartRow2;
  const rowForUserB = userBId === userId2 ? opts.chartRow2 : opts.chartRow1;

  const [chartRowA, chartRowB] = await Promise.all([
    rowForUserA ?? loadChartRow(userAId),
    rowForUserB ?? loadChartRow(userBId),
  ]);

  // Always score in canonical-pair order so the stored result is the same
  // regardless of which user's request triggered the computation.
  const result = scoreSynastry(toNatalChart(chartRowA), toNatalChart(chartRowB), { weights: resolveWeights(opts.intent ?? null) });

  return prisma.compatibilityScore.upsert({
    where: { userAId_userBId_intent: { userAId, userBId, intent } },
    create: {
      userAId,
      userBId,
      intent,
      score: result.score,
      aspects: result.aspects as unknown as object,
      highlights: result.highlights as unknown as object,
      synastryVersion: result.synastryVersion,
    },
    update: {
      score: result.score,
      aspects: result.aspects as unknown as object,
      highlights: result.highlights as unknown as object,
      synastryVersion: result.synastryVersion,
      computedAt: new Date(),
    },
  });
}

/**
 * Documented seam for future per-viewer wording (e.g. swapping "Your"/"their"
 * in highlight text). Score and highlights are viewer-symmetric today, so
 * this is currently a pass-through - kept as the single call site so that
 * future personalization doesn't require touching every caller.
 */
export function resolveSynastryPerspective(
  compat: Pick<CompatibilityScore, "score" | "highlights" | "aspects">,
  _viewerId: string,
): { score: number; highlights: CompatibilityScore["highlights"]; aspects: CompatibilityScore["aspects"] } {
  return { score: compat.score, highlights: compat.highlights, aspects: compat.aspects };
}
