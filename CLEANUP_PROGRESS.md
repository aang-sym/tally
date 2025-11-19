# Repository Cleanup Progress

**Audit Date:** 2025-11-17
**Status:** 🔄 In Progress
**Branch Strategy:** Themed branches, one at a time with PR review

---

## Quick Stats

### Current Progress
- ✅ **Completed:** 0/7 branches
- 🔄 **In Progress:** 1/7 branches (Branch 1: Housekeeping)
- ⏳ **Pending:** 6/7 branches

### Cleanup Impact
- **Dead Code Found:** ~100KB across 13 utility scripts, 9 SQL files, 24 archived docs
- **Duplicate Code:** 2 error handler implementations, 3 config locations
- **Maintenance Items:** 17+ outdated packages, 322 console.log calls
- **Files to Remove/Archive:** ~100 files

---

## Audit Summary

### Dead/Unused Code Identified
1. **Temporary files** - `tmp_test.txt`, `dev.log`
2. **13 debugging utilities** in `apps/api/src/utils/` (~50KB)
3. **9 ad-hoc SQL files** in `apps/api/src/db/` (~30KB)
4. **24 archived planning docs** in `docs/archive/`
5. **Legacy storage implementation** - `apps/api/src/storage/` (115 lines)
6. **Duplicate error handler** - `apps/api/src/utils/errorHandler.ts` (184 lines)

### Refactoring Opportunities
1. **Duplicate error handlers** (middleware vs utils)
2. **322 console.log calls** across API (20 files)
3. **15+ debug logs** in production web API client
4. **3 overlapping lint configs** (.eslintrc.js, packages/config, inline in package.json)
5. **Large service files** needing decomposition

### Maintenance Issues
1. **17+ outdated packages** (some 2+ major versions behind)
2. **Minimal test coverage** (<15 test files)
3. **Duplicate migration numbering** (three files numbered 013_)
4. **Package manager mismatch** (using pnpm, engines specifies npm)
5. **No .env.example files** for developer onboarding

---

## Branch Roadmap

### P0 - High Impact, Low/Medium Effort

#### ✅ Branch 1: Housekeeping
**Branch:** `claude/audit-1-housekeeping`
**Status:** 🔄 In Progress
**PR:** -
**Merged:** -
**Risk:** None | **Effort:** 5 min

**Changes:**
- [x] Create comprehensive CLEANUP_PROGRESS.md
- [x] Create future work issue templates
- [ ] Delete tmp_test.txt
- [ ] Update .gitignore (add dev.log, *.log)
- [ ] Fix package.json engines (npm → pnpm)
- [ ] Archive docs/archive/ into organized folders
- [ ] Delete empty scripts/test-streaming-api.sh

**Files Changed:**
- New: `CLEANUP_PROGRESS.md`
- New: `docs/future-work/*.md` (6 issue templates)
- Deleted: `tmp_test.txt`, `scripts/test-streaming-api.sh`
- Modified: `.gitignore`, `package.json`
- Reorganized: `docs/archive/` → organized structure

---

#### ⏳ Branch 2: Debug Script Relocation
**Branch:** `claude/audit-2-debug-scripts`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** Low | **Effort:** 30 min

**Changes:**
- [ ] Move `apps/api/src/utils/test-*.ts` → `apps/api/scripts/debug/`
- [ ] Move `apps/api/src/utils/*-fix*.ts` → `apps/api/scripts/debug/`
- [ ] Move `apps/api/src/utils/debug-*.ts` → `apps/api/scripts/debug/`
- [ ] Move `apps/api/src/utils/verify-*.ts` → `apps/api/scripts/debug/`
- [ ] Update CLEANUP_PROGRESS.md

**Files to Move (13 files):**
- `apply-rls-fix.ts`
- `comprehensive-auth-fix.ts`
- `contract-coverage-check.ts`
- `debug-watchlist-failure.ts`
- `execute-rls-fix-direct.ts`
- `step2-validation.ts`
- `test-public-shows-access.ts`
- `test-real-api-flow.ts`
- `test-rls-fix.ts`
- `test-ui-flow.sh`
- `test-ui-flow.ts`
- `test-watchlist-flow.ts`
- `verify-database-state.ts`
- `generate-test-token.js`

**Files Remaining in utils/:**
- `errorHandler.ts` (production code)

---

#### ⏳ Branch 3: SQL Cleanup
**Branch:** `claude/audit-3-sql-cleanup`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** Medium (requires DB verification) | **Effort:** 2 hours

**Changes:**
- [ ] Renumber duplicate migration files (013 → 013, 014, 015)
- [ ] Move non-migration SQL files to `apps/api/docs/sql-queries/`
- [ ] Document which queries are still needed
- [ ] Verify migration state in production DB
- [ ] Update CLEANUP_PROGRESS.md

**SQL Files to Relocate:**
- `check-show-data.sql` → `docs/sql-queries/diagnostics/`
- `complete-rls-fix.sql` → `docs/sql-queries/rls-fixes/`
- `fix-rls-shows.sql` → `docs/sql-queries/rls-fixes/`
- `fix-service-role-rls.sql` → `docs/sql-queries/rls-fixes/`
- `fix-user-shows-rls.sql` → `docs/sql-queries/rls-fixes/`
- `fix-users-rls.sql` → `docs/sql-queries/rls-fixes/`
- `queries.sql` → `docs/sql-queries/general/`
- `secure-rls-policies.sql` → `docs/sql-queries/rls-fixes/`
- `verify-progress.sql` → `docs/sql-queries/diagnostics/`
- `check-all-rls-policies.sql` (root) → `docs/sql-queries/diagnostics/`

**Migration Files to Renumber:**
- Keep: `013_enable_user_streaming_subscriptions_rls.sql`
- Rename: `013_standardize_user_episode_progress_rls.sql` → `014_`
- Rename: `013_standardize_user_season_ratings_rls.sql` → `015_`

⚠️ **Requires verification:** Check which migrations have run in production before renumbering

---

#### ⏳ Branch 4: Logging & Config Cleanup
**Branch:** `claude/audit-4-logging-config`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** Low | **Effort:** 2 hours

**Changes:**
- [ ] Remove debug console.logs from `apps/web/src/config/api.ts` (15+ logs)
- [ ] Create `.env.example` in `apps/api/`
- [ ] Create `.env.example` in `apps/web/`
- [ ] Centralize ESLint config to `packages/config/`
- [ ] Centralize Prettier config to `packages/config/`
- [ ] Update all packages to reference shared configs
- [ ] Update CLEANUP_PROGRESS.md

**Web API Debug Logs to Remove:**
- Lines 128-194 in `apps/web/src/config/api.ts`
- Replace with conditional logging: `if (import.meta.env.DEV)`

**Config Consolidation:**
- Delete: `/.eslintrc.js` (duplicate)
- Delete: `/.prettierrc` (duplicate)
- Move inline config from `package.json:56-121` to `packages/config/`
- Update all workspace packages to extend shared config

**Environment Variables to Document:**
- API: `SUPABASE_URL`, `SUPABASE_API_KEY`, `SUPABASE_SERVICE_KEY`, `PORT`, etc.
- Web: `VITE_API_BASE_URL`, etc.

---

#### ⏳ Branch 5: Error Handler Consolidation
**Branch:** `claude/audit-5-error-consolidation`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** Medium (touches error handling) | **Effort:** 3 hours

**Changes:**
- [ ] Analyze both error handler implementations
- [ ] Consolidate into `apps/api/src/middleware/errorHandler.ts`
- [ ] Update `routes/users.ts` to use middleware error classes
- [ ] Delete `apps/api/src/utils/errorHandler.ts`
- [ ] Add tests for error handling
- [ ] Update CLEANUP_PROGRESS.md

**Current State:**
- `middleware/errorHandler.ts` (68 lines) - Class-based (AppError, ValidationError, NotFoundError)
- `utils/errorHandler.ts` (184 lines) - Functional (createErrorResponse, handleDatabaseError)
- Only `routes/users.ts` imports the utils version

**Migration Strategy:**
1. Add missing error types to middleware version
2. Update users.ts to use middleware classes
3. Run tests to verify no regressions
4. Delete utils/errorHandler.ts

---

### P1 - Medium Impact, Medium Effort

#### ⏳ Branch 6a: Safe Dependency Updates
**Branch:** `claude/audit-6a-safe-deps`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** Low-Medium | **Effort:** 3 hours

**Changes:**
- [ ] Update @redocly/cli: 2.0.8 → 2.11.1
- [ ] Update @openapitools/openapi-generator-cli: 2.23.1 → 2.25.0
- [ ] Update @typescript-eslint/*: 6.21.0 → 8.46.4
- [ ] Update lint-staged: 15.5.2 → 16.2.6
- [ ] Update concurrently: 8.2.2 → 9.2.1
- [ ] Update typescript: 5.9.2 → 5.9.3
- [ ] Run full test suite after each update
- [ ] Update CLEANUP_PROGRESS.md

**Testing Strategy:**
1. Update one package at a time
2. Run `pnpm install`
3. Run `pnpm build` and `pnpm typecheck`
4. Run `pnpm test`
5. Fix any breaking changes
6. Commit before next update

---

#### ⏳ Branch 6b: Vite Major Upgrade (Risky)
**Branch:** `claude/audit-6b-vite-upgrade`
**Status:** ⏳ Not Started
**PR:** -
**Merged:** -
**Risk:** High (2 major versions) | **Effort:** 1-2 days

**Changes:**
- [ ] Review Vite 6.x and 7.x migration guides
- [ ] Update vite: 5.4.20 → 7.2.2
- [ ] Update @vitejs/plugin-react-swc to compatible version
- [ ] Test dev server (`pnpm dev:web`)
- [ ] Test production build (`pnpm build`)
- [ ] Fix any breaking changes
- [ ] Update CLEANUP_PROGRESS.md

**Known Breaking Changes to Check:**
- Config file format changes
- Plugin API changes
- Build output structure
- Dev server behavior

⚠️ **Recommend:** Do this in a separate, dedicated session with thorough testing

---

### P2 - Nice-to-Have / Long-Term (Future Work)

The following items are tracked as GitHub issues for future work:

#### 📋 Issue: Remove Legacy Storage Implementation
**Priority:** P2
**Effort:** 1 day
**Risk:** Medium

Verify all routes use Supabase services, then remove `apps/api/src/storage/index.ts` and `storage/simple-watchlist.ts`.

**See:** `docs/future-work/remove-legacy-storage.md`

---

#### 📋 Issue: Refactor Large Service Files
**Priority:** P2
**Effort:** 2-3 days
**Risk:** Medium

Extract specialized services:
- `AvailabilityService` from `ShowService`
- Consolidate episode progress logic
- Single responsibility per service

**See:** `docs/future-work/refactor-service-files.md`

---

#### 📋 Issue: Add Structured Logging
**Priority:** P1
**Effort:** 4 hours
**Risk:** Low

Replace 322 console.* calls with proper logging library (winston/pino).

**See:** `docs/future-work/add-structured-logging.md`

---

#### 📋 Issue: Increase Test Coverage
**Priority:** P1
**Effort:** 1-2 weeks
**Risk:** None

Add comprehensive tests for:
- All API routes
- Service layer
- Middleware
- Critical user flows

**See:** `docs/future-work/increase-test-coverage.md`

---

#### 📋 Issue: Reduce Lint Warnings to Zero
**Priority:** P2
**Effort:** 1 week
**Risk:** Low

Fix or suppress all ESLint warnings, set `--max-warnings=0`.

**See:** `docs/future-work/zero-lint-warnings.md`

---

#### 📋 Issue: Extract TODOs to GitHub Issues
**Priority:** P2
**Effort:** 4 hours
**Risk:** None

Parse all TODO/FIXME/HACK comments, create issues with proper context.

**See:** `docs/future-work/todo-extraction.md`

---

## Timeline

### Week 1 (Current)
- ✅ Complete audit
- 🔄 Branch 1: Housekeeping
- ⏳ Branch 2: Debug Scripts
- ⏳ Branch 4: Logging & Config

### Week 2
- ⏳ Branch 3: SQL Cleanup (after DB verification)
- ⏳ Branch 5: Error Consolidation
- ⏳ Branch 6a: Safe Dependency Updates

### Week 3+
- ⏳ Branch 6b: Vite Upgrade (dedicated effort)
- 📋 Future work items (tracked as issues)

---

## Notes

### Decision Log

**2025-11-17:** Decided on one-branch-at-a-time approach with PR review between each branch.

**2025-11-17:** Archived docs will be organized into folders by topic (plans, fixes, security) rather than deleted.

### Blocked Items

None currently.

### Questions for Review

None currently.

---

## Update History

- **2025-11-17:** Initial audit completed, tracking document created
- **2025-11-17:** Branch 1 (Housekeeping) started

---

**Last Updated:** 2025-11-17 (Branch 1 in progress)
