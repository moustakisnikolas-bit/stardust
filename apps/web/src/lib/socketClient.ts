import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@stardust/shared-types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createSocket(accessToken: string): ChatSocket {
  return io(API_BASE_URL, {
    auth: { token: accessToken },
    autoConnect: true,
  });
}
