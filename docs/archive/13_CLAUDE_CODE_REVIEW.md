# Codebase Review and Action Plan

## High-Level Summary

The codebase is functional but contains **critical security vulnerabilities** that must be addressed immediately. The authentication system is completely insecure, allowing any user to impersonate others and access/modify any data. Beyond these urgent security issues, the codebase shows signs of rapid development with redundant code, inconsistent patterns, and maintainability concerns that should be addressed systematically.

## Priority Tiers

**Tier 1 (Critical - Immediate Action Required):** Security vulnerabilities that expose user data and system integrity  
**Tier 2 (High - Code Quality):** Redundant code, refactoring opportunities  
**Tier 3 (Medium - Maintainability):** Code organization, consistency, documentation

---

# TIER 1: CRITICAL SECURITY VULNERABILITIES

## 1. Insecure Authentication System

### Problem
- **File:** `apps/api/src/middleware/user-identity.ts`
- **Issue:** Authentication relies on client-provided `x-user-id` header with no validation
- **Impact:** Any user can impersonate any other user by simply changing the header value

### Current Implementation
```typescript
// This allows complete user impersonation
const userId = req.headers['x-user-id'] as string;
req.userId = userId || 'anonymous';
```

### Action Plan
1. **Install JWT library:** `npm install jsonwebtoken @types/jsonwebtoken`
2. **Add environment variable:** `JWT_SECRET` to `.env` files
3. **Update `apps/api/src/routes/users.ts`:**
   - Add login endpoint that validates credentials and returns JWT
   - Add signup endpoint that creates user and returns JWT
4. **Replace `user-identity.ts` middleware:**
   - Validate JWT from `Authorization: Bearer <token>` header
   - Extract `userId` from verified token payload
   - Reject requests with invalid/missing tokens
5. **Update frontend login/auth logic** to store and send JWT tokens

## 2. Database Security Bypass

### Problem
- **File:** `apps/api/src/db/supabase.ts`
- **Issue:** Uses `SUPABASE_SERVICE_KEY` (admin privileges) instead of `SUPABASE_ANON_KEY`
- **Issue:** Row Level Security policies are disabled with `USING (true)` clauses
- **Impact:** Complete bypass of all database security, any operation can access any data

### Current Implementation
```typescript
// This bypasses ALL security policies
const supabase = createClient(url, serviceKey);
```

### Action Plan
1. **Update `apps/api/src/db/supabase.ts`:**
   - Change to use `SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_KEY`
   - Pass user JWT to Supabase client for each request
2. **Update all RLS policies in `apps/api/src/db/*.sql`:**
   - Replace `USING (true)` with proper user-specific policies
   - Example: `USING (auth.uid() = user_id)` for user-owned data
3. **Test all API endpoints** to ensure they work with proper RLS enforcement

## 3. API Authorization Gaps

### Problem
- **Files:** All API routes in `apps/api/src/routes/`
- **Issue:** No authorization checks on protected endpoints
- **Impact:** Even with proper authentication, there are no route-level protections

### Action Plan
1. **Add authorization middleware** that verifies user permissions for specific operations
2. **Audit all API endpoints** and add appropriate auth checks
3. **Implement user session management** to handle token refresh and logout

---

# TIER 2: CODE QUALITY ISSUES

## Redundant Code

### 1. Unnecessary Files

- **File:** `apps/api/src/services/streaming-availability.ts.new`
  - **Suggestion:** This file is an incomplete and unused duplicate of `streaming-availability.ts`. It should be deleted.

- **Files:**
  - `packages/core/src/external/streaming-availability.js`
  - `packages/core/src/external/streaming-availability.d.ts`
  - `packages/core/src/external/streaming-availability.d.ts.map`
  - **Suggestion:** These are build artifacts from the TypeScript compiler and should not be in version control. Add `*.js`, `*.d.ts`, and `*.d.ts.map` to the `.gitignore` file in the `packages/core` directory.

### 2. Deprecated Routes

- **Files:**
  - `apps/api/src/routes/watchlist.ts`
  - `apps/api/src/routes/users-simple.ts`
  - `apps/api/src/routes/watchlist-v2-simple.ts`
  - **Suggestion:** The existence of `watchlist-v2.ts` and `users.ts` suggests that these are older or simplified versions of the routes. Analyze their usage and if they are no longer needed, remove them to simplify the API.

### 3. Duplicated Logic

- **File:** `apps/api/src/routes/shows.ts`
  - **Suggestion:** The functions `discoverAndAnalyzeShows`, `getOnTheAirShows`, and `analyzeShow` contain a lot of overlapping logic for fetching and analyzing shows from TMDB. This logic should be consolidated into a single, more robust service in `apps/api/src/services/ShowService.ts`.

- **Files:**
  - `apps/api/src/storage/simple-watchlist.ts`
  - `apps/api/src/storage/index.ts`
  - **Suggestion:** These files both provide in-memory storage solutions. `simple-watchlist.ts` appears to be more feature-complete. Consolidate the necessary functionality into one and remove the other.

## Refactoring Opportunities

### 1. Consolidate Redundant API Routes

- **Files:** 
  - `apps/api/src/routes/watchlist.ts` vs `apps/api/src/routes/watchlist-v2.ts` vs `apps/api/src/routes/watchlist-v2-simple.ts`
  - `apps/api/src/routes/users.ts` vs `apps/api/src/routes/users-simple.ts`
- **Action Plan:**
  1. Compare logic in all watchlist route versions and merge into single `watchlist-v2.ts`
  2. Delete obsolete `watchlist.ts` and `watchlist-v2-simple.ts`
  3. Consolidate `users.ts` and `users-simple.ts` into single `users.ts`
  4. Update frontend to use consolidated endpoints

### 2. Remove Redundant Storage Layer

- **Files:** Entire `apps/api/src/storage/` directory
- **Issue:** In-memory storage is redundant since Supabase is used for persistence
- **Action Plan:**
  1. Find all imports from `apps/api/src/storage/`
  2. Replace with Supabase service calls
  3. Delete entire storage directory

### 3. Centralize API Configuration

- **Files:** `apps/web/src/pages/MyShows.tsx`, `apps/web/src/pages/SearchShows.tsx`
- **Issue:** API base URL (`http://localhost:4000`) hardcoded in multiple places
- **Action Plan:**
  1. Create `apps/web/src/config/api.ts` with environment-based config
  2. Replace all hardcoded URLs with imports from config
  3. Add `VITE_API_BASE_URL` to environment files

### 4. Component Logic Extraction

- **Files:** `apps/web/src/pages/MyShows.tsx`, `apps/web/src/pages/SearchShows.tsx`
- **Issue:** Components are too large with embedded business logic
- **Action Plan:**
  1. Extract data fetching into custom hooks: `useWatchlist()`, `useShowSearch()`
  2. Move API calls to service layer: `apps/web/src/services/`
  3. Keep components focused on rendering only

### 5. Improve Type Safety

- **Issue:** Excessive use of `any` type throughout codebase
- **Action Plan:**
  1. Add ESLint rule to warn against explicit `any` usage
  2. Replace `any` types in API routes with proper TypeScript interfaces
  3. Utilize existing types from `packages/types`
  4. Add return type annotations to all functions

### 6. Enhance Error Handling

- **Issue:** Inconsistent error handling, most just log to console
- **Action Plan:**
  1. Create standardized error response format for API
  2. Add proper HTTP status codes for all error scenarios
  3. Implement toast notifications in frontend for user-facing errors
  4. Add error boundaries for React components

---

# TIER 3: MAINTAINABILITY IMPROVEMENTS

### 1. Clean Up Unused Files and Build Artifacts

- **Files:**
  - `apps/api/src/services/streaming-availability.ts.new` (incomplete duplicate)
  - `packages/core/src/external/streaming-availability.js` (build artifact)
  - `packages/core/src/external/streaming-availability.d.ts` (build artifact)
  - `packages/core/src/external/streaming-availability.d.ts.map` (build artifact)
- **Action Plan:**
  1. Delete `.new` file and build artifacts
  2. Add `*.js`, `*.d.ts`, `*.d.ts.map` to `.gitignore` in packages directories
  3. Remove these files from version control

### 2. Address TODO Comments

- **Files:** Various files contain TODO comments indicating incomplete features
- **Key TODOs:**
  - Authentication implementation (covered in Tier 1)
  - Navigation improvements in `ShowBlock.tsx`
  - Streaming service integration completions
- **Action Plan:**
  1. Prioritize actionable TODOs
  2. Remove or update outdated comments
  3. Convert remaining TODOs to GitHub issues for tracking

### 3. Consistent Naming Conventions

- **Issue:** Inconsistent file and route naming patterns
- **Examples:** `watchlist-v2.ts` vs `watchlist-v2-simple.ts`, mixed kebab-case and camelCase
- **Action Plan:**
  1. Establish naming convention guidelines
  2. Standardize all file names to follow chosen convention
  3. Update imports and references accordingly

### 4. Code Comments and Documentation

- **Issue:** Complex business logic lacks explanatory comments
- **Action Plan:**
  1. Add JSDoc blocks to all public functions and services
  2. Document complex algorithms and business rules
  3. Focus on explaining "why" not just "what"
  4. Add README files for each major package/app

### 5. TypeScript Configuration Consistency

- **Issue:** Mixed usage of strict TypeScript settings across packages
- **Action Plan:**
  1. Enable strict mode in all `tsconfig.json` files
  2. Add consistent linting rules for type safety
  3. Gradually eliminate `any` types throughout codebase

## Implementation Priority

1. **Start with Tier 1 (Security)** - These are production-blocking issues
2. **Address Tier 2 (Code Quality)** - Focus on consolidation and refactoring
3. **Clean up Tier 3 (Maintainability)** - Long-term code health improvements

**Estimated effort:** 2-3 weeks for complete implementation, with Tier 1 requiring immediate attention (3-5 days).
