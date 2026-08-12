import type { AstrologyProvider } from "./AstrologyProvider.js";
import { SwissEphemerisProvider } from "./SwissEphemerisProvider.js";
import { ProkeralaProvider } from "./ProkeralaProvider.js";

const providers = new Map<string, AstrologyProvider>();

function register(provider: AstrologyProvider): void {
  providers.set(provider.id, provider);
}

register(new SwissEphemerisProvider());

// Only registered when credentials are configured, so an unconfigured
// third-party provider is simply absent from listProviders() rather than
// crashing startup - same pattern used for OAuth providers in apps/api.
if (process.env.PROKERALA_CLIENT_ID && process.env.PROKERALA_CLIENT_SECRET) {
  register(new ProkeralaProvider(process.env.PROKERALA_CLIENT_ID, process.env.PROKERALA_CLIENT_SECRET));
}

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
