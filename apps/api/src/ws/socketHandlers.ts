import { z } from "zod";
import { HttpError } from "../middleware/errorHandler.js";
import { createMessage, getMatchForParticipant, markMessagesRead } from "../modules/chat/chatService.js";
import { sendPushToUser } from "../modules/push/pushService.js";
import { socketAuth } from "./socketAuth.js";
import { setIo } from "./ioRegistry.js";
import { matchRoom, userRoom } from "./rooms.js";
import type { TypedServer, TypedSocket } from "./types.js";

function emitError(socket: TypedSocket, err: unknown): void {
  const message = err instanceof HttpError ? err.message : "Something went wrong";
  socket.emit("error", { message });
}

const sendSchema = z.object({ matchId: z.string().uuid(), body: z.string().min(1).max(2000) });
const matchIdSchema = z.object({ matchId: z.string().uuid() });

export function registerSocketHandlers(io: TypedServer): void {
  setIo(io);
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    socket.join(userRoom(userId));

    socket.on("chat:join", async (payload) => {
      try {
        const { matchId } = matchIdSchema.parse(payload);
        await getMatchForParticipant(matchId, userId);
        socket.join(matchRoom(matchId));
      } catch (err) {
        emitError(socket, err);
      }
    });

    socket.on("message:send", async (payload) => {
      try {
        const { matchId, body } = sendSchema.parse(payload);
        // Re-authorize on every send - a prior join doesn't guarantee the
        // match is still active (it could have been unmatched meanwhile).
        const match = await getMatchForParticipant(matchId, userId);
        const message = await createMessage(matchId, userId, body);
        io.to(matchRoom(matchId)).emit("message:new", message);

        const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
        sendPushToUser(otherUserId, { title: "New message", body: body.slice(0, 120), url: `/matches/${matchId}` }).catch(
          () => {},
        );
      } catch (err) {
        emitError(socket, err);
      }
    });

    socket.on("message:markRead", async (payload) => {
      try {
        const { matchId } = matchIdSchema.parse(payload);
        await getMatchForParticipant(matchId, userId);
        const readAt = await markMessagesRead(matchId, userId);
        io.to(matchRoom(matchId)).emit("message:read", { matchId, readerId: userId, readAt });
      } catch (err) {
        emitError(socket, err);
      }
    });

    socket.on("typing:start", (payload) => {
      const parsed = matchIdSchema.safeParse(payload);
      if (!parsed.success) return;
      socket.to(matchRoom(parsed.data.matchId)).emit("typing:start", { matchId: parsed.data.matchId, userId });
    });

    socket.on("typing:stop", (payload) => {
      const parsed = matchIdSchema.safeParse(payload);
      if (!parsed.success) return;
      socket.to(matchRoom(parsed.data.matchId)).emit("typing:stop", { matchId: parsed.data.matchId, userId });
    });
  });
}
