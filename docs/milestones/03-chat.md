# Phase 3 — Real-time chat

**Status:** ✅ Done, verified end-to-end (scripted two-client WS test + browser UI click-through).

## What this phase delivers

Matched users can open a conversation and exchange messages in real time,
with history persisted and reloadable.

## Design

Additive on top of Phase 1/2. The `Message` Prisma model and the
`ChatMessage`/`ServerToClientEvents`/`ClientToServerEvents` shared-types
contracts already exist from Phase 1 scaffolding (`packages/shared-types/src/chat.ts`)
— this phase implements against that contract rather than redesigning it.

- **Transport**: Socket.IO attached to the same HTTP server as the Express
  app (`apps/api/src/server.ts` switches from `app.listen` to
  `http.createServer(app)` + `new Server(httpServer)`), namespaced under
  `/chat`.
- **`apps/api/src/ws/socketAuth.ts`** — Socket.IO middleware, verifies the
  JWT access token passed in the handshake (`socket.handshake.auth.token`),
  attaches `socket.data.userId`. Rejects the connection otherwise. Reuses
  `verifyAccessToken` from `modules/auth/jwt.ts`.
- **`apps/api/src/modules/chat/chatService.ts`** — `getMatchForParticipant(matchId, userId)`
  (throws if the user isn't a participant or the match is unmatched - the
  single authorization check reused by both the WS join and the REST history
  endpoint), `listMessages(matchId, {cursor?})` (paginated history, newest
  page first / chronological within page), `createMessage(matchId, senderId, body)`
  (persist-then-return, called before broadcasting - never broadcast before
  the DB write commits, so a crash between write and broadcast never loses
  history).
- **`apps/api/src/ws/socketHandlers.ts`** — on connection:
  - `chat:join {matchId}` — authorizes via `chatService.getMatchForParticipant`,
    joins the Socket.IO room `match:{matchId}` on success, emits `error` and
    does not join on failure.
  - `message:send {matchId, body}` — re-authorizes (never trust a prior join;
    a match can be unmatched mid-session), persists via `chatService.createMessage`,
    emits `message:new` to the whole room (including the sender, for
    optimistic-UI reconciliation consistency).
  - `message:markRead {matchId}` — sets `readAt` on the counterpart's
    unread messages, emits `message:read` to the room.
  - `typing:start` / `typing:stop` — ephemeral, no DB write, relayed
    directly to the room excluding the sender.
- **REST**: `GET /api/chat/:matchId/messages?cursor=` (under `authGuard` +
  `onboardingGuard`, same authorization check as the WS join) for initial
  history load - WS is for live delivery only, not history fetch.
- **`match:new` WS event**: when `swipeService.recordSwipe` creates a
  `Match`, emit `match:new` to both participants if they have an active
  socket connection (best-effort - the `/matches` REST list is still the
  source of truth if a user isn't connected at match time).
- **Frontend**: `apps/web/src/lib/socketClient.ts` (thin Socket.IO client
  wrapper, connects lazily with the access token), a chat page at
  `/matches/[matchId]` — message list (auto-scroll, sender-aligned bubbles
  matching the stardust theme), text input, loads history via REST on
  mount then subscribes to `message:new` for live updates. `/matches` list
  items become links into this page.

## Verification (actual results)

Scripted two-client test against the live API (real Postgres + real
Socket.IO server, `socket.io-client` connections, not mocks):

1. **Live delivery**: participant A sends a message; both A (optimistic
   echo) and B receive `message:new` with the correct body and sender id.
2. **Persistence**: `GET /api/chat/:matchId/messages` immediately reflects
   the sent message via REST.
3. **Authorization**: a non-participant's `chat:join` gets an `error` event
   ("You are not a participant in this match"); their REST history request
   gets `403`.
4. **Unmatch handling**: after setting `unmatchedAt` on the match, a
   participant's `message:send` gets an `error` event ("This match has
   ended") and the REST history endpoint returns `410`.

**Web UI** (headless Playwright, real browser Socket.IO client against the
real dev servers): logged in, opened `/matches`, clicked into a seeded
conversation, saw the counterpart's existing message render correctly, typed
and sent a new message, watched it appear instantly via the live WS
round-trip with correct sender-aligned bubble styling. Zero console errors.

One real bug caught and fixed during verification: the first UI check hit a
`500` on `/api/matching/matches` — not a chat bug, but a gap in my seed
script (it created a `Match` for two users without giving them
`NatalChart` rows, which `listMatches` requires when resolving
compatibility). Not reachable through the real app flow, since matches can
only be created via `swipeService` and onboarding always produces a chart
first, but worth noting as the one snag hit.

`tsc --noEmit` clean for both `apps/api` and `apps/web`. All prior unit
tests still pass. Verification scripts and their seeded data were removed
after the run.
