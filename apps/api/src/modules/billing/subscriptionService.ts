import type Stripe from "stripe";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { getStripe } from "./stripeClient.js";

export async function createCheckoutSession(userId: string, userEmail: string): Promise<string> {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_PRICE_ID) {
    throw new HttpError(503, "BILLING_UNAVAILABLE", "Payments are not configured yet");
  }

  // Reuse an existing Stripe customer if this user has one, to avoid creating duplicates on repeat checkout attempts.
  const existing = await prisma.subscription.findUnique({ where: { userId }, select: { stripeCustomerId: true } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: existing?.stripeCustomerId,
    customer_email: existing ? undefined : userEmail,
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${env.WEB_ORIGIN}/plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.WEB_ORIGIN}/plus`,
    client_reference_id: userId,
  });

  if (!session.url) {
    throw new HttpError(500, "CHECKOUT_FAILED", "Stripe did not return a checkout URL");
  }
  return session.url;
}

function toCustomerId(customer: Stripe.Checkout.Session["customer"] | Stripe.Subscription["customer"]): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Extracts the current billing period end. In this Stripe API version,
 * current_period_end lives on each subscription *item*, not the top-level
 * Subscription object (verified against the installed SDK's type
 * definitions before writing this - a genuine breaking change from older
 * Stripe API versions worth getting right rather than guessing). We only
 * ever create single-item subscriptions, so the first item is authoritative.
 */
function periodEndOf(sub: Stripe.Subscription): Date | null {
  const item = sub.items.data[0];
  return item ? new Date(item.current_period_end * 1000) : null;
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = toCustomerId(session.customer);
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (!userId || !customerId) break; // not one of our checkout sessions - ignore

      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId ?? null, status: "active" },
        update: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId ?? null, status: "active" },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = toCustomerId(sub.customer);
      if (!customerId) break;

      const existing = await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
      if (!existing) break; // webhook arrived before checkout.session.completed, or for an unrelated customer - ignore

      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
          stripeSubscriptionId: sub.id,
          currentPeriodEnd: periodEndOf(sub),
        },
      });
      break;
    }

    default:
      // Other event types aren't relevant to entitlement state - ignored.
      break;
  }
}
