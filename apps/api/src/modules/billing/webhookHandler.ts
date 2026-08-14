import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { getStripe } from "./stripeClient.js";
import { handleWebhookEvent } from "./subscriptionService.js";

/**
 * Mounted directly in server.ts with express.raw() BEFORE the global
 * express.json() middleware - Stripe's signature verification needs the
 * exact raw request bytes, which a JSON-parsed body can't reconstruct.
 */
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).send("Billing not configured");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).send("Missing Stripe-Signature header");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    await handleWebhookEvent(event);
    res.status(200).send();
  } catch (err) {
    console.error("Stripe webhook handling failed:", err);
    // 500 so Stripe retries - the event may not have been fully processed.
    res.status(500).send();
  }
}
