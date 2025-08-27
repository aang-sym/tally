CLAUDE CODE PLAN v1: TMDB Integration

STATUS: ✅ COMPLETED CREATED: 2025-08-27 COMPLETED: 2025-08-27 TOKENS USED: ~15k
Overview

Replace Streaming Availability API with TMDB API for release pattern detection and watch provider data. TMDB has episode air dates + watch providers by country.
Tasks
Task 1: TMDB Episode Release Pattern Detection ✅

STATUS: ✅ COMPLETED 2025-08-27 Goal: Detect weekly vs binge patterns from episode air dates

Steps:

    Read TMDB docs: https://developer.themoviedb.org/docs/getting-started
    Focus on TV endpoints: /search/tv, /tv/{id}, /tv/{id}/season/{season_number}
    Replace /packages/core/src/index.ts mock functions with real TMDB calls
    Implement detectReleasePatternFromTMDB(showTitle, tmdbApiKey):
        Search show by title
        Get latest season episodes with air_date
        Calculate day intervals between episodes
        Return pattern: 'weekly' (6-8 days avg), 'binge' (≤1 day), 'irregular'
    Update /apps/api/src/routes/watchlist.ts to use real detection
    Add TMDB_API_READ_TOKEN to .env.example

Task 2: TMDB Watch Providers Integration ✅

STATUS: ✅ COMPLETED 2025-08-27 Goal: Replace Streaming Availability API with TMDB watch providers (keep SA only for "leaving soon")

Steps:

    Check TMDB docs for /tv/{id}/watch/providers endpoint
    Replace streaming service logic in /packages/core/src/index.ts:
        Remove hardcoded STREAMING_SERVICES
        Add getWatchProvidersFromTMDB(showId, country)
        Return providers with logos, links, subscription types from "flatrate" key
    Update watchlist API to use TMDB providers instead of mock data
    Add user country preference to user schema
    Keep minimal Streaming Availability integration only for expiring content

Task 3: Update API Responses ✅

STATUS: ✅ COMPLETED 2025-08-27 Goal: Ensure watchlist responses include real TMDB data

Steps:

    Modify CreateWatchlistItemSchema in /packages/types/src/index.ts:
        Add optional tmdbId, releasePattern, watchProviders
    Update /apps/api/src/routes/watchlist.ts POST endpoint:
        Call TMDB APIs when adding items
        Store pattern + provider data
    Update /apps/api/src/routes/plan.ts:
        Use real release patterns for window generation
        Base timing on actual episode schedules

Technical Details

TMDB API Key: Add TMDB_API_READ_TOKEN (Bearer token) to environment variables Rate Limits: 40 requests per 10 seconds (much better than Streaming Availability) Data Flow:

    User adds show → Search TMDB → Get show ID → Fetch season data → Detect pattern → Store enhanced data

Testing Strategy

    Test with known shows: "The Last of Us" (weekly), "Stranger Things" (binge)
    Verify watch providers for different countries
    Check pattern detection accuracy with recent seasons

Status Tracking

    ⏳ PENDING
    🔄 IN PROGRESS
    ✅ COMPLETED
    ❌ BLOCKED

Completion Instructions

When a task is completed:

    Update task status to ✅
    Add completion date
    Note any deviations from plan
    Update overall STATUS when all tasks done

Files to Modify

    /packages/core/src/index.ts - Core TMDB integration
    /packages/types/src/index.ts - Add TMDB fields to schemas
    /apps/api/src/routes/watchlist.ts - Use TMDB in watchlist endpoints
    /apps/api/src/routes/plan.ts - Generate plans from real patterns
    .env.example - Add TMDB_API_READ_TOKEN
    /scripts/test-streaming-api.sh - Update to test TMDB instead of Streaming Availability API

