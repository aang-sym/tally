# Calendar Redesign Plan

Primary reference: Image 2 (stacked logo bubbles), light theme only.

## Goals

- Monday-first calendar with previous/next month spillover days.
- Subtle rounded day tiles (8–12px), dim out-of-month days.
- Chevrons header with `Month, Year` and monthly spend.
- Represent ongoing subscriptions with small provider-colored pips (not bars).
- Show stacked/overlapping provider logo bubbles (max 3) on key days.
- Overflow indicator (`+N`) when >3 providers for a day.
- Hover/selection price badge and a day-detail modal (image 2 style).
- Optional status dots for start/end/ending-soon.

## Tasks

1. Refactor `CalendarView` grid
   - Week starts Monday.
   - Render spillover days from adjacent months to always show 6×7.
2. Tile styling and content
   - Rounded tiles, dim out-of-month.
   - Stacked logo bubbles (overlap) up to 3; `+N` overflow.
   - Centered, larger, full‑bleed logos (no inner square), with lazy loading.
   - Continuity pips (color = provider), placed near bottom of tile.
   - Hover price badge (sum of unique provider costs that day).
3. Header overhaul (in `OverviewCalendar`)
   - Left/right chevrons; `Month, Year` centered/left.
   - Monthly spend calculation and display.
4. Day detail modal
   - List providers with icon, name, price; total row.
   - Close/Confirm buttons (Confirm stubbed for now).
5. Status dots
   - Start=green, Ending soon (<7d)=orange, End=red (on the logo bubble).
6. Legend
   - Provider pip list only (status dots live on logos, not duplicated in legend).
7. Robustness
   - Wrap calendar in ErrorBoundary to avoid white-screen on runtime errors.
8. Asset quality
   - Upgrade TMDB logo URLs to `/original` when detected; consider responsive `srcset` later.
9. Caching
   - LocalStorage cache for Overview calendar by user+month with 6h TTL; hash signature of user shows ensures invalidation when shows/providers change.
   - Persist episode analysis cache per TMDB ID for faster rebuilds across reloads.

## Notes

- Service logos: use `streaming_provider.logo_path` when available; fallback color dot.
- Data model: compute per-provider per-day `displayType` (`logo` vs `bar` → now `pip`), with flags for `isStart`, `isEnd`, `isEndingSoon` for status dots.
- Keep `SavingsCalendar` behavior intact by making new props optional with safe defaults.

Out of Scope / Removed
- Row-spanning “capsule” overlay was prototyped for comparison and removed per direction.

## Progress

- [x] Refactor CalendarView (Monday start + spillover days)
- [x] Implement stacked centered logos (full‑bleed)
- [x] Continuity pips (provider-colored) with legend
- [x] Add overflow +N and hover price badge
- [x] Revamp header (chevrons + monthly spend)
- [x] Enhance day detail modal + totals
- [x] TMDB logo quality upgrade (/original)
- [x] ErrorBoundary integration around Calendar view
- [x] Remove old blue info panel from Calendar page
- [x] Responsive logo layout with container queries (stacked → grid) and overflow clipping
- [x] Extra services indicator
  - Stacked mode: circular plus bubble to the right of logos
  - Grid/narrow mode: +N badge shown via container queries
- [x] Dynamic pips count
  - Render a pip per active provider on the day (no hard cap)
 - [x] Calendar caching (localStorage by user+month; 6h TTL) and persisted episode cache

## Known Issues / Follow-ups
- Lock background scroll/content under the day-detail modal to avoid any underlying numbers peeking through on some screen sizes.
- Optionally add aria-label for the stacked “+” bubble to aid screen readers.
