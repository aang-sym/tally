# 04 – Search: Episode Tap = Start Watching + Progress

Objective

- Let users tap an episode to: 1) set show status to `watching`, and 2) set progress up to that episode (inclusive). Remove the current "Add to Watching" button. Add an "Add to Watchlist" action (clock icon).

Scope (iOS Search expanded row)

- Update the expanded details UI for a search result to support episode-tap interactions and cleaner season selection.
- Wire to existing API endpoints to set status and progress.

API Contracts (server already supports these)

- POST `/api/watchlist` body `{ tmdbId: number, status: 'watching' }` → ensures a `user_show` row exists with status `watching` (idempotent upsert).
- PUT `/api/watchlist/:tmdbId/progress` body `{ seasonNumber: number, episodeNumber: number, status: 'watching' | 'watched' | 'unwatched' }` → batch-sets progress up to episode.

Implementation Plan

1. API client additions

- Add `ApiClient.setEpisodeProgress(tmdbId: Int, season: Int, episode: Int, status: String) -> ProgressSetResponse`.
  - Request: PUT `/api/watchlist/{tmdbId}/progress` with JSON `{ seasonNumber, episodeNumber, status }`.
  - Response model: `{ success: Bool, data: { updatedCount: Int, totalRequested: Int, status: String, message: String } }`.
- Keep `addToWatching(tmdbId:season:)` as-is (used to ensure status=watching before setting progress).

2. UI interaction: episode tap

- Convert each `EpisodeRowView` into a tappable button.
- On tap:
  - Guard `tmdbId` and `selectedSeason`.
  - Start a per-episode loading state to disable repeated taps.
  - Step A: call `api.addToWatching(tmdbId: tmdbId)` (no season required, optional best-effort).
  - Step B: call `api.setEpisodeProgress(tmdbId: tmdbId, season: selectedSeason, episode: tappedEpisode.episodeNumber, status: 'watched')` to mark all up to N as watched.
  - On success: visually reflect progress (see 4), show lightweight toast/feedback.
  - On failure: show inline error banner; keep row enabled.

3. Replace header actions

- Remove "Add to Watching" button.
- Add compact "Add to Watchlist" control:
  - Trailing small button with clock icon `🕒` (SF Symbols: `clock`), label "Watchlist".
  - Calls existing `addToWatchlist(tmdbId: status: .watchlist)`.
  - Disabled if `tmdbId` missing.

4. Visual feedback for progress

- Persist local progress in view model keyed per `tmdbId+season` so rows ≤ N render as green with a checkmark.
- Green tint for rows 1..N, matching web behavior; tapped row included.
- Server remains source of truth; this local state is optimistic feedback.

5. Season selector cleanup

- Remove duplication of the word "Season". Current layout shows a headline "Season" and a row labeled "Season:" again.
- New layout within expanded card header row:
  - Left: static label "Season" in secondary text.
  - Middle: a Menu-style picker button titled "Season X" with a chevron, subtitle "(N episodes)" in smaller, secondary text stacked beneath.
  - Right: Watchlist clock button from step 3.
- Use only one control for season change (no separate numeric stepper). Prefer `.menu` picker; ensure tap target large enough.
- Spacing: reduce vertical padding to bring the selector closer to the episodes heading; use a single Divider above the section.

6. Episode list polish (scrollable)

- Make each episode cell a Button with pressed highlight.
- Right-aligned date uses a consistent short format (e.g., `MMM d`).
- Keep status chip (Aired/Upcoming/Airing Next), but reduce repetition; place below the title as a small caption with color.
- Replace the ellipsis truncation with a scrollable area:
  - Use `ScrollView { LazyVStack { ... } }` inside the expanded card.
  - Constrain height to ~240–280pt via `.frame(height:)` for comfortable scanning without growing the parent list row excessively.
  - Remove the "… and N more episodes" line.
  - Ensure nested scrolling behaves well: allow the outer `List` to scroll; the inner `ScrollView` handles episode scrolling.

7. Search-as-you-type (debounced)

- Add `scheduleSearch(api:debounceMs:)` to the view model with a cancellable task that calls `performSearch` after ~400ms of inactivity.
- Wire `onChange(of: query)` to call `scheduleSearch`. Remove the Search button.

8. State + error handling

- Introduce `@Published var settingProgressFor: Set<String>` in `SearchViewModel` to track in-flight episode taps by composite key like `"
\(tmdbId)-s\(season)-e\(episode)"`.
- Map API failures via existing `mapErrorToUserFriendlyMessage` and show inline row error (e.g., red exclamation in row) for a few seconds.

9. Accessibility

- Use `accessibilityLabel` like "Set progress to Episode 4".
- Announce success via `UIAccessibility.post(notification: .announcement, argument: ...)`.

10. Acceptance criteria

- Tapping an episode immediately:
  - creates/updates a `user_show` to `watching`, and
  - sets progress up to that episode as watched via the TMDB progress endpoint,
  - provides visible confirmation in the list.
- Season selector is single, clean control; no duplicate labels; compact and aligned.
- No "Add to Watching" button remains; Watchlist action available via clock icon.
- Episode section is scrollable with no trailing ellipsis; scrollbar or momentum scrolling is available; layout stays within the card without expanding indefinitely.

---

Progress Update (implemented)

- Added `ApiClient.setEpisodeProgress` with response decoding.
- Episode tap now: ensures show status=watching and sets progress up to tapped episode as watched.
- Local progress cache in `SearchViewModel` to immediately tint rows ≤ N green with a checkmark.
- Removed "Add to Watching"; added clock "Watchlist" action.
- Cleaned season selector with a single Menu control and stacked subtitle.
- Episodes list now scrollable within the expanded card (fixed height ~260pt).
- Search-as-you-type added with 400ms debounce; Search button removed.

---

TODO FOR IMPLEMENTATION (Lower-Reasoning Model)

- Name: SEARCH_EPISODE_PROGRESS_POLISH
- Tasks:
  - Hook a GET to `/api/watchlist/:tmdbId/progress` after setting progress, and on expand, to replace local optimistic state with server truth when available.
  - Distinguish the current episode (N) styling vs earlier episodes (≤ N-1) if desired (e.g., blue badge for "Watching"). This may require a two-step set: episodes ≤ N-1 as `watched`, episode N as `watching`.
  - Add a subtle success toast/snackbar after progress update.
  - Accessibility: add `accessibilityHint` for episode buttons; announce success message.
  - Persist the last selected season per expanded show while the view is alive.
  - Guard nested scroll performance on very long episode lists (e.g., reuse identifiers or reduce shadow effects).
  - Remove dead code paths related to the old ellipsis and button.

10. Follow-ups (out of scope for this pass)

- Persist and reflect real progress in Search via fetching `/api/watchlist/:tmdbId/progress` after update.
- Long-press episode for quick actions: Watched / Unwatched / Set as Next.
- Optimistic updates across app-wide progress views.

File Touch List (when implementing)

- `apps/ios/Tally/Services/ApiClient.swift` – add `setEpisodeProgress` and response model.
- `apps/ios/Tally/Features/Search/SearchViewModel.swift` – add episode-tap handler, in-flight state, error handling.
- `apps/ios/Tally/Features/Search/SearchView.swift` –
  - replace season selector row and trailing actions,
  - make `EpisodeRowView` a button and apply visual progress cues.

---

Next Steps For Search UI

1. Readback server progress on expand

- Add `ApiClient.getShowProgress(tmdbId: Int)` calling `GET /api/watchlist/:tmdbId/progress`.
- Map the response to per-season highest watched and any active watching episode.
- Reconcile the optimistic state so rows ≤ N-1 are green (watched) and N is styled as watching.
- Call on expand and after a successful set.

2. Exact N behavior (N-1 watched, N watching)

- Leave current call as “watched up to N” until the atomic backend route exists.
- Add a view model feature flag to switch to the atomic route when available.
- Update row styling accordingly (N blue/watching, ≤N-1 green/watched).

3. Season selector ordering

- Sort menu options in descending order (most recent season at the top).
- Default the selected season to the maximum season number.

4. Minor polish

- Add a small toast/snackbar on success.
- Accessibility: label/hint for episode rows and announce success.

Implementation Specifics (for minimal‑reasoning agent)

- ApiClient method:
  - `getShowProgress(tmdbId: Int) -> { seasons: { [Int]: [{ episodeNumber: Int, status: 'watched' | 'watching' | 'unwatched' }] } }`
  - Call `GET /api/watchlist/:tmdbId/progress` and decode only `data.seasons`.

- ViewModel state:
  - `serverProgress: [String: (lastWatched: Int, watching: Int?)]` keyed by `"<tmdbId>-s<season>"`.
  - Keep existing `localProgress` as optimistic fallback; prefer `serverProgress` when present.

- Mapping logic from API response:
  - For each season array: `lastWatched = max(episodeNumber where status == 'watched')` or 0 if none.
  - `watching = max(episodeNumber where status == 'watching')` or nil if none.
  - `isWatched(row) = episode.episodeNumber <= lastWatched`.
  - `isWatching(row) = (watching != nil) && (episode.episodeNumber == watching)`.
  - Rendering precedence: if `isWatching` then do NOT render as watched-green; use watching-blue.

- Call sites for readback:
  - On expand: after analysis + `ensureSeasonEpisodesLoaded`, call `getShowProgress`; compute and set `serverProgress`.
  - After successful `setEpisodeProgress`, call `getShowProgress` again to reconcile UI.

- Feature flag for exact N behavior:
  - Add `useExactPositionProgress: Bool = false` in ViewModel.
  - When true (once backend exists), call `PUT /api/watchlist/:tmdbId/progress/exact` with `{ seasonNumber, episodeNumber }` and update `serverProgress` from readback. Until then, keep current "watched up to N".

- Season ordering in UI:
  - Sort menu options: `details.seasons.sorted { $0.seasonNumber > $1.seasonNumber }`.
  - `selectedSeason = details.seasons.map(\.seasonNumber).max() ?? 1`.

- UI styling:
  - Watched (≤ N−1): green background tint (e.g., `.opacity(0.25)`) + `checkmark.circle.fill`.
  - Watching (N): blue accent (no green) + `play.fill` or `play.circle.fill`.

- Toast feedback:
  - After success: show message `"Progress updated to S{selectedSeason} E{episodeNumber}"`.

- Fallbacks:
  - If readback fails, keep optimistic local state; do not block further taps.
  - Debounce readback if multiple quick taps (e.g., 200–300ms) to avoid request spam.

---

Fix Build Issues (to apply immediately)

- The tuple usage in `serverProgress` caused Swift errors (single-element labeled tuples collapse to the underlying type `Int`). Fix by simplifying the storage and reads:
  1. Change `SearchViewModel.serverProgress` type to `private(set) var lastWatchedBySeason: [String: Int]` (or keep the name `serverProgress` but as `[String: Int]`).
  2. In `readbackProgress`, assign plain `Int`: `serverProgress[key] = lastWatched` (remove `(lastWatched: ...)`).
  3. In `SearchView.swift`, update reads:
     - `if let sp = viewModel.serverProgress[seasonKey] { return episode.episodeNumber <= sp }`
     - Up Next: `episode.episodeNumber == (sp + 1)`.
  4. Remove all references to `.lastWatched` (no longer a tuple).
  5. Keep `localProgress` fallback logic unchanged.

Rationale: Swift doesn’t support labeled single-element tuples consistently; storing an `Int` avoids the member lookup compile error and matches how we actually use the value.
