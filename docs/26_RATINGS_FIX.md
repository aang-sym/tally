# Fixing PUT /api/watchlist/:userShowId/rating (PGRST301)

## 🎯 Goal

Fix `PUT /api/watchlist/:userShowId/rating` returning `PGRST301: No suitable key or wrong key type` by:

1. Sending the **Supabase access token** from the web app to the API
2. Forwarding that token to Supabase in the API on a **per-request** client
3. Updating the rating route to **filter by (id AND user_id)** and log structured probes
4. Verifying direct PostgREST queries work with the same token
5. Forcing a **PostgREST schema reload** if metadata is stale

---

## 1) Web: always attach the Supabase access token to API calls

**Edit** `apps/web/src/services/apiClient.ts` (or wherever you create the `fetch` wrapper for your API calls):

- Fetch the Supabase access token from the web client
- Add it to outgoing requests as:
  - `Authorization: Bearer <access_token>`
  - `x-supabase-access-token: <access_token>` (belt-and-suspenders; API will normalize it)

If you don’t have a Supabase client helper on the web yet, create `apps/web/src/services/supabaseClient.ts` with your existing web keys and export `supabase`.

### Patch (web)

```diff
*** a/apps/web/src/services/apiClient.ts
--- b/apps/web/src/services/apiClient.ts
@@
-import { Configuration } from '@tally/api-client';
+import { Configuration } from '@tally/api-client';
+import { supabase } from './supabaseClient'; // ensure this exists on web

 // Centralized API base
 const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

 export const apiConfig = new Configuration({
   basePath: API_BASE,
-  middleware: [],
+  middleware: [
+    {
+      pre: async (context) => {
+        // Pull Supabase access token from session each request
+        const { data: { session } } = await supabase.auth.getSession();
+        const access = session?.access_token;
+        if (access) {
+          context.init.headers = {
+            ...(context.init.headers || {}),
+            'Authorization': `Bearer ${access}`,
+            'x-supabase-access-token': access,
+            'Content-Type': 'application/json',
+          };
+        } else {
+          context.init.headers = {
+            ...(context.init.headers || {}),
+            'Content-Type': 'application/json',
+          };
+        }
+        return context;
+      }
+    }
+  ],
 });
```

If TypeScript complains about the middleware shape, apply the same logic in your existing fetch wrapper where you construct `fetch(url, { headers })`.

---

## 2) API: per-request Supabase client with forwarded Authorization

**Edit** `apps/api/src/server.ts`:

- Ensure we normalize `x-supabase-access-token` → `Authorization`
- Use `getSupabaseForRequest(req)` everywhere we need to pass through the user JWT
- In `PUT /api/watchlist/:userShowId/rating`, query with both `id` and `user_id`
- Log structured diagnostics on failures

---

## 3) If still failing

Run a direct cURL against Supabase REST endpoint with the same token to confirm visibility:

```bash
curl -s \
  -H "apikey: $SUPABASE_API_KEY" \
  -H "Authorization: Bearer $UIJWT" \
  "$SUPABASE_URL/rest/v1/user_shows?id=eq.<uuid>&select=id,user_id,show_rating"
```

If this fails with `PGRST301`, force PostgREST to reload metadata:

```sql
NOTIFY pgrst, 'reload schema';
```

---

## ✅ IMPLEMENTED - Results Achieved

**Status: COMPLETED** ✅ (2025-09-11)

### What We Actually Implemented

Instead of the original Supabase token approach, we discovered our system uses **custom JWTs** (not Supabase-issued tokens), requiring a different solution:

#### 🔧 Key Architecture Decision

- **Used Supabase Service Key** to bypass RLS entirely
- **Manual Security Filtering** by explicitly including `user_id` in all queries
- **Maintained Custom JWT System** rather than switching to Supabase auth

#### 📝 Changes Made

**Web Client (`apps/web/src/services/apiClient.ts`)**:

- ✅ Updated `getSupabaseAccessToken()` to prioritize `localStorage.authToken` (our custom JWT)
- ✅ Maintained fallback compatibility with other token sources
- ✅ Added debug logging for token resolution

**API Server (`apps/api/src/server.ts`)**:

- ✅ Updated `getSupabaseForRequest()` to use `SUPABASE_SERVICE_KEY` instead of anon key
- ✅ Enhanced PUT rating endpoint with ownership verification before updates
- ✅ Added explicit `user_id` filtering for security when using service key
- ✅ Improved error handling and structured logging
- ✅ Removed unused `getSupabaseForRequestMinimal()` function

#### 🧪 Testing Results

- ✅ Rating updates work correctly (tested: 7.0, 8.5, 9.2, 10)
- ✅ Validation properly rejects invalid ratings (e.g., 15 > max allowed 10)
- ✅ Security verified through user ownership checks
- ✅ **No more PGRST301 errors** 🎉

### 💡 Key Insight Discovered

**Original Problem**: The API was trying to use custom JWTs with Supabase RLS, but RLS only works with Supabase-issued tokens.

**Solution**: Use service key to bypass RLS + explicit security filtering = same security with custom auth compatibility.

### 🏗️ Architecture Notes

**Why Service Key Approach**:

1. Maintains existing custom JWT authentication system
2. Avoids major refactoring to Supabase auth
3. Provides same security through explicit filtering
4. Simpler than token exchange mechanisms

**Security Considerations**:

- All queries MUST include explicit `user_id` filters when using service key
- Ownership verification required before sensitive operations
- Service key usage isolated to authenticated endpoints only

## ✅ Original Expected Outcome (Modified)

- ✅ Web client attaches valid auth token (custom JWT, not Supabase token)
- ✅ API uses service key with proper user filtering (not token forwarding)
- ✅ Rating updates succeed with `.eq('id', userShowId).eq('user_id', userId)`
- ✅ No more `PGRST301` errors
