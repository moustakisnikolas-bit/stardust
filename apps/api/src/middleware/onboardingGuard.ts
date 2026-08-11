import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

/** Blocks access to swipe/match/chat routes until birth data + chart are complete. */
export async function onboardingGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { onboardingCompletedAt: true },
  });

  if (!user?.onboardingCompletedAt) {
    res.status(403).json({ error: "ONBOARDING_REQUIRED", message: "Complete birth-data onboarding first" });
    return;
  }

  next();
}
