# Tally Project Context

> **Comprehensive project documentation for AI assistants and developers**
> Last updated: 2025-11-12

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Monorepo Structure](#monorepo-structure)
4. [iOS App Architecture](#ios-app-architecture)
5. [Backend API](#backend-api)
6. [Database Schema](#database-schema)
7. [Development Principles](#development-principles)
8. [Getting Started](#getting-started)
9. [Key Features](#key-features)
10. [Current Branch Context](#current-branch-context)

---

## Project Overview

**Tally** is an iOS-first application for smart streaming service management. The app helps users save money by planning when to subscribe to streaming services based on the shows they actually want to watch.

### Core Value Proposition

- Track shows you want to watch across all streaming platforms
- Get personalized recommendations for when to subscribe/unsubscribe
- View upcoming episodes in a unified calendar across all services
- Optimize subscription costs by timing them around content releases
- Track viewing progress and manage your watchlist

### Current Status

- **iOS App**: Active development targeting iOS 26 with modern SwiftUI
- **Backend API**: Production-ready Express.js REST API with Supabase integration
- **Web Landing**: React-based waitlist page (not the main app)
- **Database**: Supabase PostgreSQL with Row-Level Security (RLS)

---

## Architecture & Tech Stack

### High-Level Architecture

```
┌─────────────────┐
│   iOS App       │ ← Main user-facing application (Swift/SwiftUI)
│   (Swift)       │
└────────┬────────┘
         │
         │ HTTP/REST
         ▼
┌─────────────────┐
│  Backend API    │ ← BFF (Backend-For-Frontend) pattern
│  (Express.js)   │ ← Handles auth, business logic, orchestration
└────────┬────────┘
         │
         │ SQL + Service Role
         ▼
┌─────────────────┐
│   Supabase      │ ← PostgreSQL + Auth + Storage + Realtime
│   (PostgreSQL)  │ ← Row-Level Security enforced
└─────────────────┘
         │
         │ External APIs
         ▼
┌─────────────────┐
│   TMDB API      │ ← Show/movie metadata, images, episode data
│   JustWatch     │ ← Streaming availability data
└─────────────────┘
```

### Technology Stack

#### iOS App

- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI (iOS 26 features)
- **Architecture**: MVVM with protocol-based dependency injection
- **State Management**: `@Observable` macro (Observation framework)
- **Networking**: Async/await with custom `ApiClient`
- **Testing**: Swift Testing framework

#### Backend API

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.21+
- **Language**: TypeScript 5.3+
- **Validation**: Zod schemas
- **Database Client**: Supabase JS SDK
- **Authentication**: JWT with bcrypt
- **Testing**: Vitest + Supertest

#### Database

- **Provider**: Supabase (PostgreSQL 15+)
- **Authentication**: Supabase Auth (JWT-based)
- **Security**: Row-Level Security (RLS) policies
- **Schema**: 10 tables with comprehensive relationships

#### Package Management

- **iOS**: Swift Package Manager (SPM) + CocoaPods (if needed)
- **Backend/Web**: pnpm workspaces
- **Monorepo**: pnpm 9.6.0

---

## Monorepo Structure

```
tally/
├── apps/
│   ├── api/                    # Backend Express.js API
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, validation, error handling
│   │   │   ├── db/            # Supabase client & migrations
│   │   │   ├── services/      # Business logic layer
│   │   │   └── utils/         # Helper functions
│   │   └── docs/              # API documentation
│   │
│   ├── web/                    # React landing page (waitlist only)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── pages/
│   │   └── public/
│   │
│   └── ios/                    # Main iOS application
│       └── Tally/
│           ├── Tally/          # App entry point
│           ├── App/            # App configuration
│           ├── Core/           # Models, utilities, persistence
│           ├── Features/       # Feature modules (MVVM)
│           ├── Services/       # API client, networking
│           ├── UI/             # Shared components, theme
│           ├── Tests/          # Unit & integration tests
│           └── Docs/           # Feature specs & guides
│
├── packages/
│   ├── types/                  # Shared TypeScript types & Zod schemas
│   ├── core/                   # Pure business logic (planning, calculations)
│   ├── config/                 # Shared ESLint, TypeScript configs
│   └── api-client/             # Auto-generated OpenAPI client
│
├── CLAUDE.md                   # Root-level AI assistant instructions
└── README.md                   # Project README
```

---

## iOS App Architecture

### Directory Structure

```
apps/ios/Tally/
├── Tally/
│   ├── TallyApp.swift          # @main entry point
│   └── ContentView.swift       # Navigation hub (dev/testing)
│
├── App/
│   └── Config/
│       └── Environment.swift   # App configuration, API URLs
│
├── Core/
│   ├── Models/                 # Core data structures
│   │   ├── Subscription.swift  # Subscription model with pricing
│   │   ├── CalendarEpisode.swift # Episode with show & provider
│   │   └── ApiClient.swift     # Show, Episode, Season models
│   │
│   ├── Networking/             # HTTP utilities
│   ├── Persistence/            # UserDefaults storage layer
│   ├── Preview/                # Preview helpers for Xcode
│   └── Utilities/              # Date formatting, helpers
│
├── Features/                   # Feature modules (MVVM)
│   ├── Auth/
│   │   ├── LoginView.swift
│   │   └── AuthViewModel.swift
│   │
│   ├── Dashboard/
│   │   ├── DashboardView.swift          # Main home screen
│   │   ├── DashboardViewModel.swift     # Core logic (690+ lines)
│   │   └── Components/
│   │       ├── HeroSection.swift        # Service logos header
│   │       ├── LiquidGlassTicker.swift  # News ticker component
│   │       └── MetricsRow.swift         # Summary stats
│   │
│   ├── Search/
│   │   ├── SearchView.swift
│   │   └── SearchViewModel.swift        # 480+ lines, debounced search
│   │
│   ├── Subscriptions/
│   │   ├── SubscriptionsView.swift
│   │   └── SubscriptionsViewModel.swift
│   │
│   ├── Watchlist/
│   │   └── WatchlistView.swift
│   │
│   ├── SimplifiedCalendar/
│   │   └── SimplifiedCalendarView.swift # Weekly episode grid
│   │
│   └── Settings/
│       └── SettingsView.swift
│
├── Services/
│   ├── ApiClient.swift                  # Core HTTP client (ObservableObject)
│   ├── ApiClient+Auth.swift             # Login, register endpoints
│   ├── ApiClient+Subscriptions.swift    # Subscription management
│   ├── ApiClient+Watchlist.swift        # Watchlist CRUD
│   ├── ApiClient+Search.swift           # Show search & analysis
│   ├── ApiClient+TVGuide.swift          # TV guide data fetching
│   ├── ApiClient+Progress.swift         # Episode progress tracking
│   └── CountryManager.swift             # Country/locale management
│
├── UI/
│   ├── Components/                      # Reusable views
│   │   ├── ProviderLogoView.swift
│   │   ├── ErrorBanner.swift
│   │   └── LoadingView.swift
│   │
│   └── Theme/                           # Design system
│       ├── Colors.swift                 # Brand & semantic colors
│       ├── Spacing.swift                # 4pt grid system
│       └── Typography.swift             # Font styles
│
├── Tests/
│   ├── SubscriptionsViewModelTests.swift
│   └── ApiClientTests.swift
│
└── Docs/                                # Feature specs & technical guides
    ├── CLAUDE.md                        # iOS-specific AI instructions
    ├── liquid-glass-ticker/             # Ticker feature documentation
    └── Archive/                         # Historical design docs
```

### State Management Patterns

#### Modern Pattern (Preferred)

```swift
@Observable final class DashboardViewModel {
    var subscriptions: [Subscription] = []
    var isLoading = false
    var errorMessage: String?

    func loadData() async { ... }
}

// Usage in SwiftUI
struct DashboardView: View {
    @State private var viewModel = DashboardViewModel()

    var body: some View {
        // Auto-updates on viewModel property changes
    }
}
```

#### Legacy Pattern (Being Phased Out)

```swift
class SubscriptionsViewModel: ObservableObject {
    @Published var subscriptions: [Subscription] = []
    @Published var isLoading = false
}
```

### Key Architectural Patterns

#### 1. Show Repository Pattern

**DashboardViewModel** implements a centralized show cache:

```swift
private var showsById: [String: Show] = [:]

func getShow(byEntityId entityId: String) -> Show?
func getShowAsync(byEntityId entityId: String, titleHint: String, api: ApiClient) async -> Show?
func cacheShows(from watchlist: [UserShow])
```

- O(1) lookups by UUID, TMDB ID, or slug
- Fallback to API search if not cached
- Used by ticker items for dynamic poster retrieval

#### 2. Protocol-Based Dependency Injection

```swift
protocol ApiClientProtocol {
    func login(email: String, password: String) async throws -> AuthenticatedUser
    func getWatchlist() async throws -> [UserShow]
}

class LiveApiClient: ApiClientProtocol { ... }
class MockApiClient: ApiClientProtocol { ... }
```

#### 3. Ticker Deep Linking System

```swift
struct TickerItem: Identifiable {
    enum Kind {
        case upcomingAirDate, newRelease, renewalDue,
             priceChange, recommendation, trendingNow
    }
    let kind: Kind
    let title: String
    let links: [TickerLink]  // Tappable elements
}

struct TickerLink {
    enum Kind {
        case show, service, episode, billing, settings
    }
    let title: String        // Chip label
    let url: URL            // Deep link (tally://...)
    let tint: Color         // Contextual color
    let isPrimary: Bool     // Main vs secondary action
}
```

#### 4. Task Lifecycle Management

```swift
class SearchViewModel {
    private var currentSearchTask: Task<Void, Never>?
    private var detailsTasks: [String: Task<Void, Never>] = [:]

    deinit {
        currentSearchTask?.cancel()
        for task in detailsTasks.values { task.cancel() }
    }

    func search(query: String) {
        currentSearchTask?.cancel()
        currentSearchTask = Task {
            // Debounced search with proper cancellation
        }
    }
}
```

### Core Data Models

#### Subscription Model

```swift
struct Subscription: Identifiable, Codable {
    let id: UUID
    let serviceId: UUID
    let userId: UUID
    let monthlyCost: Double
    let tier: String?
    let isActive: Bool
    let startedDate: Date?
    let endedDate: Date?
    let renewalDate: Date?

    var formattedCost: String
    var daysUntilRenewal: Int?
    var renewalText: String
}
```

#### Calendar Episode Model

```swift
struct CalendarEpisode: Identifiable, Codable {
    let id: UUID
    let episodeNumber: Int
    let name: String
    let overview: String?
    let airDate: Date
    let runtime: Int?
    let showTitle: String
    let showPosterPath: String?
    let providerId: Int
    let providerName: String
    let providerLogoPath: String?
    let color: CodableColor

    var episodeIdentifier: String
    var fullTitle: String
    var formattedDate: String
}
```

#### User Show Model

```swift
struct UserShow: Identifiable, Codable {
    let id: UUID
    let userId: UUID
    let showId: UUID
    let status: String  // "watchlist", "watching", "completed", "dropped"
    let addedAt: Date
    let selectedServiceId: UUID?
    let bufferDays: Int
    let countryCode: String?

    // Joined data
    let title: String
    let posterPath: String?
    let tmdbId: Int
}
```

### Design System

#### Color System (Colors.swift)

```swift
// Brand Colors
static let tallyPrimary = Color.indigo
static let tallySecondary = Color.purple

// Semantic Colors
static let textPrimary: Color
static let textSecondary: Color
static let textTertiary: Color

// Status Colors
static let success = Color.green
static let warning = Color.orange
static let error = Color.red
static let info = Color.blue
```

#### Spacing System (Spacing.swift)

```swift
// 4pt base scale
static let xs: CGFloat = 4
static let sm: CGFloat = 8
static let md: CGFloat = 12
static let lg: CGFloat = 16
static let xl: CGFloat = 20
static let xxl: CGFloat = 24
static let xxxl: CGFloat = 32

// Component sizes
static let cardCornerRadius: CGFloat = 16
static let buttonCornerRadius: CGFloat = 10
```

#### Typography System (Typography.swift)

```swift
// Display fonts (rounded, large)
static func displayLarge(weight: Font.Weight = .bold) -> Font
static func displayMedium(weight: Font.Weight = .bold) -> Font

// Headings
static func heading1(weight: Font.Weight = .bold) -> Font  // 24pt
static func heading2(weight: Font.Weight = .semibold) -> Font  // 20pt

// Body fonts
static func bodyLarge(weight: Font.Weight = .regular) -> Font  // 16pt
static func bodyMedium(weight: Font.Weight = .regular) -> Font  // 14pt
```

### iOS 26 Specific Features

The app targets **iOS 26** with these modern features:

- **Liquid Glass TabView** - Native glass morphism effects
- **Observation Framework** - `@Observable` macro
- **Native Search Morphing** - Integrated search in TabView
- **Accessibility Improvements** - `reduceMotion` support
- **Glass Effect ID** - Shared glass effect namespace

---

## Backend API

### API Architecture

```
apps/api/src/
├── server.ts              # Express app setup, middleware
├── routes/                # Route handlers
│   ├── health.ts          # Health check endpoint
│   ├── auth.ts            # Authentication (login, register)
│   ├── users.ts           # User management
│   ├── watchlist.ts       # Watchlist CRUD
│   ├── shows.ts           # Show search & details
│   ├── tv-guide.ts        # TV guide data
│   ├── progress.ts        # Episode progress tracking
│   ├── ratings.ts         # Show/season ratings
│   ├── streaming-services.ts  # Service catalog
│   ├── recommendations.ts # Personalized recommendations
│   └── tmdb.ts            # TMDB proxy endpoints
│
├── middleware/
│   ├── auth.ts            # JWT verification
│   ├── validation.ts      # Zod schema validation
│   └── errorHandler.ts    # Centralized error handling
│
├── db/
│   ├── supabase.ts        # Supabase client singleton
│   └── migrations/        # SQL migration files
│
├── services/
│   ├── tmdb.service.ts    # TMDB API integration
│   ├── justwatch.service.ts  # Streaming availability
│   └── recommendations.service.ts  # Recommendation engine
│
└── utils/
    ├── jwt.ts             # JWT generation/verification
    └── errors.ts          # Custom error classes
```

### Key API Endpoints

#### Authentication

```
POST /api/auth/register
POST /api/auth/login
```

#### Watchlist Management

```
GET    /api/watchlist              # Get user's watchlist (RLS-filtered)
GET    /api/watchlist/stats        # Statistics (count by status, etc.)
POST   /api/watchlist              # Add show to watchlist
PUT    /api/watchlist/:id/status   # Update show status
DELETE /api/watchlist/:id          # Remove from watchlist
PUT    /api/watchlist/:id/service  # Update selected service
PUT    /api/watchlist/:id/buffer   # Update buffer days
```

#### Show Search & Details

```
GET  /api/shows/search             # Search shows by title
GET  /api/shows/:tmdbId            # Get show details
GET  /api/shows/:tmdbId/analyze    # Analyze show release pattern
GET  /api/shows/:tmdbId/season/:seasonNumber  # Get season details
```

#### TV Guide

```
GET  /api/tv-guide                 # Get upcoming episodes
POST /api/tv-guide/user            # Get personalized TV guide
```

#### Progress Tracking

```
POST /api/progress/episode         # Set episode progress
GET  /api/progress/show/:showId    # Get show progress
```

#### Subscriptions

```
GET    /api/users/subscriptions    # Get user's subscriptions
POST   /api/users/subscriptions    # Add subscription
PUT    /api/users/subscriptions/:id  # Update subscription
DELETE /api/users/subscriptions/:id  # Delete subscription
```

### Authentication Flow

1. **Client** sends credentials to `POST /api/auth/login`
2. **Backend** validates against Supabase Auth
3. **Backend** generates JWT token with user claims
4. **Client** stores token (Keychain on iOS)
5. **Client** includes `Authorization: Bearer <token>` in subsequent requests
6. **Backend** middleware verifies JWT and attaches `userId` to request
7. **Supabase** RLS policies enforce user-scoped data access

### Error Handling

Consistent error shape across all endpoints:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid credentials",
    "details": { ... }
  }
}
```

Common error codes:

- `UNAUTHORIZED` - Invalid or missing auth token
- `FORBIDDEN` - User lacks permission
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid request data
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

---

## Database Schema

### Core Tables

#### users

Primary user accounts with authentication data.

```sql
id: uuid (PK)
email: varchar(255) UNIQUE
encrypted_password: varchar(255)
country_code: varchar(2) DEFAULT 'US'
timezone: varchar(50) DEFAULT 'UTC'
display_name: varchar(100)
created_at: timestamp
updated_at: timestamp
```

#### shows

TV show metadata from TMDB.

```sql
id: uuid (PK)
tmdb_id: integer UNIQUE
title: varchar(500)
overview: text
poster_path: varchar(500)
first_air_date: date
last_air_date: date
status: varchar(50)
total_seasons: integer
total_episodes: integer
release_pattern: jsonb  -- { pattern: "weekly", confidence: 0.95 }
is_popular: boolean DEFAULT false
tmdb_last_updated: timestamp
```

#### seasons

Seasons for each show.

```sql
id: uuid (PK)
show_id: uuid FK → shows.id
tmdb_season_id: integer
season_number: integer
name: varchar(500)
overview: text
air_date: date
episode_count: integer
poster_path: varchar(500)

UNIQUE (show_id, season_number)
```

#### episodes

Individual episodes.

```sql
id: uuid (PK)
season_id: uuid FK → seasons.id
tmdb_episode_id: integer
episode_number: integer
name: varchar(500)
overview: text
air_date: date
runtime: integer

UNIQUE (season_id, episode_number)
```

#### streaming_services

Catalog of streaming platforms.

```sql
id: uuid (PK)
tmdb_provider_id: integer UNIQUE
name: varchar(100)
logo_path: varchar(500)
homepage: varchar(500)
```

#### show_availability

Which shows are available on which services.

```sql
id: uuid (PK)
show_id: uuid FK → shows.id
service_id: uuid FK → streaming_services.id
country_code: varchar(2)
availability_type: varchar(20)  -- 'flatrate', 'rent', 'buy'
price_amount: numeric
price_currency: varchar(3)
deep_link: text
updated_at: timestamp

UNIQUE (show_id, service_id, country_code, availability_type)
```

#### user_shows

User's watchlist entries.

```sql
id: uuid (PK)
user_id: uuid FK → users.id
show_id: uuid FK → shows.id
status: varchar(20)  -- 'watchlist', 'watching', 'completed', 'dropped'
added_at: timestamp
started_watching_at: timestamp
completed_at: timestamp
last_episode_watched_id: uuid FK → episodes.id
show_rating: numeric
notes: text
buffer_days: integer DEFAULT 0
selected_service_id: uuid FK → streaming_services.id
country_code: varchar(2)

UNIQUE (user_id, show_id)
```

#### user_episode_progress

Track which episodes users have watched.

```sql
id: uuid (PK)
user_id: uuid FK → users.id
episode_id: uuid FK → episodes.id
show_id: uuid FK → shows.id
state: varchar(20) DEFAULT 'unwatched'  -- 'unwatched', 'watching', 'watched'
progress: integer  -- Percentage (0-100)
started_watching_at: timestamp
watched_at: timestamp
episode_rating: numeric

UNIQUE (user_id, episode_id)
```

#### user_streaming_subscriptions

User's active streaming subscriptions.

```sql
id: uuid (PK)
user_id: uuid FK → users.id
service_id: uuid FK → streaming_services.id
monthly_cost: numeric
is_active: boolean DEFAULT true
started_date: date
ended_date: date
created_at: timestamp
updated_at: timestamp

UNIQUE (user_id, service_id)
```

#### user_season_ratings

Ratings for specific seasons.

```sql
id: uuid (PK)
user_id: uuid FK → users.id
season_id: uuid FK → seasons.id
rating: numeric
created_at: timestamp

UNIQUE (user_id, season_id)
```

### Row-Level Security (RLS)

All user-scoped tables have RLS policies enforcing:

```sql
-- Users can only read/write their own data
CREATE POLICY "Users can manage own data"
ON user_shows
FOR ALL
USING (user_id = auth.uid());
```

Applied to:

- `user_shows`
- `user_episode_progress`
- `user_streaming_subscriptions`
- `user_season_ratings`

### Entity Relationships

```
users (1) ←→ (N) user_shows ←→ (1) shows
users (1) ←→ (N) user_episode_progress ←→ (1) episodes
users (1) ←→ (N) user_streaming_subscriptions ←→ (1) streaming_services
users (1) ←→ (N) user_season_ratings ←→ (1) seasons

shows (1) ←→ (N) seasons ←→ (N) episodes
shows (1) ←→ (N) show_availability ←→ (1) streaming_services
```

---

## Development Principles

### iOS Development (from CLAUDE.md)

#### 1. Test-Driven Development (TDD)

- **ALWAYS write tests BEFORE implementation** - no exceptions
- Write a failing test that defines the desired functionality
- Implement minimal code to make the test pass
- Refactor while keeping tests green
- Use Swift Testing framework for all new tests
- Every feature MUST have test coverage before it's considered complete

#### 2. Idiomatic Swift/SwiftUI

- **Prefer idiomatic solutions over workarounds**
- After any initial implementation that works, ask: "Is this the most idiomatic way?"
- Use `@Observable` for state management (modern Swift pattern)
- Avoid state flags when computed properties will work
- No `DispatchQueue.asyncAfter` hacks - use proper SwiftUI lifecycle
- Trust SwiftUI's built-in behaviors (e.g., button tap protection)
- Follow Swift 6 strict concurrency - no detached tasks or polling loops
- Use structured concurrency with proper async/await patterns

#### 3. "Show Don't Tell" UI Design Pattern

When designing new UI features:

1. Create a throwaway demo file with 3-4 different visual approaches
2. Use fake/mock data - don't worry about DI or architecture yet
3. Add individual preview blocks for each approach
4. Review alternatives in Xcode canvas side-by-side
5. Iterate on the chosen design in the demo file
6. Only then integrate the final version into production with proper architecture

#### 4. Protocol-Based Dependency Injection

- Maintain testable architecture with protocol-based DI
- All external dependencies (API, persistence, etc.) should be protocols
- Example: `ApiClient` protocol → `LiveApiClient` / `MockApiClient`
- Makes testing trivial and keeps business logic pure

#### 5. Code Quality Standards

- Enum-based view state over boolean flags
- Computed properties over stored state when possible
- Pure business logic extracted to separate layers
- Every file should be independently testable

### Backend Development

#### 1. Type Safety

- All endpoints validate inputs with Zod schemas
- Shared types in `@tally/types` ensure consistency
- Runtime validation on all API boundaries

#### 2. Error Handling

- Consistent error shapes with proper HTTP status codes
- User-friendly error messages
- Detailed logging for debugging

#### 3. Security

- JWT-based authentication
- Row-Level Security (RLS) in database
- Never expose service-role keys to clients
- Rate limiting on all endpoints

#### 4. Testing

- Unit tests for business logic
- Integration tests for API endpoints
- Vitest + Supertest for backend testing

### BFF (Backend-For-Frontend) Decision Tree

**Does the operation need secrets, privileged logic, or cross-service orchestration?**
→ Go through **backend**

**Is it simple CRUD on user-owned rows with Row-Level Security fully enforced?**
→ Can go **direct to Supabase** from iOS

**Hybrid approach (recommended):**

- Reads that are safe under RLS → **direct to Supabase**
- Writes/privileged/business rules → **backend**
- Keep single source of truth for domain rules in backend

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and pnpm 9+
- **Xcode** 15+ with iOS 26 SDK (beta)
- **Supabase** account (or local Supabase CLI)
- **TMDB API Key** (for show metadata)

### Backend Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run migrations
pnpm --filter @tally/api run migrate

# Start development server
pnpm dev:api
```

Backend runs on `http://localhost:4000`

### iOS Setup

```bash
# Open Xcode project
open apps/ios/Tally/Tally.xcodeproj

# Configure base URL in Environment.swift
# Default: http://localhost:4000 (for Simulator)

# Build and run on Simulator (⌘R)
```

### Web Landing Setup (Optional)

```bash
# Start web dev server
pnpm dev:web
```

Web landing runs on `http://localhost:3000`

### Running Everything

```bash
# Run API + Web concurrently
pnpm dev

# With logging
pnpm dev:logged
```

### Testing

```bash
# Run all tests
pnpm test

# Backend unit tests only
pnpm test:unit

# Backend integration tests
pnpm test:integration

# TypeScript type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix

# Code formatting
pnpm format
```

---

## Key Features

### 1. Dashboard (iOS)

**Location**: `apps/ios/Tally/Features/Dashboard/`

The main home screen featuring:

- **HeroSection** - Streaming service logos header
- **LiquidGlassTicker** - Continuous scrolling news feed with:
  - Upcoming episode air dates
  - New releases on subscribed services
  - Subscription renewals
  - Trending content (e.g., "1,167 people are watching Chad Powers")
  - Deep-link navigation to shows/services
- **MetricsRow** - Total cost, show count summaries
- **Subscription List** - Active services with costs
- **Weekly Calendar** - Upcoming episodes grid

**Key Implementation Details:**

- Uses `@Observable` view model pattern
- Show repository for O(1) lookups
- Ticker items with priority-based sorting
- Derives subscriptions from watchlist providers
- Real-time data from TV Guide API

### 2. Search & Discovery (iOS)

**Location**: `apps/ios/Tally/Features/Search/`

Comprehensive show search with:

- Debounced search (400ms default)
- TMDB-powered results
- Expandable season/episode details
- Lazy episode loading (on-demand per season)
- Provider selection per show
- Add to watchlist with status selection
- Episode progress tracking
- Toast notifications for user actions

**Key Implementation Details:**

- Task-based cancellation for search debouncing
- Sophisticated task lifecycle management
- Country-aware searching
- `ExpandedSeason` helper for loaded state tracking

### 3. Watchlist Management (iOS)

**Location**: `apps/ios/Tally/Features/Watchlist/`

User's tracked shows with:

- Show status management (watchlist, watching, completed, dropped)
- Streaming service selection per show
- Buffer days configuration
- Progress tracking integration
- Visual indicators (provider logos, status badges)

### 4. Calendar View (iOS)

**Location**: `apps/ios/Tally/Features/SimplifiedCalendar/`

Weekly episode grid showing:

- Episodes grouped by provider
- Air dates and times
- Color-coded by streaming service
- Direct links to show details
- 60-day lookback window

### 5. Subscription Management (Backend)

**Location**: `apps/api/src/routes/users.ts`

Tracks user's streaming subscriptions:

- Monthly costs
- Active/inactive status
- Renewal dates
- Historical tracking
- Analytics on spending

### 6. TV Guide Integration (Backend)

**Location**: `apps/api/src/routes/tv-guide.ts`

Aggregates upcoming episodes:

- Fetches from TMDB API
- Filters by user's watchlist
- Groups by provider and show
- Handles date filtering
- Supports country-specific availability

### 7. Progress Tracking (Backend)

**Location**: `apps/api/src/routes/progress.ts`

Tracks viewing progress:

- Episode-level progress (percentage)
- Watch state (unwatched, watching, watched)
- Timestamps for watch history
- Episode and season ratings
- Statistics and analytics

### 8. Recommendations (Backend)

**Location**: `apps/api/src/routes/recommendations.ts`

Personalized show recommendations based on:

- User's watchlist and ratings
- Viewing patterns
- Popular shows on subscribed services
- Genre preferences
- Release patterns

---

## Current Branch Context

### Branch: `liquid-glass-ticker`

**Purpose**: Implementing the Liquid Glass Ticker feature

**Key Changes**:

1. Moved ticker documentation to `apps/ios/Tally/Docs/liquid-glass-ticker/`
2. Deleted redundant docs (`18_NEWS_TICKER.md`, `19_TICKER_ITEM_FORMAT.md` at root)
3. Organized ticker-related documentation in dedicated folder

**Unstaged Changes**:

```
D  apps/ios/Tally/Docs/18_NEWS_TICKER.md
D  apps/ios/Tally/Docs/19_TICKER_ITEM_FORMAT.md
R  apps/ios/Tally/Docs/Ticker/... → apps/ios/Tally/Docs/liquid-glass-ticker/...
?? apps/ios/Tally/Docs/liquid-glass-ticker/18_NEWS_TICKER.md
?? apps/ios/Tally/Docs/liquid-glass-ticker/19_TICKER_ITEM_FORMAT.md
```

**Recent Commits**:

```
d63b956 feat: ticker checkpoint #10 updated apple tv plus to apple tv
a324403 feat: ticker checkpoint #9 removed redundant provider tap
25826db feat: ticker checkpoint #8 adding clickthrough for providers
523b609 feat: ticker checkpoint #7 trying to implement chips
df8c04c feat: ticker checkpoint #6 trying new distinctions for tv and provider
```

**Ticker Implementation Status**:

- ✅ Continuous horizontal scroll animation
- ✅ Edge fade masks (tight 4% fade zones)
- ✅ Haptic feedback on tap
- ✅ Accessibility labels and hints
- ✅ 50pt/second scroll speed
- ✅ Seamless infinite loop with duplicate rows
- ✅ Glass effect styling
- ✅ Icon and chip conventions
- ✅ Deep-link handling for providers
- ✅ Integration between HeroSection and MetricsRow
- 🚧 Expanded drawer view (in progress)
- 🚧 Trending content with global stats
- 🚧 Real data from backend API

**Next Steps**:

1. Implement expanded ticker drawer
2. Wire up real ticker items from backend
3. Add trending content with anonymized stats
4. Polish animations and transitions
5. QA on device (light/dark mode, performance, VoiceOver)

---

## Additional Resources

### Documentation Files

- **Root CLAUDE.md**: `/Users/anguss/dev/tally/CLAUDE.md` - Overall project guidance
- **iOS CLAUDE.md**: `/Users/anguss/dev/tally/apps/ios/Tally/Docs/CLAUDE.md` - iOS-specific instructions
- **Database Schema**: `/Users/anguss/dev/tally/apps/api/docs/DATABASE_SCHEMA.md` - Full schema reference
- **API Documentation**: http://localhost:4000/docs (Swagger UI when running)
- **OpenAPI Spec**: http://localhost:4000/openapi.json

### External APIs

- **TMDB API**: https://developer.themoviedb.org/reference/intro/getting-started
- **JustWatch API**: (Internal integration)
- **Supabase Docs**: https://supabase.com/docs

### Development Tools

- **pnpm**: Package management for monorepo
- **Xcode**: iOS development and testing
- **Supabase CLI**: Local database management
- **Redocly**: OpenAPI spec linting and bundling
- **OpenAPI Generator**: Auto-generate API clients

---

## Best Practices Summary

### When Working on iOS:

1. Always write tests first (TDD)
2. Use `@Observable` for new view models
3. Follow protocol-based dependency injection
4. Leverage the design system (Colors, Spacing, Typography)
5. Target iOS 26 features
6. Use "Show Don't Tell" for UI design
7. Proper task lifecycle management
8. Idiomatic Swift/SwiftUI patterns

### When Working on Backend:

1. Validate all inputs with Zod schemas
2. Use consistent error handling
3. Enforce RLS for user data
4. Write integration tests for endpoints
5. Document OpenAPI specs
6. Follow BFF decision tree
7. Keep business logic in services layer
8. Never expose secrets to clients

### When Working Across Stack:

1. Use shared types from `@tally/types`
2. Keep API contracts in sync
3. Test integration points
4. Document breaking changes
5. Version API endpoints
6. Maintain backward compatibility
7. Use feature flags for gradual rollouts

---

**This document is maintained for AI assistants and developers working on the Tally project. Keep it updated as the project evolves.**
