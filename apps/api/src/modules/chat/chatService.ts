import type { Match } from "@prisma/client";
import type { ChatMessage } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

const PAGE_SIZE = 30;

/** Single authorization check reused by both the WS join and the REST history endpoint. */
export async function getMatchForParticipant(matchId: string, userId: string): Promise<Match> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    throw new HttpError(404, "MATCH_NOT_FOUND", "Match not found");
  }
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new HttpError(403, "FORBIDDEN", "You are not a participant in this match");
  }
  if (match.unmatchedAt) {
    throw new HttpError(410, "MATCH_ENDED", "This match has ended");
  }
  return match;
}

function toChatMessage(row: {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
}): ChatMessage {
  return {
    id: row.id,
    matchId: row.matchId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

/**
 * Reverse-paginated history: fetches the newest page (or the page older than
 * `cursor`, a message id from the previously loaded batch) then returns it
 * in chronological order for display.
 */
export async function listMessages(matchId: string, opts: { cursor?: string } = {}): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  return rows.reverse().map(toChatMessage);
}

/** Persist-then-return: callers must broadcast only after this resolves, never before. */
export async function createMessage(matchId: string, senderId: string, body: string): Promise<ChatMessage> {
  const row = await prisma.message.create({ data: { matchId, senderId, body } });
  return toChatMessage(row);
}

export async function markMessagesRead(matchId: string, readerId: string): Promise<string> {
  const readAt = new Date();
  await prisma.message.updateMany({
    where: { matchId, senderId: { not: readerId }, readAt: null },
    data: { readAt },
  });
  return readAt.toISOString();
}
