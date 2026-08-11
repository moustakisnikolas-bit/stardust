import type { BirthDataInput } from "@stardust/shared-types";
import { resolveProvider } from "@stardust/astrology-core";
import { prisma } from "../../lib/prisma.js";
import { resolveTimezone } from "./timezoneService.js";

export async function completeOnboarding(userId: string, input: BirthDataInput) {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = input.timeUnknown || !input.birthTime ? [12, 0] : input.birthTime.split(":").map(Number);

  const { timezoneId, utcOffsetMinutesAtBirth } = resolveTimezone(input.latitude, input.longitude, {
    year,
    month,
    day,
    hour,
    minute,
  });

  const provider = resolveProvider();
  const chart = await provider.getNatalChart({
    year,
    month,
    day,
    hour,
    minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timezoneId,
  });

  const now = new Date();

  const [birthData, natalChart] = await prisma.$transaction([
    prisma.birthData.upsert({
      where: { userId },
      create: {
        userId,
        birthDate: new Date(Date.UTC(year, month - 1, day)),
        birthTime: input.timeUnknown ? null : input.birthTime,
        timeUnknown: input.timeUnknown,
        birthLocationRaw: input.birthLocationRaw,
        latitude: input.latitude,
        longitude: input.longitude,
        timezoneId,
        utcOffsetMinutesAtBirth,
        geocodeProvider: "nominatim",
      },
      update: {
        birthDate: new Date(Date.UTC(year, month - 1, day)),
        birthTime: input.timeUnknown ? null : input.birthTime,
        timeUnknown: input.timeUnknown,
        birthLocationRaw: input.birthLocationRaw,
        latitude: input.latitude,
        longitude: input.longitude,
        timezoneId,
        utcOffsetMinutesAtBirth,
      },
    }),
    prisma.natalChart.upsert({
      where: { userId },
      create: {
        userId,
        providerId: provider.id,
        computedAt: now,
        raw: chart as unknown as object,
        placements: chart.placements as unknown as object,
        houses: chart.houses as unknown as object,
      },
      update: {
        providerId: provider.id,
        computedAt: now,
        raw: chart as unknown as object,
        placements: chart.placements as unknown as object,
        houses: chart.houses as unknown as object,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: now },
    }),
  ]);

  return { birthData, natalChart };
}
