import type { NextFunction, Request, Response } from "express";
import { isPaidUser } from "./entitlementService.js";

/** Blocks Stardust Plus-only routes for non-subscribers with a clear, actionable error - not partial/hidden data. */
export async function paidGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!(await isPaidUser(req.userId!))) {
    res.status(402).json({ error: "UPGRADE_REQUIRED", message: "This feature is part of Stardust Plus" });
    return;
  }
  next();
}
