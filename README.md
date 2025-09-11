# Tally

> Smart streaming service management - Save money by planning when to subscribe around the shows you care about.

## MVP Scope

This is the foundational backend API and web landing page for Tally, designed to validate the concept before building the full iOS app. The MVP includes:

- **Backend API**: Authentication, watchlist management, and planning endpoints
- **Web Landing**: Simple waitlist signup with 3-bullet value proposition (NOT the main app UI)
- **iOS App Directory**: Prepared structure for the main Swift/iOS app (not implemented yet)
- **Shared Libraries**: Type-safe schemas and core business logic
- **Dev Experience**: One command to run everything, proper linting/testing

**Note**: The main Tally app will be native iOS (Swift). The React web app is only for landing/waitlist.

## How to Run

### Prerequisites
- Node.js 18+ and npm 9+
- Copy `.env.example` to `.env` (defaults work for local dev)

### Quick Start
```bash
# Install all dependencies
npm install

# Run both API (port 4000) and web (port 3000)  
npm run dev
```

Visit:
- **Web app**: http://localhost:3000
- **API health**: http://localhost:4000/api/health

### Individual Services
```bash
npm run dev:api    # Just the backend API
npm run dev:web    # Just the web frontend
```

### Other Commands
```bash
npm run build      # Build all packages
npm run test       # Run all tests
npm run lint       # Lint all packages  
npm run typecheck  # TypeScript checking
npm run format     # Format with Prettier
```

## Using the Generated API Client

Tally provides a fully-typed TypeScript API client that's auto-generated from the OpenAPI specification:

### Installation
```bash
# Install the generated client
npm install @tally/api-client
```

### Basic Usage
```typescript
import { WatchlistApi, Configuration } from '@tally/api-client';

// Configure with JWT authentication
const config = new Configuration({
  basePath: 'http://localhost:4000',
  accessToken: 'your-jwt-token' // Bearer token from authentication
});

const watchlistApi = new WatchlistApi(config);

// Get user's watchlist (RLS-filtered automatically)
const response = await watchlistApi.apiWatchlistGet();
console.log(response.data.data.shows); // User's shows only

// Get user statistics
const stats = await watchlistApi.apiWatchlistStatsGet();
console.log(stats.data.data); // { totalShows, byStatus, averageRating }

// Update show status
await watchlistApi.apiWatchlistUserShowIdStatusPut(
  'show-uuid',
  { status: 'completed' }
);
```

### Authentication
All user-scoped endpoints require JWT authentication. Generate a test token:

```bash
# Generate a valid JWT token for testing
cd apps/api
node src/utils/generate-test-token.js
```

### API Documentation
- **Live OpenAPI Spec**: http://localhost:4000/openapi.json
- **Interactive Docs**: http://localhost:4000/docs (Swagger UI)

## Manual API Testing

For curl testing or development:

```bash
# Health check (public endpoint)
curl http://localhost:4000/api/health

# Get user watchlist (requires authentication)
curl http://localhost:4000/api/watchlist \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get watchlist statistics
curl http://localhost:4000/api/watchlist/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update show status
curl -X PUT http://localhost:4000/api/watchlist/SHOW_ID/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"status": "completed"}'
```

**Security Note**: All user data is isolated using Row-Level Security (RLS) policies. Users can only access their own data.

## Project Structure

```
/apps
  /api        # Express backend (TypeScript)
  /web        # React landing page only (TypeScript + Vite)
  /ios        # Main iOS app (Swift - not implemented yet)
/packages  
  /types      # Shared Zod schemas & TypeScript types
  /core       # Business logic (planning, savings)
  /config     # Shared configs (ESLint, TypeScript)
```

## What's Next

See `CLAUDE.md` for detailed stack decisions and next steps. Key areas for expansion:

1. **Build the iOS app** in `/apps/ios` (the main user-facing app)
2. Replace mocked data with real streaming APIs
3. Implement proper authentication and database storage  
4. Build sophisticated savings calculation algorithms

---

Built with React + Express + TypeScript. See `CLAUDE.md` for full technical details.