---
# TVGuideVert — UI Corrections (Current → Target)

This document clarifies **what the current vertical build is doing** versus **what we need it to do**, based on the latest screenshots. Use this as the single source of truth for fixes.
---

## A) Current behaviour (observed)

- **Date rail** (left column) is rendered in a **dark theme** (black background, white type).
- **Row height** is **poster-scale tall**, leaving lots of empty vertical space.
- **Column width** is **over-wide** and not constrained to poster width.
- **Posters** in the static posters row have **rounded corners**.
- **Provider header row** is **not visible**; provider icons aren’t rendered; no merged provider cells for multi‑show providers.
- **Episode tap** opens a **popover/modal**.
- **Month label** (`SEP`, `OCT`, `NOV`) is **missing from the top-left** of the date rail.

---

## B) Target behaviour (required)

### 1) Date rail (left column)

- **Theme:** Use **light mode** (same palette as TVGuide2 horizontal): system background, primary label colour.
- **Content:** Large two‑digit day (`01`, `02`, …). Optional blue dot + count is OK.
- **Month label:** Display `SEP`/`OCT`/`NOV` **pinned at the top-left** of the date rail, staying fixed while the grid scrolls.
- **Sizing:** `dateRailWidth = 56–64pt`.

### 2) Row height (all date rows)

- **Goal:** Compact; must fit one large day number **and** a single episode badge like `S1E6` without clipping.
- **Sizing:** `rowHeight = 72–88pt` (tune inside this range).

### 3) Column sizing (show columns)

- **Rule:** **Lock each column width to the poster width + padding**.
- **Suggested constants:**
  - `posterWidth = 72–84pt`
  - `posterAspect = 2:3` ⇒ `posterHeight = posterWidth * 1.5`
  - `columnHPad = 8–12pt` (each side)
  - `columnWidth = posterWidth + 2 * columnHPad`
- **Rationale:** Higher density, mirrors horizontal guide’s poster strip.

### 4) Posters row (Row 2)

- **Always visible**, independent of episodes.
- **No rounded corners** on posters (use same mask as horizontal).
- **No title text** under posters.

### 5) Provider header row (Row 1)

- **Visible** and horizontally aligned with the poster/show columns.
- **Icons are circular** (match TVGuide2 horizontal).
- **Merged provider cells:** Providers with multiple shows render **one header cell spanning all of that provider’s show columns**.
- **No provider name text**; icon only (with accessibilityLabel).

### 6) Episode rendering & interaction (Rows 3+)

- **Cell content:** Small blue dot + `SxxEyy` (e.g., `S1E6`). No posters/titles.
- **Tap behaviour:** **Inline expand the tapped date row** (no modal/popover):
  - Expanding a row increases that row’s height to show details beneath the badges.
  - Only one row expanded at a time; tapping another row collapses the previous.
  - Expanded details use full grid width but remain anchored to that date row.

### 7) Theme

- Default to **light mode**; do **not** force dark. Dark can follow system appearance later.

---

## C) Implementation notes

- Move sizing tokens to `TVGuideVertLayout.swift`:
  ```swift
  enum TVGV {
    static let dateRailWidth: CGFloat = 60
    static let rowHeight: CGFloat = 80
    static let posterWidth: CGFloat = 78
    static let posterAspect: CGFloat = 1.5 // 2:3
    static let columnHPad: CGFloat = 10
    static var columnWidth: CGFloat { posterWidth + (2 * columnHPad) }
    static let providerHeaderHeight: CGFloat = 56
  }
  ```
- **Provider spans:** Build a `provider -> (startColumn, endColumn)` map; render a single header cell per provider spanning that range (or use a decoration background to span).
- **Scroll sync:** Grid’s horizontal offset must sync to the provider header row **and** the posters row; vertical offset only within the grid.
- **Inline expansion:** Track `expandedDayIndex: Int?`; update layout/snapshot to apply an expanded height only to that index.

---

## D) Acceptance criteria (sign‑off)

1. Date rail is **light**; month label is **pinned top-left**.
2. Date rows are compact (≈80pt) and comfortably fit `01` and `S1E6`.
3. Columns are **as narrow as poster + padding**.
4. Posters have **square corners**; no title text.
5. Provider header is visible with **circular icons** and **merged cells** for multi‑show providers.
6. Episode tap **expands the date row inline**; no modal/popover appears.
7. Posters remain static in Row 2; episodes appear only in date rows when airing.
8. Header + posters stay perfectly aligned with grid columns during horizontal scroll.

---
