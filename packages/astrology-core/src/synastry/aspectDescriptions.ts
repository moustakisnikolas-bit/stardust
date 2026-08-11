import type { AspectType, ChartBody } from "@stardust/shared-types";

const CURATED: Partial<Record<string, string>> = {
  "Sun-Moon-conjunction": "A natural sense of ease and mutual understanding",
  "Sun-Moon-trine": "Your core identity and their emotional nature flow together effortlessly",
  "Sun-Moon-square": "Strong pull with real friction between what you want and what they need",
  "Venus-Mars-trine": "Easy, mutual attraction",
  "Venus-Mars-conjunction": "Intense romantic and physical chemistry",
  "Venus-Mars-square": "Magnetic tension - attraction mixed with friction",
  "Venus-Venus-trine": "Shared taste in affection and what you both find beautiful",
  "Venus-Moon-trine": "Emotional warmth and easy affection",
  "Sun-Ascendant-conjunction": "Immediate, strong first impression",
  "Moon-Moon-trine": "You intuitively understand each other's moods",
  "Sun-Venus-trine": "They naturally appreciate who you are",
  "Mars-Mars-square": "Competing drives - can spark passion or clashes",
};

function valenceWord(aspectType: AspectType): string {
  switch (aspectType) {
    case "trine":
    case "sextile":
      return "harmonious";
    case "conjunction":
      return "intense";
    case "square":
      return "tense";
    case "opposition":
      return "polarizing";
  }
}

export function describeAspect(bodyA: ChartBody, bodyB: ChartBody, aspectType: AspectType): string {
  const key = `${bodyA}-${bodyB}-${aspectType}`;
  const reverseKey = `${bodyB}-${bodyA}-${aspectType}`;
  const curated = CURATED[key] ?? CURATED[reverseKey];
  if (curated) return curated;
  return `Your ${bodyA} forms a ${valenceWord(aspectType)} ${aspectType} with their ${bodyB}`;
}
