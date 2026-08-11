import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Missing bearer token" });
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice("Bearer ".length));
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Invalid or expired token" });
  }
}
