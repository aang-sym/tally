# Contributing to Tally

Thank you for your interest in contributing to Tally! This guide covers the development workflow, security practices, and API standards.

## Development Setup

### Prerequisites
- Node.js 18+ 
- pnpm (recommended package manager)
- Access to Supabase project for database

### Getting Started
```bash
# Clone the repository
git clone <repository-url>
cd tally

# Install dependencies
pnpm install

# Start development servers
pnpm run dev        # Starts all services
pnpm run dev:api    # API server only (:4000)
pnpm run dev:web    # Web frontend only (:3000)
```

## Architecture & Security

### Row-Level Security (RLS) Policies
All user-scoped database tables **must** implement standardized RLS policies to ensure proper data isolation.

#### RLS Policy Template
When adding new user-scoped tables (containing `user_id`), apply this template:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Standard policies
CREATE POLICY your_table_select_policy ON your_table FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY your_table_insert_policy ON your_table FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY your_table_update_policy ON your_table FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY your_table_delete_policy ON your_table FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON your_table TO authenticated;
```

#### Testing RLS Policies
Before merging, **always** test RLS policies using the integration test suite:

```bash
# Run RLS integration tests
pnpm test -- src/integration/rls/

# Run specific RLS validation
pnpm test -- src/integration/rls/rls-summary.test.ts
```

Tests must verify:
- ✅ Authenticated users can access only their own data
- ✅ Unauthenticated requests are denied (401)
- ✅ Users cannot access other users' data
- ✅ All CRUD operations respect user ownership

## API Development & OpenAPI

### OpenAPI Specification
The API contract is maintained in `/apps/api/src/server.ts` as a live OpenAPI 3.0.3 specification.

#### Security Requirements
- **All user-scoped endpoints** must require `bearerAuth` (JWT authentication)
- **Public endpoints** (like `/api/health`) must explicitly override with `security: []`
- **Error responses** must include 401/403 for protected endpoints

#### Adding New Endpoints
1. **Add the route** in `/apps/api/src/routes/`
2. **Update OpenAPI spec** in `server.ts`:
   ```javascript
   '/api/your-endpoint': {
     get: {
       summary: 'Description of endpoint',
       tags: ['your-tag'],
       // security: [], // Only for public endpoints
       responses: {
         '200': { /* success response */ },
         '401': {
           description: 'Missing or invalid JWT token',
           content: {
             'application/json': {
               schema: { $ref: '#/components/schemas/Error' }
             }
           }
         },
         '403': {
           description: 'RLS policy denied access',
           content: {
             'application/json': {
               schema: { $ref: '#/components/schemas/Error' }
             }
           }
         }
       }
     }
   }
   ```
3. **Regenerate API client**:
   ```bash
   pnpm run client:regen
   ```
4. **Test the endpoint** with authentication and RLS validation

### API Client Generation
The TypeScript API client is auto-generated from the OpenAPI specification.

#### Workflow
```bash
# 1. Update OpenAPI spec in server.ts
# 2. Validate and regenerate client
pnpm run spec:validate      # Validate OpenAPI spec
pnpm run client:regen       # Bundle spec + generate client
# 3. Test integration
pnpm test -- src/integration/
```

#### Using the Generated Client
```typescript
import { WatchlistApi, Configuration } from '@tally/api-client';

const config = new Configuration({
  basePath: 'http://localhost:4000',
  accessToken: 'your-jwt-token'
});

const api = new WatchlistApi(config);

// All endpoints automatically include authentication
const watchlist = await api.apiWatchlistGet();
```

## Testing Standards

### Integration Tests
Critical for validating security policies:

```bash
# RLS integration tests (required for user-scoped features)
pnpm test -- src/integration/rls/

# API endpoint tests
pnpm test -- src/routes/

# Service layer tests
pnpm test -- src/services/
```

### Test Requirements
- **RLS tests** for any new user-scoped tables/endpoints
- **Authentication tests** for protected endpoints
- **Error handling tests** for 401/403 responses
- **Data isolation tests** between users

## Code Quality

### Linting & Type Checking
```bash
pnpm run lint        # ESLint
pnpm run typecheck   # TypeScript validation
pnpm run format      # Prettier formatting
```

### Pre-commit Requirements
- All tests must pass
- No TypeScript errors
- RLS integration tests must validate security
- OpenAPI spec must be valid

## Database Migrations

### Adding Migrations
1. Create migration file in `/apps/api/src/db/migrations/`
2. Use incremental numbering: `014_description.sql`
3. **Always include RLS policies** for user-scoped tables
4. Test migration with real data

### Migration Template
```sql
-- Migration XXX: Description
BEGIN;

-- Schema changes
ALTER TABLE your_table ADD COLUMN new_field TEXT;

-- Enable RLS if user-scoped table
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Add standardized policies (if user-scoped)
-- [Use template from RLS section above]

COMMIT;
```

## Documentation

### API Documentation
- Live OpenAPI spec: `http://localhost:4000/openapi.json`
- Interactive docs: `http://localhost:4000/docs`

### Code Documentation
- **Comment complex RLS policies**
- **Document security decisions**
- **Explain authentication flows**

## Security Practices

### Authentication
- All protected endpoints use JWT Bearer tokens
- Tokens must contain valid `userId` claim
- Use `authenticateUser` middleware for protected routes

### Data Access
- **Never bypass RLS** with direct database queries
- **Always test cross-user access prevention**
- **Validate user ownership** in business logic

### Error Handling
- **Don't expose internal errors** to API responses
- **Use consistent error format**
- **Log security violations** for monitoring

## Release Process

### API Client Releases
```bash
# Validate all changes
pnpm run spec:validate
pnpm test

# Generate and test client
pnpm run client:regen
pnpm build

# Publish prerelease (maintainers only)
cd packages/api-client
pnpm version prerelease
pnpm publish --tag beta
```

## Getting Help

- **Security questions**: Refer to `/docs/28_API_CONTRACTS_AND_RLS_FOLLOWUPS.md`
- **API design**: Check existing patterns in `/apps/api/src/routes/`
- **Testing**: Examples in `/apps/api/src/integration/rls/`

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (including RLS integration tests)
- [ ] TypeScript compiles without errors
- [ ] OpenAPI spec is valid (`pnpm run spec:validate`)
- [ ] API client regenerates successfully
- [ ] New user-scoped tables have RLS policies
- [ ] Security endpoints have proper authentication
- [ ] Documentation is updated for breaking changes

Thank you for contributing to a more secure and well-documented API! 🛡️