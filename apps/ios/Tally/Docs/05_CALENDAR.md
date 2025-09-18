# 05 – Calendar (iOS) – Completed ✅

Goal

- Ship a simple, performant monthly calendar showing streaming provider indicators per day; match the spirit of the web calendar and mockups. Prioritize correctness and responsiveness.

## Implementation Status

Completed and integrated:

- ✅ Files: `Features/Calendar/CalendarView.swift`, `Features/Calendar/CalendarViewModel.swift`, `Features/Calendar/DayDetailListView.swift`
- ✅ Navigation: Calendar entry wired from main navigation
- ✅ Core: Month grid, provider indicators, country switching, day tap → detail sheet
- ✅ Data: Uses TV Guide monthly endpoint; maps episodes to days; derives providers per day
- ✅ Performance: Caching by month/country, loading states, reduced redundant work
- ✅ Build: Compiles cleanly

Web reference

- See `apps/web/src/pages/Calendar.tsx` for UX affordances (country pill, overview calendar behavior).

## Data Integration (TV Guide) ✅

- ✅ Endpoint: `GET /api/tv-guide?startDate=yyyy-MM-dd&endDate=yyyy-MM-dd&country=XX`
- ✅ Maps response into:
  - `episodesByDate[yyyy-MM-dd] = [EpisodeRef]`
  - `dailyProviders[yyyy-MM-dd] = [ProviderBadge]`
- ✅ Primary provider selection (for days with 1–3 providers that have logos) with tiebreaker `(name.count DESC, id ASC)`
- ✅ Proper ISO 8601 → `yyyy-MM-dd` conversion with fallbacks; extensive logging for tracing

## Data Shape ✅

- `Calendar2Day { id: String(yyyy-MM-dd), date: Date, inMonth: Bool }`
- Providers use `{ id: Int, name: String, logo: String? }`
- 6×7 month grid via `LazyVGrid`; pads leading/trailing days to 42 cells

## Screens & Components ✅

- `CalendarView` (screen)
  - Header: month/year title, `Menu("Country: …")`, `Today` button
  - Weekday row: SUN … SAT
  - Grid: square day tiles; shows either a centered primary logo or an overflow badge
  - Day tap: opens `DayDetailListView` only when there are episodes/providers
- `DayDetailListView` (sheet)
  - Header with TOTAL price; list of provider rows (name + price)
  - Presentation: medium/large detents; drag indicator; accessible labels

## UI Details (matched to code) ✅

- Grid spacing: 1pt between items; square tiles via `aspectRatio(1, .fit)`
- Day tile background: `RoundedRectangle` with 14pt corner radius
- Icon sizing: `iconSize = min(cellWidth * 0.58, 46)`; centered within top 4/5 of tile
- Overflow: for >1 provider and no primary, show `+N` circle with small color dots overlay
- Accessibility: `accessibilityLabel` like “Netflix on Monday 1 September”

## Behavior Rules ✅

- No episodes → no icons/dots
- 1–3 providers with available logos → centered primary logo; others represented via dots
- > 3 providers or missing logos → fallback to dots/`+N`

## ViewModel Highlights ✅

- TV Guide-based loading: see `// MARK: - Data loading using TV Guide API (Step B implementation)` in `CalendarViewModel.swift`
- Primary provider selection and public accessors `primaryProvider(for:)`, `secondaryProviders(for:)`
- Static pricing per country for detail sheet; helpers: `getProviderPrices`, `getTotalCost`, `getShowsAiringOnDay`

## Code Organization

- Added MARK sections to `CalendarView.swift`:
  - `// MARK: - Calendar View (Screen)`
  - `// MARK: - State`, `// MARK: - Body`, `// MARK: - Header`, `// MARK: - Grid`, `// MARK: - Helpers`, `// MARK: - Day Cell`, `// MARK: - Previews`
- `CalendarViewModel.swift` already segmented with MARKs for month helpers, data loading, provider selection, and UI accessors.

## Acceptance Criteria ✅ Met

- Renders full month with provider indicators
- Country changes update inline
- Today behavior correct; padded days maintained
- Tapping a date with shows opens detail sheet; empty dates do nothing
- Proper loading states and error handling

## Future Improvements

- Server-side monthly schedule endpoint tailored to user shows
- Provider legend and monthly spend overlays
- Week/list hybrid view
- Subtle animations + haptics
- Deep-link to show cards (pre-selected season/episode)
