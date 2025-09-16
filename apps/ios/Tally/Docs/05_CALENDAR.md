# 05 – Calendar (iOS) – Basic Implementation Plan

Goal

- Ship a simple, performant monthly calendar that shows streaming provider indicators per day, matching the spirit of the web Calendar and the reference mockups. Focus is on wiring + shape correctness; visuals can be iterated later.

Web reference

- See apps/web/src/pages/Calendar.tsx for data usage and basic UX affordances (country pill, multi-view selector). The Overview calendar renders provider dots/logos per day.

API inputs (minimum viable)

- User subscriptions: GET /api/users/{id}/subscriptions?country={code}
- User shows with provider: GET /api/watchlist (already returns user shows with show + selected provider)
- Episodes per day source (choose 1 for MVP):
  - A. Server route that returns daily schedule for user’s shows (preferred if available).
  - B. Fallback: derive a lightweight schedule by calling analyze/season endpoints for watching shows and grouping episodes by airDate (OK for small lists; cache 24h on app side).

Data shape (iOS)

- CalendarDay: { date: DateOnly, providers: [{ id: Int, name: String, logo: URL? }] }
- Month grid: 6 rows × 7 columns; each cell holds zero or more providers for that day.
- ProviderPalette: stable color/icon mapping for dots and a 24px logo overlay if 1–3 providers (overflow shows +N).

Screens and components

- CalendarView (screen):
  - Header: month/year, chevrons for prev/next, Today button.
  - Country: reuse the Search header country menu (same CountryManager).
  - Grid: MonthGridView showing days; each day shows:
    - Either small colored dots (1–4) OR tiny provider logos (if available) per web.
    - Optional selected-day outline.
  - Footer (optional): legend mapping colors to provider names.

Implementation steps (minimal‑reasoning ready)

1. Scaffolding

- Add Features/Calendar/CalendarView.swift (SwiftUI) and Features/Calendar/CalendarViewModel.swift.

2. ViewModel state

- @Published var country: String = CountryManager.get()
- @Published var monthAnchor: Date (first day of current month)
- Derived: visibleDays: [CalendarDay] covering 6×7 grid (pad leading/trailing days)
- @Published var dailyProviders: [String /_yyyy-MM-dd_/: [Provider]] = [:]

3. Data fetching

- loadForMonth(monthAnchor,country):
  - Fetch user subscriptions + user shows in parallel.
  - If server exposes a route for daily schedule, use it.
  - Else: for each watching show (limit 20 for MVP), call analyzeShow(tmdbId:country) and map episode airDate → day; attach selected provider (if any) or providers from analysis.
  - Normalize providers to { id,name,logo }.
  - Build dailyProviders keyed by yyyy-MM-dd.
  - Cache results in-memory by (month,country).

4. UI grid rendering

- MonthGridView: 7 columns, 6 rows.
- DayCell:
  - Date number.
  - Row of tiny provider dots (or logos if ≤ 3) – AsyncImage for logos.
  - Overflow +N badge when >3 providers.
- Navigation: chevrons change monthAnchor by ±1 month; Today snaps to current month.
- Country menu in header: changes country and reloads month inline.

5. Routing sanity check

- Tap a day → show a simple sheet listing providers/shows on that day (MVP) with show title and provider logo.
- From the sheet, tap a show (optional) → navigate back to Search and prefill the query (or deep-link later).

6. Performance notes

- Limit per-show analyze calls (watching only; top 20), cache 24h in-memory.
- Avoid blocking UI: show a “Loading month…” indicator; render grid skeleton.

7. Acceptance criteria

- Calendar renders a full month with provider dots/logos per day.
- Country changes update calendar inline.
- Today/prev/next behave correctly (including month boundaries and padding days).
- Tap shows a basic sheet with providers/shows for that day.

Future improvements

- Server-side monthly schedule endpoint for user shows (reduce client analysis calls).
- Provider legend and cost overlays (monthly spend like web mockup).
- Week view + list hybrid.
- Animations + haptics, rounded day tiles per mockup.
- Deep-link to show card with pre-selected season/episode.
