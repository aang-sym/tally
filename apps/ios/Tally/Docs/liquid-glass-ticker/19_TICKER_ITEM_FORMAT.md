# Ticker item format — plan (v1)

A cohesive, system‑level spec for the **What’s New** ticker and the expandable sheet.

---

## Goals

- Every ticker has **at least one deep link** (show, service, episode/season/date, billing/settings, etc.).
- Visual grammar is **consistent** across kinds (title, subtitle, badge, icon, actions).
- Icons/badges are **leading** (at the start of each row), as in current design.
- Support **two distinct deep links** per row (e.g. _Show_ and _Service_) with **tinted actions**.
- Copy is short, sentence case, and relies on **relative time**.

---

## Global layout rules

- **Row anatomy:** `[Leading icon/badge]  Title  [trailing link chips/chevron]` then **subtitle** on line 2.
- **Title:** sentence case, max 1 line (truncate tail). Avoid price at start unless renewal.
- **Subtitle:** provider/context or concise state (“Renews in 3 days”).
- **Numbers:** compact and plural‑safe (e.g., `1.2K` not `1,167`).
- **Relative time:** today/tomorrow/“in 3 days,” never absolute unless required.
- **Tap targets:**
  - **Primary row tap** → primary deep link.
  - **Tinted link chips** (at trailing edge, small rounded pills) provide **secondary links** (e.g., _Show_, _Service_). Chips are individually tappable.
  - **Long‑press** opens context menu mirroring available links.
- **Chevron**: only if there is exactly one deep link and no chips.
- **A11y label:** `title, subtitle, badges: <names>, actions: <chip titles>`.

---

## Badge & icon system (leading)

- Always **leading**. Icon size 20pt (SF Symbols _fill_ variants). Badge text optional and compact.
- **Tint by kind:**
  - Trending → Orange
  - Pause → Blue
  - Renewal → Red (≤3d), Orange (≤7d), Gray (else)
  - Airs (upcoming air date) → Indigo
  - New release → Green
- Example: `🔥 Trending`, `⏸ Save`, `💳 Renewal`, `📅 Airs`, `✨ New`.

---

## Deep link model & tinting

Each item can expose 1–2 explicit deep links rendered as **tinted chips** on the right.

```swift
enum TickerLinkKind { case show, service, episode, season, date, billing, settings }

struct TickerLink {
    let kind: TickerLinkKind
    let title: String            // Chip title, e.g. "Show", "Service", "Billing"
    let url: URL
    let icon: String?            // Optional small symbol on chip
    let tint: Color              // See tint map below
    let isPrimary: Bool          // True = row’s primary tap target
}

struct TickerItem {
    // existing fields…
    let links: [TickerLink]      // ≥ 1, max 2 in UI (extras via context menu)
}
```

**Tint map for links** (chips):

- `show` / `episode` / `season` → **Poster‑dominant** color or fallback **Purple**
- `service` → **Brand color** (from provider theme map)
- `billing` → **Red**
- `settings` → **Gray**
- `date` → **Indigo**

> If both _Show_ and _Service_ links are present, both chips render; primary tap goes to **Show** by default.

---

## Copy templates by kind

Use these exactly, substituting tokens.

### `trendingNow`

- **Title:** `{countCompact} watching {Show} this week`
- **Subtitle:** `{Service}`
- **Leading:** `flame.fill` + `Trending`
- **Links:** `Show` (primary), `Service` (secondary)

### `pause`

- **Title:** `Pause {Service}?`
- **Subtitle:** `No upcoming episodes this month`
- **Leading:** `pause.circle.fill` + `Save`
- **Links:** `Service` (primary), `Settings` (secondary → manage subscription)

### `renewalDue`

- **Title:** `{Service} {price}` (omit price if unknown)
- **Subtitle:** `Renews {relativeDate}`
- **Leading:** `creditcard.fill` + `Renewal`
- **Links:** `Billing` (primary), `Service` (secondary)

### `upcomingAirDate`

- **Title:** `{Show} S{SS}E{EE} airs {relativeDate}`
- **Subtitle:** `{Service}`
- **Leading:** `calendar.badge.clock` + `Airs`
- **Links:** `Show` (primary), `Service` (secondary)

### `newRelease`

- **Title (out now):** `{Show} Season {N} now streaming`
- **Title (future):** `{Show} Season {N} premieres {relativeDate}`
- **Subtitle:** `{Service}`
- **Leading:** `sparkles` + `New`
- **Links:** `Show` (primary), `Service` (secondary)

---

## Rendering pipeline

1. **Normalize** raw item → `TickerRender` (title, subtitle, leading icon/badge, links[]).
2. **Truncate** title to 1 line (tail).
3. **Generate chips** for up to 2 links sorted by `isPrimary desc, link importance`.
4. **Compute tints** from link kind (poster dominant / brand color via theme map).
5. **Assign primary tap** to first link with `isPrimary`, else first link.
6. **Accessibility**: announce badge first, then title, subtitle, then actions.

---

## Sorting & de‑dupe

- Sort: `urgency desc`, then `date asc` (if present), then kind priority: `renewal > upcomingAirDate > newRelease > pause > trendingNow`.
- De‑dupe same entity: keep highest‑priority kind; merge links.

---

## Edge cases & fallbacks

- Missing service → subtitle becomes “Unknown service”; hide `Service` chip.
- Missing show → fallback to generic copy (e.g., `Trending this week`).
- No date → use `soon`.
- Price formatting → local currency, narrow no‑break space before symbol where locale requires.

---

## Analytics

- Impression: `ticker_impression(kind, entity_id, service_id)`.
- Row tap (primary): `ticker_primary_tap(link_kind, url)`.
- Chip tap (secondary): `ticker_chip_tap(link_kind, url)`.
- Long‑press: `ticker_context_menu(kind)`.

---

## Accessibility

- Minimum 44×44pt tap areas for chips.
- VoiceOver order: **leading icon/badge → title → subtitle → actions**.
- Chips expose **individual accessibility actions** with their titles.

---

## QA checklist

- [ ] Each item renders **≥ 1 deep link**.
- [ ] If both Show and Service exist, two **tinted chips** appear and route correctly.
- [ ] Leading badge/icon always visible and tinted by kind.
- [ ] Titles fit in one line across narrow devices.
- [ ] Relative dates match locale.
- [ ] Color contrast AA for all chip states.

---

## Example re‑format of current sample

- **Trending:** `1.2K watching Chad Powers this week` · `Disney Plus` · Chips: _Show_ (purple), _Service_ (brand red).
- **Pause:** `Pause HBO Max?` · `No upcoming episodes this month` · Chips: _Service_ (brand blue), _Settings_ (gray).
- **Renewal:** `Prime Video $15.99` · `Renews in 3 days` · Chips: _Billing_ (red), _Service_ (brand yellow).
- **Airs:** `Severance S02E05 airs tomorrow` · `Apple TV+` · Chips: _Show_ (purple), _Service_ (brand blue).
- **New:** `Stranger Things Season 5 now streaming` · `Netflix` · Chips: _Show_ (purple), _Service_ (brand red).

---

## Implementation notes (Swift snippets)

```swift
struct TickerRender {
    let title: String
    let subtitle: String
    let leadingIcon: String
    let leadingBadge: String?
    let leadingTint: Color
    let links: [TickerLink]
}

enum TickerKindPriority: Int { case renewal=4, upcomingAirDate=3, newRelease=2, pause=1, trendingNow=0 }

func relative(_ date: Date?) -> String { /* RelativeDateTimeFormatter + today/tomorrow */ }
func compact(_ n: Int) -> String { /* 1.2K/2.3M */ }
```

> Rendering code should live beside the view as a `Formatter` type; do **not** hard‑code strings in the view.

---

## Open questions (v2)

- Should chips ever contain **dynamic titles** (e.g., _S2E5_) when the link is to an episode?
- Do we need a **third** link exposure via overflow (`…`) when there are >2 links?
- Should we show **context badges** like _Free with Prime_ or _Leaving soon_?
