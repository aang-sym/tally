# Refactor Large Service Files

**Priority:** P2
**Effort:** 2-3 days
**Risk:** Medium
**Labels:** `refactor`, `P2`, `technical-debt`, `architecture`

---

## Problem

Several service files in `apps/api/src/services/` are **growing too large** and handling **multiple responsibilities**, violating the Single Responsibility Principle:

### Current Service Files

**ShowService.ts** - Doing too much:
- ✅ Show CRUD operations
- ✅ Show metadata lookup
- ❌ Availability checking (should be separate)
- ❌ Search functionality (could be separate)
- ❌ Provider normalization

**WatchlistService.ts** - Mixed concerns:
- ✅ Watchlist CRUD
- ❌ Episode progress tracking (separate service exists!)
- ❌ Status management
- ❌ Provider assignment
- ❌ Statistics calculation

**StreamingService.ts** - Multiple domains:
- ✅ Streaming service metadata
- ❌ Availability lookups
- ❌ Provider normalization
- ❌ Regional content filtering

### Issues This Causes

1. **Hard to test** - Too many dependencies and concerns
2. **Hard to understand** - Files are long, unclear boundaries
3. **Tight coupling** - Services depend on each other's internals
4. **Code duplication** - Similar logic in multiple places
5. **Difficult to extend** - Adding features touches many files

## Proposed Solution

Refactor into smaller, focused services following **Single Responsibility Principle**:

### New Service Structure

```
apps/api/src/services/
├── show/
│   ├── ShowService.ts              (Show CRUD only)
│   ├── ShowSearchService.ts        (Search logic)
│   └── ShowMetadataService.ts      (TMDB integration)
├── availability/
│   ├── AvailabilityService.ts      (Streaming availability)
│   ├── ProviderNormalizer.ts       (Provider name mapping)
│   └── RegionalContentService.ts   (Region filtering)
├── watchlist/
│   ├── WatchlistService.ts         (Watchlist CRUD only)
│   ├── WatchlistStatsService.ts    (Statistics)
│   └── ProviderAssignmentService.ts (Provider selection)
├── progress/
│   ├── EpisodeProgressService.ts   (Already exists!)
│   ├── SeasonProgressService.ts    (Season-level tracking)
│   └── ProgressCalculator.ts       (Progress percentages)
├── streaming/
│   ├── StreamingService.ts         (Service metadata only)
│   ├── StreamingProviderService.ts (Provider CRUD)
│   └── SubscriptionService.ts      (User subscriptions)
└── user/
    ├── UserService.ts              (User CRUD)
    ├── UserProfileService.ts       (Profile management)
    └── UserPreferencesService.ts   (Settings, preferences)
```

### Extraction Example: AvailabilityService

**Before (in ShowService.ts):**
```typescript
class ShowService {
  async getShowAvailability(tmdbId: number, region: string) {
    // 50+ lines of availability logic
    // Mixed with show metadata logic
  }
}
```

**After (new AvailabilityService.ts):**
```typescript
class AvailabilityService {
  async getShowAvailability(tmdbId: number, region: string) {
    // Focused only on availability
    // Clear inputs and outputs
    // Easy to test
  }
}

class ShowService {
  constructor(
    private availabilityService: AvailabilityService
  ) {}

  async getShowWithAvailability(tmdbId: number, region: string) {
    const show = await this.getShow(tmdbId);
    const availability = await this.availabilityService.getShowAvailability(tmdbId, region);
    return { ...show, availability };
  }
}
```

## Refactoring Strategy

### Phase 1: Extract Availability Logic

1. Create `services/availability/AvailabilityService.ts`
2. Move availability logic from ShowService and StreamingService
3. Update dependents to use new service
4. Add tests for AvailabilityService

### Phase 2: Consolidate Progress Tracking

1. `EpisodeProgressService` already exists
2. Create `SeasonProgressService` for season-level operations
3. Move progress logic from WatchlistService to progress services
4. Update routes to use progress services directly

### Phase 3: Split Watchlist Service

1. Keep core CRUD in WatchlistService
2. Extract stats to WatchlistStatsService
3. Extract provider assignment logic
4. Update routes to compose services

### Phase 4: Clean Up Dependencies

1. Use dependency injection for service composition
2. Define clear interfaces between services
3. Remove circular dependencies
4. Document service boundaries

## Tasks

### Analysis
- [ ] Map all methods in large service files
- [ ] Identify logical groupings by responsibility
- [ ] Document current dependencies between services
- [ ] Identify shared logic to extract to utils

### Extraction
- [ ] Create `AvailabilityService`
- [ ] Create `ShowSearchService`
- [ ] Create `ProviderNormalizer`
- [ ] Create `WatchlistStatsService`
- [ ] Create `SeasonProgressService`

### Migration
- [ ] Update routes to use new services
- [ ] Update old services to delegate to new ones
- [ ] Ensure backward compatibility during transition
- [ ] Update dependency injection

### Testing
- [ ] Add unit tests for each new service
- [ ] Integration tests for service composition
- [ ] Verify no regressions in API behavior
- [ ] Load test critical paths

### Documentation
- [ ] Document service architecture in docs/
- [ ] Update CLAUDE.md with new structure
- [ ] Add JSDoc comments to service classes
- [ ] Create architecture diagram

## Success Criteria

- **Each service** has a single, clear responsibility
- **Service files** are <200 lines each
- **All services** have unit tests
- **No circular dependencies** between services
- **Clear interfaces** documented with TypeScript types
- **Routes** compose services, don't contain business logic

## Benefits

After refactoring:
- ✅ **Easier to test** - Services have fewer dependencies
- ✅ **Easier to understand** - Clear separation of concerns
- ✅ **Easier to extend** - Add features without touching unrelated code
- ✅ **Better reusability** - Small services can be composed
- ✅ **Better maintainability** - Changes are localized

## Migration Path

To minimize risk, refactor **incrementally**:

1. **Create new services** alongside old ones
2. **Migrate routes one at a time** to use new services
3. **Keep old services** until all routes migrated
4. **Remove old services** once migration complete

This allows rollback at any step if issues arise.

## References

- Single Responsibility Principle: [Clean Code](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- Service Layer Pattern: [Martin Fowler](https://martinfowler.com/eaaCatalog/serviceLayer.html)
- Audit findings: CLEANUP_PROGRESS.md → "Large Service Files"

---

**⚠️ Important:** This is a significant refactor. Consider doing it incrementally over multiple PRs, one service at a time, to minimize risk and make reviews manageable.
