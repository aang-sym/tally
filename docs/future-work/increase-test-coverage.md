# Increase Test Coverage Across the Application

**Priority:** P1
**Effort:** 1-2 weeks
**Risk:** None (pure addition)
**Labels:** `testing`, `P1`, `quality`, `technical-debt`

---

## Problem

Current test coverage is **minimal** with only **14 test files** across the entire monorepo:

### Current State
- ✅ **iOS app:** Some tests (ApiClientTests.swift, SubscriptionsViewModelTests.swift)
- ⚠️ **API:** Only 3-4 route files have tests
- ❌ **Services:** No tests for EpisodeProgressService, RatingService, ShowService, etc.
- ❌ **Middleware:** No tests for errorHandler, user-identity, usage-tracker
- ❌ **Web app:** Has `--passWithNoTests` flag (actively skips tests!)

### Critical Paths Missing Tests
- Authentication flow (login, signup, token validation)
- Watchlist operations (add, update, delete, status changes)
- Episode progress tracking
- Streaming service availability lookups
- RLS policy enforcement
- Error handling across routes

## Proposed Solution

Add comprehensive test coverage in phases:

### Phase 1: API Route Tests (Integration)

Test all API endpoints with Supertest:

**Priority routes:**
- `routes/auth.ts` - Login, signup, token refresh
- `routes/watchlist.ts` - CRUD operations
- `routes/progress.ts` - Episode tracking
- `routes/users.ts` - User profile, subscriptions
- `routes/shows.ts` - Show search, details

**Example test structure:**
```typescript
// apps/api/src/routes/watchlist.test.ts
import request from 'supertest';
import { app } from '../server';

describe('POST /api/watchlist', () => {
  it('should add show to watchlist with valid auth', async () => {
    const response = await request(app)
      .post('/api/watchlist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ tmdbId: 12345, status: 'watchlist' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/watchlist')
      .send({ tmdbId: 12345 });

    expect(response.status).toBe(401);
  });
});
```

### Phase 2: Service Layer Tests (Unit)

Test business logic in isolation:

**Services to test:**
- `ShowService` - Show lookup, availability checks
- `WatchlistService` - Watchlist operations
- `EpisodeProgressService` - Progress tracking
- `RatingService` - Rating calculations
- `UserService` - User management

**Example:**
```typescript
// apps/api/src/services/ShowService.test.ts
import { ShowService } from './ShowService';
import { mockSupabaseClient } from '../test/mocks';

describe('ShowService', () => {
  let service: ShowService;

  beforeEach(() => {
    service = new ShowService(mockSupabaseClient);
  });

  it('should fetch show by TMDB ID', async () => {
    const show = await service.getShowByTmdbId(12345);
    expect(show).toBeDefined();
    expect(show.tmdb_id).toBe(12345);
  });
});
```

### Phase 3: Middleware Tests

Test middleware in isolation:

- `errorHandler` - Error formatting and status codes
- `user-identity` - Token validation, user extraction
- `usage-tracker` - Request tracking

### Phase 4: Web App Tests

Remove `--passWithNoTests` and add:

- Component tests (React Testing Library)
- API client tests (mock fetch)
- User flow tests (login, watchlist management)

### Phase 5: Coverage Reporting

Set up Vitest coverage:

```json
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
}
```

## Tasks

### API Testing
- [ ] Remove `--passWithNoTests` from web package.json
- [ ] Add tests for all routes in `apps/api/src/routes/`
- [ ] Add tests for all services in `apps/api/src/services/`
- [ ] Add tests for middleware in `apps/api/src/middleware/`
- [ ] Add test for Supabase RLS policies
- [ ] Set up test database or mocks for Supabase

### Web Testing
- [ ] Set up React Testing Library
- [ ] Add component tests for key UI components
- [ ] Add integration tests for user flows
- [ ] Test API client error handling

### Infrastructure
- [ ] Set up coverage reporting with Vitest
- [ ] Set coverage thresholds (start at 50%, increase gradually)
- [ ] Add coverage reports to CI/CD
- [ ] Block PRs that decrease coverage

### Documentation
- [ ] Document testing standards in CONTRIBUTING.md
- [ ] Add examples of good tests
- [ ] Document how to run tests locally

## Success Criteria

- **80%+ code coverage** in critical paths (auth, watchlist, progress)
- **All API routes** have integration tests
- **All services** have unit tests
- **CI fails** if tests fail
- **Coverage reports** generated on each PR
- **No `--passWithNoTests`** flags in package.json

## Testing Strategy

### Test Pyramid
```
     /\
    /UI\      ← Few end-to-end tests
   /────\
  /Integ\     ← Moderate integration tests (API routes)
 /──────\
/  Unit  \    ← Many unit tests (services, utils)
──────────
```

### What to Test
- **Happy paths:** Valid inputs, successful operations
- **Error paths:** Invalid inputs, auth failures, DB errors
- **Edge cases:** Empty results, boundary conditions
- **Security:** RLS enforcement, token validation

### What NOT to Test
- External APIs (TMDB, streaming services) - use mocks
- Supabase internals - trust their tests
- Third-party library behavior

## References

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [React Testing Library](https://testing-library.com/react)
- Audit findings: CLEANUP_PROGRESS.md → "Testing Coverage"

---

**Note:** This is a large effort. Consider breaking into multiple issues/PRs (one per route, one per service, etc.) to make progress incremental and reviewable.
