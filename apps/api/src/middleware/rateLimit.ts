import rateLimit from "express-rate-limit";

/** Generous general limit across all API routes - abuse/DoS backstop, not meant to affect normal use. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Tighter limit for signup/login/refresh - the actual brute-force/credential-stuffing surface. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "RATE_LIMITED", message: "Too many attempts - please try again later" },
});
