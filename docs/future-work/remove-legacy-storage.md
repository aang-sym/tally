# Remove Legacy In-Memory Storage Implementation

**Priority:** P2
**Effort:** 1 day
**Risk:** Medium (requires thorough verification)
**Labels:** `refactor`, `P2`, `technical-debt`, `database`

---

## Problem

The codebase contains **legacy in-memory storage** implementations that appear to be unused now that the app has migrated to Supabase:

### Legacy Storage Files

**`apps/api/src/storage/index.ts`** (115 lines)
- In-memory Maps for users, watchlists, waitlist
- Only imported in 3 files: `waitlist.ts`, `watchlist.test.ts`, `plan.ts`
- Comments say "replace with real database later" - now using Supabase

**`apps/api/src/storage/simple-watchlist.ts`** (345 lines)
- In-memory watchlist and episode progress storage
- Imported in 6 route files
- Includes hardcoded test data (user-1 with Peacemaker/Dexter)

### Current Database: Supabase

The app now uses Supabase (PostgreSQL) as the primary database:
- `apps/api/src/db/supabase.ts` - Supabase client
- Services use Supabase: `ShowService`, `UserService`, `EpisodeProgressService`, etc.
- RLS policies enforce data access
- Database schema in `apps/api/src/db/migrations/`

## Why This Matters

**Cons of keeping legacy storage:**
- ❌ Confusing - two storage systems
- ❌ Bugs - easy to accidentally use wrong storage
- ❌ Maintenance burden - extra code to maintain
- ❌ Test data pollution - hardcoded user-1 data

**Pros of keeping (if any):**
- ✅ Fallback for local development without Supabase?
- ✅ Used in tests?

## Verification Needed

Before removing, verify:

### 1. Check All Storage Imports

```bash
# Find all files importing legacy storage
grep -r "from.*storage/index" apps/api/src/
grep -r "from.*storage/simple-watchlist" apps/api/src/
```

**Current known imports:**
- `routes/waitlist.ts` → `storage/index.ts`
- `routes/watchlist.test.ts` → `storage/index.ts`
- `routes/plan.ts` → `storage/index.ts`
- 6 routes → `storage/simple-watchlist.ts`

### 2. Verify Supabase Usage

For each file importing legacy storage, confirm it's actually using Supabase instead:

**Check for:**
- `supabase.from('table_name')` calls
- Service usage (ShowService, UserService, etc.)
- No calls to `userStore.*` or `watchlistStore.*`

### 3. Check Tests

- Do any tests depend on in-memory storage?
- Can tests use Supabase test database instead?
- Or use mocks of Supabase client?

### 4. Check Development Workflow

- Can developers run the app without Supabase (local dev)?
- Is in-memory storage used as a fallback?
- Or is Supabase required now?

## Proposed Solution

### Option A: Full Removal (Recommended)

If Supabase is now required:

1. **Remove storage files**
   ```bash
   rm apps/api/src/storage/index.ts
   rm apps/api/src/storage/simple-watchlist.ts
   rmdir apps/api/src/storage/
   ```

2. **Update imports**
   - Replace storage imports with Supabase service usage
   - Update tests to use Supabase mocks

3. **Update documentation**
   - Remove references to in-memory storage
   - Document Supabase as the only storage layer

### Option B: Keep for Tests Only

If tests need it:

1. **Move to test directory**
   ```bash
   mv apps/api/src/storage/ apps/api/test/fixtures/
   ```

2. **Only import in test files**
   - Update test imports
   - Ensure production code doesn't use it

3. **Add safeguards**
   - Add linting rule to prevent importing from test fixtures in src/

### Option C: Make it Explicit Fallback

If it's intentionally a fallback:

1. **Rename clearly**
   ```bash
   mv storage/ storage-mock/
   ```

2. **Add runtime check**
   ```typescript
   if (!process.env.SUPABASE_URL) {
     console.warn('Using mock in-memory storage - NOT FOR PRODUCTION');
   }
   ```

3. **Document when it's used**

## Tasks

- [ ] Audit all imports of `storage/index.ts` and `storage/simple-watchlist.ts`
- [ ] Verify each importing file actually uses Supabase instead
- [ ] Check if any tests depend on in-memory storage
- [ ] Decide: Full removal, test-only, or explicit fallback?
- [ ] Update all imports to use services/Supabase
- [ ] Remove storage files (or move to test/)
- [ ] Update tests to use Supabase mocks or test DB
- [ ] Run full test suite to verify nothing breaks
- [ ] Update documentation (README, CLAUDE.md)

## Success Criteria

- **No production routes** import legacy storage
- **Tests pass** without in-memory storage (or using mocks)
- **Documentation** reflects Supabase as the only storage layer
- **Reduced code** (~460 lines removed or moved to test/)

## Migration Examples

**Before (using legacy storage):**
```typescript
// routes/waitlist.ts
import { waitlistStore } from '../storage';

const entry = await waitlistStore.add(email, country);
```

**After (using Supabase service):**
```typescript
// routes/waitlist.ts
import { supabase } from '../db/supabase';

const { data: entry, error } = await supabase
  .from('waitlist')
  .insert({ email, country })
  .select()
  .single();
```

## References

- Current usage: Check `routes/waitlist.ts`, `routes/plan.ts`
- Supabase client: `apps/api/src/db/supabase.ts`
- Audit findings: CLEANUP_PROGRESS.md → "Legacy Storage Implementation"

---

**⚠️ Important:** Do NOT remove until verification is complete. Removing the wrong storage layer could break the application.
