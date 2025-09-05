#!/bin/bash
# Test UI Flow - Simulate Frontend Watchlist Addition
# 
# Replicates the exact API call that the frontend makes when adding
# Peacemaker (TMDB ID 110492) to watchlist, including authentication

echo "🎭 Testing UI Flow - Frontend Watchlist Addition Simulation..."
echo ""

# Valid JWT token (properly signed with JWT_SECRET)
TEST_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMzY4Njk3My1iYTYwLTQ0MDUtODUyNS1mOGQ2YjNkY2I3ZmMiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJkaXNwbGF5TmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc1NzA0NTEyNCwiZXhwIjoxNzU3MTMxNTI0fQ.s3h5d7uqikw_vwYoZ2jlKOQhPYTFdHcMV9Kq2ekb-rc"

echo "📱 Step 1: Simulating frontend API call..."
echo "   Target: POST http://localhost:3001/api/watchlist-v2"
echo "   User ID: b3686973-ba60-4405-8525-f8d6b3dcb7fc"
echo "   TMDB ID: 110492 (Peacemaker)"
echo "   Status: watching"
echo ""

echo "🚀 Making API request with detailed logging..."
echo ""

# Make the API call with verbose output
curl -v \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "User-Agent: Test-UI-Flow/1.0" \
  -d '{"tmdbId": 110492, "status": "watching"}' \
  http://localhost:3001/api/watchlist-v2

echo ""
echo ""
echo "✅ API call completed. Check the server logs above for detailed execution trace."
echo "   Look for the 🎬, 🔧, 📝, 🎭 emoji prefixes in the logs to trace the flow."