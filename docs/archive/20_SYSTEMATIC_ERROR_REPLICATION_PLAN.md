# 20. Systematic Error Replication & Fix Plan

## Objective

Replicate the exact user flow that produces watchlist errors, implement fixes, and verify complete resolution through identical replication.

## Error Replication Process

### Phase 1: Exact Error Replication

**Goal**: Reproduce the exact same errors the user is experiencing

#### Step 1: Reset Environment to Known State

- [ ] Clear browser cache/localStorage
- [ ] Ensure both API (port 4000) and Frontend (port 3002) are running
- [ ] Check API logs are clean

#### Step 2: Execute Exact User Flow

**User Flow to Replicate:**

1. Navigate to http://localhost:3002
2. Go to Search page
3. Search for "alien"
4. Click on "Alien: Earth" (or first search result)
5. Observe any React console errors
6. Try to add the show to watchlist
7. Document EXACT errors that occur

#### Step 3: Document All Errors

**Track these specific error types:**

- [ ] React rendering errors (`Objects are not valid as a React child`)
- [ ] API request failures (400, 500 status codes)
- [ ] Watchlist addition failures ("service returned null")
- [ ] Database constraint errors (PGRST301)
- [ ] Console JavaScript errors
- [ ] Network request failures

### Phase 2: Root Cause Analysis

Using the documented errors from Phase 1, identify:

- [ ] Which API endpoints are being called
- [ ] What data structures are being sent/received
- [ ] Where the data flow breaks
- [ ] What component is throwing the error

### Phase 3: Systematic Fix Implementation

- [ ] Fix one error at a time
- [ ] Test each fix with exact replication
- [ ] Only proceed to next error when current one is 100% resolved

### Phase 4: Complete End-to-End Verification

**Success Criteria:**

- [ ] No React console errors when clicking shows
- [ ] Pattern analysis displays properly
- [ ] "Add to Watchlist" button works
- [ ] Show appears in user's watchlist
- [ ] No API errors in server logs
- [ ] Complete flow works from search → select → add → verify

## Detailed Replication Script

### Environment Setup Check

```bash
# Terminal 1: API Server Status
curl -s http://localhost:4000/api/health | head -20

# Terminal 2: Frontend Status
curl -s http://localhost:3002 | head -10

# Check browser console is clear
# Check no existing localStorage auth tokens
```

### Exact User Actions to Replicate

1. **Browser Setup**
   - Open Chrome/Firefox
   - Clear all site data for localhost:3002
   - Open Developer Tools (F12) → Console tab
   - Note: Clean console state

2. **User Registration/Login**
   - Navigate to http://localhost:3002
   - If no user exists: Create new user account
   - If user exists: Log in
   - Verify authentication state

3. **Search Flow**
   - Click "Search" or navigate to search page
   - Type "alien" in search box
   - Wait for search results to load
   - **Document any errors in console**

4. **Show Selection**
   - Click on first search result ("Alien: Earth" or similar)
   - **CRITICAL: Document exact errors that appear**
   - Note timing of errors (immediate vs after loading)
   - Screenshot error messages if needed

5. **Watchlist Addition**
   - Click "Add to Watchlist" or "Start Watching" button
   - **Document exact API call being made**
   - **Document exact error response**
   - **Document exact error message shown to user**

### Error Documentation Template

For each error found:

```
ERROR #X:
Type: [React/API/Network/Database]
When: [Specific user action that triggers it]
Message: [Exact error message]
Location: [Component/File/Line if known]
API Call: [If applicable - endpoint, method, payload]
Response: [If applicable - status code, response body]
Browser: [Chrome/Firefox/etc.]
```

## Tools for Investigation

### Browser Developer Tools

- **Console**: React errors, JavaScript errors
- **Network**: API calls, responses, status codes
- **Application**: localStorage, session data

### API Server Monitoring

```bash
# Monitor API logs in real-time
cd apps/api && npx tsx src/server.ts | tee api-debug.log

# In separate terminal, filter for errors
tail -f api-debug.log | grep -E "(Error|Failed|CRITICAL|500|400)"
```

### Database Query Monitoring

```bash
# Check for database constraint violations
# Monitor for PGRST301 errors
tail -f api-debug.log | grep "PGRST301"
```

### Code Analysis with Gemini

If needed, use Gemini CLI to analyze:

- Watchlist data flow
- API endpoint implementations
- React component error boundaries
- Data structure mismatches

```bash
gemini -p "@apps/web/src/pages/SearchShows.tsx @apps/web/src/components/PatternAnalysis.tsx @apps/api/src/routes/watchlist-v2.ts @apps/api/src/services/WatchlistService.ts Analyze the complete data flow from clicking a show in search results to adding it to watchlist. Identify where errors could occur and what data structure mismatches exist."
```

## Success Verification Checklist

### ✅ Final Verification (Must All Pass)

- [ ] User can search for shows without errors
- [ ] User can click on search results without React errors
- [ ] Pattern analysis displays correctly with proper data
- [ ] "Add to Watchlist" button is functional
- [ ] Show successfully adds to watchlist (API returns 201)
- [ ] Show appears in "My Shows" page
- [ ] No errors in browser console throughout entire flow
- [ ] No errors in API server logs throughout entire flow
- [ ] User can repeat the flow multiple times without issues

### ✅ Regression Testing

After fixes are complete, test these scenarios:

- [ ] Different shows (not just "Alien: Earth")
- [ ] Different user accounts
- [ ] Multiple shows in sequence
- [ ] Browser refresh and retry
- [ ] Different browsers if possible

## Implementation Notes

- **DO NOT** assume previous fixes worked
- **DO NOT** skip any replication steps
- **DO NOT** proceed until each error is 100% resolved
- **DOCUMENT** every error found, even small ones
- **TEST** each fix with identical user flow
- **VERIFY** complete end-to-end functionality before marking complete

## Expected Outcome

By following this systematic process:

1. All watchlist errors will be identified and documented
2. Each error will be fixed individually and verified
3. The complete user flow will work flawlessly
4. Future regressions can be caught by repeating this exact process

**Status: READY TO EXECUTE**  
**Next Action: Begin Phase 1 - Exact Error Replication**
