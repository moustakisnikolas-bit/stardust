# Stardust

A Tinder-style dating/chat app where matches are surfaced by astrological
compatibility (synastry) instead of plain preference swiping. Users provide
their birth date, exact time, and location; the app computes a natal chart
and only shows candidates it scores as astrologically compatible.

Full build history, design decisions, and verification results for each
phase live in [`docs/milestones/`](./docs/milestones/README.md) - start
there for the "why" behind anything in this codebase.

## Stack

- **Web**: Next.js 14 (App Router), React, Tailwind
- **API**: Node.js, Express, Socket.IO, Prisma
- **Database**: PostgreSQL
- **Astrology engine**: self-hosted Swiss Ephemeris calculations
  (`packages/astrology-core`), pluggable for third-party providers later
- **Monorepo**: pnpm workspaces + Turborepo

## Project structure

```
apps/
  web/     Next.js app (signup/login, onboarding, swipe, matches, chat)
  api/     Express + Socket.IO + Prisma backend
packages/
  astrology-core/  Natal chart computation + synastry scoring (no HTTP/DB deps)
  shared-types/    Zod schemas + DTOs shared across web, api, and any future client
docs/
  milestones/      Per-phase build history: what was built, why, how it was verified
```

## Prerequisites

- Node.js 20+
- pnpm (`corepack enable` will provide it)
- Docker (for local PostgreSQL)

## Setup

1. **Install dependencies**
   ```
   pnpm install
   ```

2. **Start PostgreSQL**
   ```
   docker compose up -d
   ```
   Runs on `127.0.0.1:5433` (not the default 5432 - see
   `docs/milestones/01-foundations.md` for why). Use `127.0.0.1`, not
   `localhost`, in connection strings - see the same doc for why.

3. **Configure environment variables**

   Copy `.env.example` to `apps/api/.env` and `apps/web/.env.local` (the
   latter only needs `NEXT_PUBLIC_API_URL`) and fill in the values. Every
   var is documented inline in `.env.example`. At minimum for local dev you
   need `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - the
   Google/Facebook OAuth and geocoding vars are optional (see
   `docs/milestones/04-oauth.md` for how to obtain them if you want social
   login working).

4. **Run database migrations**
   ```
   pnpm db:migrate
   ```

5. **Start the dev servers**
   ```
   pnpm --filter @stardust/api dev    # http://localhost:4000
   pnpm --filter @stardust/web dev    # http://localhost:3000 (or next available port)
   ```

## Testing

```
pnpm --filter @stardust/astrology-core test
pnpm --filter @stardust/api test
```

Type-checking: `pnpm --filter <package> exec tsc --noEmit` in any workspace.

## Useful scripts

- `pnpm db:studio` - Prisma Studio, browse the database visually
- `pnpm compare-providers` - run one birth input through every registered
  astrology provider side-by-side (currently just Swiss Ephemeris; see
  `docs/milestones/05-provider-validation.md` for adding more)
