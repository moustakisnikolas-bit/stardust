import type { GeocodeResult } from "@stardust/shared-types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

/**
 * Free, no-API-key geocoding via OpenStreetMap Nominatim. Good enough for MVP
 * / dev; swap for a paid provider (OpenCage, Google) behind this same
 * function signature if Nominatim's usage-policy rate limit (1 req/s) or
 * accuracy in a given region becomes a problem.
 */
export async function searchLocations(query: string, limit = 5): Promise<GeocodeResult[]> {
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: {
      "User-Agent": "StardustApp/0.1 (astrology birth-location onboarding)",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const results = (await response.json()) as NominatimResult[];
  return results.map((r) => ({
    displayName: r.display_name,
    latitude: Number(r.lat),
    longitude: Number(r.lon),
    provider: "nominatim",
    placeId: String(r.place_id),
  }));
}
