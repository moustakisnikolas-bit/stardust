import "./lib/loadEnv.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/authRoutes.js";
import { onboardingRoutes } from "./modules/onboarding/onboardingRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Stardust API listening on http://localhost:${env.PORT}`);
});
