#!/bin/bash

# Tally Streaming API Testing Script
# Safely test the Streaming Availability API with quota monitoring

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
    echo "   STREAMING_AVAILABILITY_API_KEY=your_rapidapi_key"
    echo "   STREAMING_API_MONTHLY_LIMIT=20"
    echo "   STREAMING_API_DEV_MODE=false"
    echo
    confirm
}

# Phase 2: Single API Call Testing
phase2_single_call() {
    print_header "Phase 2: Single API Call Testing (2-4 calls expected)"
    
    print_warning "This will consume 2 API calls (search + availability check)"
    confirm
    
    echo "🎬 Adding 'Stranger Things' to watchlist..."
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
    
    echo "📤 Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    
    check_quota
    
    echo "🔄 Testing cache - adding same item again (should use cache)..."
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
    
    print_warning "This phase will analyze show release patterns (4-6 API calls)"
    echo "📊 This will test automatic detection of weekly vs binge release patterns"
    confirm
    
    echo "🎬 Testing well-known weekly show (The Last of Us)..."
    echo "Expected: Weekly release pattern with ~7 day intervals"
    TLOU_RESPONSE=$(curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "tlou-test",
            "title": "The Last of Us",
            "serviceId": "hbo",
            "serviceName": "HBO Max",
            "type": "series"
        }')
    
    echo "📤 Response with release pattern analysis:"
    echo "$TLOU_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'releasePattern' in data:
        pattern = data['releasePattern']
        print(f'🎯 Release Pattern Detected: {pattern[\"pattern\"]}')
        print(f'   Confidence: {pattern[\"confidence\"]}')
        if 'episodeInterval' in pattern:
            print(f'   Episode Interval: {pattern[\"episodeInterval\"]} days')
        if 'totalEpisodes' in pattern:
            print(f'   Total Episodes: {pattern[\"totalEpisodes\"]}')
        print()
    print('Full Response:')
    print(json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
    
    check_quota
    
    echo -e "\n🍿 Testing well-known binge show (Stranger Things)..."
    echo "Expected: Binge release pattern (same-day releases)"
    ST_RESPONSE=$(curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "st-test",
            "title": "Stranger Things",
            "serviceId": "netflix",
            "serviceName": "Netflix",
            "type": "series"
        }')
    
    echo "📤 Response with release pattern analysis:"
    echo "$ST_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'releasePattern' in data:
        pattern = data['releasePattern']
        print(f'🎯 Release Pattern Detected: {pattern[\"pattern\"]}')
        print(f'   Confidence: {pattern[\"confidence\"]}')
        if 'episodeInterval' in pattern:
            print(f'   Episode Interval: {pattern[\"episodeInterval\"]} days')
        if 'totalEpisodes' in pattern:
            print(f'   Total Episodes: {pattern[\"totalEpisodes\"]}')
        print()
    else:
        print('⚠️  No release pattern detected in response')
    print('Full Response:')
    print(json.dumps(data, indent=2))
except:
    print(sys.stdin.read())
"
    
    check_quota
    
    echo -e "\n🔄 Testing another weekly show (Wednesday)..."
    echo "Expected: Weekly release pattern"
    WED_RESPONSE=$(curl -s -X POST "$BASE_URL/api/watchlist" \
        -H "$AUTH_HEADER" \
        -H "$CONTENT_TYPE" \
        -d '{
            "titleId": "wednesday-test",
            "title": "Wednesday",
            "serviceId": "netflix",
            "serviceName": "Netflix",
            "type": "series"
        }')
    
    echo "📤 Response summary:"
    echo "$WED_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'releasePattern' in data:
        pattern = data['releasePattern']
        print(f'🎯 Pattern: {pattern[\"pattern\"]} (confidence: {pattern[\"confidence\"]})')
    else:
        print('⚠️  No pattern detected')
    print(f'📺 Title: {data.get(\"title\", \"N/A\")}')
    print(f'📍 Service: {data.get(\"serviceName\", \"N/A\")}')
except:
    print('Could not parse response')
"
    
    check_quota
    
    print_success "Release pattern detection testing complete!"
    echo "💡 Summary:"
    echo "   • Weekly shows should show pattern='weekly' with ~7 day intervals"
    echo "   • Binge shows should show pattern='binge' with same-day releases"
    echo "   • Unknown patterns indicate insufficient episode data or irregular release schedule"
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
    echo -e "\n${BLUE}🎬 Tally Streaming API Test Suite${NC}"
    echo "Choose a testing phase:"
    echo "1) Phase 1: Setup & Baseline (0 API calls)"
    echo "2) Phase 2: Single Call Testing (2-4 calls)"
    echo "3) Phase 3: Edge Cases (2-4 calls)"
    echo "4) Phase 4: Integration Testing (cached)"
    echo "5) Phase 5: Quota Safety Testing"
    echo "6) Phase 6: Release Pattern Detection (4-6 calls)"
    echo "7) Phase 7: Smart Window Planning (with pattern analysis)"
    echo "8) Phase 8: Departure Detection"
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
    echo -e "${GREEN}🚀 Tally Streaming API Testing Script${NC}"
    echo "This script helps you safely test the real Streaming Availability API"
    echo "while monitoring quota usage in real-time."
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
            7) phase7_window_planning ;;
            8) phase8_departure_detection ;;
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