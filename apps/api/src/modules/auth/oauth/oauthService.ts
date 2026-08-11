import type { AuthTokens } from "@stardust/shared-types";
import { prisma } from "../../../lib/prisma.js";
import { issueTokens } from "../jwt.js";
import type { OAuthProfile, OAuthProvider } from "./OAuthProvider.js";

const PROVIDER_ID_FIELD = { google: "googleId", facebook: "facebookId" } as const;

/**
 * Finds the user by provider id; if this is the first time this provider
 * has been used, links to an existing email match (e.g. a prior
 * email/password signup) or creates a brand-new account.
 */
export async function loginOrCreateOAuthUser(providerName: OAuthProvider["id"], profile: OAuthProfile): Promise<AuthTokens> {
  const idField = PROVIDER_ID_FIELD[providerName];

  let user = await prisma.user.findFirst({ where: { [idField]: profile.providerId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    user = existingByEmail
      ? await prisma.user.update({ where: { id: existingByEmail.id }, data: { [idField]: profile.providerId } })
      : await prisma.user.create({
          data: { email: profile.email, displayName: profile.name, [idField]: profile.providerId },
        });
  }

  return issueTokens(user.id);
}
