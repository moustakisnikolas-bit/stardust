# Stardust — Milestones

Astrology-matched dating/chat app. Each phase below has its own doc with what
was built, key decisions, and how to verify it. See the root `README.md` (TBD)
for day-to-day dev setup; this folder is the durable build history.

| # | Phase | Status |
|---|-------|--------|
| 1 | [Foundations](./01-foundations.md) — auth, onboarding, natal chart computation | ✅ Done |
| 2 | [Matching](./02-matching.md) — synastry scoring, swipe deck, matches | ✅ Done |
| 3 | [Chat](./03-chat.md) — Socket.IO real-time messaging | ✅ Done |
| 4 | [Google & Facebook sign-in](./04-oauth.md) — OAuth signup/login | ✅ Code done, needs your app credentials |
| 5 | [Provider validation](./05-provider-validation.md) — third-party astrology APIs, per-region comparison | ✅ Prokerala live, cross-validated against real credentials (zero sign divergences) |
| 6 | [Polish](./06-polish.md) — rate limiting, refresh-token rotation, photo upload, push notifications | 🚧 In progress |
| 7 | [Stardust Plus](./07-stardust-plus.md) — relationship-intent-weighted synastry, Stripe paid tier | ✅ Verified end-to-end (non-Stripe paths); Stripe checkout needs your test-mode keys |
