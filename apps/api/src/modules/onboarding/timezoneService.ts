import { find as findTimeZones } from "geo-tz";
import { DateTime } from "luxon";

export interface LocalDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ResolvedTimezone {
  timezoneId: string;
  /** Historical UTC offset in minutes at this exact local instant (accounts for DST + past tz-boundary changes). */
  utcOffsetMinutesAtBirth: number;
}

/**
 * Resolves the IANA timezone for a coordinate and the *historical* UTC offset
 * for a specific local date/time in it - not just today's offset. DST rules
 * and even timezone boundaries have shifted over the decades, so this must be
 * computed per-birth-instant rather than assumed from the zone's current rules.
 */
export function resolveTimezone(latitude: number, longitude: number, local: LocalDateTimeParts): ResolvedTimezone {
  const [timezoneId] = findTimeZones(latitude, longitude);
  if (!timezoneId) {
    throw new Error(`Could not resolve a timezone for coordinates (${latitude}, ${longitude})`);
  }

  const dt = DateTime.fromObject(
    { year: local.year, month: local.month, day: local.day, hour: local.hour, minute: local.minute },
    { zone: timezoneId },
  );

  if (!dt.isValid) {
    throw new Error(`Invalid birth date/time for zone ${timezoneId}: ${dt.invalidReason ?? "unknown"}`);
  }

  return { timezoneId, utcOffsetMinutesAtBirth: dt.offset };
}
