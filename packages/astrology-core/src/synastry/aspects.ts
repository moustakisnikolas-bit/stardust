import type { AspectType, ChartBody } from "@stardust/shared-types";

export interface AspectDefinition {
  type: AspectType;
  angle: number;
  orb: number;
}

/** Classical major aspects with standard orb tolerances (degrees). */
export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "sextile", angle: 60, orb: 6 },
  { type: "square", angle: 90, orb: 7 },
  { type: "trine", angle: 120, orb: 8 },
  { type: "opposition", angle: 180, orb: 8 },
];

/**
 * How much each aspect type contributes to compatibility, from -1 (maximally
 * challenging) to 1 (maximally harmonious). Conjunction is treated as a
 * strong-but-mixed blending of energies rather than purely positive.
 */
export const ASPECT_VALENCE: Record<AspectType, number> = {
  trine: 1.0,
  sextile: 0.6,
  conjunction: 0.4,
  square: -0.85,
  opposition: -1.0,
};

/** Relative significance of each body in synastry - how much weight an aspect involving it carries. */
export const BODY_SIGNIFICANCE: Record<ChartBody, number> = {
  Sun: 1.5,
  Moon: 1.5,
  Ascendant: 1.3,
  Venus: 1.3,
  Mars: 1.3,
  Mercury: 1.0,
  Jupiter: 0.9,
  Saturn: 0.9,
  MC: 1.0,
  Uranus: 0.7,
  Neptune: 0.7,
  Pluto: 0.7,
};

export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export interface AspectMatch {
  definition: AspectDefinition;
  orb: number;
}

/** Returns the closest-orb aspect the given angle falls within, or null if none match. */
export function findAspect(angle: number): AspectMatch | null {
  let best: AspectMatch | null = null;
  for (const definition of ASPECT_DEFINITIONS) {
    const orb = Math.abs(angle - definition.angle);
    if (orb <= definition.orb && (!best || orb < best.orb)) {
      best = { definition, orb };
    }
  }
  return best;
}
