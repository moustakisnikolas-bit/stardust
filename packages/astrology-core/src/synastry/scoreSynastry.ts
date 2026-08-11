import {
  SYNASTRY_BODIES,
  type NatalChart,
  type SynastryAspect,
  type SynastryHighlight,
  type SynastryResult,
} from "@stardust/shared-types";
import { ASPECT_VALENCE, BODY_SIGNIFICANCE, angularSeparation, findAspect } from "./aspects.js";
import { describeAspect } from "./aspectDescriptions.js";

/** Bump whenever the scoring formula changes - invalidates cached CompatibilityScore rows. */
export const SYNASTRY_VERSION = 1;

const MAX_HIGHLIGHTS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function scoreSynastry(chartA: NatalChart, chartB: NatalChart): SynastryResult {
  const placementsA = chartA.placements.filter((p) => (SYNASTRY_BODIES as readonly string[]).includes(p.body));
  const placementsB = chartB.placements.filter((p) => (SYNASTRY_BODIES as readonly string[]).includes(p.body));

  const aspects: SynastryAspect[] = [];
  let weightedValenceSum = 0;
  let totalWeight = 0;

  for (const a of placementsA) {
    for (const b of placementsB) {
      const angle = angularSeparation(a.longitudeDegrees, b.longitudeDegrees);
      const match = findAspect(angle);
      if (!match) continue;

      const significanceProduct = (BODY_SIGNIFICANCE[a.body] ?? 1) * (BODY_SIGNIFICANCE[b.body] ?? 1);
      const orbCloseness = 1 - match.orb / match.definition.orb;
      const weight = significanceProduct * orbCloseness;

      totalWeight += weight;
      weightedValenceSum += weight * ASPECT_VALENCE[match.definition.type];

      aspects.push({
        bodyA: a.body,
        bodyB: b.body,
        aspectType: match.definition.type,
        exactAngle: angle,
        orb: match.orb,
        weight,
      });
    }
  }

  // Weighted-average valence across every detected aspect, mapped from
  // [-1, 1] onto a 0-100 score. No aspects at all -> neutral 50.
  const averageValence = totalWeight > 0 ? weightedValenceSum / totalWeight : 0;
  const score = clamp(Math.round(50 + averageValence * 50), 0, 100);

  const highlights: SynastryHighlight[] = [...aspects]
    .sort((x, y) => y.weight - x.weight)
    .slice(0, MAX_HIGHLIGHTS)
    .map((aspect) => ({
      ...aspect,
      description: describeAspect(aspect.bodyA, aspect.bodyB, aspect.aspectType),
    }));

  return { score, aspects, highlights, synastryVersion: SYNASTRY_VERSION };
}
