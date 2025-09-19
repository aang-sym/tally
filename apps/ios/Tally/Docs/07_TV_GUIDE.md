# 07 – TV Guide (iOS)

Goal

- Build a horizontally scrollable TV Guide that groups user shows by streaming service (rows) across a date range (columns), rendering upcoming episode cards on the corresponding day. Match the spirit of img 1 while keeping performance and clarity top-of-mind.

## API Contract (current)

- Endpoint: `/api/tv-guide` with query `startDate`, `endDate`, optional `country`.
- Auth: standard bearer token; server may use `x-user-id` header to resolve Supabase user.
- Response shape (`TVGuideData` in iOS):
  - `services[]` → `{ service: { id, name, logo, color, textColor }, shows: TVGuideShow[] }`
  - `dateRange` → `{ startDate, endDate }`
  - `totalShows`, `totalEpisodes`
- `TVGuideShow` (subset used on iOS): `tmdbId`, `title`, `poster?`, `streamingServices[]`, `activeWindow? { start, end }`, `upcomingEpisodes[]`, `bufferDays?`, `country?`
- `TVGuideEpisode`: `seasonNumber?`, `episodeNumber?`, `airDate (yyyy-MM-dd)`, `title`, `tmdbId`
- References:
  - apps/api/src/routes/tv-guide.ts:165
  - apps/ios/Tally/Services/ApiClient.swift:820

## UX Summary (img 1 → iOS)

- Locked columns (left):
  - Column 1: Provider rail with logo inside a brand‑colored pill (uses API `service.color`/`textColor`).
  - Column 2: Show rail listing posters of shows for that provider that have episodes in range (stacked vertically in the provider row).
- Day columns (right): one column per day with light rounded background and pinned day headers (e.g., "01", "02").
- Episode cards: rendered in provider row × day column. Card text is two lines only:
  - Line 1: `S<E>E<NN>` (e.g., `S3E01`)
  - Line 2: Episode name
    No show title on the card (the show is implied by the show rail).
- Scrolling: horizontal across days; vertical across providers. Top day‑header and the two left rails remain pinned.

## Component Plan

- `TVGuideView`
  - Owns date range, country, loading, and error state.
  - Fetches `TVGuideData` via `ApiClient.getTVGuide(startDate,endDate,country)`.
- `TVGuideHeader`
  - Month label and weekday/day‑of‑month pills for visible range; pinned at top.
- `ProviderRail`
  - Column 1: Provider logo + brand color; pinned while grid scrolls.
- `ShowRail`
  - Column 2: For the selected provider row, stacked show posters representing shows with episodes in the date range. Tap to filter grid to a single show.
- `GuideGrid`
  - Virtualized 2D grid: columns=days, rows=providers.
  - Renders `EpisodeCard` for each episode in day × provider. Multiple episodes stack vertically.
- `EpisodeCard`
  - Two text lines: `SxEy` and episode title. Rounded rect with provider‑tinted background and readable foreground; no show title on card.

## Layout Strategy

- Synchronized scrolling:
  - Horizontal axis: day columns in a `ScrollView(.horizontal)` that drives the day header.
  - Vertical axis: body grid in `ScrollView(.vertical)`; both `ProviderRail` and `ShowRail` mirror the vertical offset via `PreferenceKey`.
- Pinned regions:
  - Top: day header with month + day pills.
  - Left: two fixed‑width columns (ProviderRail, ShowRail).
- Grid options:
  - Start with `LazyVStack` of provider rows containing a `LazyHStack` of day cells; switch to `LazyHGrid` if needed.
- Sizing:
  - `providerRailWidth`: ~96–120pt; `showRailWidth`: ~84–96pt (poster 56–64pt + padding).
  - `dayWidth`: 120–140pt on iPhone; 160–200pt on iPad.
  - `rowHeight`: 84–100pt; vertical stack for multiple episode cards with 6–8pt spacing.
  - Day columns use rounded rect (12–16pt corner radius) with subtle fill.

## Data Mapping

- Build an index for fast lookup: `episodesBy(dateKey: String, serviceId: Int) -> [EpisodeSlot]` where each slot includes `showTmdbId`, `episode`, and `provider` color.
- Show rail contents: from `services[n].shows` filter to shows with `upcomingEpisodes` that intersect the chosen date range; dedupe by `tmdbId`.
- A show may list multiple `streamingServices`; prefer the group service (first entry) for placement.
- Optional: render a faint `activeWindow` span across day columns per show row (if it helps context without clutter).
- Dates use local timezone; keys in `yyyy-MM-dd` to match API.

## Interactions

- Tap `EpisodeCard` → bottom sheet with show title, SxEy, air date, provider, overview.
- Tap provider pill → filter to that provider only (toggle).
- Tap show poster in ShowRail → filter to that single show within the provider row.
- Long‑press episode → preview popover (iPad) or haptic + context actions.

## Accessibility

- Episode card accessibilityLabel: "<Show>, S<E>E<E>, on <weekday> <d MMM> on <Provider>".
- Large text support: card scales up to maintain tap target ≥44pt.
- Rail/header are separate accessibility containers with clear roles.

## Performance

- Virtualize with `LazyHStack/LazyVStack`; avoid nesting heavy views.
- Cache `TVGuideData` per (startDate,endDate,country) in-memory.
- Debounce country/date changes; only refetch if range actually changes.
- Use `AsyncImage` with small poster size; placeholders + fade-in.

## Error/Loading

- While loading: show skeleton rails and columns with shimmering placeholders.
- On error: compact message with retry button; keep previous content if available.

## Edge Cases

- Multiple episodes for the same provider/day: stack vertically with 6–8pt spacing, show up to 3 then `+N` overflow.
- Many shows in ShowRail: cap to 3–4 visible posters with a `+N` counter; expand on tap or scroll within the rail cell.
- No shows for a provider in range: show provider pill and an empty ShowRail cell.
- Long ranges (60–90 days): cap UI width and paginate by month if needed.

## Versioned Implementation Plan

### v1.0 – Locked Rails + Two‑Line Cards (ship this)

- Scope: Implement Provider + Show locked columns, pinned day header, horizontally scrollable days, stacked episode cards with `SxEy` + episode name.
- iOS tasks:
  - Files: create `Features/TVGuide/TVGuideView.swift`, `Features/TVGuide/TVGuideViewModel.swift`, and `Features/TVGuide/Components/{TVGuideHeader.swift,ProviderRail.swift,ShowRail.swift,GuideGrid.swift,EpisodeCard.swift}`.
  - Fetch: call `ApiClient.getTVGuide(startDate:endDate:country:)` once per range; cache in-memory by `(start,end,country)`.
  - Index: build `[String(dayKey) : [Int(serviceId) : [EpisodeSlot]]]` where `EpisodeSlot = (showTmdbId, seasonNumber?, episodeNumber?, title, providerColor, providerTextColor)`.
  - Day keys: generate `yyyy-MM-dd` array from `dateRange.startDate...endDate` (local timezone).
  - Layout: implement pinned rails/header using two scroll views and `PreferenceKey` sync:
    - Define `struct VerticalOffsetKey: PreferenceKey` and `struct HorizontalOffsetKey: PreferenceKey`.
    - Mirror vertical offset from grid to `ProviderRail` and `ShowRail`.
    - Mirror horizontal offset from grid to `TVGuideHeader`.
  - Card: two text lines only; rounded 12pt; background `providerColor` with text in `providerTextColor` or computed readable color.
  - Stacking: if multiple episodes exist for same provider/day, stack vertically with 6–8pt spacing; max 3 then show `+N` badge.
  - Filtering: simple provider filter toggle when tapping provider pill; optional (leave stub).
  - State: `@Published country`, `@Published dateRange`, `@Published isLoading`, `@Published error`, `@Published data`.
  - Error/loading: show skeletons; retain last good data on failure with a Retry button.
- Validation:
  - Visual: confirm rails and header remain pinned; cards placed correctly for at least 14–30 days.
  - Performance: smooth scroll on iPhone 12+; avoid layout thrash (limit views inside loops).

Status: Implemented core v1 files and behavior

- Added `Features/TVGuide/TVGuideViewModel.swift`: fetching via `ApiClient.getTVGuide`, day key generation, and index `[dayKey: [serviceId: [EpisodeSlot]]]` with deterministic sorting.
- Added `Features/TVGuide/TVGuideView.swift`:
  - Pinned header (horizontal days), locked Provider and Show rails, and scrollable grid.
  - `EpisodeCard` with two lines (SxEy + episode title), rounded backgrounds tinted by provider color.
  - Basic stacking with +N overflow.
- Added components:
  - `Features/TVGuide/Components/TVGuideHeader.swift`
  - `Features/TVGuide/Components/ProviderRail.swift`
  - `Features/TVGuide/Components/ShowRail.swift`
  - Loading skeletons and retry button wired in `TVGuideView`.

Fix Pack A (next actions for v1)

- Issue: Not all currently airing shows appear (e.g., Peacemaker on HBO Max, Alien: Earth on Disney+, Terminal List: Dark Wolf on Prime).
  - Fix (iOS): Ensure we load a full calendar month range, not a 28‑day window.
    - File: `Features/TVGuide/TVGuideViewModel.swift`
    - Change `defaultRange()` to use first day → last day of the current month.
      - Compute `start` = first of month; `end` = last day via `Calendar.current.range(of: .day, in: .month, for: start)`.
    - After change, call `getTVGuide(startDate:endDate:country:)` with the new bounds and rebuild index.
  - Validation: Re‑run with the same account; confirm “still airing” shows surface with upcoming episodes in the current month; finished shows (e.g., Dexter Resurrection) should not show episodes unless the finale falls in range.

- Issue: Grid not aligned — provider/show rows don’t line up with day cells; days are offset below rails.
  - Fix (Layout): Use a single vertical scroll container for rails + grid so they share the same scroll position.
    - File: `Features/TVGuide/TVGuideView.swift`
    - Wrap the HStack containing ProviderRail, ShowRail, and grid in `ScrollView(.vertical)`.
    - Inside rails components (`ProviderRail`, `ShowRail`), replace their `ScrollView(.vertical)` with plain `VStack` (no internal vertical scrolling).
    - Keep the grid’s horizontal scrolling as is; vertical scrolling is driven only by the outer container.
    - Days row (01, 02, 03) should be frozen, not to move when scrolling vertically
    - Provider column, show column, and episode air days columns should scroll together, vertically
    - Provider column and show column should be frozen when scrolling horizontally
  - Validation: Top of grid aligns directly under the day header; scrolling vertically moves rails and grid together without drift.

- Issue: Month label should appear above Provider/Show columns (left of the days).
  - Fix (Header): Replace the left spacer in the header with a month pill that has the same width as `providerRailWidth + showRailWidth` and shows `MMM`.
    - File: `Features/TVGuide/TVGuideView.swift` (header) or `Components/TVGuideHeader.swift`.
    - Implementation: Prepend a `RoundedRectangle(cornerRadius: 12)` with text `monthLabel` (derived from the first day key).
    - Provider label should be frozen, not to move when scrolling vertically
  - Validation: Month pill aligns with the left rails; day pills start immediately to its right.

- Issue: Days only show 01‑28; should be full month (horizontal calendar).
  - Fix (Range + Keys): When computing `dayKeys()`, generate the inclusive keys from the first to the last day of the selected month.
    - File: `Features/TVGuide/TVGuideViewModel.swift`
    - Ensure `dayKeys()` uses the `dateRange` provided by API (if returned) or the month bounds computed in `defaultRange()`.
  - Validation: For a 30/31‑day month, day pills and grid columns render for all days.

- Issue: Show posters in ShowRail have a colored square behind them.
  - Fix (Styling): Remove background fills from ShowRail cells; use a clear background with just posters and spacing.
    - File: `Features/TVGuide/Components/ShowRail.swift`
    - Change container from `RoundedRectangle(...).fill(...)` to a simple `Color.clear` overlay or a `RoundedRectangle` stroke if needed (but no fill color).
  - Validation: Posters appear on a blank rail column consistent with the mock.

- Issue: On tap, posters should expand full‑screen (Letterboxd style).
  - Fix (Interaction): Add full‑screen poster viewer.
    - Files: `TVGuideView.swift`, `ShowRail.swift`.
    - State: `@State private var expandedPosterURL: URL?` in `TVGuideView`.
    - On poster tap in `ShowRail`, set `expandedPosterURL = URL(string: show.poster ?? "")`.
    - Present with `.fullScreenCover(item: $expandedPosterURL) { url in PosterFullScreenView(url: url) }`.
    - Implement `PosterFullScreenView`: black background, `AsyncImage(url: url)` with `scaledToFit`, tap to dismiss.
  - Validation: Tapping a poster opens a full‑screen image; swipe/tap down dismisses; no layout shift in the grid.

Tracking checklist

- [x] VM defaultRange → first..last day of current month
- [x] dayKeys covers entire month (or API `dateRange`) — uses month bounds when API doesn’t override
- [ ] Single vertical ScrollView; rails use VStack (aligned grid)
  - [x] Rails converted to `VStack` (no internal vertical scrolling)
  - [ ] Wrap rails + grid in outer `ScrollView(.vertical)` so they share vertical offset
- [ ] Header month pill aligns over rails
- [x] Remove ShowRail background fill
- [x] Poster full‑screen viewer on tap
- Next small tasks to finish v1 polish:
  - Add explicit `TVGuideHeader`, `ProviderRail`, `ShowRail`, `GuideGrid` component files (currently implemented inline in `TVGuideView`).
  - Skeleton placeholders during loading; retry button on error.

# v1.0 TV Guide Redesign Brief

## Context
We are building the **TV Guide view** in the Tally app.  
This view is *not* for content discovery. Instead, it only shows shows the user has marked as **“watching”**.  

- A show appears in the guide **1 week before a season premiere**.  
- The guide should focus on **clarity and utility**, not browsing or recommendations.  

## Requirements

### 1. Layout & Structure
- **Frozen Poster Column**:
  - Left column displays static posters of shows the user is watching.
  - Posters should be consistent in aspect ratio (3:4), with slight corner radius (8–12pt).
  - If a show has no new episodes in the current week, dim or gray out its poster.

- **Calendar Grid**:
  - Top row shows days of the current week (e.g., 01–07 Sep).
  - Highlight *today* with a filled accent circle.
  - Use vertical gridlines to visually align dates with episode cells.
  - Default to the *current week auto-expanded*, with swipe gestures to navigate to future/past weeks.

- **Episode Markers**:
  - By default, each release cell shows shorthand like `S1E8`.
  - On tap, expand inline to show episode details.

### 2. Episode Expansion
When a user taps on `S1E8`, expand the cell to show:
- Episode code + title (e.g., `S1E8: The Lord of the Tides`)
- Air date + runtime
- Short synopsis (2–3 lines)
- Quick actions:
  - ⭐ Add to Watchlist
  - 🔔 Set Reminder
- Expanded card should collapse back when tapped again.

### 3. Season Premieres
- One week before a season starts, display show with a **“Premieres in 7d”** badge instead of an episode code.
- Once the release date arrives, switch to standard `SxEy` format.

### 4. Interaction & Navigation
- Horizontal swipe on the calendar row to move between weeks.
- Auto-scroll the grid to bring the nearest new release into view.
- Pinch-to-zoom (optional) to toggle between **week view** and **month view**.

### 5. Visual Design & iOS Guidelines
- Follow **Apple Human Interface Guidelines (HIG)**:
  - Use **SF Pro Text** for typography.
    - Show title = 17pt Semibold
    - Episode details = 13pt Regular (70% opacity)
  - Accent colors should align with system dynamic colors (blue for highlights, or service-brand colors where subtle).
- Provide strong contrast for readability (e.g., text at 85–90% white on dark background).
- Use **SF Symbols** for icons (bell, star, plus).
- Motion:
  - Smooth expansion/collapse animations for episode cards.
  - Week transitions should slide horizontally like Apple Calendar.

### 6. Empty States
- If no shows have new episodes in the current week:
  - Display posters dimmed.
  - Provide a friendly message like “No new episodes this week — check back soon.”

---

## References
- **Apple Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **Apple Calendar (week view)**: for grid navigation patterns.
- **Apple TV app (Up Next row)**: for poster/episode association.
- **Mobbin**: design pattern references for streaming + schedule apps.

### v1.1 – API Enhancements + Deterministic Ordering

- Scope: Add richer episode metadata and server‑assisted day keys; update client ordering and mapping.
- API tasks (apps/api/src/routes/tv-guide.ts):
  - Add `episodeId` (stable ID like `tmdbId-s{season}e{episode}`) to `TVGuideEpisode`.
  - Add optional `airDateTime` (ISO 8601 with timezone) and `timeSource` ("official" | "inferred").
  - Add `serviceId` on each `upcomingEpisodes[]` item (copy from grouping service) to remove client inference.
  - Add `days[]: string[]` echo for the requested range (yyyy-MM-dd) in `TVGuideResponse`.
  - Optional: add `badgeColor` to the service object (less saturated) for card backgrounds.
- iOS tasks:
  - Update models in `ApiClient.swift` to include `episodeId`, `airDateTime?`, `timeSource?`, `serviceId?`, and `days[]` on `TVGuideData`.
  - Prefer `days[]` from API for iteration; fall back to local generation if omitted.
  - Sort stacking in a cell by: `airDateTime? asc` else `(seasonNumber asc, episodeNumber asc, title asc)`.
  - Use `serviceId` directly for indexing.
- Validation:
  - Confirm deterministic ordering in multi‑episode cells across refreshes.
  - Verify backwards compatibility if server omits new fields.

### v1.2 – Usability: Filters, Overflow, Active Window, Density

- Scope: Add filters and refine rails; improve scan density.
- iOS tasks:
  - Provider filter chips: render chips above grid; toggle filters state; filter index by provider.
  - ShowRail overflow: show up to 3–4 posters and a `+N` capsule; tapping capsule expands a modal list to choose a show filter.
  - Active window: draw faint span across day columns per show using `activeWindow` (if present).
  - Density toggle: add `Compact / Comfortable` control; adjust `dayWidth` and `rowHeight` accordingly.
  - Haptics: light impact on card tap; context menu on long‑press with “Open show,” “Copy episode,” etc.
- Validation:
  - Filters compose (provider + show) without layout glitches.
  - Density toggle does not cause reflow jank; frame updates are under 16ms.

### v1.3 – Resilience: Pagination, Caching, Freshness

- Scope: Handle long ranges and reduce network churn.
- API tasks:
  - Add `maxRangeDays` constant and return `nextStartDate` hints for pagination.
  - Support `ETag`/`If-None-Match` or `lastUpdatedAt` to enable 304 responses.
- iOS tasks:
  - Paginate by month when range > `maxRangeDays`; stitch days seamlessly in UI.
  - Cache responses by `(start,end,country)` with freshness TTL; revalidate using ETag/304 when available.
  - Background refresh hook to prefetch the next page when user approaches the end.
- Validation:
  - Verify memory stays bounded on 60–90 day browsing.
  - Confirm cache hit paths and graceful offline behavior.

## Acceptance Criteria

- Day header remains pinned; two left rails (Provider & Show) remain pinned.
- Episode cards show only `SxEy` and episode name; no show title on card.
- Correct placement: provider × day intersections; multiple episodes stack with overflow handling.
- Provider brand colors applied; foreground text readable (use API `textColor` or computed contrast).
- Smooth for 14–30 day ranges; graceful error recovery with retry.

## Feedback on Mock (img 1)

- Strong: Clear mental model (services as rows, days as columns). The rounded day lanes and colored provider rail match the brand and help scanning.
- Suggest: Consider small time badges only if we ever add times; API is date-only today, so vertical position shouldn’t imply time ordering.
- Overflow: Where multiple episodes occur in one cell, show up to 3 cards then a compact `+N` badge.
- Contrast: Ensure text over provider-tinted cards meets contrast—use API `textColor` or compute readable foreground.
- Density: iPhone may prefer 120–140pt per day; on iPad we can increase width and show larger posters.
