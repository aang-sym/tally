#!/bin/bash

# Tally TMDB API Integration Testing Script
# Test TMDB integration for release pattern detection and watch providers

set -e

BASE_URL="http://localhost:3001"
AUTH_HEADER="Authorization: Bearer stub_token_testuser"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check quota status
check_quota() {
    echo -e "\n${BLUE}📊 Current Quota Status:${NC}"
    curl -s "$BASE_URL/api/streaming-quota" | \
    python3 -m json.tool 2>/dev/null || \
    curl -s "$BASE_URL/api/streaming-quota"
    echo
}

# Wait for user confirmation
confirm() {
    read -p "Press Enter to continue or Ctrl+C to stop..."
}

# Phase 1: Setup & Baseline
phase1_setup() {
    print_header "Phase 1: Setup & Baseline Testing"
    
    echo "🚀 Testing server connectivity..."
    if curl -s "$BASE_URL/api/health" > /dev/null; then
        print_success "Server is running"
    else
        print_error "Server is not running. Start it with: npm run dev"
        exit 1
    fi
    
    check_quota
    
    echo "📋 Make sure your .env has:"
    echo "   TMDB_API_READ_TOKEN=your_tmdb_read_token"
    echo "   TMDB_DEV_MODE=false"
    echo "   STREAMING_AVAILABILITY_API_KEY=your_rapidapi_key (for leaving soon detection)"
    echo
    confirm
}

# Phase 2: Single API Call Testing
phase2_single_call() {
    print_header "Phase 2: TMDB Integration Testing (2-4 TMDB calls expected)"
    
    print_warning "This will use TMDB API for release pattern detection and watch providers"
    confirm
    
    echo "🎬 Adding 'Stranger Things' to watchlist (with TMDB enhancement)..."
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "test-stranger-things",
            "title": "Stranger Things", 
            "serviceId": "netflix",
            "serviceName": "Netflix",
            "type": "series"
        }')
    
    echo "📤 Response with TMDB data:"
    echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('🎯 TMDB Integration Results:')
    if 'tmdbShowId' in data:
        print(f'   TMDB Show ID: {data[\"tmdbShowId\"]}')
    if 'detectedReleasePattern' in data:
        print(f'   Release Pattern: {data[\"detectedReleasePattern\"]}')
    if 'watchProviders' in data and data['watchProviders']:
        print(f'   Watch Providers: {len(data[\"watchProviders\"])} found')
        for provider in data['watchProviders'][:3]:  # Show first 3
            print(f'     • {provider[\"provider_name\"]}')
    print()
    print('Full Response:')
    print(json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
    
    check_quota
    
    echo "🔄 Testing TMDB caching - adding same item again..."
    curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "test-stranger-things-2",
            "title": "Stranger Things",
            "serviceId": "netflix", 
            "serviceName": "Netflix",
            "type": "series"
        }' > /dev/null
    
    print_success "Second request completed"
    check_quota
    
    echo "📊 If quota didn't increase, caching is working!"
    confirm
}

# Phase 3: Error & Edge Case Testing  
phase3_edge_cases() {
    print_header "Phase 3: Error & Edge Case Testing (2-4 more calls)"
    
    echo "🔍 Testing with non-existent show..."
    print_warning "This may consume 1-2 API calls"
    confirm
    
    curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "test-fake",
            "title": "This Show Definitely Does Not Exist 12345",
            "serviceId": "netflix",
            "serviceName": "Netflix", 
            "type": "series"
        }' > /dev/null
    
    check_quota
    
    echo "🧪 Testing refresh endpoint..."
    echo "📋 First, let's get the watchlist to find an item ID:"
    WATCHLIST=$(curl -s "$BASE_URL/api/watchlist" -H "$AUTH_HEADER")
    echo "$WATCHLIST" | python3 -m json.tool 2>/dev/null || echo "$WATCHLIST"
    
    echo -n "Enter an item ID from above to test refresh: "
    read ITEM_ID
    
    if [ -n "$ITEM_ID" ]; then
        print_warning "This will consume 1 API call"
        confirm
        
        echo "🔄 Refreshing item $ITEM_ID..."
        curl -s -X PUT "$BASE_URL/api/watchlist/$ITEM_ID/refresh" \
            -H "$AUTH_HEADER" | python3 -m json.tool 2>/dev/null || echo "Refresh completed"
        
        check_quota
    fi
}

# Phase 4: Integration Testing
phase4_integration() {
    print_header "Phase 4: Integration Testing"
    
    echo "📋 Testing watchlist retrieval..."
    WATCHLIST=$(curl -s "$BASE_URL/api/watchlist" -H "$AUTH_HEADER")
    echo "$WATCHLIST" | python3 -m json.tool 2>/dev/null || echo "$WATCHLIST"
    
    echo -e "\n🚨 Testing leaving soon endpoint..."
    curl -s "$BASE_URL/api/watchlist/leaving-soon" -H "$AUTH_HEADER" | \
        python3 -m json.tool 2>/dev/null || echo "No items leaving soon"
    
    echo -e "\n📅 Testing plan generation..."
    print_warning "This should use cached data, no API calls"
    PLAN=$(curl -s -X POST "$BASE_URL/api/plan/generate" -H "$AUTH_HEADER")
    echo "$PLAN" | python3 -m json.tool 2>/dev/null || echo "$PLAN"
    
    check_quota
    print_success "Integration testing complete"
}

# Phase 5: Quota Safety Testing
phase5_quota_safety() {
    print_header "Phase 5: Quota Safety Testing"
    
    echo "🧪 Let's test quota exhaustion protection..."
    echo "💡 Current quota status:"
    check_quota
    
    echo "⚙️  To test quota exhaustion:"
    echo "   1. Note your current 'callsUsed' number above"
    echo "   2. Set STREAMING_API_MONTHLY_LIMIT to (callsUsed + 1) in .env"
    echo "   3. Restart the server" 
    echo "   4. Try adding a new watchlist item"
    echo "   5. Should get 429 error about quota exhausted"
    echo
    echo "🔄 To reset quota for more testing:"
    echo "   curl -X POST $BASE_URL/api/streaming-quota/reset"
}

# Phase 6: Release Pattern Detection
phase6_release_pattern() {
    print_header "Phase 6: Release Pattern Detection"
    
    print_warning "This phase will analyze show release patterns using the dedicated analysis endpoint"
    echo "📊 This will test automatic detection of weekly vs binge release patterns"
    confirm
    
    echo "🎬 Testing pattern analysis endpoint with well-known shows..."
    
    # Test 1: Stranger Things (should be binge)
    echo "🍿 Testing Stranger Things (expected: binge)..."
    ST_ANALYSIS=$(curl -s -X POST "$BASE_URL/api/shows/analyze-pattern" \
        -H "$CONTENT_TYPE" \
        -d '{
            "title": "Stranger Things"
        }')
    
    echo "📤 Pattern analysis result:"
    echo "$ST_ANALYSIS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'releasePattern' in data and data['releasePattern']:
        pattern = data['releasePattern']
        print(f'🎯 Release Pattern Detected: {pattern[\"pattern\"]}')
        print(f'   Confidence: {pattern[\"confidence\"]}')
        if 'episodeInterval' in pattern:
            print(f'   Episode Interval: {pattern[\"episodeInterval\"]} days')
        if 'totalEpisodes' in pattern:
            print(f'   Total Episodes: {pattern[\"totalEpisodes\"]}')
        if 'diagnostics' in pattern and pattern['diagnostics']:
            diag = pattern['diagnostics']
            print(f'   Reasoning: {diag[\"reasoning\"]}')
            print(f'   Episode Intervals: {diag[\"intervals\"]} days')
            print(f'   Avg Interval: {diag[\"avgInterval\"]:.1f} days')
            print(f'   Std Deviation: {diag[\"stdDev\"]:.1f} days')
        print()
    else:
        print('⚠️ No releasePattern found in response!')
        print('   This indicates pattern detection failed or wasn\\'t triggered.')
        print()
    print('Full Response:')
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f'❌ JSON parsing failed: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"
    
    echo -e "\n📺 Testing The Boys (expected: weekly)..."
    BOYS_ANALYSIS=$(curl -s -X POST "$BASE_URL/api/shows/analyze-pattern" \
        -H "$CONTENT_TYPE" \
        -d '{
            "title": "The Boys"
        }')
    
    echo "📤 Pattern analysis result:"
    echo "$BOYS_ANALYSIS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'releasePattern' in data and data['releasePattern']:
        pattern = data['releasePattern']
        print(f'🎯 Release Pattern: {pattern[\"pattern\"]} (confidence: {pattern[\"confidence\"]})')
        if 'diagnostics' in pattern and pattern['diagnostics']:
            print(f'   Reasoning: {pattern[\"diagnostics\"][\"reasoning\"]}')
    else:
        print('⚠️ No pattern detected')
    print(f'📺 Title: {data.get(\"title\", \"N/A\")}')
except Exception as e:
    print(f'❌ Analysis failed: {e}')
"
    
    # Test traditional watchlist endpoint for comparison
    echo -e "\n🔄 Comparing with watchlist endpoint enhancement..."
    WATCHLIST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "comparison-test",
            "title": "House of the Dragon",
            "serviceId": "hbo",
            "serviceName": "HBO Max",
            "type": "series"
        }')
    
    echo "📤 Watchlist enhancement result:"
    echo "$WATCHLIST_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'detectedReleasePattern' in data:
        print(f'🎯 Detected Pattern: {data[\"detectedReleasePattern\"]}')
    if 'tmdbShowId' in data:
        print(f'   TMDB Show ID: {data[\"tmdbShowId\"]}')
    if 'watchProviders' in data and data['watchProviders']:
        print(f'   Watch Providers: {len(data[\"watchProviders\"])} found')
    print()
except Exception as e:
    print(f'❌ Failed to parse watchlist response: {e}')
"
    
    print_success "Release pattern detection testing complete!"
    echo "💡 Pattern Types:"
    echo "   • binge: All episodes ≤1 day apart"
    echo "   • weekly: 6-8 days average, low variance"
    echo "   • premiere_weekly: 2+ episodes day 1, then weekly"
    echo "   • multi_weekly: Multiple episodes every ~7 days consistently"
    echo "   • mixed: Irregular but identifiable pattern"
    echo "   • unknown: Truly irregular or insufficient data"
    echo
}

# Phase 6.5: Direct TMDB Testing and Dynamic Discovery
phase6_5_direct_tmdb() {
    print_header "Phase 6.5: Direct TMDB Testing and Dynamic Discovery"
    
    print_warning "This phase will test direct TMDB API calls and pattern discovery"
    echo "📊 This will discover current shows and analyze their patterns automatically"
    confirm
    
    echo "🏆 Testing TOP RATED shows discovery..."
    DISCOVERY_RESPONSE=$(curl -s "$BASE_URL/api/shows/discover-patterns?sampleSize=5")
    
    echo "📤 TOP RATED Discovery results:"
    echo "$DISCOVERY_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'success' in data and data['success']:
        report = data['report']
        print(f'🎯 TOP RATED Shows Analysis Summary:')
        print(f'   Total Analyzed: {report[\"totalAnalyzed\"]}')
        print(f'   Errors: {report[\"errors\"]}')
        print(f'   Pattern Distribution:')
        for pattern, count in report['patternDistribution'].items():
            if count > 0:
                print(f'     • {pattern}: {count} shows')
        
        stats = report['confidenceStats']
        print(f'   Confidence Stats: avg={stats[\"avg\"]:.2f}, min={stats[\"min\"]:.2f}, max={stats[\"max\"]:.2f}')
        
        print(f'\\n🎬 TOP RATED Shows Found and Analyzed:')
        for show in report['examples']:
            analyzed_season = show.get('analyzedSeason', 1)
            show_status = show.get('showStatus', 'Unknown')
            print(f'   🏆 \"{show[\"title\"]}\" (TMDB ID: {show[\"tmdbId\"]})')
            print(f'      • Total Seasons: {show[\"seasons\"]} | Analyzed Season {analyzed_season}: {show[\"episodesInSeason1\"]} episodes')
            print(f'      • Show Status: {show_status} | Pattern: {show[\"pattern\"]} (confidence: {show[\"confidence\"]:.2f})')
            print(f'      • Reasoning: {show[\"reasoning\"]}')
            print()
            
        # Show detailed info if available
        if 'detailedShows' in report and report['detailedShows']:
            print(f'\\n📺 Detailed Show Information:')
            for show in report['detailedShows'][:3]:  # Show first 3 in detail
                print(f'   🎬 \"{show[\"title\"]}\" (First aired: {show[\"firstAirDate\"]})')
                print(f'      Overview: {show[\"overview\"]}')
                print(f'      Total Seasons: {len(show[\"seasons\"])}')
                for season in show['seasons'][:3]:  # Show first 3 seasons
                    print(f'        - Season {season[\"seasonNumber\"]}: {season[\"episodeCount\"]} episodes (aired: {season[\"airDate\"]})')
                if show.get('season1Analysis'):
                    s1 = show['season1Analysis']
                    print(f'      Season 1 Pattern: {s1[\"pattern\"]} ({s1[\"confidence\"]:.2f} confidence)')
                print()
        print()
    else:
        print('⚠️ Discovery failed or TMDB unavailable')
        print(f'Message: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse discovery response: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"
    
    echo -e "\n🧪 Testing pattern validation with known shows..."
    VALIDATION_RESPONSE=$(curl -s "$BASE_URL/api/shows/validate-patterns")
    
    echo "📤 Validation results:"
    echo "$VALIDATION_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'success' in data and data['success']:
        validation = data['validation']
        print(f'🎯 Validation Results:')
        print(f'   Overall Accuracy: {data[\"accuracy\"]}')
        print(f'\\n🧪 Individual Test Cases:')
        for result in validation['validationResults']:
            status = '✅' if result['match'] else '❌'
            print(f'   {status} {result[\"title\"]}: Expected {result[\"expected\"]}, Got {result[\"detected\"]} (confidence: {result[\"confidence\"]:.2f})')
        print()
    else:
        print('⚠️ Validation failed or TMDB unavailable')
        print(f'Message: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse validation response: {e}')
"
    
    echo -e "\n🔍 Testing detailed diagnostics for a specific show..."
    echo -n "Enter a TMDB ID to analyze (or press Enter for default 66732 - Stranger Things): "
    read TMDB_ID
    
    if [ -z "$TMDB_ID" ]; then
        TMDB_ID=66732
    fi
    
    echo "🔬 Getting detailed diagnostics for TMDB ID: $TMDB_ID..."
    DIAGNOSTICS_RESPONSE=$(curl -s "$BASE_URL/api/shows/diagnostics/$TMDB_ID")
    
    echo "📤 Detailed diagnostics:"
    echo "$DIAGNOSTICS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'analysis' in data:
        analysis = data['analysis']
        print(f'🎯 Analysis for TMDB ID {data[\"tmdbId\"]} (Season {data[\"seasonNumber\"]}):')
        print(f'   Pattern: {analysis[\"pattern\"]} (confidence: {analysis[\"confidence\"]:.2f})')
        print(f'   Total Episodes: {analysis.get(\"totalEpisodes\", \"N/A\")}')
        
        if 'fullDiagnostics' in data and data['fullDiagnostics']:
            diag = data['fullDiagnostics']
            print(f'\\n🔬 Detailed Diagnostics:')
            print(f'   Reasoning: {diag[\"reasoning\"]}')
            print(f'   Episode Intervals: {diag[\"intervals\"]} days')
            print(f'   Average Interval: {diag[\"avgInterval\"]:.1f} days')
            print(f'   Standard Deviation: {diag[\"stdDev\"]:.1f} days')
            print(f'   Min/Max Intervals: {diag[\"minInterval\"]}/{diag[\"maxInterval\"]} days')
            if 'premiereEpisodes' in diag:
                print(f'   Premiere Episodes: {diag[\"premiereEpisodes\"]}')
                print(f'   Has Premiere Pattern: {diag.get(\"hasPremierePattern\", False)}')
                print(f'   Has Multi-Weekly Pattern: {diag.get(\"hasMultiWeeklyPattern\", False)}')
        print()
    else:
        print(f'⚠️ Analysis failed for TMDB ID {TMDB_ID}')
        print(f'Error: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse diagnostics response: {e}')
"
    
    print_success "Direct TMDB testing complete!"
    echo "💡 Use these endpoints for development and debugging:"
    echo "   • POST /api/shows/analyze-pattern - Analyze specific show by title or TMDB ID"
    echo "   • GET /api/shows/discover-patterns?sampleSize=N - Discover patterns in current shows"
    echo "   • GET /api/shows/validate-patterns - Test accuracy against known patterns"
    echo "   • GET /api/shows/diagnostics/:tmdbId - Get detailed pattern diagnostics"
    echo
}

# Phase 6.6: Popular Shows Discovery
phase6_6_popular_discovery() {
    print_header "Phase 6.6: Popular Shows Discovery"
    
    print_warning "This phase will discover and analyze POPULAR shows from TMDB"
    echo "📊 This will find trending/popular shows and analyze their release patterns"
    confirm
    
    echo "🔥 Testing POPULAR shows discovery..."
    POPULAR_RESPONSE=$(curl -s "$BASE_URL/api/shows/discover-popular?sampleSize=5")
    
    echo "📤 POPULAR Discovery results:"
    echo "$POPULAR_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'success' in data and data['success']:
        report = data['report']
        print(f'🎯 POPULAR Shows Analysis Summary:')
        print(f'   Total Analyzed: {report[\"totalAnalyzed\"]}')
        print(f'   Errors: {report[\"errors\"]}')
        print(f'   Pattern Distribution:')
        for pattern, count in report['patternDistribution'].items():
            if count > 0:
                print(f'     • {pattern}: {count} shows')
        
        stats = report['confidenceStats']
        print(f'   Confidence Stats: avg={stats[\"avg\"]:.2f}, min={stats[\"min\"]:.2f}, max={stats[\"max\"]:.2f}')
        
        print(f'\\n🎬 POPULAR Shows Found and Analyzed:')
        for show in report['examples']:
            analyzed_season = show.get('analyzedSeason', 1)
            show_status = show.get('showStatus', 'Unknown')
            print(f'   🔥 \"{show[\"title\"]}\" (TMDB ID: {show[\"tmdbId\"]})')
            print(f'      • Total Seasons: {show[\"seasons\"]} | Analyzed Season {analyzed_season}: {show[\"episodesInSeason1\"]} episodes')
            print(f'      • Show Status: {show_status} | Pattern: {show[\"pattern\"]} (confidence: {show[\"confidence\"]:.2f})')
            print(f'      • Reasoning: {show[\"reasoning\"]}')
            print()
            
        # Show detailed info if available
        if 'detailedShows' in report and report['detailedShows']:
            print(f'\\n📺 Detailed Show Information:')
            for show in report['detailedShows'][:3]:  # Show first 3 in detail
                print(f'   🎬 \"{show[\"title\"]}\" (First aired: {show[\"firstAirDate\"]})')
                print(f'      Overview: {show[\"overview\"]}')
                print(f'      Total Seasons: {len(show[\"seasons\"])}')
                for season in show['seasons'][:3]:  # Show first 3 seasons
                    print(f'        - Season {season[\"seasonNumber\"]}: {season[\"episodeCount\"]} episodes (aired: {season[\"airDate\"]})')
                if show.get('season1Analysis'):
                    s1 = show['season1Analysis']
                    print(f'      Season 1 Pattern: {s1[\"pattern\"]} ({s1[\"confidence\"]:.2f} confidence)')
                print()
        print()
    else:
        print('⚠️ Discovery failed or TMDB unavailable')
        print(f'Message: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse popular discovery response: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"
    
    print_success "Popular shows discovery complete!"
    echo "💡 This phase discovered actual popular shows from TMDB and analyzed their real release patterns."
    echo
}

# Phase 6.7: On-The-Air Shows Discovery (Current Season Analysis)
phase6_7_on_air_discovery() {
    print_header "Phase 6.7: On-The-Air Shows Discovery"
    
    print_warning "This phase will discover and analyze ON THE AIR shows from TMDB"
    echo "📊 This analyzes the MOST RECENT season of currently airing shows"
    echo "💡 Key insight: Currently airing shows analyze their latest season (like Summer I Turned Pretty S3)"
    confirm
    
    echo "📺 Testing ON THE AIR shows discovery..."
    ON_AIR_RESPONSE=$(curl -s "$BASE_URL/api/shows/discover-on-air?sampleSize=5")
    
    echo "📤 ON THE AIR Discovery results:"
    echo "$ON_AIR_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'success' in data and data['success']:
        report = data['report']
        print(f'🎯 ON THE AIR Shows Analysis Summary:')
        print(f'   Total Analyzed: {report[\"totalAnalyzed\"]}')
        print(f'   Errors: {report[\"errors\"]}')
        print(f'   Pattern Distribution:')
        for pattern, count in report['patternDistribution'].items():
            if count > 0:
                print(f'     • {pattern}: {count} shows')
        
        stats = report['confidenceStats']
        print(f'   Confidence Stats: avg={stats[\"avg\"]:.2f}, min={stats[\"min\"]:.2f}, max={stats[\"max\"]:.2f}')
        
        print(f'\\n🎬 CURRENTLY AIRING Shows Found and Analyzed:')
        for show in report['examples']:
            airing_status = '📡 AIRING' if show['isCurrentlyAiring'] else '✅ COMPLETE'
            print(f'   {airing_status} \"{show[\"title\"]}\" (TMDB ID: {show[\"tmdbId\"]})')
            print(f'      • Current Season: {show[\"currentSeason\"]} | Episodes: {show[\"episodesInCurrentSeason\"]}')
            print(f'      • Pattern: {show[\"pattern\"]} (confidence: {show[\"confidence\"]:.2f})')
            print(f'      • Reasoning: {show[\"reasoning\"]}')
            print()
            
        # Show detailed info if available
        if 'detailedShows' in report and report['detailedShows']:
            print(f'\\n📺 Detailed Currently Airing Show Information:')
            for show in report['detailedShows'][:3]:  # Show first 3 in detail
                print(f'   📡 \"{show[\"title\"]}\" ({show[\"airingStatus\"]})')
                print(f'      Status: {show[\"status\"]} | First Aired: {show[\"firstAirDate\"]}')
                if show.get('lastAirDate'):
                    print(f'      Last Aired: {show[\"lastAirDate\"]}')
                print(f'      Overview: {show[\"overview\"]}')
                print(f'      Total Seasons: {len(show[\"seasons\"])}')
                
                # Show all seasons for context
                for season in show['seasons']:
                    print(f'        - Season {season[\"seasonNumber\"]}: {season[\"episodeCount\"]} episodes (aired: {season[\"airDate\"]})')
                
                if show.get('currentSeasonAnalysis'):
                    current = show['currentSeasonAnalysis']
                    print(f'      🎯 Current Season {current[\"seasonNumber\"]} Analysis:')
                    print(f'         Pattern: {current[\"pattern\"]} ({current[\"confidence\"]:.2f} confidence)')
                    print(f'         Episodes: {current[\"totalEpisodes\"]} | Reasoning: {current[\"reasoning\"]}')
                print()
        print()
    else:
        print('⚠️ Discovery failed or TMDB unavailable')
        print(f'Message: {data.get(\"message\", \"Unknown error\")}')
except Exception as e:
    print(f'❌ Failed to parse on-air discovery response: {e}')
    print('Raw response:')
    print(sys.stdin.read())
"
    
    print_success "On-the-air shows discovery complete!"
    echo "💡 This phase analyzed the MOST RECENT season of currently airing shows."
    echo "   Currently airing shows often have weekly patterns for their current season."
    echo "   Completed shows can be binged since all episodes are available."
    echo
}

# Phase 7: Smart Window Planning
phase7_window_planning() {
    print_header "Phase 7: Smart Window Planning"
    
    print_warning "Testing subscription window optimization"
    confirm
    
    echo "📅 Adding shows with different patterns..."
    curl -s -X POST "$BASE_URL/api/watchlist/bulk" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "items": [
                {
                    "titleId": "tlou",
                    "title": "The Last of Us",
                    "serviceId": "hbo",
                    "serviceName": "HBO Max",
                    "rule": "weekly"
                },
                {
                    "titleId": "st5",
                    "title": "Stranger Things",
                    "serviceId": "netflix",
                    "serviceName": "Netflix",
                    "rule": "binge"
                },
                {
                    "titleId": "mandalorian",
                    "title": "The Mandalorian",
                    "serviceId": "disney",
                    "serviceName": "Disney+",
                    "rule": "weekly"
                }
            ]
        }' | python3 -m json.tool
    
    echo -e "\n📊 Generating optimized subscription plan..."
    curl -s -X POST "$BASE_URL/api/plan/optimize" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "preferences": {
                "maxSimultaneous": 2,
                "watchDelay": "P2D",
                "batchEpisodes": true
            }
        }' | python3 -m json.tool
    
    print_success "Window planning test complete"
}

# Phase 8: Departure Detection
phase8_departure_detection() {
    print_header "Phase 8: Departure Detection"
    
    print_warning "Testing content departure detection"
    confirm
    
    echo "🚨 Checking for titles leaving soon..."
    curl -s "$BASE_URL/api/watchlist/leaving-soon" \
        -H "$AUTH_HEADER" | python3 -m json.tool
    
    echo -e "\n⏰ Testing urgent watch recommendations..."
    curl -s "$BASE_URL/api/watchlist/urgent" \
        -H "$AUTH_HEADER" \
        -d '{
            "maxDays": 30,
            "excludeWatched": true
        }' | python3 -m json.tool
    
    print_success "Departure detection complete"
}

# Main menu
show_menu() {
    echo -e "\n${BLUE}🎬 Tally TMDB Integration Test Suite${NC}"
    echo "Choose a testing phase:"
    echo "1) Phase 1: Setup & Baseline (0 API calls)"
    echo "2) Phase 2: TMDB Integration Testing (2-4 TMDB calls)"
    echo "3) Phase 3: Edge Cases (2-4 calls)"
    echo "4) Phase 4: Integration Testing (cached)"
    echo "5) Phase 5: Quota Safety Testing (for Streaming API)"
    echo "6) Phase 6: Enhanced Pattern Detection (Direct API testing)"
    echo "7) Phase 6.5: Top Rated Shows Discovery (Live TMDB data)"
    echo "8) Phase 6.6: Popular Shows Discovery (Live TMDB data)"
    echo "9) Phase 6.7: On-The-Air Shows (Current Season Analysis)"
    echo "10) Phase 7: Smart Window Planning (with TMDB patterns)"
    echo "11) Phase 8: Departure Detection (Streaming API)"
    echo "q) Check Quota Status"
    echo "r) Reset Quota (dev only)"
    echo "c) Clear Cache"
    echo "x) Exit"
    echo
}

# Reset quota
reset_quota() {
    print_warning "Resetting quota (development only)..."
    curl -s -X POST "$BASE_URL/api/streaming-quota/reset" | \
        python3 -m json.tool 2>/dev/null || echo "Reset completed"
    check_quota
}

# Clear cache  
clear_cache() {
    echo "🧹 Clearing cache..."
    curl -s -X POST "$BASE_URL/api/streaming-quota/clear-cache" | \
        python3 -m json.tool 2>/dev/null || echo "Cache cleared"
    print_success "Cache cleared"
}

# Main script
main() {
    echo -e "${GREEN}🚀 Tally TMDB Integration Testing Script${NC}"
    echo "This script helps you test TMDB integration for release pattern detection"
    echo "and watch provider data, with fallback streaming API quota monitoring."
    echo
    
    while true; do
        show_menu
        read -p "Select option: " choice
        
        case $choice in
            1) phase1_setup ;;
            2) phase2_single_call ;;
            3) phase3_edge_cases ;;
            4) phase4_integration ;;
            5) phase5_quota_safety ;;
            6) phase6_release_pattern ;;
            7) phase6_5_direct_tmdb ;;
            8) phase6_6_popular_discovery ;;
            9) phase6_7_on_air_discovery ;;
            10) phase7_window_planning ;;
            11) phase8_departure_detection ;;
            q) check_quota ;;
            r) reset_quota ;;
            c) clear_cache ;;
            x) echo "👋 Happy testing!"; exit 0 ;;
            *) print_error "Invalid option. Please try again." ;;
        esac
    done
}

# Run main function
main