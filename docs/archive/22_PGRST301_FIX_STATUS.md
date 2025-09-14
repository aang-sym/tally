# 22. PGRST301 Fix Status - Comprehensive Report

## Problem Summary

**Issue**: Users cannot add shows to watchlist due to persistent **PGRST301 "No suitable key or wrong key type"** error during foreign key validation, despite multiple fix attempts.

**Current Status**: ❌ **STILL BROKEN** - Error persists after applying complete RLS policy fixes

---

## Changes Made So Far

### 1. Complete RLS Policy Fix Applied

**Date**: 2025-09-05  
**Action**: Applied `complete-rls-fix.sql` in Supabase SQL Editor

```sql
-- Removed ALL existing problematic policies
DROP POLICY IF EXISTS "Public can read shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can delete shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can update shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;
DROP POLICY IF EXISTS "Service and authenticated can manage shows" ON shows;

-- Created clean, working policies
CREATE POLICY "Public can read shows" ON shows FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert shows" ON shows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update shows" ON shows FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete shows" ON shows FOR DELETE USING (auth.uid() IS NOT NULL);
```

**Expected Result**: Should allow public read access for foreign key validation  
**Actual Result**: ❌ PGRST301 error continues

### 2. Created Test and Diagnostic Scripts

**Files Created**:

- `apps/api/src/utils/test-rls-fix.ts` - Tests RLS policies functionality
- `apps/api/src/utils/apply-rls-fix.ts` - Automated RLS fix script
- `apps/api/complete-rls-fix.sql` - Manual SQL fix script
- `apps/api/check-all-rls-policies.sql` - Comprehensive policy audit script

### 3. Systematic Error Replication

**Test Method**: Replicated exact user flow that produces the error:

1. Create test user: `POST /api/users/signup`
2. Search for shows: `POST /api/search` with query "alien"
3. Add to watchlist: `POST /api/watchlist-v2` with tmdbId 157239

**Result**: Consistently reproduces PGRST301 error

---

## Current Error State

### API Response

```json
{ "success": false, "error": "Failed to add show to watchlist - service returned null" }
```

### Server Logs

```
Failed to add show to watchlist: {
  code: 'PGRST301',
  details: null,
  hint: null,
  message: 'No suitable key or wrong key type'
}
```

### RLS Test Results

```
🧪 Testing RLS Policy Fix...
✅ Public shows access works: 5 shows found
❌ User shows access failed: { code: 'PGRST301' }
⚠️  Cannot test watchlist insertion - no shows found
```

### Mixed Error Codes Observed

- Primary: `PGRST301` (foreign key validation failure)
- Secondary: `23505` (duplicate key violations - suggests some operations partially succeed)

---

## Root Cause Analysis

### Database Flow Analysis (via Gemini CLI)

**Tables Involved in Watchlist Addition**:

1. `shows` - TMDB show data cache (referenced by foreign key)
2. `user_shows` - User watchlist entries (where insertion happens)
3. `users` - User data (referenced by foreign key)

**Foreign Key Constraints**:

- `user_shows.user_id` → `users.id` (ON DELETE CASCADE)
- `user_shows.show_id` → `shows.id` (ON DELETE CASCADE)

**Issue Identified**: The PGRST301 error occurs during foreign key validation when inserting into `user_shows`. Despite having public read access on `shows` table, the user session cannot read the `shows` table for validation.

### Potential Additional Causes

1. **Hidden RLS Policies**: Other tables may have conflicting policies
2. **User Context Issues**: JWT token or user session configuration problems
3. **Service Role vs User Role**: Mixed permissions between service operations and user operations
4. **Policy Evaluation Order**: Supabase/PostgREST policy precedence issues

---

## Remaining Diagnostic Tasks

### 1. ⏳ Complete RLS Policy Audit

**Action Required**: Run `apps/api/check-all-rls-policies.sql` in Supabase SQL Editor

**What This Will Reveal**:

- All current RLS policies across `shows`, `user_shows`, `users`, `seasons`, `episodes`
- Which tables have RLS enabled/disabled
- Any remaining `ALL` command policies that override specific policies
- Policy precedence and conflicts

**SQL Script**:

```sql
-- Check ALL RLS policies
SELECT schemaname, tablename, policyname, cmd, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('shows', 'user_shows', 'users', 'seasons', 'episodes')
ORDER BY tablename, policyname;

-- Check RLS enabled status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('shows', 'user_shows', 'users', 'seasons', 'episodes');

-- Find problematic ALL policies
SELECT schemaname, tablename, policyname, cmd, permissive, qual
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'ALL'
ORDER BY tablename, policyname;
```

### 2. ⏳ User Session Context Analysis

**Investigation Points**:

- JWT token structure and permissions
- User client vs service client configuration
- Authentication middleware impact on RLS
- Supabase client initialization differences

### 3. ⏳ Database Permission Deep Dive

**Check**:

- Table ownership and permissions
- Role-based access control (RBAC) vs RLS conflicts
- Service role bypass behavior
- Anonymous role permissions

---

## Next Steps Required

### Immediate Actions

1. **🔍 Run Policy Audit**: Execute `check-all-rls-policies.sql` to see current state
2. **📋 Analyze Results**: Identify any conflicting or missing policies
3. **🛠️ Apply Targeted Fix**: Address specific policy conflicts found
4. **🧪 Test End-to-End**: Verify watchlist addition works completely

### Success Criteria

- [ ] PGRST301 errors eliminated completely
- [ ] Watchlist addition returns HTTP 201 success
- [ ] User can add shows to watchlist via frontend
- [ ] No foreign key validation errors in API logs
- [ ] RLS test script passes all validation checks

---

## Files Modified/Created

### Configuration Files

- `apps/api/src/db/supabase.ts` - Database client configuration
- `apps/api/complete-rls-fix.sql` - Manual RLS fix script
- `apps/api/check-all-rls-policies.sql` - Policy audit script

### Test and Utility Scripts

- `apps/api/src/utils/test-rls-fix.ts` - RLS functionality tests
- `apps/api/src/utils/apply-rls-fix.ts` - Automated RLS fix application

### Documentation

- `docs/21_PGRST301_RLS_FIX.md` - Initial fix documentation
- `docs/20_SYSTEMATIC_ERROR_REPLICATION_PLAN.md` - Error replication plan
- `docs/22_PGRST301_FIX_STATUS.md` - This comprehensive status report

---

## Historical Context

### Previous Fix Attempts

1. **docs/18_COMPREHENSIVE_API_FIX_PLAN.md** - Addressed TypeScript compilation errors
2. **docs/19_WATCHLIST_ERROR_ANALYSIS.md** - Analyzed watchlist service flow
3. **docs/20_SYSTEMATIC_ERROR_REPLICATION_PLAN.md** - Established systematic error replication
4. **docs/21_PGRST301_RLS_FIX.md** - First RLS policy fix attempt

### User's Requirements

> "replicate exactly what is happening for the errors to occur, and you shouldn't stop until you replicate them and they have no errors. your process should be: replicate in a way that produces the error > implement fix > replicate in the exact same way > only stop if error is fixed when replicating the exact same way as the start."

**Status**: ✅ Error replication successful, ❌ Fix incomplete - still in fix iteration phase

---

## Priority Status: 🚨 HIGH

**Blocking**: User watchlist functionality completely broken  
**Impact**: Core feature unusable, affects user engagement  
**Next Action**: Complete comprehensive RLS policy audit to identify root cause

---

**Last Updated**: 2025-09-05T02:15:00Z  
**Status**: Work in progress - awaiting policy audit results
