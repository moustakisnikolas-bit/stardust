import type { TypedServer } from "./types.js";

let io: TypedServer | null = null;

export function setIo(server: TypedServer): void {
  io = server;
}

/** Null outside a running server (e.g. scripts/tests) - callers must treat emission as best-effort. */
export function getIo(): TypedServer | null {
  return io;
}
