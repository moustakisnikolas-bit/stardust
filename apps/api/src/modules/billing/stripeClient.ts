import Stripe from "stripe";
import { env } from "../../config/env.js";

let stripe: Stripe | null = null;

/** Null when STRIPE_SECRET_KEY isn't configured - callers must treat billing as unavailable rather than crash. */
export function getStripe(): Stripe | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!stripe) {
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

export function isBillingConfigured(): boolean {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID);
}
