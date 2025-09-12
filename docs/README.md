# Tally Documentation

Welcome to the Tally documentation! This directory contains all technical documentation, guides, and project planning materials.

## 📚 Quick Navigation

### Core Documentation

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Development workflow, RLS policies, OpenAPI standards
- **[28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md](./28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md)** - Complete RLS implementation & OpenAPI security guide

### API & Integration

- **[OpenAPI Specification](http://localhost:4000/openapi.json)** - Live API contract (when server is running)
- **[Interactive API Docs](http://localhost:4000/docs)** - Swagger UI for testing endpoints
- **[Integration Tests](../apps/api/src/integration/rls/)** - RLS validation test suite

### Database & Security

- **[RLS Policy Template](./RLS_POLICY_TEMPLATE.md)** - Standardized Row-Level Security patterns
- **[Database Schema](../apps/api/docs/DATABASE_SCHEMA.md)** - Complete database documentation

## 🛡️ Security & RLS Implementation

Tally implements comprehensive Row-Level Security (RLS) to ensure proper data isolation:

### Key Security Features

- **JWT Authentication**: All protected endpoints require valid Bearer tokens
- **RLS Policies**: Database-level user data isolation on all user-scoped tables
- **Integration Testing**: Automated validation of security policies

### User-Scoped Tables (RLS Enabled)

| Table                          | Policies                       | Integration Tests                                                                                | Status    |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------ | --------- |
| `user_shows`                   | ✅ SELECT/INSERT/UPDATE/DELETE | [`rls-validation.test.ts`](../apps/api/src/integration/rls/rls-validation.test.ts)               | ✅ Active |
| `user_episode_progress`        | ✅ SELECT/INSERT/UPDATE/DELETE | [`user-episode-progress.test.ts`](../apps/api/src/integration/rls/user-episode-progress.test.ts) | ✅ Active |
| `user_season_ratings`          | ✅ SELECT/INSERT/UPDATE/DELETE | Covered by watchlist tests                                                                       | ✅ Active |
| `user_streaming_subscriptions` | ✅ SELECT/INSERT/UPDATE/DELETE | Covered by watchlist tests                                                                       | ✅ Active |

### Testing RLS Policies

```bash
# Run all RLS integration tests
pnpm test -- src/integration/rls/

# Run comprehensive RLS validation
pnpm test -- src/integration/rls/rls-summary.test.ts
```

## 🔌 API Client Usage

The TypeScript API client is auto-generated from the OpenAPI specification:

### Installation

```bash
# Install from workspace
npm install @tally/api-client
```

### Basic Usage

```typescript
import { WatchlistApi, Configuration } from '@tally/api-client';

// Configure with authentication
const config = new Configuration({
  basePath: 'http://localhost:4000',
  accessToken: 'your-jwt-token', // Bearer token
});

const watchlistApi = new WatchlistApi(config);

// Get user's watchlist (automatically authenticated)
const response = await watchlistApi.apiWatchlistGet();
console.log(response.data); // User's shows with RLS filtering applied

// Get watchlist statistics
const stats = await watchlistApi.apiWatchlistStatsGet();
console.log(stats.data); // User-specific aggregated data
```

### Advanced Usage

```typescript
// Update show status
await watchlistApi.apiWatchlistUserShowIdStatusPut('show-uuid', { status: 'completed' });

// Update episode progress
await watchlistApi.apiWatchlistTmdbIdProgressPut(
  123456, // TMDB ID
  {
    state: 'watched',
    progress: 75,
    seasonNumber: 1,
    episodeNumber: 8,
  }
);
```

## 🔄 API Client Regeneration

The API client is regenerated whenever the OpenAPI specification changes:

```bash
# Validate OpenAPI spec
pnpm run spec:validate

# Bundle YAML files and regenerate TypeScript client
pnpm run client:regen

# Validate integration after changes
pnpm test -- src/integration/
```

## 📖 Documentation Index

### Implementation Guides

- **[28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md](./28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md)** - Phase 1 implementation (Steps 1-3)
- **[RLS_POLICY_TEMPLATE.md](./RLS_POLICY_TEMPLATE.md)** - Database security patterns

### Project History

- **[27_RLS_NORMALISATION.md](./27_RLS_NORMALISATION.md)** - RLS standardization process
- **[26_RATINGS_FIX.md](./26_RATINGS_FIX.md)** - Rating system implementation
- **[25_GPT_PLAN.md](./25_GPT_PLAN.md)** - API development planning

### Archive

The `archive/` directory contains historical planning documents and implementation phases.

## 🚀 Development Workflow

### Quick Start

1. **Setup**: Follow instructions in [CONTRIBUTING.md](../CONTRIBUTING.md)
2. **Security**: Review RLS policies and authentication requirements
3. **Testing**: Run integration tests to validate security
4. **API Changes**: Update OpenAPI spec and regenerate client

### Integration Testing

All security-critical features have automated integration tests:

- **Authentication validation** - ensures JWT tokens are required
- **Data isolation** - verifies users only see their own data
- **Cross-user prevention** - confirms no unauthorized data access

### Release Process

1. Validate all tests pass (especially RLS integration tests)
2. Update OpenAPI specification if endpoints changed
3. Regenerate and validate API client
4. Update relevant documentation
5. Publish API client prerelease if needed

## 📞 Getting Help

- **Security Questions**: See [RLS implementation guide](./28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md)
- **API Usage**: Check [interactive docs](http://localhost:4000/docs) or OpenAPI spec
- **Contributing**: Full workflow in [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Testing**: Examples in [`integration/rls/`](../apps/api/src/integration/rls/) directory

---

_This documentation is maintained alongside the codebase. When making changes to APIs, security policies, or core functionality, please update the relevant documentation._
