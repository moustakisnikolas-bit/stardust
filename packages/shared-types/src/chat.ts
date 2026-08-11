export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ServerToClientEvents {
  "message:new": (message: ChatMessage) => void;
  "message:read": (payload: { matchId: string; readerId: string; readAt: string }) => void;
  "typing:start": (payload: { matchId: string; userId: string }) => void;
  "typing:stop": (payload: { matchId: string; userId: string }) => void;
  "match:new": (match: { matchId: string; otherUserId: string }) => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  "chat:join": (payload: { matchId: string }) => void;
  "message:send": (payload: { matchId: string; body: string }) => void;
  "message:markRead": (payload: { matchId: string }) => void;
  "typing:start": (payload: { matchId: string }) => void;
  "typing:stop": (payload: { matchId: string }) => void;
}
