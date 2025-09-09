# 21. PGRST301 Database RLS Policy Fix

## Problem Summary

Users cannot add shows to watchlist due to **PGRST301 "No suitable key or wrong key type"** error during foreign key validation.

### Error Confirmed
```
Failed to add show to watchlist: {
  code: 'PGRST301',
  details: null,
  hint: null,
  message: 'No suitable key or wrong key type'
}
```

### Root Cause Identified
The issue is caused by overly restrictive Row Level Security (RLS) policies on the `shows` table. The current policy:

```sql
-- PROBLEMATIC POLICY in secure-rls-policies.sql
CREATE POLICY "Authenticated can manage shows" ON shows
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

This `FOR ALL` policy incorrectly restricts `SELECT` operations, preventing users from reading shows during foreign key validation when inserting into `user_shows` table.

## The Fix

Replace the restrictive `FOR ALL` policy with separate policies that allow public read access while restricting write operations to authenticated users.

### SQL Fix (Apply in Supabase SQL Editor)

**Copy and paste this EXACT SQL into Supabase SQL Editor:**

```sql
-- Fix PGRST301 Error - Remove Restrictive RLS Policies
-- Run this in Supabase SQL Editor to fix watchlist addition errors

-- Step 1: Drop problematic policies
DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can update shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can delete shows" ON shows;

-- Step 2: Ensure clean slate
DROP POLICY IF EXISTS "Public can read shows" ON shows;

-- Step 3: Create correct policies
-- Allow public read access (required for foreign key validation)
CREATE POLICY "Public can read shows" ON shows
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert shows
CREATE POLICY "Authenticated can manage shows" ON shows
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update shows
CREATE POLICY "Authenticated can update shows" ON shows
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete shows
CREATE POLICY "Authenticated can delete shows" ON shows
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Step 4: Verify policies are applied correctly
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'shows'
ORDER BY policyname;
```

### Expected Output After Fix
After running the SQL, you should see these policies:

```
 schemaname | tablename |        policyname         | cmd    | qual
------------|-----------|----------------------------|--------|------------------
 public     | shows     | Authenticated can delete shows | DELETE | (auth.uid() IS NOT NULL)
 public     | shows     | Authenticated can manage shows | INSERT | 
 public     | shows     | Authenticated can update shows | UPDATE | (auth.uid() IS NOT NULL)
 public     | shows     | Public can read shows     | SELECT | true
```

## Testing the Fix

1. **Apply the SQL fix** in Supabase SQL Editor
2. **Test watchlist addition** using the API:

```bash
# Create test user
curl -X POST http://localhost:4000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test-fix@example.com", "password": "testpass123", "displayName": "Fix Test", "countryCode": "US"}'

# Use the returned JWT token to test watchlist addition
curl -X POST http://localhost:4000/api/watchlist-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"tmdbId": 157239, "status": "watchlist"}'
```

### Expected Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "userId": "user-id-here", 
    "showId": "show-id-here",
    "status": "watchlist",
    "addedAt": "2025-09-05T01:xx:xx.xxxZ"
  },
  "message": "Show added to watchlist successfully"
}
```

## Why This Fix Works

1. **Public SELECT Access**: Shows are public data that all users should be able to read for foreign key validation
2. **Separate Operation Policies**: INSERT/UPDATE/DELETE operations are properly restricted to authenticated users only
3. **Foreign Key Validation**: Users can now see shows during `user_shows` table insertion, preventing PGRST301 errors
4. **Security Maintained**: Write operations still require authentication, maintaining data security

## Files Updated

- `apps/api/src/db/secure-rls-policies.sql` - Updated with correct policy structure
- `apps/api/src/utils/apply-rls-fix.ts` - Created RLS fix automation script

## Status

- ⚠️  **REQUIRES MANUAL ACTION**: SQL must be run in Supabase SQL Editor
- 🔄  **Testing Required**: Verify watchlist additions work after applying fix
- 📋  **Follow-up**: Update todo list status after successful verification

## Resolution Checklist

- [ ] SQL fix applied in Supabase SQL Editor
- [ ] Policy verification query shows correct policies
- [ ] Watchlist addition test succeeds (HTTP 201)
- [ ] No PGRST301 errors in API logs
- [ ] Frontend watchlist functionality works end-to-end
- [ ] Todo marked as completed

---

**Next Action**: Apply the SQL fix in Supabase SQL Editor and test watchlist functionality.