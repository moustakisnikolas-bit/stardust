import { scoreSynastry, SYNASTRY_VERSION } from "@stardust/astrology-core";
import type { CompatibilityScore } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { orderPair } from "./pairOrdering.js";
import { toNatalChart, type NatalChartRow } from "./chartMapper.js";

export interface GetOrComputeOpts {
  chartRow1?: NatalChartRow;
  chartRow2?: NatalChartRow;
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
 * through here so there is exactly one stored CompatibilityScore per pair.
 */
export async function getOrComputeCompatibility(
  userId1: string,
  userId2: string,
  opts: GetOrComputeOpts = {},
): Promise<CompatibilityScore> {
  const { userAId, userBId } = orderPair(userId1, userId2);

  const existing = await prisma.compatibilityScore.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
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
  const result = scoreSynastry(toNatalChart(chartRowA), toNatalChart(chartRowB));

  return prisma.compatibilityScore.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: {
      userAId,
      userBId,
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
  compat: Pick<CompatibilityScore, "score" | "highlights">,
  _viewerId: string,
): { score: number; highlights: CompatibilityScore["highlights"] } {
  return { score: compat.score, highlights: compat.highlights };
}
