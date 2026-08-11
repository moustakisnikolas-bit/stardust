"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ChatMessage } from "@stardust/shared-types";
import { useAuth } from "@/lib/AuthProvider";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { apiRequest, ApiError } from "@/lib/apiClient";
import { createSocket, type ChatSocket } from "@/lib/socketClient";

export default function ChatPage({ params }: { params: { matchId: string } }) {
  const { matchId } = params;
  const { loading } = useRequireAuth({ requireOnboarding: true });
  const { user, accessToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const socketRef = useRef<ChatSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    apiRequest<{ messages: ChatMessage[] }>(`/api/chat/${matchId}/messages`, { accessToken })
      .then(({ messages }) => setMessages(messages))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load conversation"))
      .finally(() => setHistoryLoaded(true));

    const socket = createSocket(accessToken);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("chat:join", { matchId });
    });
    socket.on("message:new", (message) => {
      if (message.matchId !== matchId) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    socket.on("error", (payload) => {
      setError(payload.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !socketRef.current) return;
    socketRef.current.emit("message:send", { matchId, body: trimmed });
    setBody("");
  }

  if (loading || !historyLoaded) return null;

  return (
    <main className="flex min-h-screen flex-col px-4 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/matches" className="text-sm text-stardust-400 underline hover:text-stardust-200">
            ← Matches
          </Link>
        </div>

        {error && <p className="mb-2 text-sm text-red-400">{error}</p>}

        <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border border-stardust-600/40 bg-stardust-900/40 p-4">
          {messages.length === 0 && <p className="text-center text-sm text-stardust-400">Say hello!</p>}
          {messages.map((message) => {
            const isMine = message.senderId === user?.id;
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? "bg-stardust-400 text-stardust-950" : "bg-stardust-800 text-stardust-100"
                  }`}
                >
                  {message.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-stardust-600/50 bg-stardust-950 px-3 py-2 text-stardust-100 outline-none focus:border-stardust-400"
          />
          <button
            type="submit"
            disabled={!body.trim()}
            className="rounded-lg bg-stardust-400 px-5 py-2 font-medium text-stardust-950 transition hover:bg-stardust-200 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
