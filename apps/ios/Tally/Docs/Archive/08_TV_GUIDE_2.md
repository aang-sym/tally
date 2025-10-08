# TVGuide2 – Specification for Implementation

This document describes the requirements for building **TVGuide2**, a horizontally scrolling TV guide built with **UIKit `UICollectionView` + `UICollectionViewCompositionalLayout`**.

The design must match the provided reference image (`apps/ios/Tally/Docs/tv_guide_example.png`) and the attached CSV (`apps/ios/Tally/Docs/tv_guide_example.csv`) functionality grid.

---

## Requirements

### 1. Project Setup

- Create a **new component** `TVGuide2` from scratch.
- Use **UIKit’s `UICollectionView`** with **`UICollectionViewCompositionalLayout`**.
- Must support **infinite horizontal scrolling** for days (past and future).
- Columns: Days/dates (`Mon 01`, `Tue 02`, …).
- Rows: User’s shows (poster + provider in frozen columns).

---

### 2. Data Source

- Use the API from `apps/web/src/pages/MyShows.tsx`.
- Required data per show:
  - Poster image
  - Provider logo
  - Episodes list (with season/episode numbers, air dates, titles, summaries, rating)
- Episodes should be aligned in the grid under the correct **day/date** column.
- If API does not return summaries, fallback to placeholder text.

---

### 3. Layout & Scrolling

- **Frozen Columns/Rows**:
  - **Frozen left columns:** Provider + show info.
  - **Frozen top rows:** Day of week row (Mon/Tue/…) and date row (01/02/…).
- **Scrollable grid**:
  - Horizontal scroll = days.
  - Vertical scroll = shows.
- Must behave like Excel with frozen panes.

---

### 4. Expansion Behavior

- Each show row can be **expanded**:
  - Expanding a row shows **episode details aligned with the correct day/date**.
  - Details include:
    - Show title
    - Episode title
    - Episode summary
    - Rating

---

### 5. Interactions

- **Tap on episode cell**: Expands row to show detailed info.
- **Hover/hold on episode cell**: Show a popup with episode details (title, summary, rating).
- **Long press on row**: Show contextual menu (e.g., _Remove from watching_).
- **Tap poster**:
  - Expands poster to ~60% of screen, centered.
  - Background dims to 60% opacity.
  - Dismiss by flicking poster away in any direction.

---

### 6. Implementation Details

- Use **`UICollectionViewDiffableDataSource`** for state handling.
- Use **`UICollectionViewCompositionalLayout`** with:
  - **Pinned supplementary headers** for the date row.
  - **Orthogonal scrolling** for the grid content.
- Performance:
  - Use cell reuse identifiers for poster cells, provider cells, and episode cells.
  - Prefetch poster images and episode metadata.

---

### 7. UI Fidelity

- Match the provided screenshot **exactly** unless minor Apple HIG improvements are justified.
- Use SF Symbols and San Francisco fonts where applicable.
- Poster cells must match aspect ratio from the design.
- Episode cells display `S1E1` (or similar) with proper truncation/ellipsis for long titles.

---

### 8. Edge Cases

- If a show has no episode for a given day → show empty cell.
- If episode summary is missing → show placeholder text `"Summary unavailable"`.
- If poster image missing → show fallback “No Image” cell.

---

## References

- [UICollectionView Documentation](https://developer.apple.com/documentation/uikit/uicollectionview)
- [UICollectionViewCompositionalLayout Documentation](https://developer.apple.com/documentation/uikit/uicollectionviewcompositionallayout)

---

## Next Steps

- Scaffold `TVGuide2` view controller with `UICollectionView`.
- Implement compositional layout with frozen provider/show column and pinned date headers.
- Connect to API from `MyShows.tsx`.
- Implement interactions (expansion, hover/long press menus, poster zoom).
