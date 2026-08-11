import { Router } from "express";
import { z } from "zod";
import { authGuard } from "../../middleware/authGuard.js";
import { onboardingGuard } from "../../middleware/onboardingGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { getMatchForParticipant, listMessages } from "./chatService.js";

export const chatRoutes = Router();

chatRoutes.use(authGuard, onboardingGuard);

const paramsSchema = z.object({ matchId: z.string().uuid() });
const querySchema = z.object({ cursor: z.string().uuid().optional() });

chatRoutes.get(
  "/:matchId/messages",
  asyncHandler(async (req, res) => {
    const { matchId } = paramsSchema.parse(req.params);
    const { cursor } = querySchema.parse(req.query);

    await getMatchForParticipant(matchId, req.userId!);
    const messages = await listMessages(matchId, { cursor });
    res.json({ messages });
  }),
);
