import { Router } from "express";
import { z } from "zod";
import { swipeInputSchema } from "@stardust/shared-types";
import type { RewindResult } from "@stardust/shared-types";
import { authGuard } from "../../middleware/authGuard.js";
import { onboardingGuard } from "../../middleware/onboardingGuard.js";
import { paidGuard } from "../billing/paidGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getCandidateDeck } from "./candidatePoolService.js";
import { recordSwipe, rewindLastSwipe } from "./swipeService.js";
import { listMatches } from "./matchesService.js";
import { listIncomingLikes } from "./likesService.js";
import { activateBoost } from "./boostService.js";

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

matchingRoutes.post(
  "/rewind",
  paidGuard,
  asyncHandler(async (req, res) => {
    const result: RewindResult = await rewindLastSwipe(req.userId!);
    res.json(result);
  }),
);

matchingRoutes.get(
  "/likes",
  paidGuard,
  asyncHandler(async (req, res) => {
    const likes = await listIncomingLikes(req.userId!);
    res.json({ likes });
  }),
);

matchingRoutes.post(
  "/boost",
  paidGuard,
  asyncHandler(async (req, res) => {
    const boostedUntil = await activateBoost(req.userId!);
    res.json({ boostedUntil: boostedUntil.toISOString() });
  }),
);
