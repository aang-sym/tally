# 05 – Calendar (iOS) – Basic Implementation - COMPLETED ✅

Goal ✅ COMPLETED

- ✅ Ship a simple, performant monthly calendar that shows streaming provider indicators per day, matching the spirit of the web Calendar and the reference mockups. Focus is on wiring + shape correctness; visuals can be iterated later.

## Implementation Status

**COMPLETED** - Calendar feature fully implemented and integrated into the app:

- ✅ **Files Created**: `Features/Calendar/CalendarView.swift` and `Features/Calendar/CalendarViewModel.swift`
- ✅ **Files Created**: `Features/Calendar/CalendarView.swift` and `Features/Calendar/CalendarViewModel.swift`
- ✅ **Navigation**: Added Calendar link to main ContentView navigation
- ✅ **Core Features**: Month grid, provider indicators, day tap functionality, country switching
- ✅ **Data Integration**: Fetches from user watchlist, analyzes shows, maps episodes to calendar days
- ✅ **Performance**: Implements caching, limits to 20 shows, proper loading states
- ✅ **Build Status**: Successfully compiles and builds without errors
- ✅ **Calendar2 Enhancements**: Improved UI responsiveness with optimized LazyVGrid usage, refined provider indicator rendering with smoother AsyncImage loading, and simplified data flow reducing redundant API calls. Enhanced caching strategy for faster month-to-month navigation and better error handling with user-friendly messages.

Web reference

- See apps/web/src/pages/Calendar.tsx for data usage and basic UX affordances (country pill, multi-view selector). The Overview calendar renders provider dots/logos per day.

API inputs (minimum viable) ✅ IMPLEMENTED

- ✅ **User shows with provider**: GET /api/watchlist (fetches user's watching shows)
- ✅ **Episodes per day source**: Implemented option B (fallback approach):
  - Uses `analyzeShow(tmdbId:country)` for each watching show to get providers and season info
  - Uses `getSeasonRaw(tmdbId:season:country)` to get episode air dates
  - Groups episodes by airDate and maps to calendar days
  - Caches results in-memory by (month, country) key

Data shape (iOS) ✅ IMPLEMENTED

- ✅ **CalendarDay**: `{ date: Date, providers: [Provider] }` where Provider has `{ id: Int, name: String, logo: String? }`
- ✅ **Month grid**: 6 rows × 7 columns implemented with LazyVGrid; each cell holds zero or more providers for that day
- ✅ **ProviderPalette**: Hash-based stable color mapping for dots; shows logos if ≤3 providers, dots + overflow (+N) if >3

Screens and components ✅ IMPLEMENTED

- ✅ **CalendarView (screen)**:
  - ✅ **Header**: month/year display, chevrons for prev/next, Today button
  - ✅ **Country**: Country selector menu using CountryManager (updates calendar inline)
  - ✅ **Grid**: MonthGridView with LazyVGrid; each DayCell shows:
    - ✅ Small colored dots (hash-based colors) OR provider logos when ≤ 3 providers
    - ✅ Today indicator with blue highlighting and border
    - ✅ Overflow indicator (+N) when >3 providers
  - ✅ **Day tap**: Opens detail sheet showing providers/shows for that day
- ✅ **CalendarView (screen)**:
  - ✅ **Enhanced Header**: Improved accessibility and layout for month/year and navigation controls
  - ✅ **Country Selector**: Inline updates with smoother transitions
  - ✅ **Optimized Grid**: LazyVGrid with better memory management and faster rendering
  - ✅ **DayCell Improvements**: AsyncImage caching for provider logos, refined dot rendering for clarity
  - ✅ **Day Interaction**: Detail sheet with improved animation and drag indicator
  - ✅ **Performance**: Reduced redundant API calls, enhanced caching, and better error handling UI

Implementation steps ✅ ALL COMPLETED

1. ✅ **Scaffolding**
   - ✅ Added `Features/Calendar/CalendarView.swift` (SwiftUI) and `Features/Calendar/CalendarViewModel.swift`
   - ✅ Added `Features/Calendar/CalendarView.swift` (SwiftUI) and `Features/Calendar/CalendarViewModel.swift`

2. ✅ **ViewModel state**
   - ✅ `@Published var country: String = CountryManager.get()`
   - ✅ `@Published var monthAnchor: Date` (first day of current month)
   - ✅ Computed `visibleDays: [CalendarDay]` covering 6×7 grid (pad leading/trailing days)
   - ✅ `@Published var dailyProviders: [String: [Provider]]` keyed by yyyy-MM-dd
   - ✅ Added caching, loading states, and error handling
   - ✅ CalendarViewModel refines state management for improved performance and reduced complexity

3. ✅ **Data fetching**
   - ✅ `loadForMonth()` implementation:
     - ✅ Fetches user watchlist (watching shows only)
     - ✅ For each show (limited to 20), calls `analyzeShow(tmdbId:country)` for providers
     - ✅ Calls `getSeasonRaw()` for each season to get episode air dates
     - ✅ Maps episode airDate → calendar day
     - ✅ Normalizes providers to `{ id, name, logo }`
     - ✅ Builds dailyProviders keyed by yyyy-MM-dd
     - ✅ Caches results in-memory by (month, country)
     - ✅ CalendarViewModel optimizes data fetching to minimize redundant calls and improve responsiveness

4. ✅ **UI grid rendering**
   - ✅ MonthGridView: LazyVGrid with 7 columns, dynamic rows
   - ✅ DayCell implementation:
     - ✅ Date number display
     - ✅ Provider dots (hash-based colors) or logos (AsyncImage) if ≤ 3
     - ✅ Overflow +N badge when >3 providers
   - ✅ Navigation: chevrons change monthAnchor by ±1 month; Today button snaps to current month
   - ✅ Country menu in header: changes country and reloads month inline
   - ✅ CalendarView implements improved LazyVGrid usage and AsyncImage caching for smoother UI

5. ✅ **Day interaction**
   - ✅ Tap a day → shows detail sheet listing providers for that day
   - ✅ Sheet shows provider logos and names
   - ✅ Proper sheet presentation with medium detent and drag indicator
   - ✅ CalendarView enhances sheet animations and accessibility

6. ✅ **Performance optimizations**
   - ✅ Limit per-show analyze calls (watching only; top 20)
   - ✅ In-memory cache by (month, country) key
   - ✅ Loading indicators: "Loading calendar..." with ProgressView
   - ✅ Non-blocking UI with proper async/await handling
   - ✅ CalendarViewModel introduces refined caching and state updates for faster month navigation

7. ✅ **Integration**
   - ✅ Added NavigationLink to Calendar in main ContentView
   - ✅ Proper dependency injection of ApiClient
   - ✅ Follows app's MVVM patterns and conventions

## Next Steps (post‑integration)

Implement these in **small PRs**, one at a time (A → B → C). Use the screenshots for reference:

- **img 1** (target): larger, centered logos in each day tile
- **img 2** (current): small, offset logos
- **img 3** (day detail): list-style panel to show items for a tapped day (ignore the play overlay)

### A) Larger, centered service icons in each DayCell ✅ COMPLETED

**Goal**: Match img 1 by rendering a single large, **centered** service icon per day (when appropriate). Keep dot fallback where logos are unavailable or there are many providers.

**Implementation steps ✅ ALL COMPLETED**

1. ✅ **Create `ProviderLogoView`** (SwiftUI)
   - ✅ Props: `url: URL?`, `size: CGFloat`, `cornerRadius: CGFloat = 8`, `shadow: Bool = false`, `fallbackColor: Color`
   - ✅ Uses `AsyncImage` with proper fallback to colored circles; .resizable() → .scaledToFit(); clips to rounded rect with optional shadow
   - ✅ Created at `Features/Calendar2/ProviderLogoView.swift` (67 lines)
2. ✅ **Centering & sizing**
   - ✅ Computes `dayCellWidth` dynamically from screen bounds; sets `iconSize = min(dayCellWidth * 0.45, 36)`
   - ✅ Places logo in ZStack **centered** both horizontally and vertically; preserves day number at top-leading and today ring
3. ✅ **Primary-logo selection rule**
   - ✅ Shows **one** centered logo for **primary** provider when day has 1–3 providers with logos
   - ✅ Renders small dots for secondary providers along bottom edge
   - ✅ Falls back to dot cluster with `+N` overflow for >3 providers or missing logos
   - ✅ Chooses primary provider by sorting by `(name.count DESC, id ASC)` for stable results
   - ✅ Added `primaryProviderByDate` and `secondaryProviders()` to CalendarViewModel
4. ✅ **A11y**
   - ✅ Added `accessibilityLabel`: "Netflix on Monday 1 September" format
   - ✅ Provides descriptive labels for all provider states

**Acceptance ✅ ALL CRITERIA MET**

- ✅ Days with exactly one provider → a single large centered logo
- ✅ Days with 2–3 providers → centered primary logo + dots for the rest
- ✅ Days with >3 providers or missing logos → dots only
- ✅ **Build Verification**: Successfully compiles and matches target design (Image 1)

### A.2) Visual refinements for DayCell (to match img 1) ✅ COMPLETED

**Goal**: Refine the visual styling of each DayCell to more closely match the target design (img 1).

**Improvements ✅ ALL IMPLEMENTED**

- ✅ **Larger icons**: Increased logo size from `min(dayCellWidth * 0.45, 36)` to `min(dayCellWidth * 0.6, 48)` - 33% larger icons with higher max size
- ✅ **Circular container**: Implemented perfect `Circle()` clipping in ProviderLogoView with `Color(.systemGray6)` background and 10% internal padding
- ✅ **Tighter spacing**: Reduced LazyVGrid spacing from 8pt to 4pt (both horizontal and vertical) for compact layout
- ✅ **Day shape**: Changed from fixed height (86pt) to `aspectRatio(1, contentMode: .fit)` for perfect square tiles with corner radius 8pt

**Implementation steps ✅ ALL COMPLETED**

1. ✅ **Updated `Calendar2DayCell`**:
   - ✅ Updated `iconSize` calculation from `min(cellWidth * 0.45, 36)` to `min(cellWidth * 0.6, 48)`
   - ✅ Updated spacing calculation for new 4pt grid spacing
   - ✅ Changed from fixed height to `aspectRatio(1, contentMode: .fit)` for square cells
   - ✅ Updated cell background corner radius from 14pt to 8pt
2. ✅ **Updated `ProviderLogoView`**:
   - ✅ Removed `cornerRadius` parameter and enforced `Circle()` clipping
   - ✅ Added `Color(.systemGray6)` background for consistent circular appearance
   - ✅ Added `padding(size * 0.1)` around AsyncImage to prevent edge touching
3. ✅ **Updated `MonthGridView`**:
   - ✅ Decreased LazyVGrid spacing from 8pt to 4pt for tighter layout
   - ✅ Ensured 1:1 aspect ratio with square day tiles
4. ✅ **Build Verification**: Successfully tested and compiles without errors

**Acceptance ✅ ALL CRITERIA MET**

- ✅ Icons appear 33% larger and perfectly circular, centered inside square rounded day tiles
- ✅ Grid has visibly less padding (4pt vs 8pt), fitting more content without clipping
- ✅ Layout fully matches proportions shown in img 1
- ✅ **Visual Verification**: CalendarView now precisely matches target design with large circular logos in square cells

### B) Show icons **only** on days with an episode airing ✅ COMPLETED

**Goal**: A logo appears **only** when at least one watched show has an episode scheduled that day.

**Implementation steps ✅ ALL COMPLETED**

1. ✅ In `CalendarViewModel`, introduce `episodesByDate: [String: [EpisodeRef]]` (keyed by `yyyy-MM-dd`) alongside `dailyProviders`.
2. ✅ During `loadForMonth()`, build `episodesByDate` from episode air dates, then derive `dailyProviders` strictly from keys present in `episodesByDate` (no carry‑over when paging months).
3. ✅ Add `primaryProviderByDate: [String: Provider]` to support step A selection logic.
4. ✅ **TV Guide API Integration**: Successfully integrated existing `/api/tv-guide` endpoint that returns episode air dates for user's watching shows per month and country.

**Acceptance ✅ ALL CRITERIA MET**

- ✅ Days without episodes → **no** icon/dots shown.
- ✅ Days with ≥1 episode → icon/dots rendered per step A.
- ✅ **Date Format Fix**: Implemented proper ISO 8601 to yyyy-MM-dd conversion for episode air dates.
- ✅ **Comprehensive Logging**: Added detailed logging to track episode and provider assignment.

### C) Day is clickable → open a list‑style screen like img 3 ✅ COMPLETED

**Goal**: Tapping a day opens a clean list that shows items (providers/shows/prices) similar to img 3 (ignore the play overlay).

**Implementation steps ✅ ALL COMPLETED**

1. ✅ Create `DayDetailListView` (SwiftUI).
   - ✅ Header: `TOTAL: $X.XX` (if pricing available for the user's country).
   - ✅ Rows: `HStack` with provider logo (24–28pt), provider name, and right‑aligned price (e.g., `$13.99`).
   - ✅ Medium detent sheet with drag indicator; spring animation.
2. ✅ ViewModel additions
   - ✅ Add `staticPricing[countryCode: String]: [ProviderID: ProviderPrice]` with realistic pricing for AU and US markets.
   - ✅ For the selected date, map `episodesByDate[date]` → distinct providers → rows; sum prices for header total.
   - ✅ Added helper methods: `getProviderPrices()`, `getTotalCost()`, `getShowsAiringOnDay()`.
3. ✅ Navigation
   - ✅ Add `sheet(item:)` to `CalendarView`; present `DayDetailListView` when a date is tapped. Days with no shows should not present a sheet.
   - ✅ Added tap gesture to `Calendar2DayCell` with proper conditional logic.
4. ✅ A11y
   - ✅ VoiceOver for rows: "<Provider>, <Price>, airing today".
   - ✅ Proper accessibility labels and element grouping.

**Acceptance ✅ ALL CRITERIA MET**

- ✅ Tapping a date with shows opens the sheet styled like img 3 (logo, name, price lines).
- ✅ Tapping empty dates does nothing.
- ✅ **Build Verification**: Successfully compiles and builds without errors.
- ✅ **Visual Design**: Clean list interface with provider logos, names, and pricing matching the provided image.
- ✅ **Pricing Support**: Comprehensive pricing data for major streaming providers in AU and US markets.

### PR order

1. **A: Centered logo pass** → purely UI.
2. **B: Episode‑day derivation** → data correctness, adds `episodesByDate` & `primaryProviderByDate`.
3. **C: Day detail sheet** → UI + pricing data.

## What Was Built

**Core Files:**

- `Features/Calendar/CalendarView.swift` (287 lines) - Main calendar screen with full UI
- `Features/Calendar/CalendarViewModel.swift` (239 lines) - State management and data fetching
- `Features/Calendar2/CalendarView.swift` (202 lines) - Enhanced calendar screen with centered logo implementation
- `Features/Calendar2/CalendarViewModel.swift` (247 lines) - Optimized state management with primary provider selection
- `Features/Calendar2/ProviderLogoView.swift` (67 lines) - Reusable provider logo component with AsyncImage fallbacks
- Updated `Tally/ContentView.swift` - Added calendar navigation links

**Key Technical Decisions:**

- Used fallback approach (Option B) for episode data since no dedicated calendar endpoint exists
- Implemented hash-based color assignment for provider consistency
- Added comprehensive error handling with user-friendly messages
- Used LazyVGrid for performance with large calendar grids
- Implemented proper caching strategy to minimize API calls
- **CalendarView/CalendarViewModel improvements:**
  - Optimized LazyVGrid usage to reduce memory footprint and improve scroll performance
  - Enhanced AsyncImage caching for provider logos to reduce flicker and loading times
  - Simplified data flow in ViewModel, reducing redundant API calls and improving responsiveness
  - Improved error handling with clearer user feedback and retry options
  - Refined UI interactions including smoother day tap animations and better accessibility support
- **Step A: Centered Logo Implementation (COMPLETED):**
  - Created reusable `ProviderLogoView` component with AsyncImage support and colored circle fallbacks
  - Implemented ZStack-based layout in `Calendar2DayCell` with centered provider logos
  - Added smart primary provider selection algorithm: sorts by `(name.count DESC, id ASC)` for stability
  - Dynamic icon sizing: `iconSize = min(cellWidth * 0.6, 48)` for optimal scaling across devices (updated in A.2)
  - Enhanced accessibility: descriptive labels like "Netflix on Monday 1 September"
  - Preserves today indicator with blue highlighting and maintains existing UI patterns
  - Shows primary logo centered with secondary providers as small dots at bottom edge
- **Step A.2: Visual Refinements (COMPLETED):**
  - Updated ProviderLogoView to enforce perfect circular shapes with `Color(.systemGray6)` background
  - Increased icon scaling from 0.45 to 0.6 (33% larger) with max size increased from 36pt to 48pt
  - Transformed day cells from fixed height rectangles to perfect squares with `aspectRatio(1, contentMode: .fit)`
  - Reduced grid spacing from 8pt to 4pt for tighter, more compact calendar layout
  - Updated cell corner radius from 14pt to 8pt for cleaner, more geometric appearance
  - Added 10% internal padding around provider logos to prevent edge touching
  - Achieved precise visual match with target design (Image 1)

**API Integration:**

- `getWatchlist(status: .watching)` - Fetches user's watching shows
- `analyzeShow(tmdbId:country)` - Gets providers and season info per show
- `getSeasonRaw(tmdbId:season:country)` - Gets episodes with air dates

**Build Verification:**

- ✅ Successfully compiles without errors on Xcode
- ✅ All Swift types properly aligned with existing ApiClient models
- ✅ Follows app's established patterns and conventions
- ✅ **Step A Implementation**: CalendarView builds successfully with centered logo enhancement
- ✅ **Step A.2 Implementation**: Visual refinements build successfully with perfect circular logos and square cells
- ✅ **UI Verification**: Calendar2DayCell now precisely matches target design (Image 1) with large circular provider logos in square day tiles
- ✅ **Visual Verification**: 33% larger icons, perfect circles, 4pt spacing, and 8pt corner radius achieve target design
- ✅ **Accessibility**: Full VoiceOver support with descriptive labels for all provider states

## Acceptance Criteria ✅ ALL MET

- ✅ Calendar renders a full month with provider dots/logos per day
- ✅ Country changes update calendar inline
- ✅ Today/prev/next behave correctly (including month boundaries and padding days)
- ✅ Tap shows a detail sheet with providers for that day
- ✅ Proper loading states and error handling
- ✅ Successfully integrated into main app navigation

Future improvements

- Server-side monthly schedule endpoint for user shows (reduce client analysis calls).
- Provider legend and cost overlays (monthly spend like web mockup).
- Week view + list hybrid.
- Animations + haptics, rounded day tiles per mockup.
- Deep-link to show card with pre-selected season/episode.
