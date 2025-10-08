# Dev Console vs iOS App Strategy

## What to keep in the web app (dev console)

- Auth + user switcher (impersonate test users).
- A few golden flows to validate backend logic:
  - Manage watchlist and progress.
  - Subscriptions (with tiers) + country switch.
  - Calendar overview to sanity-check schedule math.
- Minimal UI polish. Optimize for speed of change, not beauty.

**Branch:** `feature/dev-console-core-flows`

## Where to double down

- **API contracts**: lock them with an OpenAPI spec, generate a TypeScript client, and share that between web and iOS. Add examples for each response state.  
  **Branch:** `feature/api-contracts-openapi`
  - Progress:
    - **Done**
      - Added `/api/watchlist` and `/api/watchlist/{userShowId}/provider` to spec.
      - Regenerated TypeScript client, wired into `MyShows.tsx` for watchlist list fetch.
      - Updated `server.ts` spec to reflect `{ count, shows }` response.
      - Added `/api/watchlist/stats` path and used `apiRequest` with validation in UI.
    - **Remaining**
      - Add `/api/watchlist/{id}/status` to spec + client.
      - Add `/api/watchlist/{id}/rating` to spec + client.
      - Add `/api/watchlist/{id}/progress` to spec + client.
      - Switch UI calls (status updates, rating, provider updates, progress fetch) to generated client.
      - Re‑regenerate client and remove legacy `apiRequest` fallbacks once stable.

- **Test data & seeds**: scripts to seed shows, seasons, availability, prices per country, and user scenarios (watching/completed/mixed).  
  **Branch:** `feature/test-data-seeds`

- **Background jobs**: ingestion/upserts (TMDB, prices), denormalized progress, cache invalidation.  
  **Branch:** `feature/background-jobs-ingestion`

- **RLS/RPCs**: keep your RLS airtight; prefer server-side RPCs for multi-table operations.  
  **Branch:** `feature/security-rls-rpcs`

- **Observability**: structured logs, request IDs, and a health dashboard for ingestion and API latencies.  
  **Branch:** `feature/observability`

- **Price strategy**: since TMDB doesn’t give prices, decide on your source:
  - Manual `streaming_service_prices` with tiers (good enough for v1).
  - Optional scraper or partner feed later; design the table to accept multiple sources + effective dates.  
    **Branch:** `feature/streaming-service-prices`

## iOS-first workflow

- Ship the iOS app using the same OpenAPI-generated client.  
  **Branch:** `feature/ios-client`

- Use the web console only to seed, spot-check, and debug. Don’t chase pixel-perfection on web.  
  **Branch:** `chore/web-console-lite`

## Code quality & automation (later)

- [ ] **ESLint/Prettier baseline**: unify lint/format across apps and packages; wire `lint-staged` + `husky` pre-commit.  
       **Branch:** `chore/eslint-prettier-baseline`
- [ ] **ESLint 9 migration**: upgrade to ESLint v9 and align `@typescript-eslint` + configs; fix/relax breaking rules project-wide.  
       **Branch:** `feat/eslint9-migration`
- [ ] **Deprecations sweep**: replace deprecated packages (e.g., `supertest@6`, legacy glob) with maintained alternatives or upgraded majors; record decisions in CHANGELOG.  
       **Branch:** `chore/deps-deprecations`
- [ ] **CI gates**: add `pnpm run spec:lint`, `pnpm -r typecheck`, and lint/format checks to CI; cache pnpm store for speed.  
       **Branch:** `chore/ci-quality-gates`

## Backend Progress Model Enhancements (Queued)

- Problem: Mobile UI needs a fast way to know "where am I up to?" without fetching/joining all episode progress. The current `user_episode_progress` table stores detailed per-episode state, but we lack a denormalized pointer for current position.

- Proposal:
  1. Add columns to `user_shows`:
     - `current_season` integer nullable
     - `current_episode` integer nullable
     - Optional: `last_progress_at` timestamptz for recency.
  2. Update progress routes to keep these in sync:
     - When setting progress up to N: set `current_season = seasonNumber`, `current_episode = episodeNumber`.
     - When marking a single episode watched/watching: recompute or set pointer as needed.
  3. Safeguards:
     - Add a database trigger (or ensure in service layer) that if `current_episode` decreases, treat as allowed (user correction) but log.
     - Maintain truth in `user_episode_progress`; the pointer is a cache for quick reads.
  4. Read API additions:
     - Extend `/api/watchlist` cards to include `{ current_season, current_episode }` for quick display.
  5. Migration plan:
     - SQL migration to add columns with defaults null.
     - Backfill pointers where possible by scanning `user_episode_progress` per show (latest watched or watching).

- Follow-up: Consider a server endpoint that sets "watched up to N-1" and "episode N as watching" in one atomic call and updates the pointer; this maps exactly to the web UX and simplifies mobile logic.

### Additional items (from iOS Search integration)

- Keep `user_episode_progress` as one row per episode per user per show. This is necessary to represent partial seasons and analytics. Do NOT collapse to one row per show — that loses per-episode state. Instead, continue to:
  - Maintain a denormalized pointer on `user_shows` (`current_season`, `current_episode`, `last_progress_at`).
  - Consider a materialized view or nightly job to expose aggregates quickly (watched count per season/show).

- New atomic endpoint for exact position (high priority):
  - `PUT /api/watchlist/:tmdbId/progress/exact` body `{ seasonNumber, episodeNumber }`.
  - Behavior: marks episodes `<= N-1` as `watched`, marks episode `N` as `watching`, upserts pointer on `user_shows` in a single transaction.
  - Returns updated pointer and counts.

- Episode ID surfacing (to enable per-episode endpoints from clients):
  - Option A: extend Season Raw/Analyze responses to include DB `episode_id` alongside `seasonNumber` and `episodeNumber`.
  - Option B: add resolver `GET /api/episodes/resolve?tmdbId=...&season=...&episode=...` → `{ episodeId }`.
  - Either unlocks the existing per-episode endpoints: `POST /api/progress/episode/:episodeId/watching|watched`.

- Readback endpoint usage:
  - The iOS client will call `GET /api/watchlist/:tmdbId/progress` on expand and after updates to reconcile local optimistic state. Ensure this route is fast; consider caching for 30–60s per user/show.
  - Note for iOS: simplify progress storage to a plain `Int` per season (lastWatched) to avoid Swift tuple edge cases; UI computes “Up Next” as `lastWatched + 1`.

- Sorting: expose seasons in descending order optionally (param `sort=desc`) or let the client sort. No backend change needed, but document default.
