# Add Structured Logging to Replace console.* Calls

**Priority:** P1
**Effort:** 4 hours
**Risk:** Low
**Labels:** `enhancement`, `P1`, `technical-debt`, `observability`

---

## Problem

Currently the API has **322 console.log/error/warn calls** across 20 files. This creates several issues:

- No log levels (can't filter by severity)
- No structured data (hard to parse/search)
- Performance overhead in production
- Console noise makes debugging harder
- No centralized log management possible

**Files with most logging:**
- `apps/api/src/utils/verify-database-state.ts` (47 calls)
- `apps/api/src/utils/debug-watchlist-failure.ts` (31 calls)
- `apps/api/src/utils/test-real-api-flow.ts` (32 calls)
- `apps/api/src/utils/contract-coverage-check.ts` (28 calls)

## Proposed Solution

Introduce a proper logging library and replace console.* calls:

### 1. Choose a Logging Library

**Option A: Winston** (most popular)
```bash
pnpm add winston
pnpm add -D @types/winston
```

**Option B: Pino** (faster, structured by default)
```bash
pnpm add pino
pnpm add -D pino-pretty
```

**Recommendation:** Pino for better performance and built-in structured logging.

### 2. Create Logger Utility

```typescript
// apps/api/src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

export default logger;
```

### 3. Replace console.* Calls

**Before:**
```typescript
console.log('[DatabaseError] Operation failed:', error);
console.error('Failed to fetch user:', userId, error);
```

**After:**
```typescript
logger.error({ err: error, operation: 'fetchUser' }, 'Database operation failed');
logger.error({ userId, err: error }, 'Failed to fetch user');
```

### 4. Set Up Log Levels

- **error:** System errors, exceptions
- **warn:** Deprecations, recoverable issues
- **info:** Normal operations (auth, requests)
- **debug:** Detailed debugging (SQL queries, API calls)
- **trace:** Very verbose (disabled in production)

## Tasks

- [ ] Install logging library (pino recommended)
- [ ] Create centralized logger utility
- [ ] Replace console.* in production routes
- [ ] Replace console.* in services
- [ ] Replace console.* in middleware
- [ ] Update error handlers to use logger
- [ ] Add LOG_LEVEL to .env.example
- [ ] Document logging standards in CONTRIBUTING.md
- [ ] (Optional) Clean up debug utilities that should be removed anyway

## Success Criteria

- Zero console.* calls in `apps/api/src/routes/`
- Zero console.* calls in `apps/api/src/services/`
- Zero console.* calls in `apps/api/src/middleware/`
- Structured logging with consistent format
- Configurable log levels via environment variable
- Pretty output in development, JSON in production

## References

- [Pino Documentation](https://getpino.io/)
- [Winston Documentation](https://github.com/winstonjs/winston)
- Audit findings: CLEANUP_PROGRESS.md → "Excessive Debug Logging"

---

**Note:** Many of the files with high console.* counts are in `utils/` and are debugging scripts that should be moved/removed in Branch 2 (Debug Script Relocation). This issue focuses on replacing console calls in production code.
