import { verifyAccessToken } from "../modules/auth/jwt.js";
import type { TypedSocket } from "./types.js";

export function socketAuth(socket: TypedSocket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    next(new Error("UNAUTHENTICATED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("UNAUTHENTICATED"));
  }
}
