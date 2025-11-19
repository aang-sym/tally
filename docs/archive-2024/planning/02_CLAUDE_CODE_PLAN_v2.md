CLAUDE CODE FIX PLAN v2: TMDB Release Pattern Improvements

STATUS: PENDING CREATED: 2025-08-27 ESTIMATED TOKENS: ~37k for all tasks
Task Priority

Phase 1 (Core Fixes): Tasks 1-6 (~17k tokens) Phase 2 (Web Interface): Tasks 7-10 (~20k tokens)
Overview

Fix existing TMDB integration issues with release pattern detection and improve accuracy for mixed/complex release schedules.
Current Issues Identified

    scripts/test-streaming-api.sh only tests local API, not direct TMDB calls
    Release pattern logic too strict - mixed schedules classified as "unknown"
    Test data incorrect (Wednesday labeled as weekly when it's binge)
    Missing comprehensive pattern detection for complex release schedules

Tasks
Task 1: Fix Release Pattern Detection Logic ⏳

STATUS: PENDING
ESTIMATED TOKENS: ~4k

Goal: Improve pattern detection to handle mixed/complex schedules

Steps:

    Update /packages/core/src/services/release-pattern.ts
    Add new pattern types: mixed, premiere_weekly, multi_weekly
    Implement smarter detection logic:
        Check for premiere patterns (2+ episodes on day 1, then weekly)
        Detect multi-episode weekly drops (2 episodes every 7 days)
        Handle season finale patterns (longer gaps before final episode)
        Use episode count and timing variance for better classification
    Add confidence scoring based on pattern consistency
    Update tests to cover new patterns

New Classification Rules:

    binge: All episodes ≤1 day apart
    weekly: 6-8 days average, low variance (<2 days std dev)
    premiere_weekly: 2+ episodes day 1, then 6-8 day intervals
    multi_weekly: Multiple episodes every ~7 days consistently
    mixed: Irregular but identifiable pattern (premieres + gaps)
    unknown: Truly irregular or insufficient data

Task 2: Add Dynamic Pattern Discovery Testing ⏳

STATUS: PENDING ESTIMATED TOKENS: ~3k

Goal: Create comprehensive test suite using live TMDB data

Steps:

    Create new test functions in /packages/core/src/services/release-pattern.ts:
        discoverCurrentShows() - Get airing and popular shows
        analyzeShowPattern() - Detect pattern for any TMDB show ID
        generatePatternReport() - Statistical analysis of pattern distribution
    Update test suite to validate against real current shows:
        Sample 10-20 shows from "now airing"
        Sample 10-20 shows from "popular"
        Analyze their actual release patterns
        Verify classification accuracy
    Add pattern validation logic:
        Cross-reference with known release schedules where possible
        Flag edge cases and unusual patterns for review
        Generate confidence metrics for classifications
    Research and document actual release patterns for reference shows:
        Keep static test cases for regression testing
        But prioritize dynamic discovery for comprehensive validation

Task 3: Enhance TMDB Direct Testing with Dynamic Show Discovery ⏳

STATUS: PENDING ESTIMATED TOKENS: ~4k

Goal: Add comprehensive TMDB testing using real current data

Steps:

    Update scripts/test-streaming-api.sh to include direct TMDB calls
    Add new test phases:
        Phase 1: Get "Now Airing" shows from /tv/airing_today and /tv/on_the_air
        Phase 2: Get "Popular Now" shows from /tv/popular
        Phase 3: For each discovered show, fetch season/episode data dynamically
        Phase 4: Analyze episode air dates and detect patterns automatically
        Phase 5: Compare pattern detection results across different show types
        Phase 6: Test watch providers for discovered shows
    Add automatic pattern validation:
        Classify detected patterns into expected categories
        Flag shows with interesting/unusual patterns for manual review
        Generate pattern distribution statistics (% weekly vs binge vs mixed)
    Add rate limiting and error handling for TMDB calls
    Cache discovered show data to avoid re-fetching in same session

Task 4: Improve Error Handling and Diagnostics ⏳

STATUS: PENDING ESTIMATED TOKENS: ~2k

Goal: Better debugging and error reporting for pattern detection

Steps:

    Add detailed logging to release pattern detection
    Include episode air dates in response for debugging
    Add diagnostic info:
        Episode intervals array
        Pattern confidence scores
        Reasoning for classification decisions
    Update API responses to include diagnostic data in development mode

Task 5: Update Environment Configuration ⏳

STATUS: PENDING ESTIMATED TOKENS: ~1k

Goal: Fix .env.example and ensure proper TMDB configuration

Steps:

    Update .env.example with correct TMDB_API_READ_TOKEN format
    Add validation for TMDB token format in startup
    Add fallback handling when TMDB is unavailable
    Document rate limits and usage recommendations

Technical Details

Pattern Detection Algorithm:
typescript

// New enhanced detection logic
function detectReleasePattern(episodes: Episode[]): PatternResult {
const intervals = calculateIntervals(episodes);
const stats = calculateStats(intervals);

// Check for binge (all within 1 day)
if (stats.max <= 1) return { pattern: 'binge', confidence: 0.95 };

// Check for premiere pattern (2+ episodes day 1, then weekly)
if (hasPremierePattern(episodes)) return { pattern: 'premiere_weekly', confidence: 0.9 };

// Check for consistent weekly (6-8 days, low variance)
if (stats.avg >= 6 && stats.avg <= 8 && stats.stdDev < 2) {
return { pattern: 'weekly', confidence: 0.85 };
}

// Check for multi-episode weekly (multiple eps every ~7 days)
if (hasMultiWeeklyPattern(episodes)) return { pattern: 'multi_weekly', confidence: 0.8 };

// Additional mixed patterns...
}

Testing Strategy:

    Dynamic Discovery: Use TMDB's /tv/airing_today, /tv/on_the_air, and /tv/popular endpoints
    Real-time Analysis: Analyze current shows' actual episode release patterns
    Pattern Distribution: Generate statistics on pattern types found in the wild
    Validation: Cross-check pattern detection against known release schedules
    Edge Case Discovery: Automatically identify unusual patterns for further analysis

TMDB Endpoints for Dynamic Testing:
bash

# Get currently airing shows

GET /tv/airing_today
GET /tv/on_the_air

# Get popular shows

GET /tv/popular

# For each show discovered:

GET /tv/{show_id} # Get show details
GET /tv/{show_id}/season/{season_number} # Get episode air dates
GET /tv/{show_id}/watch/providers # Test watch providers

Status Tracking

    ⏳ PENDING
    🔄 IN PROGRESS
    ✅ COMPLETED
    ❌ BLOCKED

Task 6: Fix Test Script Pattern Detection and Debugging ⏳

STATUS: PENDING ESTIMATED TOKENS: ~2k

Goal: Ensure test script properly triggers and debugs pattern detection

Steps:

    Improve Python JSON parser in scripts/test-streaming-api.sh:
    python

    import sys, json
    try:
        data = json.load(sys.stdin)
        if 'releasePattern' in data and data['releasePattern']:
            pattern = data['releasePattern']
            print(f'🎯 Release Pattern Detected: {pattern["pattern"]}')
            print(f'   Confidence: {pattern["confidence"]}')
            if 'episodeInterval' in pattern:
                print(f'   Episode Interval: {pattern["episodeInterval"]} days')
            if 'totalEpisodes' in pattern:
                print(f'   Total Episodes: {pattern["totalEpisodes"]}')
            print()
        else:
            print('⚠️ No releasePattern found in response!')
            print('   This indicates pattern detection failed or wasn\'t triggered.')
            print()
        print('Full Response:')
        print(json.dumps(data, indent=2))
    except Exception as e:
        print(f'❌ JSON parsing failed: {e}')
        print('Raw response:')
        print(sys.stdin.read())

    Add dedicated pattern detection endpoint:
        Create /api/shows/analyze-pattern endpoint
        Takes { "title": "Show Name" } or { "tmdbId": 12345 }
        Returns detailed pattern analysis with diagnostics
        Always triggers fresh TMDB lookup and pattern detection
    Update test script to use multiple endpoints:
        Test both watchlist creation AND pattern analysis
        Compare results between endpoints
        Use pattern analysis endpoint for reliable pattern testing
    Add direct TMDB testing phase:
        Test pattern detection without going through local API
        Call TMDB directly and analyze patterns in the script
        Compare direct TMDB results vs local API results

    /packages/core/src/services/release-pattern.ts - Enhanced detection logic
    /packages/types/src/index.ts - Add new pattern types and diagnostic fields
    /scripts/test-streaming-api.sh - Fix test data and add TMDB direct testing
    .env.example - Correct TMDB token format
    /apps/api/src/routes/watchlist.ts - Add diagnostic mode support

Completion Instructions

When each task is completed:

    Update task status to ✅
    Add completion date
    Test with actual TMDB data
    Verify all test cases pass
    Update overall STATUS when all tasks done
