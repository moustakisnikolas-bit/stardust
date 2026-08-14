/**
 * Creates/deletes a small set of fully-onboarded test profiles for manual
 * testing in the browser (swiping, matching, chat, Stardust Plus). All test
 * profiles live under one marker email domain (TEST_DOMAIN below) - that's
 * the "specific place" that makes them trivial to find and wipe later,
 * without touching real accounts.
 *
 * Usage (API dev server must already be running):
 *   npx tsx scripts/test-profiles.ts create              # creates the 5 fixed profiles below
 *   npx tsx scripts/test-profiles.ts compatible <email>   # searches for + creates 5 high-scoring profiles against a real account's chart
 *   npx tsx scripts/test-profiles.ts list                 # shows which test profiles currently exist
 *   npx tsx scripts/test-profiles.ts delete               # deletes every user under TEST_DOMAIN
 */
import "../src/lib/loadEnv.js";
import { resolveProvider, scoreSynastry } from "@stardust/astrology-core";
import type { RelationshipIntent } from "@stardust/shared-types";
import { prisma } from "../src/lib/prisma.js";
import { toNatalChart } from "../src/modules/matching/chartMapper.js";

const BASE = `http://localhost:${process.env.PORT ?? 4000}`;
const TEST_DOMAIN = "stardust-test.local";
const TEST_PASSWORD = "TestPass123!";
const ATHENS = { lat: 37.9838, lon: 23.7275 };

interface Persona {
  slug: string;
  displayName: string;
  bio: string;
  gender: "woman" | "man" | "nonbinary";
  relationshipIntent: "casual" | "passionate" | "long_term" | "life_partner" | null;
  birthDate: string;
  birthTime: string;
}

const PERSONAS: Persona[] = [
  {
    slug: "luna",
    displayName: "Luna",
    bio: "Moon child, coffee first, chart second. Looking for something real.",
    gender: "woman",
    relationshipIntent: "life_partner",
    birthDate: "1992-04-10",
    birthTime: "08:15",
  },
  {
    slug: "nikos",
    displayName: "Nikos",
    bio: "Saturn in Capricorn and proud of it. Slow burn > fast spark.",
    gender: "man",
    relationshipIntent: "long_term",
    birthDate: "1989-11-02",
    birthTime: "21:40",
  },
  {
    slug: "elena",
    displayName: "Elena",
    bio: "Venus-Mars conjunction, act accordingly.",
    gender: "nonbinary",
    relationshipIntent: "passionate",
    birthDate: "1995-07-22",
    birthTime: "03:05",
  },
  {
    slug: "dimitri",
    displayName: "Dimitri",
    bio: "Just here for good conversation and better company.",
    gender: "man",
    relationshipIntent: "casual",
    birthDate: "1991-01-30",
    birthTime: "16:50",
  },
  {
    slug: "sophia",
    displayName: "Sophia",
    bio: "Still figuring out what I want - ask my chart, not me.",
    gender: "woman",
    relationshipIntent: null,
    birthDate: "1993-09-18",
    birthTime: "11:25",
  },
];

function emailFor(slug: string): string {
  return `${slug}@${TEST_DOMAIN}`;
}

async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${opts.method ?? "GET"} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function createPersona(p: Persona) {
  const email = emailFor(p.slug);
  const signup = await api("/api/auth/signup", { method: "POST", body: { email, password: TEST_PASSWORD } });
  const token = signup.tokens.accessToken as string;

  await api("/api/onboarding/birth-data", {
    method: "POST",
    token,
    body: {
      birthDate: p.birthDate,
      birthTime: p.birthTime,
      timeUnknown: false,
      birthLocationRaw: "Athens, Greece",
      latitude: ATHENS.lat,
      longitude: ATHENS.lon,
    },
  });

  await api("/api/users/me", {
    method: "PUT",
    token,
    body: {
      displayName: p.displayName,
      bio: p.bio,
      gender: p.gender,
      genderPreference: null,
      relationshipIntent: p.relationshipIntent,
    },
  });

  console.log(`  created ${email} (${p.displayName})`);
}

async function create() {
  console.log(`Creating ${PERSONAS.length} test profiles under @${TEST_DOMAIN} ...`);
  for (const p of PERSONAS) {
    await createPersona(p);
  }
  console.log(`\nAll set. Log into any of them at the web app's /login with password: ${TEST_PASSWORD}`);
  console.log(PERSONAS.map((p) => `  ${emailFor(p.slug)}`).join("\n"));
}

async function list() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${TEST_DOMAIN}` } },
    select: { email: true, displayName: true, onboardingCompletedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  if (users.length === 0) {
    console.log(`No test profiles found under @${TEST_DOMAIN}.`);
    return;
  }
  console.log(`${users.length} test profile(s) under @${TEST_DOMAIN}:`);
  for (const u of users) {
    console.log(`  ${u.email}  ${u.displayName ?? "(no name)"}  onboarded=${!!u.onboardingCompletedAt}`);
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface CompatibleWinner {
  score: number;
  birthDate: string;
  birthTime: string;
}

/**
 * Samples random Athens-born birth moments, scores each against the target
 * chart with the same neutral (unweighted) scoreSynastry used for deck
 * filtering, and keeps the top `count`. Uses the same provider call
 * (resolveProvider + raw year/month/day/hour/minute) that onboardingService
 * uses, so a winner's score here is reproduced exactly once it's actually
 * onboarded through the real API below - not an approximation.
 */
async function findCompatibleBirths(targetChart: Parameters<typeof scoreSynastry>[0], count: number, sampleSize: number) {
  const provider = resolveProvider();
  const results: CompatibleWinner[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const year = randomInt(1985, 2001);
    const month = randomInt(1, 12);
    const day = randomInt(1, 28);
    const hour = randomInt(0, 23);
    const minute = randomInt(0, 59);

    const chart = await provider.getNatalChart({
      year,
      month,
      day,
      hour,
      minute,
      latitude: ATHENS.lat,
      longitude: ATHENS.lon,
      timezoneId: "Europe/Athens",
    });
    const { score } = scoreSynastry(targetChart, chart);
    results.push({ score, birthDate: `${year}-${pad(month)}-${pad(day)}`, birthTime: `${pad(hour)}:${pad(minute)}` });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, count);
}

const COMPATIBLE_NAMES = ["Aria", "Vera", "Maya", "Zara", "Nadia"];
const COMPATIBLE_INTENTS: (RelationshipIntent | null)[] = ["life_partner", "long_term", "passionate", "casual", null];
const COMPATIBLE_BIOS = [
  "Here for the real thing, chart says you're worth the scroll.",
  "Slow and steady - Saturn doesn't rush, neither do I.",
  "Venus in a good mood lately. Let's find out why.",
  "Not overthinking this one - just here to see what happens.",
  "Not sure what I'm looking for yet, figured the stars might know first.",
];

async function createCompatible(targetEmail: string) {
  const targetUser = await prisma.user.findUnique({ where: { email: targetEmail }, include: { natalChart: true } });
  if (!targetUser?.natalChart) {
    throw new Error(`No onboarded user found for "${targetEmail}" - check the email and that onboarding is complete.`);
  }
  const targetChart = toNatalChart(targetUser.natalChart);

  const sampleSize = 500;
  console.log(`Sampling ${sampleSize} candidate charts against ${targetEmail}'s real chart ...`);
  const winners = await findCompatibleBirths(targetChart, COMPATIBLE_NAMES.length, sampleSize);

  console.log(`Creating ${winners.length} compatible profiles under @${TEST_DOMAIN} ...`);
  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    const email = emailFor(COMPATIBLE_NAMES[i].toLowerCase());
    const signup = await api("/api/auth/signup", { method: "POST", body: { email, password: TEST_PASSWORD } });
    const token = signup.tokens.accessToken as string;

    await api("/api/onboarding/birth-data", {
      method: "POST",
      token,
      body: {
        birthDate: w.birthDate,
        birthTime: w.birthTime,
        timeUnknown: false,
        birthLocationRaw: "Athens, Greece",
        latitude: ATHENS.lat,
        longitude: ATHENS.lon,
      },
    });

    await api("/api/users/me", {
      method: "PUT",
      token,
      body: {
        displayName: COMPATIBLE_NAMES[i],
        bio: COMPATIBLE_BIOS[i],
        gender: "woman",
        genderPreference: null,
        relationshipIntent: COMPATIBLE_INTENTS[i],
      },
    });

    console.log(`  created ${email} (${COMPATIBLE_NAMES[i]}) - score ${w.score} vs ${targetEmail}`);
  }

  console.log(`\nAll set. Log in as ${targetEmail} and check your deck - these 5 should be near the top.`);
}

async function del() {
  const result = await prisma.user.deleteMany({ where: { email: { endsWith: `@${TEST_DOMAIN}` } } });
  console.log(`Deleted ${result.count} test profile(s) under @${TEST_DOMAIN} (cascades: birth data, chart, photos, swipes, matches, messages, subscription).`);
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === "create") await create();
  else if (cmd === "compatible") {
    const email = process.argv[3];
    if (!email) {
      console.error("Usage: npx tsx scripts/test-profiles.ts compatible <target-email>");
      process.exit(1);
    }
    await createCompatible(email);
  } else if (cmd === "list") await list();
  else if (cmd === "delete") await del();
  else {
    console.error("Usage: npx tsx scripts/test-profiles.ts <create|compatible <email>|list|delete>");
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
