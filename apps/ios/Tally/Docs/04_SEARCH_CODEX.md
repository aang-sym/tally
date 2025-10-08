# 04 – Search: iOS Episode Progress + Parity Checklist

Purpose

- Ensure iOS Search uses the API fully and mirrors the web’s core workflow. Keep UI simple; focus on wiring and correctness.

Completed

- Search-as-you-type with 400ms debounce (button removed).
- Expandable results with season selector (Menu) and descending season order.
- Lazy season episode load on demand; scrollable episodes area (~260pt).
- Tap episode N sets status to watching (idempotent) and marks “watched up to N”.
- Readback GET `/api/watchlist/:tmdbId/progress` on expand to reflect server state.
- Local + server progress rendering:
  - Watched: rows ≤ lastWatched tinted green with checkmark.
  - “Up Next”: shows on row lastWatched + 1 (distinct from “Airing Next”).
- “Add to Watchlist” clock action in the header.
- Pattern summary badge (pattern + confidence) in the expanded header.
- Providers mini row (logos + names) rendered under the badge.
- Provider chips are clickable and persist the selection via `PUT /api/watchlist/:id/provider`.
- Bottom toast/snackbar confirms progress and provider saves; basic accessibility labels/hints added.
- Country selection picker in Search header; API calls pass the selected country and expanded rows auto-refresh with new providers.
- Development logs for Search/Expand/Analyze/Season/Progress/Provider/Watchlist in DEBUG builds.

Working Next

1. Immediate readback after update

- Goal: After an optimistic success, silently fetch server truth and reconcile UI in-place (no reload/expand).
- Implementation steps (lower-reasoning ready):
  1. File `apps/ios/Tally/Features/Search/SearchViewModel.swift`, inside `setProgressUpToEpisode(...)`:
     - After the `api.setEpisodeProgress(...)` `try await` returns OK, add a non-blocking readback call:
       - `Task { await self.readbackProgress(api: api, tmdbId: tmdbId) }`
       - Keep it outside the defer removal of `settingProgressFor` so the spinner clears immediately while readback runs.
  2. Keep existing optimistic update (`localProgress["<tmdbId>-s<season>"] = episode`) intact so the UI flips to green instantly.
  3. Readback reconciliation is already implemented in `readbackProgress(...)` + row logic:
     - `serverProgress["<tmdbId>-s<season>"] = lastWatched`
     - Row watched check uses `serverProgress` when present, else `localProgress`.
  4. Error handling:
     - If readback fails, do nothing (leave optimistic state). Do not surface a blocking error; log only.
  5. Optional micro-optimization (skip for now unless needed):
     - If we want less data, we can later limit reconciliation to the active season by filtering the map from `getShowProgress`.
  6. Acceptance criteria:
     - Tapping episode N immediately marks ≤ N as watched (green) with no UI jump.
     - Within ~200–500ms, if the server differs, the rows adjust to match server truth.
     - No card collapse/expand; no full-result reload.

2. Web parity checklist (compare SearchShows + PatternAnalysis on web)

- Goal: Surface providers + actions like web, and show inline errors.
- A. Pattern summary badge — completed (see Completed).

- B. Providers: make chips clickable to save selection
  - Status: Implemented.
  - API Route (already available): `PUT /api/watchlist/:id/provider` with body `{ provider: { id, name, logo_path } | null }`.
  - ApiClient:
    - Add method `updateStreamingProvider(userShowId: String, provider: ProviderSelection?)` where
      ```swift
      struct ProviderSelection: Codable { let id: Int; let name: String; let logo_path: String }
      ```
    - Encode as `{ provider: provider }` (or `{ provider: null }` to clear).
  - ViewModel state:
    - Add `@Published var userShowIdByTmdb: [Int: String] = [:]`.
    - When calling `addToWatching(tmdbId:)`, capture the returned `UserShow.id` and store it in `userShowIdByTmdb[tmdbId]`.
    - Add helper `ensureUserShowId(api:tmdbId:) async -> String?` that:
      1. If mapping exists, return it.
      2. Else call `addToWatching(tmdbId:)`, store and return the id.
  - UI wiring (in `ExpandedDetailsView` providers row):
    - Render each provider chip as a Button.
    - On tap:
      1. Resolve `tmdbId` and call `ensureUserShowId` to get `userShowId`.
      2. Build `ProviderSelection` from chip: `id = provider.providerId`, `name = provider.name`, `logo_path = provider.logo ?? ""`.
      3. Call `api.updateStreamingProvider(userShowId: userShowId, provider: selection)`.
      4. Locally mark the selected provider for the TMDB show (e.g., `@Published var selectedProviderByTmdb: [Int: Int]`).
    - Visual state:
      - Selected provider chip uses a filled background/tint.
      - Show a small spinner on the tapped chip while saving.
  - Acceptance:
    - Tapping a provider chip persists the selection server-side and updates the chip’s selected state.
    - If the show wasn’t in watchlist, it’s auto-created as `watching` first.

- C. Inline error surfacing
  - File: `apps/ios/Tally/Features/Search/SearchView.swift`
    - In the expanded card body (above episodes), if `viewModel.error` is non-nil:
      - Show a small rounded banner with the error text (caption) and a “Dismiss” text button that calls `viewModel.clearError()`.
      - Do not block interactions.
  - Acceptance: Network/parse issues show a small inline banner; dismiss clears it.

  D. Idempotent add behavior (no extra UI)
  - No change needed; `addToWatchlist` and `addToWatching` already handle duplicates server-side. Just ensure errors (409/400) manifest in the inline banner above.

  E. QA checklist
  - Pattern badge shows for shows with a pattern and hides otherwise.
  - Providers strip appears when API returns providers; logos load at ~20–24pt height.
  - If a provider logo URL is missing/invalid, show a fallback placeholder (e.g., rectangle with initials or generic icon).
  - Any error during analyze/season/progress calls shows the inline banner and can be dismissed.

3. Minor polish

- Goal: lightweight confirmations and accessibility improvements.
- Implementation steps (lower-reasoning ready):
  A. Toast/snackbar
  - ViewModel: add `@Published var toastMessage: String?` and `func showToast(_:)` that sets the message and clears it after ~1.5s using a Task sleep.
  - View: in `SearchView`, overlay a small bottom-floating capsule when `toastMessage != nil`.
  - Trigger points: after `setEpisodeProgress` success and after provider save success (section 2B), call `showToast("Saved progress to S{season} E{episode}")` or `showToast("Provider saved")`.
    B. Accessibility
  - Episode button: `accessibilityLabel("Episode \(episode.episodeNumber)")`, `accessibilityHint("Sets watched up to this episode")`.
  - Provider chip: `accessibilityLabel("Provider: \(name)")`, `accessibilityHint("Sets streaming provider for this show")`.
  - On success, post announcement: `UIAccessibility.post(notification: .announcement, argument: "Progress saved")`.

Future

- Exact position API: atomic route that sets ≤ N−1 watched and N watching, and updates pointer on `user_shows` in one transaction.
- Episode ID surfacing or resolver to allow per-episode POSTs (watching/watched) from clients.
- Persist last selected season per show during the session.
- Bulk progress controls (mark season watched/unwatched) once screens move beyond Search.

4. Instrumentation logs (development-only)

- Goal: Print concise logs to Xcode console to trace user actions and API round-trips.
- Add the following #if DEBUG print(...) statements:
  - SearchViewModel.performSearch: "[Search] query='…' start", on success "[Search] done count=…", on failure "[Search] error=…".
  - SearchViewModel.toggleExpansion: "[Expand] tmdbId=… open/close".
  - Details fetch complete: "[Analyze] tmdbId=… analyzedSeason=…".
  - Season episodes load: "[Season] tmdbId=… season=… loaded episodes=…".
  - Episode tap start: "[Progress] tap tmdbId=… SxEy".
  - After setEpisodeProgress success: "[Progress] set watched up to SxEy OK".
  - After readback: "[Progress] readback tmdbId=… seasons=…".
  - Provider chip tap start/success/fail: "[Provider] select name=… id=… (saving)", then "[Provider] saved userShowId=…" or "[Provider] error=…".
  - Add to watchlist/watching: "[Watchlist] added id=… status=…" or "[Watchlist] error=…".
  - All mapped errors should include the ApiError case or HTTP status.

5. Country selection (match web UserManager behavior)

- Goal: Allow users to set a preferred country that Search/Analyze/Providers use.
- Placement (now vs later):
  - Now: a quick picker lives on the Search page header (immediate feedback; same pattern as web).
  - Later: also surface the same preference in a Settings screen; both write to `CountryManager` so they stay in sync.
- A. Persistence (CountryManager)
  - Add apps/ios/Tally/Services/CountryManager.swift:
    enum CountryManager {
    private static let key = "user*country"
    static func get() -> String { UserDefaults.standard.string(forKey: key) ?? "US" }
    static func set(* code: String) { UserDefaults.standard.set(code, forKey: key) }
    static let all: [String] = ["US","GB","CA","AU","DE","FR","JP","KR","IN","BR"]
    }
- B. ViewModel wiring
  - Add @Published var country: String = CountryManager.get().
  - On appear: country = CountryManager.get().
  - Add func setCountry(\_ c: String) { CountryManager.set(c); country = c }.
  - Use country when calling ApiClient:
    - Search: api.searchShows(query: trimmedQuery, country: country).
    - Analyze: api.analyzeShow(tmdbId:…, country: country).
    - Season raw: api.getSeasonRaw(tmdbId:…, season:…, country: country).
    - Progress readback unchanged (server is user-specific).
- C. UI control (Search header)
  - In `SearchView` header, add a `Menu("Country: \(viewModel.country)")` next to the search field.
  - Populate items from CountryManager.all.
  - On select: viewModel.setCountry(code) then
    - If query not empty: viewModel.scheduleSearch(api: api).
    - For expanded shows: call ensureSeasonEpisodesLoaded after re-running analyze with the new country via existing expansion flow.
- D. Acceptance
  - Country persists via UserDefaults and survives app restarts.
  - Search/analyze/provider results reflect the selected country without navigation.
