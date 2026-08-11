import type { SwipeDirection, SwipeResult } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { orderPair } from "./pairOrdering.js";

export async function recordSwipe(swiperId: string, swipeeId: string, direction: SwipeDirection): Promise<SwipeResult> {
  if (swiperId === swipeeId) {
    throw new HttpError(400, "VALIDATION_ERROR", "Cannot swipe on yourself");
  }

  const swipee = await prisma.user.findUnique({ where: { id: swipeeId }, select: { id: true } });
  if (!swipee) {
    throw new HttpError(404, "CANDIDATE_NOT_FOUND", "That user does not exist");
  }

  const { userAId, userBId } = orderPair(swiperId, swipeeId);
  const pairKey = `${userAId}:${userBId}`;

  return prisma.$transaction(async (tx) => {
    // Transaction-scoped advisory lock keyed on the canonical pair: if both
    // users' swipe requests land near-simultaneously, the second blocks here
    // until the first commits, then sees its already-committed swipe row.
    // Without this, both transactions could evaluate "does a reverse LIKE
    // exist?" before either commits, and neither would produce a match.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pairKey})::bigint)`;

    await tx.swipe.upsert({
      where: { swiperId_swipeeId: { swiperId, swipeeId } },
      create: { swiperId, swipeeId, direction },
      update: { direction },
    });

    if (direction === "PASS") {
      return { matched: false, matchId: null };
    }

    const reverse = await tx.swipe.findUnique({
      where: { swiperId_swipeeId: { swiperId: swipeeId, swipeeId: swiperId } },
    });

    if (reverse?.direction !== "LIKE") {
      return { matched: false, matchId: null };
    }

    const match = await tx.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId },
      update: {},
    });

    return { matched: true, matchId: match.id };
  });
}
