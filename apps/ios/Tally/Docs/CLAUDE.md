# Claude Code Guide for the Tally Repo

This file tells an AI code assistant (Claude Code or similar) **how to work in this repository**. Keep it short, actionable, and updated.

---

## Project Overview

- **Monorepo**: `apps/api` (backend), `apps/web` (web), `apps/ios/Tally` (iOS app)
- **Primary data**: Supabase (Postgres + RLS, Auth, Storage)
- **Preferred pattern right now**: iOS → **Backend (BFF)** → Supabase & other services

## Why BFF (Backend-For-Frontend)?

Use this decision tree:

- **Does the operation need secrets, privileged logic, or cross-service orchestration?**
  → Go through **backend**.
- **Is it simple CRUD on user-owned rows with Row-Level Security fully enforced?**
  → Can go **direct to Supabase** from iOS using the public anon key.

### Pros & Cons

**Going through Backend**

- ✅ Hide secrets/keys, centralize validation, rate limiting, observability.
- ✅ Single place for versioning, migrations coordination, schema guards.
- ✅ Easier to change data sources without shipping a new app.
- ➖ Extra hop/latency & infra to maintain.

**Direct to Supabase from iOS**

- ✅ Lower latency for reads, fewer moving parts.
- ✅ Real‑time and storage SDK are easy to use.
- ➖ Must design RLS perfectly; bugs = data leakage.
- ➖ Some flows still need a server (billing webhooks, service role actions, secure fan‑out).
- ➖ Client ships with the anon key; you **cannot** safely do service‑role operations on device.

**Hybrid (recommended)**

- Reads that are safe under RLS → **direct**.
- Writes/privileged/business rules → **backend**.
- Keep a single source of truth for domain rules in the backend to avoid drift.

---

## Repo Layout Hints (for the assistant)

- iOS app root: `apps/ios/Tally/`
  - Source folders: `App/`, `Core/`, `Features/`, `UI/`, `Services/`, `Resources/`
  - Entry: `Tally/TallyApp.swift` (SwiftUI `@main`)
- Backend: `apps/api/` (pnpm workspace)
- Web: `apps/web/`

## Build & Run

- **Backend**: `pnpm dev --filter @tally/api` (or `pnpm dev` if it runs all)
- **iOS**: open `apps/ios/Tally/Tally.xcodeproj` in Xcode → run on Simulator.
- Local iOS networking: base URL currently `http://localhost:4000` with ATS exceptions in Info.

## iOS Conventions

- Architecture: feature‑oriented MVVM.
- Networking: `Services/ApiClient.swift` (async/await). Token is optional and passed as `Authorization: Bearer …`.
- Place new feature files under `Features/<FeatureName>/` with `View`, `ViewModel`, and optional `Service`.
- Keep models in `Core/Models/` when they are reused across features.

## Safe Tasks the Assistant May Do

- Create/modify Swift files within the iOS app.
- Add small, targeted backend routes in `apps/api` when needed.
- Write tests in `Tests/`.
- Update docs under `Docs/`.

## Things to Avoid

- Do **not** introduce service-role keys into iOS.
- Do **not** bypass RLS assumptions without an explicit note in PR.
- Do **not** create nested git repos inside `apps/ios`.

## Credentials & Secrets

- iOS uses a token typed in UI or stored in Keychain (to be added). No secrets committed.
- Backend env goes in `.env` (not committed). Use Supabase service key **only** on server.

## Open Questions / TODOs

- [ ] Decide which endpoints can be direct-to-Supabase (reads) vs backend (writes).
- [ ] Persist token securely (Keychain) and auto-inject into `ApiClient`.
- [ ] Add SubscriptionsViewModel + list backed by real endpoint.
- [ ] Add unit tests for `ApiClient` and feature VMs.

---

## Quick Prompt Examples

- _“Add a SubscriptionsViewModel with `load()` that calls `ApiClient.subscriptions()` and binds to `SubscriptionsView`.”_
- _“Refactor ApiClient into request builder + typed endpoints; keep baseURL in `App/Config/Environment.swift`.”_
- _“Create tests for ApiClient.health() mocking URLProtocol.”_

---

## Doc Access for Swift/Xcode

For development-time help only:

- Prefer official Apple docs:
  - `https://developer.apple.com/documentation`
  - `https://swift.org`
  - Apple sample projects on `developer.apple.com/sample-code`
- When answering, always link the exact doc page used.
- Prioritise explanations grounded in SwiftUI, Combine, async/await, and Xcode conventions.
