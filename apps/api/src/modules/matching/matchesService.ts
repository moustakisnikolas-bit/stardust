import type { MatchSummary } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { getOrComputeCompatibility, resolveSynastryPerspective } from "./compatibilityService.js";

const userSelect = {
  id: true,
  displayName: true,
  photos: { orderBy: { position: "asc" as const }, select: { url: true } },
};

export async function listMatches(userId: string): Promise<MatchSummary[]> {
  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }], unmatchedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      userA: { select: userSelect },
      userB: { select: userSelect },
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true } },
    },
  });

  return Promise.all(
    matches.map(async (match) => {
      const otherUser = match.userAId === userId ? match.userB : match.userA;
      const compat = await getOrComputeCompatibility(match.userAId, match.userBId);
      const { score } = resolveSynastryPerspective(compat, userId);

      return {
        matchId: match.id,
        otherUser: {
          userId: otherUser.id,
          displayName: otherUser.displayName,
          photoUrls: otherUser.photos.map((p) => p.url),
        },
        compatibilityScore: score,
        createdAt: match.createdAt.toISOString(),
        lastMessagePreview: match.messages[0]?.body ?? null,
      };
    }),
  );
}
