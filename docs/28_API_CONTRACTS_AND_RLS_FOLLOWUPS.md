# 28 – OpenAPI + RLS follow-ups (phase 1)

## scope
- apply the standard RLS pattern to remaining user-scoped tables
- regenerate and validate the OpenAPI contract to reflect auth scoping
- add integration tests (positive + negative) proving the policies

## out of scope (moved to phase 2)
- contributor docs wiring (CONTRIBUTING, docs/README cross-links)
- adding RLS to tables that don’t exist yet (e.g. future user_* tables)

---

## step 1 — RLS standardisation on existing tables
**goal:** every user-scoped table has SELECT/INSERT/UPDATE/DELETE policies using `auth.uid()` and `WITH CHECK` on write ops.

**tasks**
- [x] inventory user-scoped tables (contain `user_id` or equivalent)
- [x] add migration `013_*` per table:
  - enable RLS
  - 4 policies using `auth.uid()`
  - minimal `GRANT ... TO authenticated`
- [x] sanity test via SQL and API

**template (adapt per table)**
```sql
-- enable
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- policies
CREATE POLICY <table>_select_policy ON <table> FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY <table>_insert_policy ON <table> FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY <table>_update_policy ON <table> FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY <table>_delete_policy ON <table> FOR DELETE
  USING (user_id = auth.uid());

-- grants
GRANT SELECT, INSERT, UPDATE, DELETE ON <table> TO authenticated;


### acceptance criteria (step 1)
- [x] All user-scoped tables have RLS enabled.
- [x] Each table has SELECT, INSERT, UPDATE, DELETE policies referencing `auth.uid()`.
- [x] `WITH CHECK` is enforced on all write operations.
- [x] `GRANT` statements are present for `authenticated` role.
- [x] Manual SQL/API tests confirm RLS enforcement.

### implementation results (step 1) ✅

**Migration Files Created:**
- `013_standardize_user_episode_progress_rls.sql` - Standardized policies for episode watch tracking
- `013_standardize_user_season_ratings_rls.sql` - Standardized policies for season ratings  
- `013_enable_user_streaming_subscriptions_rls.sql` - Enabled RLS + policies for user subscriptions

**Tables Processed:**
| Table | Previous State | Action Taken | Result |
|-------|---------------|--------------|---------|
| `user_shows` | ✅ Already standardized (migration 012) | None needed | ✅ Standard policies active |
| `user_episode_progress` | ❌ Legacy "FOR ALL" policy | Replaced with 4 standard policies | ✅ `auth.uid()` enforcement |  
| `user_season_ratings` | ❌ Legacy "FOR ALL" policy | Replaced with 4 standard policies | ✅ `auth.uid()` enforcement |
| `user_streaming_subscriptions` | ❌ No RLS enabled | Full RLS setup + 4 policies | ✅ Complete protection |

**Verification Results:**
- ✅ **Security enforced**: Subscription insert blocked with "violates row-level security policy" (correct behavior)
- ✅ **User isolation verified**: Different users see only their own watchlist data
- ✅ **Core functionality preserved**: Watchlist operations, ratings, user auth all working
- ✅ **Policy naming consistent**: All using `<table>_{operation}_policy` pattern
- ⚠️ **PGRST301 remaining**: Episode progress queries show token compatibility issues (future work)

**Database State:** All user-scoped tables now have standardized RLS policies with proper `auth.uid()` enforcement and minimal granted permissions.

---

## step 2 — OpenAPI contract sync
**goal:** ensure OpenAPI contract matches new RLS scoping and documents expected permissions.

**tasks**
- [x] Add security schemes to OpenAPI spec (`bearerAuth`)
- [x] Add global security requirement with per-endpoint overrides  
- [x] Update protected endpoints with 401/403 error responses
- [x] Add public endpoints with `security: []` override
- [x] Regenerate API client and validate build
- [x] Test endpoint security documentation

**acceptance criteria**
- [x] All user-scoped endpoints show correct security requirements.
- [x] No endpoints expose data outside authenticated user scope.
- [x] OpenAPI contract passes CI validation.

### implementation results (step 2) ✅

**Security Scheme Added:**
```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Global Security Applied:**
```yaml
security:
  - bearerAuth: []
```

**Protected Endpoints Updated:**
- `GET /api/watchlist` - User's shows with RLS enforcement
- `GET /api/watchlist/stats` - User's aggregate stats  
- `PUT /api/watchlist/{userShowId}/provider` - Update streaming provider
- `PUT /api/watchlist/{userShowId}/rating` - Update show rating
- `PUT /api/watchlist/{userShowId}/status` - Update watch status
- `PUT /api/watchlist/{tmdbId}/progress` - Update episode progress

**Public Endpoints (no auth required):**
- `GET /api/health` - System health check (added `security: []`)

**Error Responses Added:**
- `401` - Missing or invalid JWT token
- `403` - RLS policy denied access  
- `400` - Invalid request data
- `404` - Resource not found

**Status:** ✅ **COMPLETE** - OpenAPI contract sync fully implemented and validated.

**Resolution Summary:**
- ✅ **Syntax Error Fixed**: Corrected smart quote (`'`) to regular apostrophe (`'`) in OpenAPI description at `server.ts:389`
- ✅ **Server Restart**: API server now running successfully on port 4000
- ✅ **Client Regenerated**: Successfully ran `pnpm run client:regen` to generate updated TypeScript client
- ✅ **Validation Passed**: OpenAPI spec validation completed with "No validation issues detected"

**Final Technical Status:**
- ✅ Security scheme implemented (bearerAuth with JWT format)
- ✅ Global security applied to all endpoints by default
- ✅ Protected endpoints documented with 401/403 error responses  
- ✅ Public health endpoint properly marked with `security: []` override
- ✅ API client regenerated with new security schemes in `/packages/api-client/`

**Validation Results (Step 2 Sanity Tests):**

*Client Authentication Tests:*
```
🧪 API Client Validation Results: ✅ 7/7 tests passed

✅ Public Endpoint Tests:
   - GET /api/health (no auth): 200 OK
   - GET /api/health (with auth): 200 OK

✅ Authentication Enforcement:
   - GET /api/watchlist (no auth): 401 Unauthorized ✓
   - GET /api/watchlist (invalid token): 401 Unauthorized ✓  
   - GET /api/watchlist (valid token): 200 OK with user data ✓
   - GET /api/watchlist/stats (no auth): 401 Unauthorized ✓
   - GET /api/watchlist/stats (valid token): 200 OK with stats ✓
```

*Contract Coverage Analysis:*
```
🔍 OpenAPI Contract Coverage: ✅ PASSED

📊 Endpoint Security Analysis:
   Total Endpoints: 7
   - Public Endpoints: 1 (GET /api/health with security: [])
   - Protected Endpoints: 6 (all watchlist endpoints)
   - Missing Security Config: 0

🔒 Security Implementation Verified:
   - Global bearerAuth security scheme active
   - All protected endpoints return 401/403 error responses
   - Public endpoints properly override global security
   - JWT authentication working with proper user isolation
```

*OpenAPI Documentation:*
- ✅ Live spec available at `http://localhost:4000/openapi.json`
- ✅ Documentation UI available at `http://localhost:4000/docs`
- ✅ Contract validation: "No validation issues detected"

---

## step 3 — integration tests for RLS
**goal:** prove RLS policies work as intended via automated tests.

**tasks**
- [ ] Write integration tests for each user-scoped table:
  - [ ] Authenticated user can access own rows (positive).
  - [ ] Authenticated user cannot access others' rows (negative).
  - [ ] Unauthenticated requests are denied.
- [ ] Ensure tests are written in apps/api/tests/integration/rls/*.test.ts with one file per table.
- [ ] Run tests in CI pipeline.

**notes**
- Use API endpoints (not direct SQL) for test coverage.
- Include both read and write operations in tests.
- Follow Jest + Supertest conventions already used in apps/api/tests to hit the API and assert responses.

**acceptance criteria**
- [ ] Tests fail if RLS is misconfigured.
- [ ] Test coverage includes all user-scoped tables.

---

## done criteria
- [x] All user-scoped tables have RLS and policies as per template.
- [x] OpenAPI contract is up-to-date and verified.
- [ ] Integration tests pass for positive/negative RLS cases.
- [x] Manual spot checks confirm expected permissions.

---

## follow-ups queued for phase 2
- Contributor documentation updates (CONTRIBUTING, docs/README, cross-links)
- Apply RLS patterns to new/future user tables (e.g. user_* tables not yet created)