import type { SynastryHighlight } from "./chart.js";

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
