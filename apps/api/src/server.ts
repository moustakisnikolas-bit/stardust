import "./lib/loadEnv.js";

import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/authRoutes.js";
import { onboardingRoutes } from "./modules/onboarding/onboardingRoutes.js";
import { matchingRoutes } from "./modules/matching/matchingRoutes.js";
import { chatRoutes } from "./modules/chat/chatRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { registerSocketHandlers } from "./ws/socketHandlers.js";
import type { TypedServer } from "./ws/types.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/chat", chatRoutes);

app.use(errorHandler);

const httpServer = createServer(app);

const io: TypedServer = new Server(httpServer, {
  cors: { origin: env.WEB_ORIGIN, credentials: true },
});
registerSocketHandlers(io);

httpServer.listen(env.PORT, () => {
  console.log(`Stardust API listening on http://localhost:${env.PORT}`);
});
