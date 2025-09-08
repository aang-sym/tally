

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