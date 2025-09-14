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
