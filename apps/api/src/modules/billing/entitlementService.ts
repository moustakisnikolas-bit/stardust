import { prisma } from "../../lib/prisma.js";

const PAID_STATUSES = new Set(["active", "trialing"]);

/** The single source of truth every gated code path checks - no duplicated Stripe-status logic elsewhere. */
export async function isPaidUser(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({ where: { userId }, select: { status: true } });
  return !!subscription && PAID_STATUSES.has(subscription.status);
}
