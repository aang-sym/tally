# Calendar Redesign Plan

Primary reference: Image 2 (stacked logo bubbles), light theme only.

## Goals

- Monday-first calendar with previous/next month spillover days.
- Subtle rounded day tiles (8–12px), dim out-of-month days.
- Chevrons header with `Month, Year` and monthly spend.
- Represent ongoing subscriptions with thin “rails” spanning days.
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
   - Implement rails with start/end caps per provider aggregate.
   - Stacked logo bubbles (overlap) up to 3; `+N` overflow.
   - Hover price badge (sum of unique provider costs that day).
3. Header overhaul (in `OverviewCalendar`)
   - Left/right chevrons; `Month, Year` centered/left.
   - Monthly spend calculation and display.
4. Day detail modal
   - List providers with icon, name, price; total row.
   - Close/Confirm buttons (Confirm stubbed for now).
5. Status dots
   - Start=blue, Active=green, Ending soon (<7d)=orange, End=red.

## Notes

- Service logos: use `streaming_provider.logo_url` when available; fallback color dot.
- Data model: enrich aggregated provider-per-day with `barLeftCap`, `barRightCap`, and `hasLogo` flags derived from show date ranges.
- Keep `SavingsCalendar` behavior intact by making new props optional with safe defaults.

## Progress

- [x] Refactor CalendarView (Monday start + spillover days)
- [x] Implement stacked centered logos (full-bleed)
- [x] Replace rails with subtle continuity pips
- [x] Add overflow +N and hover price badge
- [x] Revamp header (chevrons + monthly spend)
- [x] Enhance day detail modal + totals
- [x] Wire status dots + caps logic
