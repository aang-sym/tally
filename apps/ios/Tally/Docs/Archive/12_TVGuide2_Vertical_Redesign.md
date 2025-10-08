---
# TVGuide2 — Vertical Guide: Corrections & Fix Plan

This document explains **what’s wrong with the current vertical implementation**, **why it’s wrong**, and **what to change** so the vertical guide matches the intended design and the behaviour of the horizontal guide.
---

## 1) What Claude implemented (current behaviour)

- Posters appear **only inside date rows** when an episode airs.
- There is **no dedicated posters row** under the provider header.
- Provider names and show titles are **rendered as text** under icons/posters.
- The view defaults to **dark mode styling** (from the example mock), not the product’s light theme.
- Providers are shown as **one-per-column**, but **providers with multiple shows are not merged** across their show columns.

---

## 2) Why this is wrong

- **Breaks parity with the horizontal guide mental model**
  - In the horizontal guide, the poster strip is a **static axis** (always visible). Episodes populate the calendar **independently** of posters.
  - The current vertical build ties posters to episode days, which **removes the constant visual anchor** users rely on for scanning.

- **Violates the vertical spec**
  - Spec requires:
    - **Row 1** = providers (logos only, with merged cells spanning all their shows).
    - **Row 2** = **static** shows/posters (always present, independent of episodes).
    - **Rows 3+** = dates; episode badges (`SxxEyy`) appear beneath the correct show.
  - Current build does none of the above reliably.

- **Hurts scannability & comparison**
  - Without a fixed posters row, a user cannot quickly map **which episodes** belong to **which show** as they scroll days—the anchor moves/disappears.

- **Unnecessary labels**
  - Provider/show text duplicates what the **icon/poster** already communicates. It adds noise, reduces density, and diverges from the established horizontal UI.

- **Theme mismatch**
  - The dark theme came from the mock; it’s not the app default and creates **inconsistent brand presentation** across screens.

---

## 3) The correct vertical model (parity with horizontal)

- **Row 1 – Providers (header)**
  - Provider logos only (no text).
  - For providers with multiple user-watching shows, the **provider cell is merged horizontally** across all of that provider’s show columns.

- **Row 2 – Shows & Posters (static)**
  - Shows the poster **for every show the user is watching**, one column per show.
  - **Always visible** and **independent** of whether an episode airs on a given day.
  - No show title text under posters.

- **Rows 3+ – Dates**
  - Each subsequent row is a **calendar day**.
  - At the intersection of **[day × show]**, display an **episode badge** (small dot + `SxxEyy`) **only if** that show airs that day; otherwise the cell is empty.
  - This mirrors the horizontal guide’s behaviour, rotated.

---

## 4) What to change (implementation plan)

### A. Data model & mapping

- **Keep the existing data sources** (providers, shows per provider, episodes per show per date).
- Build a **flattened ordered list of show columns** grouped by provider.
- Build a **provider span map**: for each provider, the range of column indices it should span (used by the provider header merged cell).

### B. Layout structure

- Three synchronized rails:
  1. **Provider header row** (Row 1): horizontally scrollable, pinned to top; cells may **span multiple show columns** for providers with >1 show.
  2. **Posters row** (Row 2): horizontally scrollable, pinned under the provider header; **one column per show** (no text).
  3. **Main grid** (Rows 3+): 2‑D scroll; **rows = days**, **columns = shows**; contains episode badges only.

> Important: The posters row is **static** and should **not depend** on episode presence.

### C. Snapshots

- **Header snapshot**: one item per provider with metadata `{startColumn, endColumn}` for cell spanning.
- **Posters snapshot**: one item per show (ordered by provider group).
- **Grid snapshot**: for each day × show:
  - insert `.episode(vm)` if airing; else `.empty`.

### D. Styling

- Use the **light theme** by default (same tokens as horizontal).
- **Remove text** under providers and posters.
- Keep poster size and episode badge styling **identical** to horizontal for consistency.

### E. Scroll synchronisation

- Scrolling the main grid:
  - sync **x** to provider header and posters row,
  - sync **y** only within the grid (header and posters remain pinned).
- Scrolling the posters row/header:
  - sync **x** back to grid (no **y** changes).

### F. Provider “merged cells”

- Implement via:
  - decoration/supplementary backgrounds spanning the provider’s show columns **or**
  - a single header cell with a calculated **contentSize**/frame covering its column range.
- The key is: **one visible provider “cell” per provider**, width = sum of its show columns + interitem spacing.

---

## 5) Acceptance criteria (what “done” looks like)

1. **Structure**
   - Row 1 = provider logos (merged per provider).
   - Row 2 = posters (static, always visible).
   - Rows 3+ = dates; episode badges `SxxEyy` appear only when airing.

2. **Parity**
   - Poster appearance, badge visuals, and spacing match the horizontal guide (just rotated).

3. **No labels**
   - No provider names or show titles rendered in the grid; rely on icons/posters. (Accessibility labels remain for VoiceOver only.)

4. **Theme**
   - Light theme by default; respects system theme if/when we add support later.

5. **Sync**
   - Horizontal scroll keeps header & posters perfectly aligned with the grid columns; vertical scroll moves only the date rows.

6. **Providers with multiple shows**
   - Their header cell spans all associated show columns.

---

## 6) Quick QA checklist

- Posters visible for **all shows** even on days with **no episodes**.
- Switching months/dates does **not** reflow or hide the posters row.
- Provider header alignment stays perfect at extreme scroll positions.
- No text labels shown under provider icons or posters.
- Performance equals the horizontal guide (smooth scrolling).

---

## 7) Notes for implementation

- Reuse `ShowPosterCell` for the posters row; reuse the existing episode badge view from horizontal.
- Keep identifiers (show/episode IDs) consistent with the horizontal build to minimise code changes.
- If spanning via decoration views, ensure z‑index keeps header above the posters row and grid.

---
