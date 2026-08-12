import { DateTime } from "luxon";
import type { ChartBody, HouseCusp, NatalChart, Placement, ZodiacSign } from "@stardust/shared-types";
import type { AstrologyProvider, BirthInput, ProviderCapabilities } from "./AstrologyProvider.js";

const TOKEN_URL = "https://api.prokerala.com/token";
const NATAL_URL = "https://api.prokerala.com/v2/astrology/natal-planet-position";

interface ProkeralaTokenResponse {
  access_token: string;
  expires_in: number;
}

interface ProkeralaPosition {
  name: string;
  longitude: number;
  degree: number;
  is_retrograde: boolean;
  house_number: number;
  zodiac: { name: string };
}

interface ProkeralaHouse {
  number: number;
  start_cusp: { longitude: number; zodiac: { name: string } };
}

interface ProkeralaResponse {
  status: string;
  data?: {
    houses: ProkeralaHouse[];
    planet_positions: ProkeralaPosition[];
    angles: ProkeralaPosition[];
  };
  errors?: Array<{ title: string; detail: string }>;
}

// Verified against the real API (2026-08) - only the bodies present in our
// ChartBody set are mapped; Chiron/Lilith/Lunar Nodes/Nadir/Descendant from
// the response are intentionally skipped.
const BODY_NAME_MAP: Partial<Record<string, ChartBody>> = {
  Sun: "Sun",
  Moon: "Moon",
  Mercury: "Mercury",
  Venus: "Venus",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Uranus: "Uranus",
  Neptune: "Neptune",
  Pluto: "Pluto",
  Ascendant: "Ascendant",
  "Mid Heaven": "MC",
};

function toPlacement(p: ProkeralaPosition, body: ChartBody): Placement {
  return {
    body,
    sign: p.zodiac.name as ZodiacSign,
    longitudeDegrees: p.longitude,
    degreeInSign: p.degree,
    house: p.house_number,
    retrograde: p.is_retrograde,
  };
}

/**
 * Client-credentials OAuth2 + REST client for https://api.prokerala.com.
 * Verified against the live API with real sandbox credentials before
 * writing this - see docs/milestones/05-provider-validation.md for the
 * verification run and the sandbox-mode date restriction it uncovered
 * (only January 1st, any year, is accepted on a sandbox/free-tier key).
 */
export class ProkeralaProvider implements AstrologyProvider {
  readonly id = "prokerala";

  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  getCapabilities(): ProviderCapabilities {
    return { supportsHouses: true, requiresApiKey: true };
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!res.ok) {
      throw new Error(`Prokerala token request failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as ProkeralaTokenResponse;
    // Refresh a minute early so a near-expiry token is never used mid-request.
    this.tokenCache = { token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
    return this.tokenCache.token;
  }

  async getNatalChart(input: BirthInput): Promise<NatalChart> {
    if (!input.timezoneId) {
      throw new Error("ProkeralaProvider requires a resolved IANA timezoneId in the birth input");
    }

    const dt = DateTime.fromObject(
      { year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute },
      { zone: input.timezoneId },
    );
    if (!dt.isValid) {
      throw new Error(`Invalid birth date/time for zone ${input.timezoneId}: ${dt.invalidReason ?? "unknown"}`);
    }

    const token = await this.getAccessToken();
    const url = new URL(NATAL_URL);
    url.searchParams.set("profile[datetime]", dt.toISO({ suppressMilliseconds: true })!);
    url.searchParams.set("profile[coordinates]", `${input.latitude},${input.longitude}`);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as ProkeralaResponse;
    if (!res.ok || json.status !== "ok" || !json.data) {
      const detail = json.errors?.map((e) => `${e.title}: ${e.detail}`).join("; ") ?? `HTTP ${res.status}`;
      throw new Error(`Prokerala natal-planet-position request failed: ${detail}`);
    }

    const placements: Placement[] = [];
    for (const p of [...json.data.planet_positions, ...json.data.angles]) {
      const body = BODY_NAME_MAP[p.name];
      if (!body) continue;
      placements.push(toPlacement(p, body));
    }

    const houses: HouseCusp[] = json.data.houses.map((h) => ({
      house: h.number,
      longitudeDegrees: h.start_cusp.longitude,
      sign: h.start_cusp.zodiac.name as ZodiacSign,
    }));

    return {
      providerId: this.id,
      computedAt: new Date().toISOString(),
      placements,
      houses,
    };
  }
}
