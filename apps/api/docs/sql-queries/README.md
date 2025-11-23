# Archived SQL Queries

This directory contains ad-hoc SQL queries and scripts that were created during development for debugging, testing, and fixing specific issues. These files are **not part of the migration system** and should not be run automatically.

## ⚠️ Important Notes

- **These are NOT migrations** - Do not add these to the migrations directory
- **May be outdated** - Some queries reference old schema versions
- **Use with caution** - Always review queries before running in production
- **For reference only** - Most issues these addressed have been fixed

## Directory Structure

### `/diagnostics` - Database Verification Queries

Queries used to verify database state and investigate issues:

- **`check-show-data.sql`** - Verify show data integrity and relationships
- **`verify-progress.sql`** - Verify user episode progress data

**When to use:**

- Investigating data consistency issues
- Verifying RLS policies are working
- Debugging missing or incorrect data

### `/rls-fixes` - Row Level Security Fixes

Queries that were used to fix RLS (Row Level Security) policy issues:

- **`complete-rls-fix.sql`** - Comprehensive RLS policy fix
- **`fix-rls-shows.sql`** - Fix RLS policies for shows table
- **`fix-service-role-rls.sql`** - Fix service role RLS permissions
- **`fix-user-shows-rls.sql`** - Fix RLS for user_shows table
- **`fix-users-rls.sql`** - Fix RLS for users table
- **`secure-rls-policies.sql`** - Secure RLS policy definitions

**⚠️ Warning:** These fixes have likely been incorporated into migrations. Running them again may cause errors or conflicts.

**When to use:**

- Understanding past RLS issues
- Reference for RLS policy patterns
- Debugging similar RLS problems

### `/general` - General Purpose Queries

Miscellaneous queries used during development:

- **`queries.sql`** - Collection of various development queries

**When to use:**

- Finding examples of complex queries
- Understanding database relationships
- Learning SQL patterns used in the project

## Migration vs Archived Queries

### Migrations (`apps/api/src/db/migrations/`)

✅ **Run automatically** - Applied in order during deployment
✅ **Versioned** - Numbered sequentially (001, 002, etc.)
✅ **Tracked** - System knows which have been applied
✅ **Tested** - Should be tested before deployment
✅ **Permanent** - Become part of database schema

### Archived Queries (this directory)

❌ **NOT run automatically** - Must be run manually if needed
❌ **NOT versioned** - No specific order
❌ **NOT tracked** - No record of which have been run
❌ **For reference** - May be outdated or already applied
❌ **Temporary** - Were fixes for specific issues

## Usage

To run an archived query (if needed):

```bash
# 1. Review the query first
cat apps/api/docs/sql-queries/diagnostics/check-show-data.sql

# 2. Connect to your database
psql $DATABASE_URL

# 3. Run the query (if safe to do so)
\i apps/api/docs/sql-queries/diagnostics/check-show-data.sql
```

**OR** use the Supabase SQL Editor for one-off queries.

## Maintenance

Consider deleting queries that:

- Reference tables/columns that no longer exist
- Have been superseded by migrations
- Are duplicates of existing migrations
- Haven't been needed in 6+ months

## History

**Moved here from:** `apps/api/src/db/*.sql` during codebase cleanup (2025-11-19)

**Reason:** These ad-hoc queries were cluttering the db/ directory and could be confused with the actual migration system.

---

**Need to add a new query?**

Ask yourself:

1. Is this a schema change? → Create a migration instead
2. Is this a one-time fix? → Run it manually, then document it here
3. Is this for debugging? → This directory is appropriate
