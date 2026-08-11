export const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;
export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const CHART_BODIES = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Ascendant",
  "MC",
] as const;
export type ChartBody = (typeof CHART_BODIES)[number];

/** The synastry-relevant subset used for compatibility scoring. */
export const SYNASTRY_BODIES = [
  "Sun",
  "Moon",
  "Ascendant",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
] as const satisfies readonly ChartBody[];

export interface Placement {
  body: ChartBody;
  sign: ZodiacSign;
  /** Absolute ecliptic longitude in degrees, 0-360. */
  longitudeDegrees: number;
  /** Degrees within the sign, 0-30. */
  degreeInSign: number;
  house: number | null;
  retrograde: boolean;
}

export interface HouseCusp {
  house: number;
  longitudeDegrees: number;
  sign: ZodiacSign;
}

export interface NatalChart {
  providerId: string;
  computedAt: string;
  placements: Placement[];
  houses: HouseCusp[];
}

export type AspectType =
  | "conjunction"
  | "opposition"
  | "trine"
  | "square"
  | "sextile";

export interface SynastryAspect {
  bodyA: ChartBody;
  bodyB: ChartBody;
  aspectType: AspectType;
  exactAngle: number;
  orb: number;
  weight: number;
}

export interface SynastryHighlight extends SynastryAspect {
  description: string;
}

export interface SynastryResult {
  score: number;
  aspects: SynastryAspect[];
  highlights: SynastryHighlight[];
  synastryVersion: number;
}
