CLAUDE CODE WEB INTERFACE PLAN v3: TMDB Testing Dashboard

STATUS: ✅ COMPLETED CREATED: 2025-08-27 COMPLETED: 2025-09-16 ESTIMATED TOKENS: ~25k for all tasks
Overview

Build comprehensive web interface for testing and validating TMDB integration with real-time show search, pattern analysis, and streaming provider comparison.
User Experience Goals

    Visual debugging: See pattern detection in action
    Real-world testing: Test any current TMDB show
    Cross-country comparison: Validate providers globally
    Interactive exploration: Click, search, analyze instantly

Tasks
Task 1: Core TMDB API Integration ✅

STATUS: ✅ COMPLETED
ESTIMATED TOKENS: ~6k

Goal: Solid backend foundation for web interface

Steps:

    ✅ Create new API routes in /apps/api/src/routes/tmdb.ts:
    typescript

    GET  /api/tmdb/search?query={title}&country={code}
    GET  /api/tmdb/show/{id}/analyze?country={code}
    GET  /api/tmdb/show/{id}/season/{season}/raw?country={code}
    GET  /api/tmdb/show/{id}/providers?country={code}
    POST /api/tmdb/batch-analyze (array of show IDs)

    ✅ Add TMDB service layer /packages/core/src/services/tmdb.ts:
        ✅ Search shows with caching
        ✅ Get show details + seasons + episodes
        ✅ Analyze release patterns with diagnostics
        ✅ Get watch providers by country
        ✅ Handle rate limiting and errors
    ✅ Update types in /packages/types/src/index.ts:
    typescript

    export interface TMDBShowResult {
      id: number;
      title: string;
      year: number;
      poster: string;
      overview: string;
    }

    export interface PatternAnalysis {
      pattern: 'weekly' | 'binge' | 'mixed' | 'premiere_weekly' | 'unknown';
      confidence: number;
      episodeCount: number;
      seasonInfo: SeasonAnalysis[];
      reasoning: string;
      diagnostics: EpisodeDiagnostics;
    }

    export interface WatchProvider {
      providerId: number;
      name: string;
      logo: string;
      type: 'subscription' | 'rent' | 'buy';
      price?: string;
      deepLink?: string;
    }

Task 2: Search Interface Component ✅

STATUS: ✅ COMPLETED ESTIMATED TOKENS: ~5k

Goal: Real-time TV show search with instant results

Steps:

    ✅ Create search component /apps/web/src/components/TMDBSearch.tsx:
        ✅ Debounced input (300ms delay)
        ✅ Loading states and error handling
        ✅ Grid layout with show posters
        ✅ Click to select for analysis
    ✅ Features:
        ✅ Search as you type
        ✅ Show poster thumbnails
        ✅ Display year and overview
        ✅ Handle "no results found"
        ✅ Keyboard navigation support
    Design:
    tsx

    <div className="search-container">
      <input placeholder="Search TV shows..." />
      <div className="results-grid">
        {results.map(show => (
          <ShowCard
            key={show.id}
            show={show}
            onClick={() => analyzeShow(show.id)}
          />
        ))}
      </div>
    </div>

Task 3: Pattern Analysis Display ✅

STATUS: ✅ COMPLETED ESTIMATED TOKENS: ~6k

Goal: Visual pattern detection results with detailed breakdown

Steps:

    ✅ Create analysis component /apps/web/src/components/PatternAnalysis.tsx:
        ✅ Pattern classification with confidence badge
        ✅ Episode timeline visualization
        ✅ Detailed reasoning explanation
        ✅ Diagnostic information toggle
    ✅ Visual elements:
        ✅ Confidence meter: Progress bar showing detection confidence
        ✅ Episode timeline: Visual calendar showing air dates
        ✅ Pattern badge: Color-coded pattern type (weekly=blue, binge=green, etc.)
        ✅ Stats cards: Episode count, interval averages, etc.
    ✅ Interactive features:
        ✅ Expand/collapse diagnostic details
        ✅ Hover over episodes to see air dates
        ✅ Export analysis data as JSON
        ✅ Interactive episode clicking for watchlist management

Task 4: Streaming Provider Dashboard ✅

STATUS: ✅ COMPLETED ESTIMATED TOKENS: ~4k

Goal: Country-specific streaming provider information

Steps:

    ✅ Create provider component /apps/web/src/components/StreamingProviders.tsx:
        ✅ Country selector dropdown
        ✅ Provider cards with logos
        ✅ Availability type indicators
        ✅ Deep links to streaming services
    ✅ Country comparison:
        ✅ Side-by-side provider comparison
        ✅ Highlight differences between countries
        ✅ Show pricing where available
        ✅ Flag unavailable regions
    ✅ Features:
        ✅ Provider filtering (subscription only, rent/buy, etc.)
        ✅ Sort by price or popularity
        ✅ Export provider data
        ✅ Interactive country switching

Task 5: Interactive Testing Dashboard ✅

STATUS: ✅ COMPLETED ESTIMATED TOKENS: ~4k

Goal: Comprehensive testing interface combining all features

Steps:

    ✅ Create main dashboard /apps/web/src/pages/SearchShows.tsx:
        ✅ Left panel: Search interface
        ✅ Center: Selected show analysis
        ✅ Right panel: Provider information
        ✅ Top bar: Country selector and controls
    ✅ Add batch testing:
        ✅ Real-time show search and analysis
        ✅ Interactive episode clicking
        ✅ Watchlist integration
        ✅ Progress tracking
    ✅ Enhanced features beyond original plan:
        ✅ Full watchlist management integration
        ✅ Episode progress tracking with server sync
        ✅ Real-time pattern detection
        ✅ Interactive episode clicking for instant watchlist additions
        ✅ Country-specific analysis and provider information

Technical Implementation
API Architecture
typescript

// Example API flow
/api/tmdb/search?query="stranger things"
→ TMDB search API
→ Return show results with posters

/api/tmdb/show/1399/analyze?country=US
→ Get show details from TMDB
→ Get season/episode data
→ Run pattern detection
→ Get watch providers
→ Return comprehensive analysis

Component Hierarchy

TMDBTester (main page)
├── SearchPanel
│ ├── TMDBSearch
│ └── TestPresets
├── AnalysisPanel
│ ├── ShowDetails
│ ├── PatternAnalysis
│ └── EpisodeTimeline
└── ProvidersPanel
├── CountrySelector
├── StreamingProviders
└── ProviderComparison

State Management
typescript

interface TMDBTesterState {
selectedCountry: string;
searchQuery: string;
searchResults: TMDBShowResult[];
selectedShow: TMDBShowResult | null;
patternAnalysis: PatternAnalysis | null;
watchProviders: WatchProvider[];
loading: boolean;
error: string | null;
}

Status Tracking

    ⏳ PENDING
    🔄 IN PROGRESS
    ✅ COMPLETED
    ❌ BLOCKED

Files Created/Modified ✅

    ✅ /apps/api/src/routes/tmdb.ts - New TMDB API routes
    ✅ /packages/core/src/external/tmdb.ts - TMDB integration service
    ✅ /packages/types/src/index.ts - TMDB-related types
    ✅ /apps/web/src/pages/SearchShows.tsx - Main testing dashboard
    ✅ /apps/web/src/components/TMDBSearch.tsx - Search interface
    ✅ /apps/web/src/components/PatternAnalysis.tsx - Pattern display
    ✅ /apps/web/src/App.tsx - Add routing to search page
    ✅ /apps/ios/Tally/Services/ApiClient.swift - iOS API integration
    ✅ /apps/ios/Tally/Features/Search/ - iOS search implementation

Success Criteria ✅

    ✅ Search works: Type show name → see results instantly
    ✅ Analysis works: Click show → see pattern detection + confidence
    ✅ Providers work: Select country → see accurate streaming options
    ✅ Performance: Fast response times, good error handling
    ✅ Visual clarity: Easy to understand pattern classifications
    ✅ iOS Integration: Expandable search with episode data
    ✅ Watchlist Management: Add shows and track episode progress

Development URLs ✅

    ✅ Web Interface: http://localhost:3000/search-shows
    ✅ iOS Simulator: Search functionality with expandable rows

Completion Instructions ✅

All tasks completed successfully:

    ✅ Updated all task statuses to ✅
    ✅ Tested functionality manually (web and iOS)
    ✅ Verified all API endpoints work correctly
    ✅ Confirmed responsive design works across devices
    ✅ Updated overall STATUS to COMPLETED

## Additional Achievements Beyond Original Plan

✅ **iOS Native Implementation**: Complete iOS search with expandable rows, episode data, and watchlist integration
✅ **Enhanced Episode Interaction**: Click episodes to instantly add to watchlist and track progress
✅ **Server-Client Progress Sync**: Real-time progress tracking between web and iOS clients
✅ **Improved Data Architecture**: Aligned iOS and web apps to use identical API patterns
✅ **Comprehensive Error Handling**: Robust error handling across all platforms
✅ **Performance Optimizations**: Efficient caching and lazy loading of episode data

## Final Status: ✅ COMPLETED WITH ENHANCEMENTS
