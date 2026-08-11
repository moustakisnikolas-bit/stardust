import { describe, expect, it } from "vitest";
import type { NatalChart, Placement } from "@stardust/shared-types";
import { scoreSynastry } from "./scoreSynastry.js";

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

describe("scoreSynastry", () => {
  it("scores an exact trine at the top of the range", () => {
    const a = chartOf([{ body: "Sun", longitudeDegrees: 0 }]);
    const b = chartOf([{ body: "Sun", longitudeDegrees: 120 }]);
    const result = scoreSynastry(a, b);
    expect(result.score).toBe(100);
    expect(result.aspects).toHaveLength(1);
    expect(result.aspects[0].aspectType).toBe("trine");
  });

  it("scores an exact opposition at the bottom of the range", () => {
    const a = chartOf([{ body: "Sun", longitudeDegrees: 0 }]);
    const b = chartOf([{ body: "Sun", longitudeDegrees: 180 }]);
    const result = scoreSynastry(a, b);
    expect(result.score).toBe(0);
    expect(result.aspects[0].aspectType).toBe("opposition");
  });

  it("scores a square below neutral", () => {
    const a = chartOf([{ body: "Sun", longitudeDegrees: 0 }]);
    const b = chartOf([{ body: "Sun", longitudeDegrees: 90 }]);
    const result = scoreSynastry(a, b);
    expect(result.score).toBeLessThan(30);
  });

  it("returns a neutral score when no aspects are within orb", () => {
    const a = chartOf([{ body: "Sun", longitudeDegrees: 0 }]);
    const b = chartOf([{ body: "Sun", longitudeDegrees: 45 }]);
    const result = scoreSynastry(a, b);
    expect(result.score).toBe(50);
    expect(result.aspects).toHaveLength(0);
  });

  it("scores a chart pair with only harmonious aspects near 100, all-challenging near 0", () => {
    const harmoniousA = chartOf([
      { body: "Sun", longitudeDegrees: 0 },
      { body: "Moon", longitudeDegrees: 200 },
    ]);
    const harmoniousB = chartOf([
      { body: "Sun", longitudeDegrees: 120 }, // trine to A.Sun
      { body: "Moon", longitudeDegrees: 320 }, // trine to A.Moon
    ]);
    const harmonious = scoreSynastry(harmoniousA, harmoniousB);
    expect(harmonious.score).toBeGreaterThanOrEqual(95);

    const challengingB = chartOf([
      { body: "Sun", longitudeDegrees: 90 }, // square to A.Sun
      { body: "Moon", longitudeDegrees: 290 }, // square to A.Moon
    ]);
    const challenging = scoreSynastry(harmoniousA, challengingB);
    expect(challenging.score).toBeLessThanOrEqual(15);
  });

  it("ranks highlights by weighted significance, capped at 5", () => {
    const a = chartOf([
      { body: "Sun", longitudeDegrees: 0 },
      { body: "Moon", longitudeDegrees: 40 },
      { body: "Mercury", longitudeDegrees: 90 },
      { body: "Venus", longitudeDegrees: 130 },
      { body: "Mars", longitudeDegrees: 170 },
      { body: "Jupiter", longitudeDegrees: 210 },
      { body: "Saturn", longitudeDegrees: 250 },
      { body: "Ascendant", longitudeDegrees: 300 },
    ]);
    const b = chartOf([
      { body: "Sun", longitudeDegrees: 120 },
      { body: "Moon", longitudeDegrees: 160 },
      { body: "Mercury", longitudeDegrees: 210 },
      { body: "Venus", longitudeDegrees: 250 },
      { body: "Mars", longitudeDegrees: 290 },
      { body: "Jupiter", longitudeDegrees: 330 },
      { body: "Saturn", longitudeDegrees: 10 },
      { body: "Ascendant", longitudeDegrees: 60 },
    ]);
    const result = scoreSynastry(a, b);
    expect(result.highlights.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.highlights.length; i++) {
      expect(result.highlights[i - 1].weight).toBeGreaterThanOrEqual(result.highlights[i].weight);
    }
  });
});
