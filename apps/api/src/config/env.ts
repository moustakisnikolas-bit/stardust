import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  ASTROLOGY_PROVIDER_DEFAULT: z.string().default("swiss-ephemeris"),
  ASTROLOGY_PROVIDER_BY_COUNTRY: z.string().optional(),
  OPENCAGE_API_KEY: z.string().optional(),
  MIN_COMPATIBILITY_SCORE_FREE: z.coerce.number().default(65),
  MIN_COMPATIBILITY_SCORE_PAID: z.coerce.number().default(50),
  FREE_DAILY_SWIPE_LIMIT: z.coerce.number().default(20),
  BOOST_DURATION_HOURS: z.coerce.number().default(3),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:support@stardust.app"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
