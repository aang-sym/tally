#!/bin/bash

# Simple quota monitoring script for Tally API
# Usage: ./scripts/quota-monitor.sh [watch]

BASE_URL="http://localhost:3001"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m' 
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

get_quota_status() {
    curl -s "$BASE_URL/api/streaming-quota" 2>/dev/null || echo '{"error": "Server not running"}'
}

format_quota() {
    local response="$1"
    
    # Check if server is running
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ Server not running${NC}"
        return 1
    fi
    
    # Extract values using basic parsing (works without jq)
    local calls_used=$(echo "$response" | grep -o '"callsUsed":[0-9]*' | cut -d':' -f2)
    local calls_remaining=$(echo "$response" | grep -o '"callsRemaining":[0-9]*' | cut -d':' -f2) 
    local limit=$(echo "$response" | grep -o '"limit":[0-9]*' | cut -d':' -f2)
    local percent=$(echo "$response" | grep -o '"percentUsed":[0-9.]*' | cut -d':' -f2)
    local is_low_quota=$(echo "$response" | grep -o '"isLowQuota":[a-z]*' | cut -d':' -f2)
    local dev_mode=$(echo "$response" | grep -o '"devMode":[a-z]*' | cut -d':' -f2)
    local has_api_key=$(echo "$response" | grep -o '"hasApiKey":[a-z]*' | cut -d':' -f2)
    
    # Format output
    echo -e "${BLUE}📊 Quota Status${NC}"
    echo -e "   Used: ${calls_used}/${limit} calls (${percent}%)"
    echo -e "   Remaining: ${calls_remaining} calls"
    
    if [ "$dev_mode" = "true" ]; then
        echo -e "   Mode: ${YELLOW}Development (mocked)${NC}"
    elif [ "$has_api_key" = "false" ]; then
        echo -e "   Mode: ${YELLOW}No API key${NC}"
    else
        echo -e "   Mode: ${GREEN}Production${NC}"
    fi
    
    if [ "$is_low_quota" = "true" ]; then
        echo -e "   ${RED}⚠️  LOW QUOTA WARNING${NC}"
    fi
}

show_usage() {
    echo "Usage: $0 [watch|reset|clear-cache]"
    echo ""
    echo "Options:"
    echo "  (no args)    Show current quota status"
    echo "  watch        Continuously monitor quota (Ctrl+C to stop)"  
    echo "  reset        Reset quota to 0 (development only)"
    echo "  clear-cache  Clear the API response cache"
    echo ""
    echo "Examples:"
    echo "  ./scripts/quota-monitor.sh           # Check quota once"
    echo "  ./scripts/quota-monitor.sh watch     # Monitor continuously"
}

watch_quota() {
    echo -e "${BLUE}📈 Watching quota status... (Press Ctrl+C to stop)${NC}\n"
    
    while true; do
        clear
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        format_quota "$(get_quota_status)"
        echo ""
        echo "Refreshing every 5 seconds..."
        sleep 5
    done
}

reset_quota() {
    echo "🔄 Resetting quota..."
    local response=$(curl -s -X POST "$BASE_URL/api/streaming-quota/reset" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Quota reset successfully${NC}"
    else
        echo -e "${RED}❌ Failed to reset quota${NC}"
        echo "$response"
    fi
}

clear_cache() {
    echo "🧹 Clearing cache..."
    local response=$(curl -s -X POST "$BASE_URL/api/streaming-quota/clear-cache" 2>/dev/null)
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ Cache cleared successfully${NC}"
    else
        echo -e "${RED}❌ Failed to clear cache${NC}"
        echo "$response"
    fi
}

# Main script
case "${1:-status}" in
    "status"|"")
        format_quota "$(get_quota_status)"
        ;;
    "watch")
        watch_quota
        ;;
    "reset")
        reset_quota
        ;;
    "clear-cache")
        clear_cache
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
esac