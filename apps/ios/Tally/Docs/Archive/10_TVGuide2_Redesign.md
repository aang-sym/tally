# TVGuide2 — Align to _img 2_ (desired) from _img 1_ (current)

> **Goal:** Update the **existing** TVGuide2 implementation so it matches _img 2_ (and the dark-theme mock, later called _img 3_):
>
> - **One global date header row** (NOT repeated per provider).
> - A frozen **left column** consisting of:
>   - a **merged provider rail** — one logo per provider, centered vertically across that provider’s stacked show rows;
>   - **frozen posters** — one poster per show row that does **not** scroll horizontally.
> - The episodes matrix scrolls **horizontally** under the global header and **vertically** across shows.
> - Keep existing interactions (episode tap → expand details aligned to the tapped day; long press/tooltips; poster zoom) working.

We are **editing** (not rewriting) the current TVGuide2 code.

---

## Architecture change (minimal, additive)

To achieve the Excel-like frozen panes and avoid per-section date headers, we use **three synchronized collection views** inside `TVGuide2View`:

| View             | Purpose                                              | Scrolling                 |
| ---------------- | ---------------------------------------------------- | ------------------------- |
| **TopHeaderCV**  | Renders the **global day/date** header row once      | Horizontal (programmatic) |
| **LeftFrozenCV** | Renders the **provider rail** (merged) + **posters** | Vertical (user)           |
| **MainGridCV**   | Renders the **episodes matrix** (show × day cells)   | Both (user)               |

**Synchronization:**

- `MainGridCV.contentOffset.x` → drives `TopHeaderCV.contentOffset.x` (header slides with columns).
- `MainGridCV.contentOffset.y` ↔ drives `LeftFrozenCV.contentOffset.y` (left column follows vertical scroll).

This removes the repeated date header per provider and lets us truly “merge” the provider cell per section.

---

## Shared layout constants

```swift
enum GuideMetrics {
  static let railWidth: CGFloat    = 88    // provider rail width (merged logo column)
  static let posterWidth: CGFloat  = 72    // frozen poster strip width
  static let posterHeight: CGFloat = 108   // 2:3
  static let rowHeight: CGFloat    = 132   // one show row (poster+gutter)
  static let columnWidth: CGFloat  = 120   // one day column width
  static let headerHeight: CGFloat = 56    // global header (weekday+date)
}

extension GuideMetrics {
  static var frozenLeadingWidth: CGFloat { railWidth + posterWidth }
}
```
