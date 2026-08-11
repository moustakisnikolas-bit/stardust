import { describe, expect, it } from "vitest";
import { toNatalChart } from "./chartMapper.js";

describe("toNatalChart", () => {
  it("round-trips a Prisma row into the typed NatalChart shape", () => {
    const computedAt = new Date("2024-01-01T00:00:00.000Z");
    const placements = [{ body: "Sun", sign: "Aries", longitudeDegrees: 10, degreeInSign: 10, house: 1, retrograde: false }];
    const houses = [{ house: 1, longitudeDegrees: 0, sign: "Aries" }];

    const chart = toNatalChart({ providerId: "swiss-ephemeris", computedAt, placements, houses });

    expect(chart).toEqual({
      providerId: "swiss-ephemeris",
      computedAt: "2024-01-01T00:00:00.000Z",
      placements,
      houses,
    });
  });
});
