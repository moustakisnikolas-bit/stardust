import type { NatalChart } from "@stardust/shared-types";

/**
 * Local civil date/time at the birth location, plus coordinates.
 * Providers are responsible for resolving the historical UTC offset
 * themselves (or delegating to the caller's resolved timezoneId) -
 * callers should NOT pre-convert to UTC.
 */
export interface BirthInput {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** 0-23, local time. Defaults to noon-ish assumptions are the caller's problem if unknown. */
  hour: number;
  /** 0-59 */
  minute: number;
  latitude: number;
  longitude: number;
  /** IANA zone id, informational - most providers derive this themselves from lat/lon. */
  timezoneId?: string;
}

export interface ProviderCapabilities {
  supportsHouses: boolean;
  requiresApiKey: boolean;
  /** ISO country codes this provider is known to be reliable for, if constrained. Undefined = assumed global. */
  supportedRegions?: string[];
}

export interface AstrologyProvider {
  readonly id: string;
  getCapabilities(): ProviderCapabilities;
  getNatalChart(input: BirthInput): Promise<NatalChart>;
}
