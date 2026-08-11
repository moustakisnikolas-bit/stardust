import type { AstrologyProvider } from "./AstrologyProvider.js";
import { SwissEphemerisProvider } from "./SwissEphemerisProvider.js";

const providers = new Map<string, AstrologyProvider>();

function register(provider: AstrologyProvider): void {
  providers.set(provider.id, provider);
}

register(new SwissEphemerisProvider());
// Phase 4 adds more providers here (Prokerala, FreeAstrologyAPI, ...) behind
// the same AstrologyProvider interface, once API keys are available to test
// them against real birth data via scripts/compare-providers.ts.

export function getProvider(id: string): AstrologyProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Unknown astrology provider: "${id}". Registered: ${[...providers.keys()].join(", ")}`);
  }
  return provider;
}

export function listProviders(): AstrologyProvider[] {
  return [...providers.values()];
}

/**
 * Resolves the active provider for a given birth country, falling back to
 * ASTROLOGY_PROVIDER_DEFAULT (env) and then to Swiss Ephemeris. Per-country
 * overrides are set via ASTROLOGY_PROVIDER_BY_COUNTRY, a JSON map of
 * ISO country code -> provider id, e.g. {"US":"swiss-ephemeris","GR":"prokerala"}.
 * Populated once provider comparison (Phase 4) identifies regional accuracy gaps.
 */
export function resolveProvider(countryCode?: string): AstrologyProvider {
  const defaultId = process.env.ASTROLOGY_PROVIDER_DEFAULT ?? "swiss-ephemeris";

  if (countryCode) {
    const overridesRaw = process.env.ASTROLOGY_PROVIDER_BY_COUNTRY;
    if (overridesRaw) {
      try {
        const overrides = JSON.parse(overridesRaw) as Record<string, string>;
        const overrideId = overrides[countryCode.toUpperCase()];
        if (overrideId) return getProvider(overrideId);
      } catch {
        // malformed config falls through to the default provider
      }
    }
  }

  return getProvider(defaultId);
}
