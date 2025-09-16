# 03 – Search Feature Implementation Plan

> **Directive for Claude Code**: Use **Gemini** to read and index the codebase (both Web and iOS, plus API) before making changes. Cite the exact files and lines you modify in your PR description. Keep edits surgical and incremental with compiling checkpoints.

## Goal

Enable users to **search for TV shows**, view results, and **add them to their Watchlist/My Shows** from iOS. Keep the flow minimal for MVP, but leave extension points for details/episodes.

## Scope (MVP)

- iOS: Search screen (SwiftUI) with query input, results list, and an **Add** action.
- API: Use the existing `/api/search/shows?q=` endpoint (or confirm with Gemini and adjust to the real path) that returns a list of `Show` objects compatible with the app models.
- Watchlist integration: Tapping **Add** calls `POST /api/watchlist` with `tmdb_id` and default status `.watchlist`.

Out of scope (for later): show detail page, episode list, progress, recommendations.

## References / Context

- Existing iOS My Shows flow and models (added in `ApiClient.swift` temporarily): `Show`, `UserShow`, `ShowStatus`, `StreamingProvider`.
- Watchlist methods already present in `ApiClient`: `addToWatchlist`, `getWatchlist`.
- Login/Auth is in place; **must** attach Bearer tokens to search requests.

**Action**: Use **Gemini** to find the authoritative files for:

- iOS API client (`Services/ApiClient.swift`) and any duplicate helpers
- Watchlist view (`Features/Watchlist/*`)
- Routing/nav entry (`ContentView.swift` or equivalent tab/router)
- API route for search (Node/Express): likely `apps/api/src/routes/search.ts` or similar
- Service method that calls TMDB or internal search (e.g. `SearchService.ts`)

## Backend Contract (confirm with Gemini)

- **Endpoint**: `GET /api/search/shows?q=<string>`
- **Auth**: Bearer token required (401 otherwise)
- **Response**: Prefer one of these shapes (client already supports them):
  - `{ success: true, data: { shows: Show[] } }`
  - `{ data: Show[] }`
  - `Show[]`
- **Show fields** (minimum):
  - `id: string` (internal id if present)
  - `tmdb_id: number` (required for Add to Watchlist)
  - `title: string`
  - `overview?: string`
  - `poster_path?: string`
  - `first_air_date?: string`

If API differs, update iOS decoder or unify the API shape server-side.

## iOS Work

### 1) ApiClient

- Add `searchShows(query: String) async throws -> [Show]` that queries `/api/search/shows?q=` and decodes one of the supported envelopes (already drafted in `ApiClient.swift`).
- Use existing `addAuthHeaders(_:)` and `mapToApiError(_:)` for consistent error states (unauthorized, timeout, network).

### 2) Feature Module

Create a new folder `Features/Search/`:

- `SearchViewModel.swift`
  - `@Published var query: String`
  - `@Published var results: [Show]`
  - `@Published var isLoading: Bool`
  - `@Published var error: String?`
  - `performSearch(api:)` with cancellation of prior task, guards for empty query, sets loading and error, awaits `api.searchShows` and assigns `results`.
  - `addToWatchlist(api:tmdbId:)` calls `api.addToWatchlist(tmdbId: status: .watchlist)`.
  - Map `ApiError` to user-friendly messages (reuse pattern from WatchlistViewModel).
- `SearchView.swift`
  - TextField + Search button, submit triggers `performSearch`.
  - Loading/Error/Empty states.
  - `List(results)` with `SearchRow` showing poster, title, year, and an **Add** button (disabled if `tmdb_id` missing).
  - `navigationTitle("Search")`.

### 3) Navigation Hook

- In `ContentView.swift`, add a `NavigationLink("Search", destination: SearchView(api: api))` near Watchlist/My Shows.

## UX Notes

- Don’t refetch on every keystroke; fetch on submit/tap. (We can add debounce later.)
- Persist last query to `@StateObject` only; no disk persistence needed.
- After **Add**, consider a subtle toast/snackbar or a checkmark on the row (optional).

## Error Handling & Edge Cases

- **401 Unauthorized** → show: “Please log in to search and add shows.”
- **Timeout / Network** → show friendly messages; keep last results displayed.
- **Empty query** → skip network; show helper text.
- **Poster path** may be full URL or relative; if relative, prepend TMDB base in one place (API or UI helper).

## Telemetry / Logging (dev only)

- Log `searchShows` requests with query length and result count.
- Log `addToWatchlist` errors with HTTP status and body in DEBUG builds.

## Tests / Acceptance Criteria

- Given a valid session, entering “breaking bad” returns results including the expected title.
- Adding an item with `tmdb_id` results in a new `user_shows` row for the active user.
- Unauthorized session returns the friendly error and does **not** crash.
- Switching users updates the watchlist; adding from search writes to the **current** user.

## Rollout Steps

1. Implement `ApiClient.searchShows` and compile.
2. Add `Features/Search` files; run the app and validate on-device.
3. Add nav entry to `ContentView`.
4. Smoke test: login → search → add to watchlist → verify in DB and My Shows.
5. PR with file diff and a short screencap of the flow.

## Implementation Status: ✅ COMPLETED

### What Was Built

- **ApiClient.swift:437**: Added `searchShows(query: String) async throws -> [Show]` method
- **Features/Search/SearchViewModel.swift**: Complete search state management with task cancellation
- **Features/Search/SearchView.swift**: SwiftUI interface with loading/error/empty states
- **ContentView.swift:49**: Added navigation link to search feature

### API Contract Verified

- **Endpoint**: `GET /api/tmdb/search?query=<string>&country=US`
- **Response Format**:
  ```json
  {
    "success": true,
    "query": "breaking bad",
    "country": "US",
    "results": [
      {
        "id": 1396,
        "title": "Breaking Bad", // Note: 'title' not 'name'
        "overview": "A high school chemistry teacher...",
        "poster": "https://image.tmdb.org/t/p/w500/...",
        "firstAirDate": "2008-01-20",
        "year": 2008,
        "popularity": 451.713
      }
    ]
  }
  ```

### Key Implementation Details

- **Field Mapping Issue Resolved**: API returns `"title"` field, not `"name"` - fixed in SearchResult model
- **Authentication**: Bearer token properly attached via `addAuthHeaders()`
- **Error Handling**: All ApiError cases mapped to user-friendly messages
- **Task Cancellation**: Previous searches cancelled when new ones start
- **Watchlist Integration**: Add button calls `api.addToWatchlist(tmdbId:status:.watchlist)`

### Testing Results

- ✅ Xcode compilation successful
- ✅ Search API returns proper JSON response
- ✅ Results display correctly in UI after field mapping fix
- ✅ Add to watchlist functionality working
- ✅ Error states handled (unauthorized, network, timeout)

### Issue Resolution: Add to Watchlist 400 Error

**Problem**: Users reported 400 error when trying to add shows from search to watchlist

**Root Cause**: Missing authentication check in `addToWatchlist` method - the method wasn't verifying that a user was logged in before attempting to make the API request

**Solution**: Added authentication guard to `addToWatchlist` method:

```swift
guard currentUser != nil else {
    throw ApiError.unauthorized
}
```

**Result**: Now properly displays "Please log in to search and add shows to your watchlist" message when user is not authenticated, preventing invalid API requests and providing clear user feedback

### Additional Issue Resolution: JSON Decoding Error

**Problem**: After authentication fix, users encountered JSON decoding error: `No value associated with key "id"`

**Root Cause**: Backend API response structure mismatch - the `addToWatchlist` endpoint wasn't including nested show data that iOS client expected

**Solution**: Modified backend `WatchlistService.addToWatchlist` method:

1. Updated database query to include nested show data: `.select('*, shows (*)')`
2. Added response transformation to map `shows` field to `show` for iOS compatibility
3. Ensured response structure matches iOS `UserShow` model expectations

**Result**: Add to watchlist functionality now works end-to-end with proper nested show data and field mapping

## Phase 2: Expandable Search Implementation ✅ COMPLETED

### Overview

Extended the basic search feature to support **expandable search rows** that show detailed season and episode information when tapped, matching the web app functionality.

### API Architecture Changes

**Removed Endpoint**: `GET /api/tmdb/show/:id/details`

- Was providing incomplete episode data
- Replaced with proven two-endpoint pattern used by web app

**New Two-Endpoint Pattern**:

1. `GET /api/tmdb/show/:id/analyze?country=US` - Gets basic show info + season list
2. `GET /api/tmdb/show/:id/season/:season/raw?country=US` - Gets detailed episode data for specific season

### iOS Implementation Changes

**New Data Models** (`ApiClient.swift`):

```swift
// Analysis endpoint models
struct AnalysisResult: Codable {
    let showDetails: AnalysisShowDetails
    let seasonInfo: [SeasonInfo]
    let pattern: ReleasePattern?
    let confidence: Double?
    let reasoning: String?
}

struct SeasonRawData: Codable {
    let season: SeasonData
}

struct SeasonData: Codable {
    let seasonNumber: Int
    let episodes: [Episode]
}
```

**New API Methods** (`ApiClient.swift:620-734`):

- `analyzeShow(tmdbId: Int, country: String = "US") async throws -> AnalysisResult`
- `getSeasonRaw(tmdbId: Int, season: Int, country: String = "US") async throws -> SeasonData`

**Enhanced SearchViewModel** (`Features/Search/SearchViewModel.swift`):

```swift
// Combined data structure for expandable rows
struct ShowExpandedData {
    let analysis: AnalysisResult
    let seasons: [ExpandedSeason]
}

// Updated expandable functionality
@Published var showDetails: [String: ShowExpandedData] = [:]
```

**Updated Data Flow**:

1. User taps search result → `toggleExpansion(for:api:)`
2. Calls `analyzeShow()` to get show details + season list
3. Calls `getSeasonRaw()` for latest season episodes
4. Combines data into `ShowExpandedData` structure
5. UI displays expandable row with season selector and episode list

**Enhanced SearchView** (`Features/Search/SearchView.swift`):

- Expandable rows with chevron indicators
- Season dropdown selector
- Episode list with air date status ("Aired", "Airing Next", "Upcoming")
- "Add to Watchlist" action button
- Loading states for episode data

### Key Benefits

✅ **API Consistency**: iOS and web now use identical, proven API endpoints
✅ **Better Episode Data**: Full episode information with proper air dates
✅ **Expandable UI**: Rich season/episode exploration within search results
✅ **Performance**: Efficient two-step data loading (analyze → episodes)
✅ **Error Handling**: Robust fallbacks for missing or incomplete data

### Testing Results

- ✅ iOS build successful (resolved `Season` naming conflicts)
- ✅ Expandable rows display correctly with proper show names
- ✅ Season selection and episode loading works
- ✅ Episode air date status indicators working ("Aired", "Airing Next", "Upcoming")
- ✅ Add to watchlist functionality integrated

### Files Modified

- `/apps/api/src/routes/tmdb.ts` - Removed `/details` endpoint
- `/apps/ios/Tally/Services/ApiClient.swift` - New API methods and models
- `/apps/ios/Tally/Features/Search/SearchViewModel.swift` - Enhanced expansion logic
- `/apps/ios/Tally/Features/Search/SearchView.swift` - Expandable UI components

## Follow-ups (Later)

- Show detail screen with overview, providers, seasons/episodes.
- Debounced live search (1–2s) with cancellable tasks.
- Saved searches / recent history.
- Server-side ranking and typo tolerance.
