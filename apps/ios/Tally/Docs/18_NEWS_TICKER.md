## Next steps (dev checklist)

- [ ] Create branch `feat/liquid-glass-ticker`
- [ ] Scaffold `LiquidGlassTicker.swift` and `LiquidGlassTickerExpanded.swift`
- [ ] Add placeholder `TickerItem` samples (incl. `.trendingNow`)
- [ ] Integrate between HeroSection and MetricsRow
- [ ] Implement marquee + Reduce Motion fallback
- [ ] Implement expand/collapse with matchedGeometryEffect
- [ ] Apply liquid-glass styling (material, border, shadow)
- [ ] Map icons & chips by item kind (see Icon & Chip conventions)
- [ ] Deep-link handling for show/service pages
- [ ] QA: light/dark, performance on device, VO labels

# Feature Spec: Liquid Glass Ticker

## 🎯 Goal

Add a horizontally scrolling “liquid glass” ticker below the **HeroSection** and above the **MetricsRow** in the Dashboard screen.

The ticker displays short, personalised “news” items for the user, such as:

- Upcoming episode air dates
- New releases on subscribed services
- Subscription renewals or price changes
- Show or movie recommendations

When tapped, it expands into a full “liquid glass” drawer from the top of the screen showing a detailed list view.

Additionally, surface **anonymous global usage stats** (e.g., “1,167 people are watching _Chad Powers_ this week”). Tapping such an item in the expanded view should deep-link to the relevant show page.

---

## 🧱 Scope / Architecture

### 1. Create a new component

**File:** `Features/Dashboard/Components/LiquidGlassTicker.swift`

- A compact horizontal ticker view with rounded glass effect and marquee scroll animation.
- Default position: below **HeroSection**, above **MetricsRow**.
- Accepts:
  ```swift
  struct LiquidGlassTicker: View {
      let items: [TickerItem]
      @Binding var isExpanded: Bool
  }
  ```

### 2. Create a second component

**File:** `Features/Dashboard/Components/LiquidGlassTickerExpanded.swift`

- Expanded version that appears from the top using a smooth transition.
- Full-width, blurred “liquid glass” background.
- Displays a vertical list of `TickerItem`s, grouped by relevance or date.
- Each row: icon, title, subtitle, optional buttons (“Open show”, “Remind me”).
- Includes a close/dismiss affordance and swipe-down gesture.
- Supports tapping items with global stats (e.g., “1,167 people are watching _Chad Powers_ this week”) to navigate to the **show detail page** via `deepLink`.

### 3. Update `DashboardViewModel.swift`

Add model + placeholder data:

```swift
struct TickerItem: Identifiable {
    enum Kind { case upcomingAirDate, newRelease, renewalDue, priceChange, recommendation, trendingNow }
    let id: UUID = .init()
    let kind: Kind
    let title: String
    let subtitle: String?
    let icon: String
    let aggregateCount: Int?    // anonymous global count e.g., viewers this week
    let entityId: String?       // e.g., show ID for deep-link
    let date: Date?
    let deepLink: URL?
    let urgency: Int
}

@Published var tickerItems: [TickerItem] = []
```

Later, items will be sourced from:

- Episode/Calendar API → upcoming air dates
- Catalog → new to subscribed services
- Billing → renewal or price changes
- Watchlist → recommendations
- Global, anonymised usage stats → “Trending now” counts for shows/services (no personal data)

### 4. Integrate into `DashboardView.swift`

Add:

```swift
@State private var showTickerExpanded = false
```

Insert between HeroSection and MetricsRow:

```swift
LiquidGlassTicker(items: viewModel.tickerItems, isExpanded: $showTickerExpanded)
    .padding(.horizontal)
    .padding(.top, 8)
```

Add overlay for expanded drawer:

```swift
.overlay(alignment: .top) {
    if showTickerExpanded {
        LiquidGlassTickerExpanded(items: viewModel.tickerItems, isExpanded: $showTickerExpanded)
            .transition(.move(edge: .top).combined(with: .opacity))
            .zIndex(2)
            .ignoresSafeArea(edges: .top)
    }
}
```

**Example item (trending):**

```swift
TickerItem(
    kind: .trendingNow,
    title: "1,167 people are watching Chad Powers this week",
    subtitle: nil,
    icon: "flame.fill",
    date: nil,
    deepLink: URL(string: "tally://show/chad-powers"),
    urgency: 0,
    aggregateCount: 1167,
    entityId: "show:chad-powers"
)
```

---

## 🎨 Styling & Animation

### Icon & Chip conventions

Use consistent SF Symbols and optional capsules to quickly convey item type and urgency.

**Icon mapping:**

- `.upcomingAirDate` → `calendar` (or `calendar.badge.clock`)
- `.newRelease` → `sparkles`
- `.renewalDue` → `creditcard`
- `.priceChange` → `arrow.up.arrow.down.circle`
- `.recommendation` → `star.fill`
- `.trendingNow` → `flame.fill`

**Chips (optional):**

- Trending chip: small **capsule** with `flame.fill`, subtle orange/pink gradient background, white text, 12–13pt. Example: "Trending" or abbreviated count like "1.1k watching".
- Urgency (renewal soon): capsule with subtle red gradient and `exclamationmark.circle`.

**Edge fades:** Apply a horizontal gradient mask at ticker edges to keep icons/text readable over the hero.

### Liquid Glass Style

- `.background(.ultraThinMaterial)`
- Rounded corners (≈ 20 pt)
- Inner gradient highlight
- 1 px translucent border
- Soft drop shadow (0, 8, 20 radius, opacity 0.25)

### Marquee Animation

- Smooth, continuous horizontal scroll
- Edge fades with gradient masks
- Pauses on touch or scroll
- Disable when **Reduce Motion** is enabled

### Haptics & Interaction

- Tap ticker → light impact (`.soft`) and expand
- Swipe down to dismiss → light impact on settle
- Long-press on an item → context menu (Mute, Hide, Open)
- Pause auto-scroll while finger is down or when scrolled manually

### Expansion Animation

- `matchedGeometryEffect` between compact and expanded states
- Duration: 0.3–0.4 s, easeInOut
- Background blur + subtle scale-up during expansion

### Accessibility

- Support VoiceOver for each ticker item
- Respect system motion settings

**Privacy for global stats:**

- Only display anonymised aggregates (no user identifiers)
- Use coarse buckets for counts (e.g., 1.1k) if needed to reduce re-identification risk

---

## 🧩 Integration Plan

1. **Branch:**  
   Create new branch:

   ```bash
   git checkout -b feat/liquid-glass-ticker
   ```

2. **Scaffold Components:**
   - Build ticker + expanded views with placeholder data
   - Verify layout positioning between HeroSection and MetricsRow

3. **Add Animations:**
   - Smooth scroll and expand transition
   - Handle tap + swipe-to-close

4. **Styling Polish:**
   - Apply glass material, gradient borders, shadow, edge fades

5. **Testing:**
   - Light/dark mode visual pass
   - Reduce Motion off/on
   - Test expansion performance on device

---

## ✅ Deliverables

- [ ] `LiquidGlassTicker.swift` implemented and styled
- [ ] `LiquidGlassTickerExpanded.swift` functional with animation
- [ ] `TickerItem` model + dummy data in ViewModel
- [ ] Integration in `DashboardView`
- [ ] Matching “liquid glass / neon” aesthetic with HeroSection
- [ ] Light/dark mode and motion accessibility tested

---

## 🧠 Notes for Claude Code

- Start by creating both new SwiftUI components with placeholder content and expansion animation.
- Use `.ultraThinMaterial`, gradients, and subtle glows to stay consistent with the Hero aesthetic.
- Prioritise motion smoothness and layout safety before wiring real data.
- Ensure `DashboardView` changes are minimal — everything should be encapsulated in the new components.
- Future data logic can be connected later; just mock a few sample `TickerItem`s for now.

---

### Example branch instruction

> “Create a new branch `feat/liquid-glass-ticker` and scaffold both LiquidGlassTicker.swift and LiquidGlassTickerExpanded.swift.  
> Place the ticker between HeroSection and MetricsRow, include placeholder data, and implement expand/collapse animation with liquid-glass styling.”
