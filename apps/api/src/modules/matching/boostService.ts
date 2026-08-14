import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

/** Stardust Plus only (paid-gated at the route). Returns the new expiry. */
export async function activateBoost(userId: string): Promise<Date> {
  const boostedUntil = new Date(Date.now() + env.BOOST_DURATION_HOURS * 60 * 60 * 1000);
  await prisma.user.update({ where: { id: userId }, data: { boostedUntil } });
  return boostedUntil;
}
