# TV Guide Revamp — Codex Plan (DRAFT)

Status: In progress — backend wired to Supabase; UI polishing ongoing

Goal: Deliver a horizontally scrolling “TV Guide” that visually matches the provided mock (img1): streaming services as rows, date columns as headers, and long rounded bars per show/season with poster thumbnail + title, spanning their active window across days. Smooth infinite scroll, sticky service logos, and a clear “today” indicator.

Assumptions (to confirm):

- Data source: Use existing `/api/tv-guide` for now; can enrich via `/api/tmdb/.../analyze` later.
- Scope: Web UI in `apps/web` and API in `apps/api` only. No DB changes right now.
- Target look: Match img1 layout and interactions closely; spacing and colors can be approximations using Tailwind.

Open Questions

1. Bars span logic: Should each block represent a “watching window” (start when user added the show or first future episode; end 7 days after the last scheduled episode), or exactly from first to last episode air date (no grace days)?
2. Overlaps: When multiple shows from the same service overlap on a day, should bars stack vertically within the service row (dynamic row height) or create additional sub-rows per service (as in our current multi-row approach)? The mock suggests multiple rows per service.
3. Providers: Use user’s actual streaming providers from watchlist item data or a controlled list (e.g., Netflix, Paramount+, Max, etc.)? If multiple providers exist for a show, which one do we render in the row grouping?
4. Posters: Use TMDB poster URLs directly (prefer `/original` size when available) and fallback to initials chip — OK?
5. Infinite scroll: Forward-only from today, or bidirectional (past and future)? The mock appears to show a single week; do you also want a “jump to week” control?
6. Today indicator: Vertical line shading for today’s column — keep sticky when scrolling?
7. Performance: Maximum shows/services expected in viewport? This impacts virtualization choices.

Decisions Captured (from your replies)

- Bars span: First to last air date only. Optional per‑show buffer days (same color, lower opacity).
- Overlaps: Multiple sub‑rows per service; consistent row height for now.
- Provider choice: User‑selected provider (from “My Shows”).
- Posters: Use TMDB images; fallback to initials.
- Scroll range: Start at today; allow back one month; “Next Month” jump added.
- Today indicator: Thin vertical outline on the column.
- Scale: ~9 rows; vertical scroll enabled.
- Country: Default stored in users.country_code (Supabase). Optional per‑show override stored with the user_show.

Work Completed Today

- Backend
  - Rewrote `/api/tv-guide` to build strictly from the user’s shows.
    - Supabase path (UUID user): reads `user_shows` with `selected_service_id`, `buffer_days`, `country_code` and user default `users.country_code`.
    - In‑memory fallback path remains for non‑UUID test users.
    - Calls `tmdbService.analyzeShow` to get episodes; computes `activeWindow` and `upcomingEpisodes` in requested range. No mock data.
  - Added migration `003_tv_guide_enhancements.sql`:
    - `user_shows.buffer_days` (default 0), `user_shows.selected_service_id` (FK), `user_shows.country_code`.
  - Admin seed route to copy the current dev in‑memory `user-1` shows into Supabase for a chosen target user UUID: `POST /api/admin/seed/memory-to-supabase`.

- Frontend (TV Guide)
  - Bars now span `activeWindow` across columns; buffer overlay supported.
  - Today vertical outline added.
  - Always‑visible info chip pinned at the left of each service row (poster + title + next ep) so text is readable even mid‑row.
  - Date chunking: previous/current/next (−30/0/+30 days) and auto‑jump to today; vertical scrolling enabled.

- “My Shows”
  - Per‑show controls: Buffer days (0–30) and Show Country (override) added; stored via API.
  - Existing provider selector wired to save selected provider and reflect availability.

Outstanding Items for Tomorrow

- Flip all watchlist endpoints in the app to use Supabase routes everywhere (page still mixes simple and Supabase in places). Currently server mounts Supabase `watchlist-v2`, but front‑end “My Shows” still expects some simple behavior for episodes — verify and align.
- Ensure provider resolution for Paramount+ variants (Paramount+ vs Paramount+ with Showtime) maps correctly into `streaming_services` using TMDB provider IDs.
- Validate Peacemaker/Dexter after seeding for a UUID user; confirm TMDB ID for Dexter variant you want shown.
- Add week separators and minor visual polish to fully match the mock.
- Persist “My Shows” top‑level Country/Region to Supabase via `PUT /api/watchlist-v2/country` (UI currently uses localStorage; endpoint exists).

How To Validate Locally

1. Run migration 003 (done). Ensure `SUPABASE_URL` and `SUPABASE_API_KEY` envs are set.
2. Seed: POST `/api/admin/seed/memory-to-supabase` with `{ "targetUserId": "<uuid>" }` (pick a test user from 002 migration, e.g., Alex).
3. In the UI, switch to that UUID user (UserSwitcher). Set provider/country/buffer in “My Shows”.
4. Open TV Guide; verify bars render and info chip is visible on the left.

Notes/Constraints

- `tmdbService.analyzeShow` must be available; the TV Guide returns empty if TMDB is disabled.
- We handle both Supabase and in‑memory users to keep dev flow unblocked; production path is Supabase only.

Questions Remaining

1. Dexter: which TMDB id do you want to reflect (Original: 1405, New Blood: 131979)? I’ll seed/update accordingly.
2. Should we move the “My Shows” default Country/Region control to persist immediately to `users.country_code` (endpoint exists), or keep it as session/local preference?
3. Any additional branding assets for provider logos you want us to prefer over the TMDB path?

Next Steps (after confirmation)

1. Finalize Supabase watchlist wiring for all pages (remove simple storage usage from client flows).
2. Provider normalization: ensure selected service reliably maps via TMDB provider id; backfill missing providers.
3. Visual polish: week dividers and subtle grid shading; finalize tooltip copy.
4. Add tests around `/api/tv-guide` data shaping for a couple of shows with varying schedules.
   High-Level Plan

1) Align Visual Spec
   - Lock bar styling: rounded ends, subtle shadow, overlay text treatment, poster thumb size, spacing.
   - Finalize stacked row behavior for multiple shows per service.

2) Data Contract Stabilization (API)
   - Extend `/api/tv-guide` to return, per show:
     - `activeWindow: { start: string; end: string }` precomputed on server.
     - At least the next episode with `airDate`, plus optional upcoming list.
   - Server computes window as per answer to Q1, using TMDB analysis when available; otherwise simulated.

3) UI Structure (apps/web)
   - Keep `TVGuide` with chunked dates and sticky header.
   - Replace per-episode placement with bar spanning `activeWindow` days.
   - Service rows remain multi-row (one row per concurrent show) for clarity with overlaps.
   - Add “today” column highlight and subtle vertical grid separators by week.
   - Poster thumbnail at left of each bar; title + season label; rounded caps; z-index layering on overlap.

4) Infinite Scroll & Virtualization
   - Keep existing chunking (30-day chunks) and intersection observer.
   - Virtualize DOM for cells using visible date range and only render bars intersecting viewport.

5) Interactions
   - Hover tooltip with episode + date; click navigates to Show detail (placeholder route for now).
   - “Today” button to jump to current column.

6) Polishing
   - Brand colors from `STREAMING_SERVICE_THEMES` with safe fallbacks.
   - Image quality upgrade to `/original` when URL is TMDB.
   - Accessibility: aria labels on bars and header controls.

Implementation Steps (once questions answered)

1. API: add `activeWindow` fields in `apps/api/src/routes/tv-guide.ts` and align mock generation.
2. Types: extend `apps/web/src/types/api.ts` and `tv-guide.types.ts` to include `activeWindow`.
3. Placement math: update `ServiceRow.tsx` and `ShowBlock.tsx` to compute `gridColumnStart/End` from `activeWindow` not single day; add rounded end caps.
4. Header polish: week separators, “Today” highlight, and jump.
5. Styling: bar shadows, poster thumb sizing, and text truncation consistent with mock.
6. Test flows: empty state, single provider, many overlaps, image error fallback.

Out-of-Scope (for now)

- Server-side caching, full TMDB integration for precise season schedules.
- Past history rendering and bi-directional scroll (unless requested).

Validation

- Visual compare to img1 for 1-week slice and for multi-week spans.
- Verify performance with ~8 services x 20 shows and 90 visible days.

Deliverables

- Updated API route and types.
- Refactored TV Guide components rendering season-span bars.
- No database changes; no additional build tools.
  Bridging Plan Added (Sep 3)
- Problem: Two data paths exist (simple in‑memory vs Supabase). Search Shows was adding to simple `/api/tmdb/watchlist` for non‑UUID test users (e.g., `user-1`), while My Shows queried Supabase via `/api/watchlist-v2`, so Emma saw 0 shows in My Shows but data in TV Guide.
- Decision: Add server‑side fallback in `/api/watchlist-v2` to return simple storage data when `x-user-id` is not a UUID. Keep Supabase path unchanged for UUID users. This keeps dev flows unblocked and the UI consistent for test users.
- Changes implemented:
  - Fallbacks in GET `/api/watchlist-v2`, GET `/stats`, PUT `/:id/status`, PUT `/:id/rating`, DELETE `/:id`, GET `/watching`, PUT `/:id/provider`, PUT `/:id/buffer`, PUT `/:id/country`.
  - Kept existing Supabase endpoints intact. Added compatibility `PUT /:tmdbId/progress` for episode progress using simple storage.
- Seeding: Kept admin route `POST /api/admin/seed/memory-to-supabase` to migrate `user-1` memory data to a chosen UUID when we want to switch fully to Supabase.
- TV Guide fixes: Start bar at first upcoming episode within requested window, removed hover scale, ensure poster/title render inside colored bar.

Follow‑ups

- Optional: Mount Supabase `users` router under `/api/users-db` and update `UserSwitcher` to list both simple and Supabase users, enabling selection of a UUID user in the UI.
- Once we commit to UUID users, remove simple fallbacks and update Search Shows to call `/api/watchlist-v2` directly.
  Episode Retrieval + Posters Hotfix Plan (Sep 3)

Context

- Reports: Search Shows analysis returns 0 episodes for currently airing shows; My Shows shows “No Image” and has empty episode lists. Console shows MyShows calls /api/tmdb/show/:id/analyze without a country param (defaulting to en-US). Manual curl against TMDB in en-AU returns a fully populated Season 2 for Peacemaker (110492).
- Current server already supports language mapping and walks back seasons, but the client (My Shows) isn’t passing the locale and can therefore hit a sparse season in en-US.

Hypotheses (ranked)

1. My Shows does not include country=AU on analyze calls, so server queries TMDB in en-US and receives incomplete episodes → diagnostics.episodeDetails = [].
2. For test users (in‑memory), the /api/watchlist-v2 fallback shape sometimes returns show.poster_path null because the analyzer returned details-only earlier; after fixing 1) it should populate. If we still see no poster for Supabase users, the Supabase path returns relative poster_path; the client expects a full URL.
3. Season selection: when user selects S2, the server must fetch /tv/:id/season/2?language=en-AU regardless; only walk back if that season truly has no dated episodes.

Plan

1. Client: pass country for all analyze calls in My Shows
   - apps/web/src/pages/MyShows.tsx
   - Wherever we call /api/tmdb/show/${tmdbId}/analyze, append ?country=${UserManager.getCountry()} and preserve &season= when present.
2. Server: ensure language mapping is applied consistently
   - apps/api/src/services/tmdb.ts already maps AU→en-AU for getTVShow/getSeason/searchTV; verify that getLatestSeasonEpisodes and all season fetches use the same mapped language (done), and keep it.
3. Season selection behavior
   - For a user-selected seasonNumber, fetch that exact season first in the mapped language.
   - Only if that season has zero dated episodes do we walk back to the latest season with dates (maintain current back-walk logic).
   - diagnostics.episodeDetails should reflect the season actually analyzed (targetSeason in payload).
4. Posters in My Shows
   - In the /api/watchlist-v2 fallback (non-UUID users), ensure poster_path is set to analysis.showDetails.poster (full URL). This already exists; re-check the path for all branches.
   - For Supabase (UUID users), watchlistService/showService returns shows.poster_path as a relative TMDB path. We will augment the API response to provide a full image URL for the web client (e.g., show.poster_path_full), or rewrite poster_path to a full URL on response.
5. Verify Search Shows flow
   - Confirm SearchShows.tsx already passes country; validate that clicking season pills appends &season= and keeps country.
6. Regression guardrails
   - Keep route-level fallback (details-only) for rare TMDB outages, but only hit this when all seasons are empty.
   - Add minimal server debug log (level: info) indicating language, selectedSeason, analyzedSeason, episodesFound to speed future diagnostics (remove or guard by NODE_ENV).
7. QA checklist (manual)
   - Peacemaker (110492) AU: /api/tmdb/show/110492/analyze?country=AU → diagnostics.episodeDetails length = 8; analyzedSeason=2; showDetails.poster is non-null.
   - Alien: Earth (157239) AU: populated S1 or current season depending on TMDB; weekly pattern appears.
   - Dexter: Resurrection (259909) AU: populated.
   - My Shows (Emma/test user): list shows with posters and episode counts > 0 after expanding details.
   - My Shows (UUID user): same behavior; verify posters appear (using full URLs).

Questions for you

1. Locale source of truth: Should My Shows always use UserSwitcher country (UserManager.getCountry()) when analyzing, or do you want a per-show override to drive analyze calls as well? (UI already has a per-show country override; we can honor that.)
2. For Supabase users, is it acceptable to return a full poster URL in show.poster_path (rewritten), or would you prefer we add a new field (poster_url) and leave poster_path untouched?
3. Confirm that in My Shows, when you click a different season pill, we should analyze exactly that season (no back-walk) unless the season is truly empty — correct?

Implementation summary (once approved)

- Update MyShows.tsx analyze fetches to include country.
- Server: keep language mapping; ensure the season fetch uses mapped language and respect selected season.
- API: rewrite poster_path to full URL for Supabase path; re-verify fallback path sets it.
- Add light debug logs and validate with the three TMDB ids.

UPDATED Episode Retrieval + Posters Hotfix Plan (Sep 3 — Revised)

Supersedes the hypotheses above. Country is not the root cause; season selection and fallback logic are.

Clarifications from product

- We only care about the currently airing season for cadence. Prior seasons (binge) are irrelevant.
- When a user explicitly selects a season (e.g., Season 2), analyze exactly that season. Do not back‑walk even if partially populated. Include episodes that have air_date; compute intervals from those with valid dates.
- Posters: normalize to a full TMDB URL in API responses for best UX; we can also expose poster_url later if needed.

Revised Plan

1. Server: analyze the selected (airing) season exactly
   - apps/api/src/services/tmdb.ts: If seasonNumber is provided, fetch /tv/:id/season/:seasonNumber and build episodes directly from that payload. Set analyzedSeason=seasonNumber.
   - Include all episodes in episodeDetails (number, title, raw air_date if present). Compute cadence intervals only from episodes with valid air_date.
   - Do not back‑walk when a season is explicitly provided. Back‑walk is allowed only when no season is provided and the latest season has zero dated episodes.

2. Posters: normalize to a full URL in API responses
   - /api/watchlist-v2 (Supabase path): rewrite show.poster_path to https://image.tmdb.org/t/p/w500${poster_path} before returning to the web client (optionally also expose poster_url for clarity). DB remains unchanged.
   - Simple (non‑UUID) path already maps to analysis.showDetails.poster; verify consistency.

3. Client (My Shows)
   - Ensure all analyze fetches include &season=<selectedSeason>. Country param is optional; episode availability must not rely on locale.

4. Diagnostics & guardrails
   - Add dev‑only logs: showId, selectedSeason, analyzedSeason, episodesFound, and first two episode numbers/dates to speed diagnosis.
   - Keep the “details‑only” fallback only when the selected season returns zero episodes AND no season has dated episodes.

5. QA checklist (manual)
   - Peacemaker (110492): /api/tmdb/show/110492/analyze?season=2 → episodeDetails length = 8; analyzedSeason=2; poster non-null.
   - Alien: Earth (157239): current season populated; weekly pattern appears.
   - Dexter: Resurrection (259909): populated and patterned.
   - My Shows (test + UUID): posters render and episode lists populate when expanded.
