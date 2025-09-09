# My Shows and Calendar Features - Critical Failure Diagnostic Plan

## Executive Summary

This document provides a comprehensive diagnostic analysis and implementation roadmap for fixing critical failures in the My Shows and Calendar features. The issues stem from missing API routes, data structure mismatches, and endpoint configuration problems.

## 1) Diagnosis

### Root Cause Analysis

#### My Shows Feature Failures

**Primary Issue: Missing API Routes**
- **Provider Selection (404)**: [`PUT /api/watchlist-v2/{id}/provider`](apps/api/src/routes/watchlist-v2.ts) route does not exist
- **Country Selection (404)**: [`PUT /api/watchlist-v2/{id}/country`](apps/api/src/routes/watchlist-v2.ts) route does not exist  
- **Rating (404)**: [`PUT /api/watchlist-v2/{id}/rating`](apps/api/src/routes/watchlist-v2.ts:283) exists but may have parameter validation issues

**Secondary Issue: Data Structure Mismatch**
- **Episodes Loading Error**: [`MyShows.tsx:357`](apps/web/src/pages/MyShows.tsx:357) expects `progressData.data.seasons[seasonNumber]` but API returns `progressData.data.showProgress`
- **Show Counter**: Stats calculation may not be aggregating correctly from database

**Evidence:**
```typescript
// MyShows.tsx:357 - Expected but incorrect structure
storedProgress = progressData.data.seasons[seasonNumber] || [];

// Actual API response from watchlist-v2.ts:646
res.json({ success: true, data: { showProgress } });
```

#### Calendar Feature Failures

**Primary Issue: Database/RLS Policy Error**
- **Subscriptions 500 Error**: [`GET /api/users/{userId}/subscriptions`](apps/api/src/routes/users.ts:587) returns 500, likely due to RLS policy or foreign key constraint issues

**Evidence:**
- Route exists and is properly authenticated
- Error suggests database-level constraint violation rather than application logic failure

### API Versioning Issues

The [`watchlist-v2`](apps/api/src/routes/watchlist-v2.ts) routes are incomplete compared to frontend expectations. Missing routes:
- `PUT /api/watchlist-v2/{id}/provider`
- `PUT /api/watchlist-v2/{id}/country` 
- `PUT /api/watchlist-v2/{id}/buffer` (used in MyShows.tsx)

## 2) Fix Plan (Phased Approach)

### Phase A: Contracts and Routing (Priority: Critical)
**Objective**: Add missing API routes and fix existing route parameters

**Tasks:**
- Add [`PUT /api/watchlist-v2/{id}/provider`](apps/api/src/routes/watchlist-v2.ts) route
- Add [`PUT /api/watchlist-v2/{id}/country`](apps/api/src/routes/watchlist-v2.ts) route  
- Add [`PUT /api/watchlist-v2/{id}/buffer`](apps/api/src/routes/watchlist-v2.ts) route
- Fix [`PUT /api/watchlist-v2/{id}/rating`](apps/api/src/routes/watchlist-v2.ts:283) validation

**Database Changes:**
- Add `streaming_provider_id`, `country_code`, `buffer_days` columns to [`user_shows`] table if missing
- Ensure foreign key relationships are properly configured

### Phase B: Episodes and Progress (Priority: High)
**Objective**: Standardize response payload structure

**Tasks:**
- Update [`MyShows.tsx:357`](apps/web/src/pages/MyShows.tsx:357) to use correct API response structure
- Add type guards for API response validation
- Implement graceful fallbacks for missing data

**Changes:**
```typescript
// Fix data access pattern in MyShows.tsx
if (progressResponse.ok) {
  const progressData = await progressResponse.json();
  storedProgress = progressData.data.showProgress?.filter(
    progress => progress.seasonNumber === seasonNumber
  ) || [];
}
```

### Phase C: Show Counter (Priority: Medium)
**Objective**: Implement accurate backend aggregate counting

**Tasks:**
- Review [`WatchlistService.getUserWatchlistStats()`](apps/api/src/services/WatchlistService.ts) implementation
- Ensure database queries properly count across user_shows table
- Add caching for expensive count operations

### Phase D: Calendar Subscriptions (Priority: High)
**Objective**: Fix 500 error in user subscriptions endpoint

**Tasks:**
- Investigate RLS policies on [`user_streaming_subscriptions`] table
- Check foreign key constraints on [`streaming_services`] reference
- Add proper error handling and logging to [`users.ts:587`](apps/api/src/routes/users.ts:587)

### Phase E: Regression Surface (Priority: Low)
**Objective**: Identify and verify affected features

**Tasks:**
- Test all watchlist operations (add, remove, update status)
- Verify episode progress tracking across different shows
- Validate calendar data loading with various user subscription states

## 3) Schema and Migrations

### Required Database Changes

```sql
-- Add missing columns to user_shows table
ALTER TABLE user_shows 
ADD COLUMN IF NOT EXISTS streaming_provider_id integer,
ADD COLUMN IF NOT EXISTS country_code varchar(2),
ADD COLUMN IF NOT EXISTS buffer_days integer DEFAULT 0;

-- Add foreign key constraint for streaming provider
ALTER TABLE user_shows 
ADD CONSTRAINT fk_user_shows_streaming_provider 
FOREIGN KEY (streaming_provider_id) REFERENCES streaming_services(id);

-- Ensure RLS policies are correct for user_streaming_subscriptions
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON user_streaming_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON user_streaming_subscriptions
    FOR ALL USING (auth.uid() = user_id);
```

### Migration File: `010_fix_my_shows_and_calendar.sql`
- Add missing columns to user_shows
- Fix RLS policies for subscriptions
- Add indexes for performance

## 4) Tests

### Backend Unit Tests
**File:** `apps/api/src/routes/watchlist-v2.test.ts`
- Test new provider/country/buffer endpoints
- Validate request/response schemas
- Test authentication and authorization

### Integration Tests  
**File:** `apps/api/src/integration/my-shows.test.ts`
- End-to-end watchlist operations
- Episode progress tracking
- Calendar subscription loading

### UI Tests
**File:** `apps/web/src/pages/MyShows.test.tsx`
- Provider selection dropdown functionality
- Country selector behavior
- Episode progress UI updates
- Error handling for failed API calls

## 5) Acceptance Criteria

### My Shows Feature
- [ ] Provider selection saves without 404 error
- [ ] Country selection saves without 404 error  
- [ ] Show counter displays accurate total (not 0)
- [ ] Episodes load and display progress correctly
- [ ] Rating system functions without 404 error
- [ ] Episode progress marks as watched/unwatched properly

### Calendar Feature
- [ ] User subscriptions load without 500 error
- [ ] Calendar displays active subscriptions
- [ ] Overview calendar shows user data when available
- [ ] Savings calendar calculates costs correctly

### System Integration
- [ ] All My Shows data integrates properly with Calendar
- [ ] Performance remains acceptable (<2s page load)
- [ ] No console errors during normal operation

## 6) Manual Verification Commands

### Test My Shows API Endpoints
```bash
# Test provider update (currently fails with 404)
curl -X PUT http://localhost:4000/api/watchlist-v2/SHOW_ID/provider \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"provider":{"id":1,"name":"Netflix","logo_path":"..."}}'

# Test country update (currently fails with 404)  
curl -X PUT http://localhost:4000/api/watchlist-v2/SHOW_ID/country \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"countryCode":"US"}'

# Test rating update (should work but currently fails)
curl -X PUT http://localhost:4000/api/watchlist-v2/SHOW_ID/rating \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":8.5}'

# Test episode progress (should work)
curl -X PUT http://localhost:4000/api/watchlist-v2/TMDB_ID/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seasonNumber":1,"episodeNumber":3,"status":"watched"}'
```

### Test Calendar API Endpoints
```bash
# Test user subscriptions (currently returns 500)
curl -X GET http://localhost:4000/api/users/USER_ID/subscriptions \
  -H "Authorization: Bearer $TOKEN"

# Test watchlist stats (for show counter)
curl -X GET http://localhost:4000/api/watchlist-v2/stats \
  -H "Authorization: Bearer $TOKEN"
```

## 7) Risk and Rollback

### Implementation Risks
- **Database Schema Changes**: Adding columns requires careful migration with proper defaults
- **API Breaking Changes**: New routes should not affect existing functionality
- **RLS Policy Updates**: Could temporarily break access if misconfigured

### Rollback Strategy
- **Phase A**: Remove new routes, restore original watchlist-v2.ts
- **Phase B**: Revert MyShows.tsx data access patterns  
- **Phase C**: Restore original stats calculation logic
- **Phase D**: Restore original RLS policies for subscriptions

### Monitoring
- Monitor 404/500 error rates on My Shows and Calendar pages
- Track API response times for watchlist endpoints
- Alert on authentication failures or database constraint violations

## 8) Implementation Log

### Phase A: Routes and Contracts ✅ READY
**Estimated Time:** 4 hours
**Dependencies:** None
**Files to Modify:**
- [`apps/api/src/routes/watchlist-v2.ts`](apps/api/src/routes/watchlist-v2.ts)
- [`apps/api/src/services/WatchlistService.ts`](apps/api/src/services/WatchlistService.ts)

### Phase B: Data Structure Fixes ✅ READY  
**Estimated Time:** 2 hours
**Dependencies:** None
**Files to Modify:**
- [`apps/web/src/pages/MyShows.tsx`](apps/web/src/pages/MyShows.tsx)

### Phase C: Show Counter ⏳ REQUIRES INVESTIGATION
**Estimated Time:** 3 hours  
**Dependencies:** Database schema verification
**Files to Modify:**
- [`apps/api/src/services/WatchlistService.ts`](apps/api/src/services/WatchlistService.ts)

### Phase D: Calendar Subscriptions ⏳ REQUIRES INVESTIGATION
**Estimated Time:** 3 hours
**Dependencies:** RLS policy review
**Files to Modify:**
- [`apps/api/src/routes/users.ts`](apps/api/src/routes/users.ts)
- Database migration for RLS policies

---

**Total Estimated Implementation Time:** 12 hours
**Priority Order:** Phase A → Phase B → Phase D → Phase C → Phase E
**Success Metrics:** 0 404/500 errors on My Shows and Calendar pages, accurate show counts, working episode progress tracking
