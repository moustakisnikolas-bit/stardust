/**
 * Single source of truth for ordering a user pair before any read/write of
 * CompatibilityScore or Match (both have @@unique([userAId, userBId])) -
 * every lookup/creation of those rows must go through this, never construct
 * {userAId, userBId} inline, so there's exactly one canonical row per pair
 * regardless of which user initiated the request.
 */
export function orderPair(userId1: string, userId2: string): { userAId: string; userBId: string } {
  return userId1 < userId2 ? { userAId: userId1, userBId: userId2 } : { userAId: userId2, userBId: userId1 };
}
