import { describe, expect, it } from "vitest";
import type { NatalChart, Placement } from "@stardust/shared-types";
import { scoreSynastry } from "./scoreSynastry.js";
import { resolveWeights } from "./intentWeights.js";

function chartOf(placements: Array<Pick<Placement, "body" | "longitudeDegrees">>): NatalChart {
  return {
    providerId: "test-fixture",
    computedAt: new Date().toISOString(),
    houses: [],
    placements: placements.map((p) => ({
      ...p,
      sign: "Aries",
      degreeInSign: p.longitudeDegrees % 30,
      house: null,
      retrograde: false,
    })),
  };
}

describe("resolveWeights", () => {
  it("falls back to the default table when no intent is given", () => {
    expect(resolveWeights(undefined)).toEqual(resolveWeights(null));
  });

  it("returns distinct tables for casual/passionate vs. long_term/life_partner", () => {
    const passionate = resolveWeights("passionate");
    const longTerm = resolveWeights("long_term");
    expect(passionate.Mars).toBeGreaterThan(longTerm.Mars);
    expect(longTerm.Saturn).toBeGreaterThan(passionate.Saturn);
  });
});

describe("intent-weighted scoreSynastry", () => {
  // Exact Venus-Mars trine (attraction/chemistry, harmonious) + exact
  // Moon-Saturn square (commitment-related, challenging) in the same pair -
  // the two intent profiles should pull the score in opposite directions.
  const a = chartOf([
    { body: "Venus", longitudeDegrees: 0 },
    { body: "Moon", longitudeDegrees: 200 },
  ]);
  const b = chartOf([
    { body: "Mars", longitudeDegrees: 120 }, // exact trine to Venus
    { body: "Saturn", longitudeDegrees: 290 }, // exact square to Moon
  ]);

  it("scores higher under passionate weights than long_term weights for a Venus-Mars-trine/Moon-Saturn-square pair", () => {
    const passionateScore = scoreSynastry(a, b, { weights: resolveWeights("passionate") }).score;
    const longTermScore = scoreSynastry(a, b, { weights: resolveWeights("long_term") }).score;

    expect(passionateScore).toBeGreaterThan(longTermScore);
    // Passionate weighting should push this specific pair above neutral (the
    // attraction aspect dominates); long_term weighting should push it below
    // neutral (the commitment-related square dominates).
    expect(passionateScore).toBeGreaterThan(50);
    expect(longTermScore).toBeLessThan(50);
  });

  it("omitting weights entirely still works and differs from either intent-specific result", () => {
    const neutral = scoreSynastry(a, b).score;
    const passionate = scoreSynastry(a, b, { weights: resolveWeights("passionate") }).score;
    const longTerm = scoreSynastry(a, b, { weights: resolveWeights("long_term") }).score;
    expect(neutral).not.toBe(passionate);
    expect(neutral).not.toBe(longTerm);
  });
});
