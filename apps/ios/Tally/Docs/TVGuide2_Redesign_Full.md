# TVGuide2 — Align to *img 1 and 2* (desired) from *img 3* (current)

Goal: Update the existing TVGuide2 implementation so it matches *img 2* (and the dark-theme mock, later called *img 3*):

- One global date header row (NOT repeated per provider).
- A frozen left column consisting of:
  - a merged provider rail — one logo per provider, centered vertically across that provider’s stacked show rows;
  - frozen posters — one poster per show row that does not scroll horizontally.
- The episodes matrix scrolls horizontally under the global header and vertically across shows.
- Keep existing interactions (episode tap → expand details aligned to the tapped day; long press/tooltips; poster zoom) working.

We are editing (not rewriting) the current TVGuide2 code.

---

## Architecture change (minimal, additive)

To achieve the Excel-like frozen panes and avoid per-section date headers, we use three synchronized collection views inside TVGuide2View:

View | Purpose | Scrolling
---- | ------- | ---------
TopHeaderCV | Renders the global day/date header row once | Horizontal (programmatic)
LeftFrozenCV | Renders the provider rail (merged) + posters | Vertical (user)
MainGridCV | Renders the episodes matrix (show × day cells) | Both (user)

Synchronization:
- MainGridCV.contentOffset.x → drives TopHeaderCV.contentOffset.x (header slides with columns).
- MainGridCV.contentOffset.y ↔ drives LeftFrozenCV.contentOffset.y (left column follows vertical scroll).

This removes the repeated date header per provider and lets us truly “merge” the provider cell per section.

---

## Shared layout constants

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

- Important: columnWidth must be shared by TopHeaderCV and MainGridCV.
- frozenLeadingWidth is used as the leading content inset for the header and grid to align columns with the frozen left strip.

---

## File-by-file changes

1. TVGuide2Kinds.swift
Add/confirm element kinds (only used inside compositional layouts if needed later):

enum TVGuide2Kinds {
  static let providerRail = "provider-rail"
}

Note: With the three-view approach we don’t need a provider-rail supplementary in MainGridCV. The rail lives in LeftFrozenCV.

2. ProviderRailView.swift
Use this as the section header of LeftFrozenCV. It should center the provider logo vertically and draw the trailing 1px separator line.

3. DateHeaderView.swift + DateHeaderCell.swift
These power TopHeaderCV. The cell should render weekday (MON/TUE…) and day number stacked. Leading inset must equal GuideMetrics.frozenLeadingWidth. Remove any date boundary supplementary in MainGridCV.

4. ShowPosterCell.swift
Item in LeftFrozenCV under each provider section. Size = posterWidth × rowHeight. Poster image centered. No horizontal scroll. Divider optional.

5. EpisodeCell.swift + EmptyCell.swift
Remain in MainGridCV. Height = rowHeight, width = columnWidth.

6. ShowRowCell.swift / ProviderCell.swift
If these were used to fake merged provider cells inside the grid, stop using them in MainGridCV. The rail should only exist in LeftFrozenCV.

7. TVGuide2View.swift
- Add three collection views (headerCV, leftCV, gridCV).
- Sync scroll offsets: headerCV follows horizontal scroll, leftCV follows vertical scroll.
- Layouts: header layout uses leading inset frozenLeadingWidth, left layout uses provider rail header with fractionalHeight(1.0), grid layout uses frozenLeadingWidth inset.

---

## Making the provider rail truly “merged”

Provider rail is a section header in LeftFrozenCV with height = fractionalHeight(1.0), spanning all show rows. One logo per provider, centered vertically. No provider cells in MainGridCV.

Check:
- ProviderRailView centers image with centerYAnchor.
- Section header zIndex ≤ posters.
- Poster counts match show rows exactly.

---

## Freeze the poster while horizontal scrolling

Handled by LeftFrozenCV: posters are in their own collection view, no horizontal scroll. Only vertical, synced with grid.

---

## Keep existing interactions

- Episode tap: expand inline details panel aligned to tapped day column.
- Long press on episode: context menu.
- Poster tap: zoom modal with backdrop, flick-to-dismiss.

---

## Pitfalls

1. Date header repeats → remove boundary supplementary in MainGridCV.
2. Columns don’t line up → check constants and leading insets.
3. Provider logo not merged → ensure one section per provider, section header fractionalHeight(1.0).
4. Row misalignment → provider and show ordering must match between LeftFrozenCV and MainGridCV.
5. Poster appears behind grid → verify frames, leftCV sits to the left.

---

## Acceptance checklist

- Only one global header row (no duplicates per provider).
- One provider logo per provider, centered vertically across stacked show rows.
- Posters stay frozen while horizontal scrolls.
- Vertical scroll keeps posters and grid aligned.
- Episode cells align under header days.
- Episode expansion aligns under tapped day column.
- Long-press works on episodes and posters.

---

## TL;DR

- Remove per-provider date headers.
- Add TopHeaderCV (global dates) and LeftFrozenCV (provider rail + posters).
- Keep MainGridCV for episodes only; align via shared constants.
- Sync scroll offsets.
- Result = UI matches img 2 / img 3 exactly.
