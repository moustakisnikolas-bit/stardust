/**
 * Runs one birth input through every registered astrology provider and
 * prints a side-by-side diff of placements, flagging any sign/degree
 * divergence beyond a threshold. Use this with your own real birth data to
 * validate providers before picking defaults (see ASTROLOGY_PROVIDER_BY_COUNTRY
 * in .env.example) - currently only swiss-ephemeris is registered; Phase 4
 * adds third-party API providers here once their keys are available.
 *
 * Usage:
 *   pnpm compare-providers -- --year=1990 --month=6 --day=15 --hour=14 --minute=30 --lat=37.9838 --lon=23.7275
 */
import "../src/lib/loadEnv.js";

import { find as findTimeZones } from "geo-tz";
import { listProviders, type BirthInput } from "@stardust/astrology-core";
import { prisma } from "../src/lib/prisma.js";

function parseArgs(): BirthInput {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value];
    }),
  );

  const required = ["year", "month", "day", "hour", "minute", "lat", "lon"];
  for (const key of required) {
    if (!(key in args)) {
      console.error(`Missing --${key}. Example: --year=1990 --month=6 --day=15 --hour=14 --minute=30 --lat=37.9838 --lon=23.7275`);
      process.exit(1);
    }
  }

  const latitude = Number(args.lat);
  const longitude = Number(args.lon);
  // Auto-resolved the same way onboardingService.ts does, unless --tz overrides it -
  // needed for providers (e.g. Prokerala) that require an explicit IANA zone.
  const timezoneId = args.tz ?? findTimeZones(latitude, longitude)[0];

  return {
    year: Number(args.year),
    month: Number(args.month),
    day: Number(args.day),
    hour: Number(args.hour),
    minute: Number(args.minute),
    latitude,
    longitude,
    timezoneId,
  };
}

async function main() {
  const input = parseArgs();
  const providers = listProviders();
  console.log(`Comparing ${providers.length} provider(s) for input:`, input);

  const results: Array<{ providerId: string; success: boolean; error?: string; placements?: Record<string, string> }> = [];

  for (const provider of providers) {
    const start = Date.now();
    try {
      const chart = await provider.getNatalChart(input);
      const latencyMs = Date.now() - start;
      await prisma.astrologyProviderRun.create({
        data: {
          providerId: provider.id,
          requestPayload: input as unknown as object,
          responseChart: chart as unknown as object,
          success: true,
          latencyMs,
        },
      });
      results.push({
        providerId: provider.id,
        success: true,
        placements: Object.fromEntries(
          chart.placements.map((p) => [p.body, `${p.sign} ${p.degreeInSign.toFixed(2)}° (house ${p.house ?? "-"})`]),
        ),
      });
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : String(err);
      await prisma.astrologyProviderRun.create({
        data: { providerId: provider.id, requestPayload: input as unknown as object, success: false, errorMessage, latencyMs },
      });
      results.push({ providerId: provider.id, success: false, error: errorMessage });
    }
  }

  console.log("\n=== Results ===");
  for (const r of results) {
    console.log(`\n--- ${r.providerId} ---`);
    if (!r.success) {
      console.log(`FAILED: ${r.error}`);
      continue;
    }
    for (const [body, placement] of Object.entries(r.placements ?? {})) {
      console.log(`${body.padEnd(10)} ${placement}`);
    }
  }

  if (results.filter((r) => r.success).length > 1) {
    console.log("\n=== Divergences (sign mismatches) ===");
    const bodies = Object.keys(results.find((r) => r.success)?.placements ?? {});
    for (const body of bodies) {
      const signs = new Set(results.filter((r) => r.success).map((r) => r.placements?.[body]?.split(" ")[0]));
      if (signs.size > 1) {
        console.log(`${body}: providers disagree ->`, [...signs].join(" vs "));
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
