# 06 — Vertical Calendar (Scroll & Fade)

## Goal

Replace left/right month paging with a **vertical, scroll-based** calendar that renders multiple months in a single scroll view. As the user scrolls, the next month **fades in** while the previous month **fades out**. Keep network access efficient and the UI smooth on older devices.

---

## Constraints & Non‑Goals

- **Non‑Goal:** Rewriting business logic for providers/subscriptions. This is a UI + light VM change.
- **Constraint:** Avoid loading an unbounded number of months up-front; load lazily.
- **Constraint:** Keep memory usage modest; old months should be discardable.

---

## Architecture

### 1) High‑level structure

- `VerticalCalendarView` (new): owns a list of month anchors and composes `MonthView` rows.
- `MonthView`: renders a single month (title + grid) given a `Date` anchor.
- `MonthVM` or reuse existing `CalendarViewModel` with a **parameterized** fetch: `reload(api: Date, country: String)`.
- **Fading:** computed with `GeometryReader` per `MonthView`, mapping vertical position → opacity.

### 2) Data flow

- Start with `[prev, current, next]` months around `Date()`.
- As the user scrolls near the bottom, append the next month; near the top, prepend the previous month.
- Cache per-month results keyed by `yyyy-MM` so re-scrolling is instant.

### 3) Performance

- Use `LazyVStack` + `LazyVGrid`.
- Defer image loading until cells are on-screen.
- Consider downscaling images or using monochrome placeholders for provider dots when many logos are missing.

---

## API/VM Changes

- Add `reload(api: ApiClient, for monthAnchor: Date, country: String)` returning `MonthData`:
  ```swift
  struct MonthData {
      let anchor: Date
      let days: [Calendar2Day]
      let dailyProviders: [Calendar2Day.ID: [ProviderBadge]]
  }
  ```
- Maintain a `@Published var months: [MonthData]` in a new `VerticalCalendarVM` or adapt the current VM by:
  - Keeping a cache `var monthCache: [String: MonthData]` where key is `yyyy-MM`.
  - Providing methods `ensureMonth(_:)` and `neighbors(of:)`.

---

## Fade Interaction

- In `MonthView`, wrap the month content with `GeometryReader` and compute an `opacity` based on its vertical midpoint:
  ```swift
  GeometryReader { geo in
      let mid = geo.frame(in: .named("scroll" )).midY
      let fade = fadeAmount(for: mid) // 0…1
      content.opacity(fade)
  }
  ```
- `fadeAmount(for:)` maps distance from viewport center to an opacity [0.6…1.0] to keep titles readable while hinting at context.

---

## Loading Strategy

- **Initial:** load current month; prefetch prev/next.
- **On appear of last 1–2 rows:** enqueue fetch for next month.
- **On appear of first 1–2 rows:** enqueue fetch for previous month.
- Use a small in-flight set to avoid duplicate requests.

---

## Edge Cases

- Year boundaries (Dec → Jan). Use `Calendar` arithmetic; never rely on month indices.
- Locale/starting weekday differences (we currently assume Sun–Sat; keep or parameterize later).
- Token expiration — surface a banner in DEBUG; in release, drive a re-auth flow.

---

## Milestones

1. **Scaffold** `VerticalCalendarView` with static months and fading only.
2. **VM parameterization**: fetch data for arbitrary `monthAnchor`.
3. **Lazy loading** prev/next with cache.
4. **Polish**: smooth fade curve, accessibility labels, haptics on month boundaries.
5. **QA**: performance (older simulators), dark mode, dynamic type.

---

## Testing Checklist

- Scrolling up/down adds months seamlessly; no jumps.
- Fade does not drop below 0.6 for off-center months; center month at 1.0.
- Memory remains stable when scrolling through 24 months.
- Keyboard/VoiceOver navigation preserves logical reading order.

---

## Future Ideas

- Sticky month chips on the right as an index scroller.
- Inline month jump search.
- Per-provider filters at the top that persist as you scroll.
