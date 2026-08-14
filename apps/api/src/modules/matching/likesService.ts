import type { IncomingLike } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { getOrComputeCompatibility, resolveSynastryPerspective } from "./compatibilityService.js";

/** Stardust Plus only (paid-gated at the route). */
export async function listIncomingLikes(userId: string): Promise<IncomingLike[]> {
  const rows = await prisma.swipe.findMany({
    where: {
      swipeeId: userId,
      direction: "LIKE",
      // Excludes anyone I've already swiped back on, in either direction -
      // a LIKE-back would already be a Match, and a PASS means I've decided.
      swiper: { swipesReceived: { none: { swiperId: userId } } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      swiper: { include: { photos: { orderBy: { position: "asc" }, select: { url: true } } } },
    },
  });

  return Promise.all(
    rows.map(async (row) => {
      const compat = await getOrComputeCompatibility(userId, row.swiper.id);
      const { score } = resolveSynastryPerspective(compat, userId);
      return {
        userId: row.swiper.id,
        displayName: row.swiper.displayName,
        photoUrls: row.swiper.photos.map((p) => p.url),
        compatibilityScore: score,
        createdAt: row.createdAt.toISOString(),
      };
    }),
  );
}
