import type { ChartBody, HouseCusp, NatalChart, Placement, ZodiacSign } from "@stardust/shared-types";
import type { AstrologyProvider, BirthInput, ProviderCapabilities } from "./AstrologyProvider.js";

// `circular-natal-horoscope-js` ships as a webpack UMD bundle. Node's ESM/CJS
// interop can't always statically detect its named exports, but a namespace
// import's `.default` reliably equals the full `module.exports` object, so we
// unwrap defensively instead of relying on `import { Origin, Horoscope }`.
import * as HoroscopeLibNamespace from "circular-natal-horoscope-js";

interface OriginInstance {
  utcTime: Date;
}

interface ChartPositionEcliptic {
  ChartPosition: { Ecliptic: { DecimalDegrees: number } };
}

interface CelestialBody extends ChartPositionEcliptic {
  key: string;
  Sign: { label: string; zodiacStart: number };
  House?: { id: number };
  isRetrograde?: boolean;
}

interface AngleBody extends ChartPositionEcliptic {
  key: string;
  Sign: { label: string; zodiacStart: number };
}

interface HouseEntry {
  id: number;
  Sign: { label: string };
  ChartPosition: { StartPosition: { Ecliptic: { DecimalDegrees: number } } };
}

interface HoroscopeInstance {
  CelestialBodies: Record<string, CelestialBody | CelestialBody[]>;
  Ascendant: AngleBody;
  Midheaven: AngleBody;
  Houses: HouseEntry[];
}

interface HoroscopeLib {
  Origin: new (args: {
    year: number;
    month: number;
    date: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
  }) => OriginInstance;
  Horoscope: new (args: {
    origin: OriginInstance;
    houseSystem: string;
    zodiac: string;
    aspectPoints: string[];
    aspectWithPoints: string[];
    aspectTypes: string[];
    language: string;
  }) => HoroscopeInstance;
}

const lib = ((HoroscopeLibNamespace as unknown as { default?: HoroscopeLib }).default ??
  HoroscopeLibNamespace) as unknown as HoroscopeLib;

const BODY_KEY_MAP: Record<string, ChartBody> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

function toPlacement(body: CelestialBody, chartBody: ChartBody, house: number | null): Placement {
  const longitudeDegrees = body.ChartPosition.Ecliptic.DecimalDegrees;
  return {
    body: chartBody,
    sign: body.Sign.label as ZodiacSign,
    longitudeDegrees,
    degreeInSign: longitudeDegrees - body.Sign.zodiacStart,
    house,
    retrograde: body.isRetrograde ?? false,
  };
}

function toAnglePlacement(angle: AngleBody, chartBody: ChartBody, house: number): Placement {
  const longitudeDegrees = angle.ChartPosition.Ecliptic.DecimalDegrees;
  return {
    body: chartBody,
    sign: angle.Sign.label as ZodiacSign,
    longitudeDegrees,
    degreeInSign: longitudeDegrees - angle.Sign.zodiacStart,
    house,
    retrograde: false,
  };
}

export class SwissEphemerisProvider implements AstrologyProvider {
  readonly id = "swiss-ephemeris";

  getCapabilities(): ProviderCapabilities {
    return { supportsHouses: true, requiresApiKey: false };
  }

  async getNatalChart(input: BirthInput): Promise<NatalChart> {
    const origin = new lib.Origin({
      year: input.year,
      month: input.month - 1, // library expects 0-indexed months
      date: input.day,
      hour: input.hour,
      minute: input.minute,
      latitude: input.latitude,
      longitude: input.longitude,
    });

    const horoscope = new lib.Horoscope({
      origin,
      houseSystem: "placidus",
      zodiac: "tropical",
      aspectPoints: ["bodies", "angles"],
      aspectWithPoints: ["bodies", "angles"],
      aspectTypes: ["major"],
      language: "en",
    });

    const placements: Placement[] = [];
    for (const [key, chartBody] of Object.entries(BODY_KEY_MAP)) {
      const entry = horoscope.CelestialBodies[key];
      const body = Array.isArray(entry) ? entry[0] : entry;
      if (!body) continue;
      placements.push(toPlacement(body, chartBody, body.House?.id ?? null));
    }
    placements.push(toAnglePlacement(horoscope.Ascendant, "Ascendant", 1));
    placements.push(toAnglePlacement(horoscope.Midheaven, "MC", 10));

    const houses: HouseCusp[] = horoscope.Houses.map((h) => ({
      house: h.id,
      longitudeDegrees: h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees,
      sign: h.Sign.label as ZodiacSign,
    }));

    return {
      providerId: this.id,
      computedAt: new Date().toISOString(),
      placements,
      houses,
    };
  }
}
