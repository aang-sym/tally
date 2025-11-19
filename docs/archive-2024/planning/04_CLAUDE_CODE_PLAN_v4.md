# CLAUDE CODE WATCHLIST PLAN v4: Personal Tracking & Smart Recommendations

**STATUS**: PENDING
**CREATED**: 2025-08-27
**ESTIMATED TOKENS**: ~65k for all tasks

## Task Priority

**Phase 1 (Core Database & Watchlist)**: Tasks 1-5 (~32k tokens)
**Phase 2 (Calendar & Optimization)**: Tasks 6-8 (~23k tokens)
**Phase 3 (Polish & Advanced Features)**: Remaining tasks (~10k tokens)

## Overview

Build comprehensive watchlist and watching tracking system with PostgreSQL backend, episode-level progress tracking, and intelligent subscription optimization recommendations.

## Database Schema Questions

## Database Schema (Updated)

### Core Tables

```sql
-- Users (extends existing)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) DEFAULT 'US',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shows (TMDB data cache with TTL)
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  overview TEXT,
  poster_path VARCHAR(500),
  first_air_date DATE,
  last_air_date DATE,
  status VARCHAR(50), -- 'Airing', 'Ended', 'Cancelled'
  total_seasons INTEGER,
  total_episodes INTEGER,
  release_pattern JSONB, -- Pattern analysis results
  tmdb_last_updated TIMESTAMP DEFAULT NOW(), -- For cache TTL
  is_popular BOOLEAN DEFAULT FALSE, -- For background refresh priority
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seasons
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  tmdb_season_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  name VARCHAR(500),
  overview TEXT,
  air_date DATE,
  episode_count INTEGER,
  poster_path VARCHAR(500),
  UNIQUE(show_id, season_number)
);

-- Episodes
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  tmdb_episode_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name VARCHAR(500),
  overview TEXT,
  air_date DATE,
  runtime INTEGER, -- minutes from TMDB
  UNIQUE(season_id, episode_number)
);

-- User Show Tracking
CREATE TABLE user_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'watchlist', 'watching', 'completed', 'dropped'
  added_at TIMESTAMP DEFAULT NOW(),
  started_watching_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_episode_watched_id UUID REFERENCES episodes(id),
  show_rating DECIMAL(3,1) CHECK (show_rating >= 0 AND show_rating <= 10), -- 0.0-10.0
  notes TEXT,
  UNIQUE(user_id, show_id)
);

-- Episode Watch Progress (Updated)
CREATE TABLE user_episode_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'unwatched', -- 'unwatched', 'watching', 'watched'
  started_watching_at TIMESTAMP, -- When marked as 'watching'
  watched_at TIMESTAMP, -- When marked as 'watched'
  episode_rating DECIMAL(3,1) CHECK (episode_rating >= 0 AND episode_rating <= 10),
  UNIQUE(user_id, episode_id)
);

-- Season Ratings
CREATE TABLE user_season_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Streaming Services & Providers (unchanged)
CREATE TABLE streaming_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_provider_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo_path VARCHAR(500),
  homepage VARCHAR(500)
);

-- Show Availability (unchanged)
CREATE TABLE show_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  availability_type VARCHAR(20) NOT NULL, -- 'subscription', 'rent', 'buy'
  price_amount DECIMAL(10,2),
  price_currency VARCHAR(3),
  deep_link TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(show_id, service_id, country_code, availability_type)
);
```

## Tasks

### Task 1: Supabase Database Setup & Schema ⏳

**STATUS**: PENDING  
**ESTIMATED TOKENS**: ~7k

**Goal**: Set up Supabase PostgreSQL database with proper schema and caching

**Steps**:

1. **Add Supabase dependencies**:
   - Add `@supabase/supabase-js` to package.json
   - Create Supabase client configuration
   - Add environment variables for Supabase connection

2. **Database connection service** `/apps/api/src/db/supabase.ts`:

   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.SUPABASE_URL!;
   const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseServiceKey);
   ```

3. **Create all database tables** (schema above) via Supabase SQL editor
4. **Set up Row Level Security (RLS)** policies for user data protection
5. **Create database inspection endpoints**:
   - `GET /api/admin/db-status` - Table counts and health
   - `GET /api/admin/live-stats` - Current "watching" episode counts

**Supabase Setup Instructions for You**:

- Create new Supabase project
- Get project URL and service role key
- Run provided SQL migrations
- Configure environment variables

### Task 2: Core Data Models & Services ⏳

**STATUS**: PENDING
**ESTIMATED TOKENS**: ~8k

**Goal**: Data access layer for all watchlist functionality

**Steps**:

1. **Create data access layer** `/apps/api/src/services/`:
   - `ShowService` - TMDB data caching and retrieval
   - `WatchlistService` - User show tracking operations
   - `EpisodeProgressService` - Episode watch progress
   - `StreamingService` - Provider availability data

2. **TMDB caching with TTL**:

   ```typescript
   // Smart cache refresh logic
   shouldRefreshShow(show: Show): boolean {
     const hoursSinceUpdate = (Date.now() - show.tmdb_last_updated) / (1000 * 60 * 60);

     // Refresh ended shows every 7 days
     if (show.status === 'Ended') return hoursSinceUpdate > 168;

     // Refresh airing shows every 6 hours
     if (show.status === 'Airing') return hoursSinceUpdate > 6;

     // Refresh popular shows daily (background job)
     if (show.is_popular) return hoursSinceUpdate > 24;

     return hoursSinceUpdate > 48; // Default: 2 days
   }
   ```

3. **Background refresh system**:
   - Daily job to refresh popular/trending shows
   - Refresh on search if cache is stale
   - Mark frequently searched shows as "popular"

4. **Episode status management**:

   ```typescript
   markEpisodeWatching(userId: string, episodeId: string): Promise<void>
   markEpisodeWatched(userId: string, episodeId: string): Promise<void>

   // Auto-mark as watched after episode duration + 30min buffer
   scheduleAutoComplete(userId: string, episodeId: string): void

   // Live stats queries
   getCurrentlyWatchingCount(episodeId: string): Promise<number>
   getCurrentlyWatchingCount(showId: string): Promise<number>
   ```

5. **Rating system**:

   ```typescript
   rateShow(userId: string, showId: string, rating: number): Promise<void>
   rateSeason(userId: string, seasonId: string, rating: number): Promise<void>
   rateEpisode(userId: string, episodeId: string, rating: number): Promise<void>

   getAggregateRating(showId: string): Promise<{ avg: number, count: number }>
   ```

### Task 3: Enhanced API Endpoints ⏳

**STATUS**: PENDING
**ESTIMATED TOKENS**: ~7k

**Goal**: RESTful API for watchlist and progress tracking

**Steps**:

1. **Watchlist management endpoints**:

   ```typescript
   GET / api / watchlist / { userId }; // Get user's watchlist
   POST / api / watchlist; // Add show to watchlist
   PUT / api / watchlist / { id } / status; // Move between watchlist/watching
   DELETE / api / watchlist / { id }; // Remove from lists

   GET / api / watching / { userId }; // Get currently watching shows
   GET / api / watching / { userId } / { showId }; // Get detailed watch progress
   ```

2. **Episode progress endpoints**:

   ```typescript
   GET / api / progress / { userId } / { showId }; // Get show watch progress
   POST / api / progress / episode / { episodeId } / watching; // Mark episode as watching
   POST / api / progress / episode / { episodeId } / watched; // Mark episode as watched
   POST / api / progress / bulk - update; // Mark multiple episodes

   // Live stats endpoints
   GET / api / stats / episode / { episodeId } / watching; // Count currently watching
   GET / api / stats / show / { showId } / watching; // Count watching show
   ```

3. **Rating endpoints**:

   ```typescript
   POST / api / ratings / show / { showId }; // Rate show (0.0-10.0)
   POST / api / ratings / season / { seasonId }; // Rate season
   POST / api / ratings / episode / { episodeId }; // Rate episode
   GET / api / ratings / show / { showId } / aggregate; // Get average rating
   ```

4. **Smart recommendations endpoints**:
   ```typescript
   GET / api / recommendations / { userId } / cancel; // Subscription cancellation suggestions
   GET / api / recommendations / { userId } / subscribe; // What to subscribe to next
   GET / api / recommendations / { userId } / optimization; // Full subscription optimization
   ```

### Task 4: Watchlist/Watching UI Components ⏳

**STATUS**: PENDING
**ESTIMATED TOKENS**: ~8k

**Goal**: User interface for managing personal show lists

**Steps**:

1. **Create watchlist page** `/apps/web/src/pages/MyShows.tsx`:
   - Tabbed interface: "Watchlist" | "Currently Watching" | "Completed"
   - Show cards with poster, title, progress info
   - Drag-and-drop reordering (priority)
   - Quick actions: Move to watching, mark episodes, remove

2. **Show detail modal** `/apps/web/src/components/ShowDetailModal.tsx`:
   - Full show info with seasons/episodes list
   - Episode checkboxes for marking watched
   - Progress indicators per season
   - Notes section for personal thoughts

3. **Quick-add functionality**:
   - Add "+" button to search results in TMDB tester
   - Modal for choosing: "Add to Watchlist" or "Start Watching"
   - Season selector for multi-season shows

4. **Episode status indicators**:
   - ⚪ Unwatched
   - 🔵 Currently watching (with live count: "1.2k watching now")
   - ✅ Watched
   - ⭐ Rated episodes with star indicators

5. **Live stats display**:
   ```tsx
   // Show live viewing stats
   '🔥 1,247 people are watching this episode right now';
   '📺 856 people watched this episode today';
   '⭐ 8.4/10 average rating from users';
   ```

### Task 5: Smart Recommendations Engine ⏳

**STATUS**: PENDING
**ESTIMATED TOKENS**: ~6k

**Goal**: Intelligent subscription optimization suggestions

**Steps**:

1. **Cancellation suggestion logic**:

   ```typescript
   analyzeCancellationOpportunity(userId: string, serviceId: string) {
     // Check currently watching shows on service
     // Check watchlist shows on service with air dates
     // Calculate gap between finishing current show and next premiere
     // Return recommendation with reasoning
   }
   ```

2. **Subscription optimization**:
   - Identify months with no content to watch
   - Calculate potential savings from strategic cancellations
   - Suggest optimal subscription calendar
   - Account for user's watch pace (episodes per week)

3. **Recommendation UI** `/apps/web/src/components/RecommendationCard.tsx`:

   ```tsx
   // Example recommendations
   'You finished The Last of Us on HBO Max. Cancel until Oct 15 when House of the Dragon returns. Save: $47.97';

   'You have 3 Netflix shows in your watchlist but nothing currently watching. Consider pausing Netflix subscription.';

   "Based on your watching pace, you'll finish Stranger Things in 2 weeks. Perfect time to start The Crown before your next billing cycle.";
   ```

## Subscription Optimization Dashboard

### Visual Components:

1. **Savings Calendar**: Month-by-month view showing:
   - Green months: "Keep subscription" (active shows)
   - Red months: "Cancel subscription" (no content)
   - Yellow months: "Consider canceling" (light content)

2. **Service Health Cards**:

   ```
   Netflix - $15.99/month
   ✅ Currently Watching: 2 shows
   📋 Watchlist: 5 shows
   💰 Next safe cancel: After Dec 15
   💡 Potential savings: $31.98 (2 months)
   ```

3. **Optimization Timeline**:
   - Visual timeline showing when to cancel/resubscribe
   - Drag to adjust dates and see savings impact
   - Export to calendar app

## Anonymous Usage Stats

Add simple analytics without user tracking:

```typescript
// Show popularity indicators
'🔥 1.2k users are watching this on Netflix';
'📈 Popular on HBO Max this week';
'⭐ Highly rated by users who finished it';
```

### Task 6: Calendar Views & Subscription Optimization ⏳

**STATUS**: PENDING
**ESTIMATED TOKENS**: ~10k

**Goal**: Visual calendar interfaces for subscription planning and optimization

**Steps**:

1. **Create calendar components** `/apps/web/src/components/calendar/`:

   ```tsx
   // Base calendar component
   CalendarView.tsx;
   CalendarDay.tsx;
   ServiceBar.tsx;

   // Specific calendar views
   OverviewCalendar.tsx; // Multi-service overview
   ProviderCalendar.tsx; // Single provider detailed view
   SavingsCalendar.tsx; // Financial optimization view
   PersonalSchedule.tsx; // User's specific shows timeline
   ReleaseTimeline.tsx; // Horizontal timeline of premieres
   ```

2. **Overview Calendar** (Multi-Service):
   - **Visual**: Service logos as colored bars filling calendar days
   - **Color coding**: Netflix red, HBO purple, Disney+ blue, etc.
   - **Bar intensity**: Full bars (heavy usage), half bars (light), dotted (planned)
   - **Interactions**: Hover for show details, click for day breakdown

3. **Provider Calendar** (Single Service):
   - **Detailed view**: One service at a time with episode air dates
   - **Show thumbnails**: Mini posters for premieres
   - **Episode markers**: Dots for regular episodes, stars for season finales
   - **Your shows**: Highlighted shows from your watchlist/watching

4. **Savings Calendar** 💰:
   - **Green days**: Active subscriptions with content you're watching
   - **Red days**: Paying for unused services (waste indicator)
   - **Yellow days**: Light usage, consider pausing
   - **Monthly totals**: "Save $47.97 by following recommendations"

5. **Personal Schedule Calendar** 📺:
   - **Your specific shows**: Only shows in your watchlist/watching
   - **Viewing pace**: Estimated completion dates based on your habits
   - **Episode tracking**: Visual progress bars per show
   - **Recommendations**: "Finish Stranger Things by Jan 15 to cancel Netflix"

6. **Release Timeline** (Horizontal):
   - **Timeline view**: Shows major premieres across all services
   - **Season arcs**: Visual bars showing show start/end dates
   - **Gap identification**: Clear periods with no content for cancellation

**Calendar Data Architecture**:

```typescript
interface CalendarData {
  date: string;
  activeServices: {
    serviceId: string;
    intensity: number; // 0-1 (content density)
    userShows: UserShow[]; // Your specific shows
    allShows: Show[]; // All shows airing
    cost: number; // Daily cost allocation
  }[];
  savings: {
    currentCost: number;
    optimizedCost: number;
    potential: number;
  };
  recommendations: CalendarRecommendation[];
}

interface CalendarRecommendation {
  type: 'cancel' | 'subscribe' | 'pause';
  service: StreamingService;
  date: string;
  reason: string;
  savings: number;
}
```

- `/apps/api/src/db/supabase.ts` - Supabase connection and client
- `/apps/api/src/services/ShowService.ts` - Show data with smart caching
- `/apps/api/src/services/WatchlistService.ts` - Watchlist operations
- `/apps/api/src/services/EpisodeService.ts` - Episode status and auto-completion
- `/apps/api/src/services/RatingService.ts` - Rating system
- `/apps/api/src/routes/watchlist.ts` - Enhanced watchlist API
- `/apps/api/src/routes/progress.ts` - Episode progress and live stats API
- `/apps/api/src/routes/ratings.ts` - Rating API endpoints
- `/apps/api/src/routes/recommendations.ts` - Smart recommendations
- `/apps/web/src/pages/MyShows.tsx` - Personal shows dashboard
- `/apps/web/src/components/ShowDetailModal.tsx` - Detailed show view with ratings
- `/apps/web/src/components/EpisodeGrid.tsx` - Episode status grid with live stats
- `/apps/web/src/components/RecommendationCard.tsx` - Optimization suggestions
- `/packages/types/src/index.ts` - Database and API types
- `.env.example` - Add Supabase environment variables

## Supabase Setup Guide

When ready to implement, I'll provide step-by-step instructions for:

1. Creating Supabase project
2. Setting up database schema
3. Configuring environment variables
4. Setting up Row Level Security policies
