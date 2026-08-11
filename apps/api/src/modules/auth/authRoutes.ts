import { Router } from "express";
import { loginSchema, signupSchema, type PublicUser } from "@stardust/shared-types";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { hashPassword, verifyPassword } from "./passwordHash.js";
import { issueTokens, verifyRefreshToken } from "./jwt.js";

export const authRoutes = Router();

function toPublicUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  onboardingCompletedAt: Date | null;
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  };
}

authRoutes.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password } = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    const tokens = issueTokens(user.id);
    res.status(201).json({ user: toPublicUser(user), tokens });
  }),
);

authRoutes.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const tokens = issueTokens(user.id);
    res.json({ user: toPublicUser(user), tokens });
  }),
);

authRoutes.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const refreshToken = req.body?.refreshToken;
    if (typeof refreshToken !== "string") {
      throw new HttpError(400, "VALIDATION_ERROR", "refreshToken is required");
    }

    let userId: string;
    try {
      userId = verifyRefreshToken(refreshToken).sub;
    } catch {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(401, "INVALID_REFRESH_TOKEN", "User no longer exists");
    }

    res.json({ tokens: issueTokens(user.id) });
  }),
);

authRoutes.get(
  "/me",
  authGuard,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw new HttpError(404, "NOT_FOUND", "User not found");
    }
    res.json({ user: toPublicUser(user) });
  }),
);
