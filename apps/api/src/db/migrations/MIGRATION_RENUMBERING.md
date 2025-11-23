# Migration Renumbering - Action Required

## ⚠️ Important: Verify Before Deploying

During the codebase cleanup on 2025-11-19, duplicate migration numbers were discovered and renumbered:

### Changes Made

| Old Filename                                  | New Filename                                  | Status        |
| --------------------------------------------- | --------------------------------------------- | ------------- |
| `013_enable_user_streaming_subscriptions_rls` | `013_enable_user_streaming_subscriptions_rls` | ✅ Unchanged  |
| `013_standardize_user_episode_progress_rls`   | `014_standardize_user_episode_progress_rls`   | ✅ Renumbered |
| `013_standardize_user_season_ratings_rls`     | `015_standardize_user_season_ratings_rls`     | ✅ Renumbered |

### Why This Happened

Three migration files were created with the same number (013), likely due to parallel development or merge conflicts.

## 🔍 Required Verification Steps

**Before deploying this branch to production**, you MUST verify which migrations have already been applied:

### Step 1: Check Supabase Migration History

```sql
-- Check which migrations have been applied
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version;
```

### Step 2: Determine Migration State

Check if any of the 013\_\* migrations have already been applied:

- [ ] `013_enable_user_streaming_subscriptions_rls` - Applied? (Yes/No)
- [ ] `013_standardize_user_episode_progress_rls` - Applied? (Yes/No)
- [ ] `013_standardize_user_season_ratings_rls` - Applied? (Yes/No)

### Step 3: Handle Based on State

#### Scenario A: None of the 013 migrations have run yet

✅ **Safe to deploy** - The renumbering will work correctly. Migrations will run in order:

- 013 (streaming subscriptions)
- 014 (episode progress)
- 015 (season ratings)

#### Scenario B: Only the first 013 migration has run

✅ **Likely safe** - The other two were never applied, so renumbering them to 014/015 is correct.

**Action:** Verify that the renamed files (014, 015) haven't been applied yet.

#### Scenario C: All three 013 migrations have run

⚠️ **PROBLEM** - Supabase may have recorded them all as "013" in migration history.

**Action:**

1. Check the `supabase_migrations.schema_migrations` table for the exact version numbers
2. If they're all recorded as "013", you may need to manually update the migration history:

```sql
-- Update migration version numbers to match new filenames
UPDATE supabase_migrations.schema_migrations
SET version = '014_standardize_user_episode_progress_rls'
WHERE version = '013_standardize_user_episode_progress_rls';

UPDATE supabase_migrations.schema_migrations
SET version = '015_standardize_user_season_ratings_rls'
WHERE version = '013_standardize_user_season_ratings_rls';
```

3. OR: Rename the files back to 013 with a suffix (013a, 013b, 013c)

## 📋 Deployment Checklist

Before merging this branch:

- [ ] Verified which migrations have been applied in production
- [ ] Confirmed renumbering is safe for production deployment
- [ ] Updated migration history if needed (Scenario C)
- [ ] Tested migration order in a staging environment
- [ ] Documented any manual steps required for deployment

## 🚫 Do NOT Deploy If...

- You haven't verified the migration state in production
- You're unsure which migrations have been applied
- Migration history conflicts with the new numbering

## ✅ Safe to Deploy If...

- You've verified none of the 013 migrations have run yet, OR
- Only the first 013 migration has run, and you've confirmed 014/015 haven't, OR
- You've updated the migration history to match the new numbering

---

**Questions?** Check with the database administrator before deploying.

**Rollback Plan:** If issues occur, migrations can be manually rolled back by running:

```sql
-- Rollback migration (example)
BEGIN;
-- Run the DOWN migration (if it exists)
-- Or manually revert the changes
COMMIT;
```

---

**Created:** 2025-11-19 during SQL cleanup (Branch 3)
**Status:** ⚠️ Requires verification before deployment
