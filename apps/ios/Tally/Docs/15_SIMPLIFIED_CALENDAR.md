# Simplified Calendar Feature

## Status: ✅ Core Implementation Complete

**Created:** 2025-10-04
**Files:**

- `/Features/SimplifiedCalendar/SimplifiedCalendarView.swift`
- `/Features/SimplifiedCalendar/SimplifiedCalendarViewModel.swift`

**Next Steps:**

1. Add files to Xcode project (`Tally.xcodeproj`)
2. Test in simulator
3. Fetch show details for proper episode card data
4. Add activation window logic for resubscription dates
5. Polish animations and accessibility

## Overview

A streamlined vertical scrolling calendar that replaces the complex TV Guide grid. Focuses on simplicity and ease of use.

## Design Goals

- Vertical scrolling only (no horizontal grid complexity)
- Week-based layout with reference to task management apps
- One interaction: tap day → see episodes for that day
- Minimal visual clutter

## UI Components

### 1. Vertical Scrolling Calendar

**Structure:**

- Sticky month header (updates as you scroll through different months)
- Weeks displayed as horizontal rows (7 days per week)
- Infinite scroll (past and future weeks)

**Day Cell Design:**

```
┌─────────────┐
│     14      │  <- Date number
│   [LOGO]    │  <- Provider logo (if resubscription date)
│   ● ● ●     │  <- Episode pips (max 3, colored by provider)
└─────────────┘
```

**Provider Logos:**

- Single provider: show logo
- Two providers: stack vertically
- More than 2: show first two, then small white "+" in grey circle

**Episode Pips:**

- Max 3 pips shown
- Colored by provider
- If >3 episodes: show "+" after 3rd pip

**Past Days:**

- Different border style to indicate they've passed

### 2. Week Locking on Selection

**Behavior:**

- Tap any day → that week "locks" to top of screen
- Episode cards appear below the locked week
- Can tap other days in any visible week (locked week collapses, new week locks)
- Can continue scrolling vertically while week is locked
- Selecting day in different week → previous week unlocks, new week locks

**Deselection:**

- Tap same day again to unlock
- Select day in different week (automatic unlock/relock)

### 3. Episode Cards (Full-Width, Vertical Scroll)

**Layout:**

```
┌────────────────────────────────────────┐
│ [POSTER]  Breaking Bad                 │
│           S1E4 - "Gray Matter"         │
│           Walt and Jesse face...       │
└────────────────────────────────────────┘
```

**Card Contents:**

- Show poster (left side, ~80-100pt width)
- Episode number (S1E4 format)
- Show title
- Episode synopsis (2-3 lines, truncated)

**Number of Cards:**

- Based on number of episodes airing that day
- Vertical scroll if many episodes

## Data Models

### Existing Models (from TVGuide2 & Calendar)

- `TVGuide2Provider`: Streaming service (id, name, logoPath, shows)
- `TVGuide2Show`: TV show (id, tmdbId, title, posterPath, episodes)
- `TVGuide2Episode`: Episode (id, title, airDate, seasonNumber, episodeNumber, overview)
- `CalendarViewModel`: Already has date-based organization:
  - `episodesByDate: [String: [EpisodeRef]]`
  - `dailyProviders: [String: [ProviderBadge]]`

### New Models Needed

**SimplifiedCalendarViewModel:**

```swift
class SimplifiedCalendarViewModel: ObservableObject {
    // Week-based organization
    @Published var weeks: [WeekData]
    @Published var selectedDate: String?
    @Published var lockedWeekIndex: Int?

    // Date-based lookups (leverage existing CalendarViewModel structure)
    var episodesByDate: [String: [EpisodeRef]]
    var dailyProviders: [String: [ProviderBadge]]
    var episodePipsByDate: [String: [ProviderPip]] // New: colored pips

    // Current scroll position
    @Published var currentMonthYear: String // "July 2025"
}

struct WeekData: Identifiable {
    let id: UUID
    let days: [DayData]
    let startDate: Date
}

struct DayData: Identifiable {
    let id: UUID
    let date: Date
    let dateString: String // "yyyy-MM-dd"
    let dayNumber: Int
    let inCurrentMonth: Bool
    let isPast: Bool
    let providers: [ProviderBadge] // For logos (max 2 visible + indicator)
    let episodePips: [ProviderPip] // For colored pips (max 3 + indicator)
}

struct ProviderPip: Identifiable {
    let id: UUID
    let providerColor: Color
    let episodeCount: Int // For grouping
}

struct EpisodeCardData: Identifiable {
    let id: String
    let showTitle: String
    let posterPath: String
    let episodeNumber: String // "S1E4"
    let episodeTitle: String
    let synopsis: String
}
```

## Implementation Steps

### Phase 1: Core Calendar View ✓

- [x] Analyze existing TVGuide2 and Calendar data structures
- [x] Create `SimplifiedCalendarView.swift`
- [x] Create `SimplifiedCalendarViewModel.swift`
- [x] Generate weeks data (infinite scroll buffer: ±8 weeks from today)

### Phase 2: Day Cells & Visual Elements ✓

- [x] Create `DayCell` component (integrated in SimplifiedCalendarView.swift)
  - Date number rendering
  - Provider logo stacking (1, 2, or 2+ logic)
  - Episode pip rendering (colored, max 3 + indicator)
  - Past day border styling
  - Selected state styling
- [x] Create `ProviderStackView` (helper for logo stacking)
- [x] Create `EpisodePipsView` (helper for pip rendering)

### Phase 3: Month Header ✓

- [x] Create `MonthHeaderView` (integrated in SimplifiedCalendarView.swift)
- [x] Implement scroll position tracking (using LazyVStack pinnedViews)
- [x] Update header text based on scroll offset

### Phase 4: Week Locking & Selection ✓

- [x] Implement day tap gesture
- [x] Add week locking animation/layout
- [x] Handle week unlock/relock on new selection
- [x] Scroll position management when week is locked
- [x] Deselection logic (tap same day, tap different week)

### Phase 5: Episode Cards ✓

- [x] Create `EpisodeCard` (integrated in SimplifiedCalendarView.swift)
  - Poster image view (with caching)
  - Episode metadata layout
  - Synopsis text (truncated)
- [x] Create `EpisodeListView` (integrated in SimplifiedCalendarView.swift)
  - Vertical scroll container
  - Empty state (no episodes for day)
  - Load episode data for selected day

### Phase 6: Data Integration ✓

- [x] Wire TV Guide API data
- [x] Map `episodesByDate` to `EpisodeCardData`
- [x] Map `dailyProviders` to provider logos & pips
- [x] Implement provider color mapping
- [x] Handle resubscription dates (provider logo logic in place)

### Phase 7: Polish & Edge Cases (Next Steps)

- [x] Smooth scrolling performance (LazyVStack implemented)
- [ ] Handle timezone edge cases
- [x] Empty states (no episodes in week/month)
- [x] Loading states
- [x] Error handling
- [ ] Accessibility labels
- [ ] Dark mode support (inherits system colors)
- [ ] Animation polish (selection, locking, transitions)
- [ ] Fetch show details for proper titles and posters in episode cards
- [ ] Add resubscription date logic (activation windows)

## Technical Notes

### SwiftUI Components to Use

- `ScrollView` with `ScrollViewReader` for programmatic scrolling
- `LazyVStack` for efficient week rendering
- `GeometryReader` for scroll position tracking (sticky header)
- `@State` and `@Published` for selection state management
- `matchedGeometryEffect` for week locking animation (optional)

### Performance Considerations

- Lazy loading of weeks (render ~16 weeks buffer, extend on scroll)
- Image caching for posters and provider logos
- Avoid expensive date calculations in view bodies
- Reuse existing `CalendarViewModel` date dictionaries

### Potential Challenges

- Scroll position tracking for sticky month header
- Smooth week locking animation without jank
- Managing week expansion/collapse state efficiently
- Provider pip color mapping (need provider → color map)

## Open Questions

- [x] Should past weeks have different styling? **Yes, different borders**
- [x] Multiple providers on same day? **Stack up to 2, then show + indicator**
- [x] Episode pip style? **Colored by provider, max 3 + indicator**
- [x] Episode cards horizontal or vertical scroll? **Vertical (full-width cards)**
- [x] Can user tap other days while week locked? **Yes**
- [x] How to deselect? **Tap same day or select different week**
- [ ] Where does provider color mapping come from? (Need to check existing code or define)
- [ ] What happens on resubscription dates? (Show provider logo - confirmed, but need activation date logic)

## References

- Existing code: `Features/Calendar/CalendarViewModel.swift`
- Existing code: `Features/TVGuide2/` (various controllers and cells)
- SwiftUI docs: https://developer.apple.com/documentation/SwiftUI
- Community docs: https://swiftuidocs.com/
