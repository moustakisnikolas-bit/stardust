import type { AuthTokens } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { signAccessToken, signRefreshToken } from "./jwt.js";

/** Issues a brand-new session (signup, login, OAuth) - creates the RefreshToken row the refresh JWT's `jti` points to. */
export async function issueSession(userId: string): Promise<AuthTokens> {
  const refreshTokenRow = await prisma.refreshToken.create({ data: { userId } });
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId, refreshTokenRow.id),
  };
}

/**
 * Rotates a refresh token: the presented one is revoked and a new one is
 * issued in its place. If the presented token was already revoked, that's a
 * signal it was reused after being rotated once before (e.g. stolen and
 * both the thief and the legitimate user tried to use it) - every session
 * for the user is revoked as a precaution, forcing a fresh login.
 */
export async function rotateSession(userId: string, tokenId: string): Promise<AuthTokens> {
  const newTokenId = await prisma.$transaction(async (tx) => {
    // Advisory lock keyed on the token being rotated: closes the race where
    // the same refresh token is presented twice near-simultaneously (e.g.
    // a client retry racing the original request) - the second call blocks
    // here until the first commits its revocation, then correctly sees it
    // as already-revoked instead of both successfully rotating in parallel.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenId})::bigint)`;

    const existing = await tx.refreshToken.findUnique({ where: { id: tokenId } });

    if (!existing || existing.userId !== userId) {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    if (existing.revokedAt) {
      throw new HttpError(401, "REFRESH_TOKEN_REUSED", "This session was revoked - please log in again");
    }

    const newTokenRow = await tx.refreshToken.create({ data: { userId } });
    await tx.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date(), replacedByTokenId: newTokenRow.id },
    });

    return newTokenRow.id;
  }).catch(async (err) => {
    if (err instanceof HttpError && err.code === "REFRESH_TOKEN_REUSED") {
      await revokeAllSessionsForUser(userId);
    }
    throw err;
  });

  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId, newTokenId),
  };
}

export async function revokeSession(tokenId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: tokenId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
