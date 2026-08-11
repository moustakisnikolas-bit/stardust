import { z } from "zod";
import type { SynastryHighlight } from "./chart";

export type SwipeDirection = "LIKE" | "PASS";

export interface CandidateProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  photoUrls: string[];
  compatibilityScore: number;
  highlights: SynastryHighlight[];
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
