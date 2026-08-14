import { Router } from "express";
import type { BillingStatus, CheckoutSessionResponse, SubscriptionStatus } from "@stardust/shared-types";
import { authGuard } from "../../middleware/authGuard.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { prisma } from "../../lib/prisma.js";
import { createCheckoutSession } from "./subscriptionService.js";

export const billingRoutes = Router();

billingRoutes.use(authGuard);

billingRoutes.post(
  "/checkout",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! }, select: { email: true } });
    const url = await createCheckoutSession(req.userId!, user.email);
    res.json({ url } satisfies CheckoutSessionResponse);
  }),
);

billingRoutes.get(
  "/status",
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({ where: { userId: req.userId! } });
    if (!subscription) {
      res.json({ isPaid: false, status: null, currentPeriodEnd: null } satisfies BillingStatus);
      return;
    }

    const isPaid = subscription.status === "active" || subscription.status === "trialing";
    res.json({
      isPaid,
      status: subscription.status as SubscriptionStatus,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    } satisfies BillingStatus);
  }),
);

// The Stripe webhook route is deliberately NOT here - it needs the raw
// request body (not JSON-parsed) to verify Stripe's signature, so it's
// mounted directly in server.ts before the global express.json() middleware.
// See webhookHandler.ts.
