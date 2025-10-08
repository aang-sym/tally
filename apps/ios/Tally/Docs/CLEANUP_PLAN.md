# iOS Codebase Cleanup Plan

**Created:** 2025-10-08
**Completed:** 2025-10-08
**Status:** ✅ COMPLETED
**Goal:** Remove redundant code from deprecated calendar implementations and improve code organization

---

## Executive Summary

With the SimplifiedCalendar feature now stable, we have three deprecated calendar implementations (Calendar, TVGuide, TVGuide2) that can be removed. This cleanup will:

- Remove ~3,500+ lines of unused code
- Improve codebase maintainability
- Reduce confusion about which calendar to use
- Better organize shared components

---

## Phase 1: Dependency Analysis ✅

### SimplifiedCalendar Dependencies (VERIFIED)

The SimplifiedCalendar feature has **only ONE dependency** from the old features:

- `ProviderLogoView` from `Features/Calendar/ProviderLogoView.swift`

**No other dependencies on:**

- Calendar/, TVGuide/, or TVGuide2/ features
- All other components are self-contained

### Navigation Dependencies

`ContentView.swift` currently has NavigationLinks to all calendar implementations (lines 52-59):

- Line 52: `CalendarView` → **TO REMOVE**
- Line 54: `SimplifiedCalendarView` → **KEEP**
- Line 56: `TVGuideView` → **TO REMOVE**
- Line 58: `TVGuide2View` → **TO REMOVE**

---

## Phase 2: Code Removal

### 2.1 Move Shared Component (DO FIRST)

**Priority: HIGH - Must be done before deletion**

Move `ProviderLogoView` to shared location:

```
FROM: Features/Calendar/ProviderLogoView.swift
TO:   UI/Components/ProviderLogoView.swift
```

**Files to update after move:**

- `Features/SimplifiedCalendar/SimplifiedCalendarView.swift` (4 usages)

**Testing:**

- [ ] Build succeeds after move
- [ ] SimplifiedCalendar still renders provider logos correctly
- [ ] No import errors

---

### 2.2 Remove Deprecated Features

**Priority: HIGH**

#### Delete Feature Folders:

```bash
# After ProviderLogoView is safely moved:
rm -rf Features/Calendar/
rm -rf Features/TVGuide/
rm -rf Features/TVGuide2/
```

**Lines of code removed:** ~3,500+

**Files being deleted:**

- **Features/Calendar/** (4 files, ~794 lines):
  - CalendarView.swift (251 lines)
  - CalendarViewModel.swift (349 lines)
  - DayDetailListView.swift (194 lines)
  - ProviderLogoView.swift (will be moved, not deleted)

- **Features/TVGuide/** (~606 lines):
  - TVGuideView.swift (449 lines)
  - TVGuideViewModel.swift (157 lines)
  - TVGuideView+Helpers.swift
  - Components/ directory

- **Features/TVGuide2/** (18 files, ~2,100+ lines):
  - TVGuide2ViewController.swift (827 lines)
  - TVGuideVertViewController.swift (953 lines)
  - TVGuideVertLayout.swift (515 lines)
  - ShowRowCell.swift (458 lines)
  - ShowPosterCell.swift (360 lines)
  - DateHeaderView.swift (243 lines)
  - TVGuideVertView.swift (280 lines)
  - ProviderSpanCell.swift (179 lines)
  - ProviderCell.swift (173 lines)
  - ProviderSupplementaryView.swift (140 lines)
  - Plus 8 more cell/view files

---

### 2.3 Update ContentView Navigation

**Priority: HIGH**

**File:** `Tally/ContentView.swift`

Remove these NavigationLinks (lines 52, 56, 58):

```swift
// DELETE THESE:
NavigationLink("Calendar", destination: CalendarView(api: api))
NavigationLink("TV Guide", destination: TVGuideView(api: api))
NavigationLink("TV Guide 2 (UIKit)", destination: TVGuide2View(apiClient: api))

// KEEP THIS:
NavigationLink("Simplified Calendar", destination: SimplifiedCalendarView(api: api))
```

**Optional:** Rename "Simplified Calendar" to just "Calendar" since it's now the only one.

---

## Phase 3: File Splitting & Refactoring

### 3.1 Split ApiClient.swift (1,464 lines)

**Priority: MEDIUM**
**File:** `Services/ApiClient.swift`

**Current issues:**

- Massive monolithic file
- Mixes concerns (auth, watchlist, search, shows, plan, etc.)
- Hard to navigate and maintain

**Proposed structure:**

```
Services/
├── ApiClient/
│   ├── ApiClient.swift              # Main class, coordination
│   ├── ApiClient+Auth.swift         # register(), login()
│   ├── ApiClient+Watchlist.swift    # getWatchlist(), addToWatchlist(), etc.
│   ├── ApiClient+Search.swift       # search(), getShowDetails()
│   ├── ApiClient+Shows.swift        # getShows(), getTVGuide2Data()
│   ├── ApiClient+Plan.swift         # generatePlan()
│   └── ApiClient+Subscriptions.swift # getSubscriptions(), etc.
```

**Benefits:**

- Each file ~150-250 lines (manageable)
- Clear separation of concerns
- Easier to test individual components
- Standard Swift pattern (like View+Helpers)

**Testing checklist:**

- [ ] All API calls still work
- [ ] No duplicate method definitions
- [ ] Proper access control maintained

---

### 3.2 Split SimplifiedCalendar Files

**Priority: LOW-MEDIUM**

#### SimplifiedCalendarViewModel.swift (597 lines)

Split into:

```
Features/SimplifiedCalendar/
├── SimplifiedCalendarView.swift              # Keep as-is (565 lines, mostly UI)
├── SimplifiedCalendarViewModel.swift         # Main coordinator (~200 lines)
├── SimplifiedCalendarViewModel+DataProcessing.swift  # processData, buildMonths (~200 lines)
└── SimplifiedCalendarModels.swift            # All models (~150 lines)
    # ShowMetadata, MonthData, WeekData, DayData,
    # ProviderPip, EpisodeCardData
```

**Benefits:**

- Separates data transformation from coordination
- Models in their own file (easier to find/modify)
- View model is more focused

**Alternative:** Keep as-is if it's not causing issues (it's well-organized despite length)

---

### 3.3 Split SearchView.swift (654 lines)

**Priority: MEDIUM**

**Current issues:**

- Long file with multiple nested views
- Mixes search UI with show detail UI

**Proposed split:**

```
Features/Search/
├── SearchView.swift              # Main search UI (~200 lines)
├── SearchResultsList.swift       # Results grid/list (~150 lines)
├── ShowDetailSheet.swift         # The detail view shown on tap (~200 lines)
└── SearchViewModel.swift         # Keep as-is (479 lines, already reasonable)
```

**Benefits:**

- Each component independently previewable
- Clearer responsibilities
- Easier to test individual pieces

---

## Phase 4: Documentation Cleanup

### 4.1 Archive Deprecated Feature Docs

**Priority: LOW**

Create archive folder and move old docs:

```bash
mkdir -p Docs/Archive/
```

**Docs to archive:**

- `05_CALENDAR.md` → deprecated feature
- `06_VERTICAL_CALENDAR.md` → deprecated exploration
- `07_TV_GUIDE.md` → deprecated feature
- `08_TV_GUIDE_2.md` → deprecated feature
- `09_TV_GUIDE_REDESIGN.md` → deprecated redesign
- `10_TVGuide2_Redesign.md` → deprecated redesign
- `11_TVGuide2_Vertical.md` → deprecated feature
- `12_TVGuide2_Vertical_Redesign.md` → deprecated redesign
- `13_TVGuide2_Vertical_Redesign_2 copy.md` → deprecated redesign
- `14_TV_VERT_BUGFIX.md` → bugfix for deprecated feature
- `TVGuide2_Redesign_Full.md` → deprecated redesign

**Large files to archive:**

- `api_log.txt` (1.7 MB)
- `tvguide_vertical.png` (115 KB)
- `5E3E7B94-D171-42A0-B6DF-CF8B69608D11.png` (232 KB)
- `C36C9215-49DA-4EA3-94E2-CC9A95008AFF.png` (283 KB)
- `D049E0BF-83E0-460A-ACE8-582E2FDF0825.png` (249 KB)

**Keep active docs:**

- `01.md` - Initial project setup
- `02_MyShows_Feature.md` - Active feature
- `03_SEARCH_FEATURE.md` - Active feature
- `04_SEARCH_CODEX.md` - Active feature reference
- `15_SIMPLIFIED_CALENDAR.md` - Current calendar implementation
- `CLAUDE.md` - Project instructions

---

### 4.2 Update .claude Documentation

**Priority: MEDIUM**

The `.claude/docs/` files contain examples using deprecated Calendar/TVGuide implementations:

**Files to update:**

- `.claude/docs/swift.md` - Replace CalendarViewModel/TVGuideViewModel examples with SimplifiedCalendarViewModel
- `.claude/docs/architecture.md` - Update feature structure to reflect SimplifiedCalendar
- `.claude/docs/testing.md` - Update test examples if they reference old implementations

**Keep:** These are important reference docs for Claude Code, so update examples rather than delete.

---

### 4.3 Create Additional Architectural Documentation

**Priority: LOW**

Consider creating:

- `ARCHITECTURE.md` - Current state of the app structure
- `COMPONENT_LIBRARY.md` - Reusable UI components guide
- `API_CLIENT_GUIDE.md` - How to use ApiClient (after splitting)

---

## Phase 5: Additional Refactoring Opportunities

### 5.1 Extract Shared Models

**Priority: MEDIUM**

**Current issue:** Data models duplicated across features

**Duplicated models to consolidate:**

- `ProviderBadge` - defined in CalendarViewModel AND SimplifiedCalendarViewModel
- `EpisodeRef` - similar structures in multiple view models

**Proposed location:**

```
Core/Models/
├── ProviderModels.swift    # ProviderBadge, ProviderMetadata
├── EpisodeModels.swift     # EpisodeRef, shared episode structures
└── ShowModels.swift        # Any shared show structures
```

**Benefits:**

- Single source of truth
- Easier to maintain consistency
- Better for future features

---

### 5.2 Improve Component Organization

**Priority: LOW**

**Current state:** Limited shared UI components

**Opportunities:**

```
UI/Components/
├── ProviderLogoView.swift      # Move from Calendar (Phase 2.1)
├── LoadingView.swift           # Already exists
├── ErrorBanner.swift           # Already exists
├── ShowPosterView.swift        # Could extract if needed
└── EpisodeBadgeView.swift      # Could extract if needed
```

**Note:** Only extract if genuinely reused across 3+ places

---

## Phase 6: Testing & Validation

### 6.1 Pre-Deletion Checklist

- [ ] Verify SimplifiedCalendar works correctly
- [ ] ProviderLogoView successfully moved and tested
- [ ] No remaining imports of deprecated features
- [ ] ContentView compiles without deprecated NavigationLinks

### 6.2 Post-Deletion Validation

- [ ] Full project builds successfully
- [ ] No orphaned files referencing deleted features
- [ ] All SwiftUI previews work
- [ ] App launches and navigates correctly
- [ ] SimplifiedCalendar still functions correctly

### 6.3 Post-Refactor Validation (if Phase 3 executed)

- [ ] All API calls still work after ApiClient split
- [ ] All tests pass
- [ ] No performance regressions
- [ ] No memory leaks introduced

---

## Execution Order (Recommended)

### Step 1: Quick Wins (Can do today)

1. Archive deprecated docs → `Docs/Archive/`
2. Archive large images/logs → `Docs/Archive/`
3. Create this cleanup plan ✅

### Step 2: Safe Deletions (Next session)

1. **FIRST:** Move ProviderLogoView to UI/Components/
2. Update SimplifiedCalendar imports
3. Build and test
4. Remove deprecated features (Calendar, TVGuide, TVGuide2)
5. Update ContentView navigation
6. Build and test again

### Step 3: Refactoring (Separate sessions, optional)

1. Split ApiClient.swift
2. Split SearchView.swift
3. Extract shared models
4. Each split should be its own focused session with testing

---

## Risk Assessment

### High Risk (needs careful testing)

- ✅ **Moving ProviderLogoView** - Used by active feature
  - _Mitigation_: Do this first, test immediately

### Medium Risk

- Splitting ApiClient - Central to all features
  - _Mitigation_: Do incrementally, test after each file split
- Updating ContentView navigation
  - _Mitigation_: Simple change, easy to verify

### Low Risk

- Deleting deprecated features (after ProviderLogoView moved)
- Archiving documentation
- Splitting view files

---

## Success Metrics

- **Code reduction:** ~3,500+ lines removed
- **Build time:** Should stay same or improve slightly
- **Maintainability:** Clearer feature structure, easier to navigate
- **Architecture:** Better separation of concerns in ApiClient
- **Documentation:** Clear history of feature evolution

---

## Notes

- Keep git history: Use `git mv` for moving files, not `rm` + new file
- Consider a feature branch for this cleanup: `feat/ios-cleanup`
- Can be done incrementally - doesn't need to be all at once
- SimplifiedCalendar is the **only** calendar going forward

---

## Questions to Resolve

1. Should we rename "SimplifiedCalendar" to just "Calendar" after cleanup?
2. Should we keep any deprecated features for reference, or delete completely?
3. Should we create a separate archive repo for old code instead of deleting?
4. Should ApiClient splitting happen now or later?

---

## Cleanup Results (2025-10-08)

### ✅ Completed Actions

**Phase 1: Extracted Shared Dependencies**

- ✅ Created `Core/Models/CalendarModels.swift` with `ProviderBadge` and `EpisodeRef`
- ✅ Updated `Features/Calendar/CalendarViewModel.swift` to remove duplicate structs
- ✅ Moved `Features/Calendar/ProviderLogoView.swift` → `UI/Components/ProviderLogoView.swift`
- ✅ Build verified - no compilation errors

**Phase 2: Deleted Deprecated Features**

- ✅ Deleted `Features/Calendar/` (4 files, ~794 lines)
- ✅ Deleted `Features/TVGuide/` (~606 lines)
- ✅ Deleted `Features/TVGuide2/` (18 files, ~2,100+ lines)
- ✅ **Total removed: ~3,500+ lines of code**

**Phase 3: Updated Navigation**

- ✅ Removed 3 old NavigationLinks from `Tally/ContentView.swift` (lines 52, 56, 58)
- ✅ Renamed "Simplified Calendar" → "Calendar"

**Phase 4: Archived Documentation**

- ✅ Created `Docs/Archive/` folder
- ✅ Moved 11 deprecated feature docs (05-14, TVGuide2_Redesign_Full.md)
- ✅ Moved 4 large PNG files (~900KB)
- ✅ Moved api_log.txt (1.7MB)
- ✅ **Total archived: ~2.6MB of files**

**Phase 5: Fixed Build Errors & Preview Infrastructure**

- ✅ Created `Core/Preview/PreviewHelpers.swift` with shared `PreviewSecrets` and `PreviewApiClient`
- ✅ Fixed SimplifiedCalendarView.swift build error (missing PreviewSecrets)
- ✅ Updated all feature previews to use `PreviewApiClient`:
  - SimplifiedCalendarView (modernized to `#Preview` macro)
  - SearchView (2 previews)
  - WatchlistView
  - SubscriptionsView
- ✅ All previews now have proper authentication for realistic preview data

**Phase 6: UI Polish**

- ✅ Swapped provider badge layout in episode cards (SimplifiedCalendarView.swift:515-527)
  - Logo now on left, recurring day ("3rd") on right
  - Maintained compact pill size

### 📊 Impact Summary

- **Code removed:** ~3,500 lines
- **Files deleted:** 22+ Swift files
- **Docs archived:** 11 markdown files
- **Space saved:** ~2.6MB
- **Features remaining:** SimplifiedCalendar (now just "Calendar")
- **Shared models created:** ProviderBadge, EpisodeRef (Core/Models/CalendarModels.swift)
- **Shared UI components:** ProviderLogoView (UI/Components/)
- **Preview infrastructure:** PreviewHelpers.swift with PreviewApiClient
- **Preview improvements:** 5 views updated with authenticated preview client

### 🚫 Remaining Tasks (Deferred for Future Sessions)

**Phase 3: File Splitting & Refactoring**

- ⏸️ ApiClient.swift splitting (1,464 lines → 6-8 extension files)
  - Low priority - file works fine, just harder to navigate
  - Suggested: ApiClient+Auth, +Watchlist, +Search, +Shows, +Plan, +Subscriptions
- ⏸️ SearchView.swift splitting (654 lines)
  - Medium priority - could split into SearchView, SearchResultsList, ShowDetailSheet
- ⏸️ SimplifiedCalendarViewModel.swift splitting (597 lines)
  - Low priority - well-organized despite length
  - Alternative: Extract models to SimplifiedCalendarModels.swift

**Phase 4: Documentation Updates**

- ⏸️ Update `.claude/docs/` examples (swift.md, architecture.md, testing.md)
  - Replace CalendarViewModel/TVGuideViewModel examples with SimplifiedCalendarViewModel
- ⏸️ Create additional architectural docs (ARCHITECTURE.md, COMPONENT_LIBRARY.md, API_CLIENT_GUIDE.md)

---

**Status Legend:**

- ✅ Completed
- 🔄 In Progress
- ⏸️ Paused
- ❌ Blocked
- 📋 Planned
