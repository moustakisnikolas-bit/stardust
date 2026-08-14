import { z } from "zod";
import type { SynastryAspect, SynastryHighlight } from "./chart";

export type SwipeDirection = "LIKE" | "PASS";

export interface CandidateProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  photoUrls: string[];
  compatibilityScore: number;
  highlights: SynastryHighlight[];
  /** Stardust Plus only: every detected aspect, not just the top highlights. Undefined for free users. */
  allAspects?: SynastryAspect[];
  /** Stardust Plus only: both users share the same relationshipIntent. Undefined for free users. */
  bothWantSameIntent?: boolean;
}

export interface MatchSummary {
  matchId: string;
  otherUser: {
    userId: string;
    displayName: string | null;
    photoUrls: string[];
  };
  compatibilityScore: number;
  createdAt: string;
  lastMessagePreview: string | null;
}

export const swipeInputSchema = z.object({
  swipeeId: z.string().uuid(),
  direction: z.enum(["LIKE", "PASS"]),
});
export type SwipeInput = z.infer<typeof swipeInputSchema>;

export interface SwipeResult {
  matched: boolean;
  matchId: string | null;
}

export interface DeckResponse {
  candidates: CandidateProfile[];
  nextCursor: string | null;
}

export interface RewindResult {
  rewound: boolean;
  candidateUserId: string | null;
}

export interface IncomingLike {
  userId: string;
  displayName: string | null;
  photoUrls: string[];
  compatibilityScore: number;
  createdAt: string;
}
