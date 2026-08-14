export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

export interface BillingStatus {
  isPaid: boolean;
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
}

export interface CheckoutSessionResponse {
  url: string;
}
