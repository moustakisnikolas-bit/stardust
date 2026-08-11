import { Router } from "express";
import { z } from "zod";
import { birthDataSchema } from "@stardust/shared-types";
import { authGuard } from "../../middleware/authGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { prisma } from "../../lib/prisma.js";
import { searchLocations } from "./geocodeService.js";
import { completeOnboarding } from "./onboardingService.js";

export const onboardingRoutes = Router();

onboardingRoutes.use(authGuard);

const geocodeQuerySchema = z.object({ q: z.string().min(2) });

onboardingRoutes.get(
  "/geocode",
  asyncHandler(async (req, res) => {
    const { q } = geocodeQuerySchema.parse(req.query);
    const results = await searchLocations(q);
    res.json({ results });
  }),
);

onboardingRoutes.post(
  "/birth-data",
  asyncHandler(async (req, res) => {
    const input = birthDataSchema.parse(req.body);
    if (!input.timeUnknown && !input.birthTime) {
      throw new HttpError(400, "VALIDATION_ERROR", "birthTime is required unless timeUnknown is true");
    }

    const { birthData, natalChart } = await completeOnboarding(req.userId!, input);
    res.status(200).json({ birthData, natalChart });
  }),
);

onboardingRoutes.get(
  "/chart",
  asyncHandler(async (req, res) => {
    const natalChart = await prisma.natalChart.findUnique({ where: { userId: req.userId } });
    if (!natalChart) {
      throw new HttpError(404, "NOT_FOUND", "Chart not computed yet - complete onboarding first");
    }
    res.json({ natalChart });
  }),
);
