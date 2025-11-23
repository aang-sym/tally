# Debug and Utility Scripts

This directory contains debugging and testing utilities used during development. These scripts are **not part of the production application** and should not be imported in `src/` files.

## Purpose

These scripts were created to:

- Debug specific issues (RLS policies, authentication, watchlist bugs)
- Test database operations manually
- Validate fixes and migrations
- Generate test tokens for development

## Scripts

### RLS (Row Level Security) Debugging

- `apply-rls-fix.ts` - Apply RLS policy fixes
- `comprehensive-auth-fix.ts` - Comprehensive authentication debugging
- `execute-rls-fix-direct.ts` - Direct RLS fix execution
- `test-rls-fix.ts` - Test RLS policy fixes

### Database Validation

- `verify-database-state.ts` - Verify database state and integrity
- `debug-watchlist-failure.ts` - Debug watchlist operation failures
- `step2-validation.ts` - Validation step 2 checks
- `test-public-shows-access.ts` - Test public shows access patterns

### API Testing

- `test-real-api-flow.ts` - Test real API request/response flows
- `test-ui-flow.ts` - Test UI interaction flows
- `test-ui-flow.sh` - Shell script for UI flow testing
- `test-watchlist-flow.ts` - Test watchlist operations end-to-end

### Contract & Coverage

- `contract-coverage-check.ts` - Check API contract coverage

### Token Generation

- `generate-test-token.js` - Generate JWT tokens for testing

## Usage

These scripts are meant to be run directly with `tsx` or `node`:

```bash
# From apps/api/
tsx scripts/debug/verify-database-state.ts
tsx scripts/debug/generate-test-token.js
```

## Important Notes

⚠️ **These are NOT production code** - They contain hardcoded values, test data, and debugging logic.

⚠️ **Do not import in src/** - Production code should never import from scripts/debug/

⚠️ **May be outdated** - Some scripts may reference old database schemas or APIs that have since changed.

## Maintenance

Consider deleting scripts that:

- Reference bugs that have been fixed
- Are duplicated by proper test coverage
- Use deprecated APIs or schemas
- Haven't been run in 6+ months

---

**Moved here from:** `apps/api/src/utils/` during codebase cleanup (2025-11-17)
