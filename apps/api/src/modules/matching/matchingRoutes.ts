import { Router } from "express";
import { z } from "zod";
import { swipeInputSchema } from "@stardust/shared-types";
import { authGuard } from "../../middleware/authGuard.js";
import { onboardingGuard } from "../../middleware/onboardingGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getCandidateDeck } from "./candidatePoolService.js";
import { recordSwipe } from "./swipeService.js";
import { listMatches } from "./matchesService.js";

export const matchingRoutes = Router();

matchingRoutes.use(authGuard, onboardingGuard);

const deckQuerySchema = z.object({ cursor: z.string().uuid().optional() });

matchingRoutes.get(
  "/deck",
  asyncHandler(async (req, res) => {
    const { cursor } = deckQuerySchema.parse(req.query);
    const result = await getCandidateDeck(req.userId!, { cursor });
    res.json(result);
  }),
);

matchingRoutes.post(
  "/swipe",
  asyncHandler(async (req, res) => {
    const { swipeeId, direction } = swipeInputSchema.parse(req.body);
    const result = await recordSwipe(req.userId!, swipeeId, direction);
    res.json(result);
  }),
);

matchingRoutes.get(
  "/matches",
  asyncHandler(async (req, res) => {
    const matches = await listMatches(req.userId!);
    res.json({ matches });
  }),
);
