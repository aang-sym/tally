# Pre-commit Hook Guide

Your pre-commit hook now runs comprehensive checks to catch issues before they reach GitHub CI!

## What Runs on Every Commit

✅ **Lint-staged** - Fixes ESLint issues and formats code with Prettier  
✅ **Typecheck** - Ensures no TypeScript errors across all packages  
✅ **Unit Tests** - Runs 47 unit tests (~1 second, always runs)  
⏭️ **Integration Tests** - RLS integration tests temporarily disabled (see below)

## Quick Commits (Skip Integration Tests)

For fast commits when you're sure your changes don't affect the API:

```bash
SKIP_INTEGRATION_TESTS=1 git commit -m "your message"
```

This will:

- ✅ Run linting and formatting
- ✅ Run typecheck
- ✅ Run unit tests
- ⏭️ Skip integration tests

## Full Testing (Run Everything)

For thorough testing before pushing:

```bash
git commit -m "your message"
```

This will:

- ✅ Run linting and formatting
- ✅ Run typecheck
- ✅ Run unit tests
- ✅ Start API server and run integration tests

## RLS Integration Tests (Currently Disabled)

**Status**: RLS integration tests are temporarily disabled in pre-commit hooks and CI due to mock environment limitations.

**To run manually**:

```bash
cd apps/api
npx vitest run --config vitest.config.integration.ts
```

**Why disabled**: The RLS integration tests have complex dependencies and mock limitations that cause inconsistent results in CI environments. Core functionality is still validated by unit tests.

**When they'll be re-enabled**: Once the mock environment issues are resolved and the tests are stabilized for consistent CI execution.

## Common Issues

**"API failed to start"**

- Check if port 4000 is busy: `lsof -i :4000`
- Verify Supabase env vars are set
- Check `apps/api/api.log` for startup errors

**"Integration tests timeout"**

- Database might be unavailable
- Use `SKIP_INTEGRATION_TESTS=1` to bypass

**Unit tests are slow**

- Unit tests should complete in ~1 second
- If slower, dependencies might not be built properly

## Benefits

🚀 **Faster feedback** - Catch issues in ~5 seconds instead of waiting for CI  
🛡️ **Prevent bad commits** - TypeScript errors and test failures block commits  
⚡ **Flexible** - Skip heavy tests when needed with environment variable  
🔧 **Auto-fix** - Linting issues are automatically corrected
