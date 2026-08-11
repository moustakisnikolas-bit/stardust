import { describe, expect, it } from "vitest";
import { ZODIAC_SIGNS } from "@stardust/shared-types";
import { SwissEphemerisProvider } from "./SwissEphemerisProvider.js";

// Structural + determinism validation. Tight-tolerance accuracy checks against
// a trusted external reference (e.g. astro.com for a known real birth chart)
// should be run via `scripts/compare-providers.ts` per the plan's verification
// step, using the user's own real birth data.
describe("SwissEphemerisProvider", () => {
  const provider = new SwissEphemerisProvider();
  const input = {
    year: 1990,
    month: 6,
    day: 15,
    hour: 14,
    minute: 30,
    latitude: 37.9838,
    longitude: 23.7275, // Athens, Greece
  };

  it("computes all 10 planets plus Ascendant and MC", async () => {
    const chart = await provider.getNatalChart(input);
    const bodies = chart.placements.map((p) => p.body).sort();
    expect(bodies).toEqual(
      [
        "Ascendant",
        "MC",
        "Jupiter",
        "Mars",
        "Mercury",
        "Moon",
        "Neptune",
        "Pluto",
        "Saturn",
        "Sun",
        "Uranus",
        "Venus",
      ].sort(),
    );
  });

  it("produces valid signs, longitudes and houses", async () => {
    const chart = await provider.getNatalChart(input);
    for (const placement of chart.placements) {
      expect(ZODIAC_SIGNS).toContain(placement.sign);
      expect(placement.longitudeDegrees).toBeGreaterThanOrEqual(0);
      expect(placement.longitudeDegrees).toBeLessThan(360);
      expect(placement.degreeInSign).toBeGreaterThanOrEqual(0);
      expect(placement.degreeInSign).toBeLessThan(30);
    }
    expect(chart.houses).toHaveLength(12);
  });

  it("is deterministic for the same birth input", async () => {
    const chartA = await provider.getNatalChart(input);
    const chartB = await provider.getNatalChart(input);
    const sunA = chartA.placements.find((p) => p.body === "Sun");
    const sunB = chartB.placements.find((p) => p.body === "Sun");
    expect(sunA?.longitudeDegrees).toBeCloseTo(sunB?.longitudeDegrees ?? NaN, 6);
  });

  it("reports the sun sign matching the known Gemini/Cancer boundary for this date", async () => {
    const chart = await provider.getNatalChart(input);
    const sun = chart.placements.find((p) => p.body === "Sun");
    // June 15 is solidly within tropical Gemini (May 21 - Jun 21).
    expect(sun?.sign).toBe("Gemini");
  });
});
