import type { ChartBody, RelationshipIntent } from "@stardust/shared-types";
import { BODY_SIGNIFICANCE } from "./aspects.js";

/**
 * Per-intent overrides of BODY_SIGNIFICANCE, grounded in traditional
 * synastry practice rather than picked arbitrarily:
 * - Venus/Mars contacts are the classical markers of attraction and physical
 *   chemistry - boosted for casual/passionate connections.
 * - Saturn contacts are the classical marker of lasting commitment and
 *   stability (traditionally under-weighted here at 0.9, same as Jupiter) -
 *   boosted along with Moon/Sun for long-term/life-partner intents.
 */
const CASUAL_PASSIONATE_WEIGHTS: Record<ChartBody, number> = {
  ...BODY_SIGNIFICANCE,
  Venus: 1.7,
  Mars: 1.8,
  Sun: 1.2,
  Moon: 1.2,
};

const LONG_TERM_WEIGHTS: Record<ChartBody, number> = {
  ...BODY_SIGNIFICANCE,
  Moon: 1.8,
  Saturn: 1.6,
  Sun: 1.7,
  Venus: 1.1,
  Mars: 1.1,
};

const INTENT_WEIGHTS: Partial<Record<RelationshipIntent, Record<ChartBody, number>>> = {
  casual: CASUAL_PASSIONATE_WEIGHTS,
  passionate: CASUAL_PASSIONATE_WEIGHTS,
  long_term: LONG_TERM_WEIGHTS,
  life_partner: LONG_TERM_WEIGHTS,
};

/** Falls back to the neutral default table when no intent (or an unrecognized one) is given. */
export function resolveWeights(intent?: RelationshipIntent | null): Record<ChartBody, number> {
  if (!intent) return BODY_SIGNIFICANCE;
  return INTENT_WEIGHTS[intent] ?? BODY_SIGNIFICANCE;
}
