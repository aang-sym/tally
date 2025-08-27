# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack Decisions

**Web Landing**: React 18 + TypeScript + Vite + Tailwind CSS
- React ONLY for the landing page and waitlist (not the main app)
- Vite for fast development and modern bundling
- Tailwind for consistent, utility-first styling
- TypeScript for type safety across the stack

**Main App UI**: Swift/iOS (not implemented yet)
- The actual Tally app will be native iOS (Swift + SwiftUI)
- React web is just for landing/waitlist validation
- API designed specifically for iOS client consumption

**Backend**: Node.js + Express + TypeScript
- Express for simple, well-documented REST API
- TypeScript for end-to-end type safety with shared types
- Zod for runtime validation of API inputs/outputs

**Monorepo**: npm workspaces + iOS app
- `/apps/api` - Express backend service
- `/apps/web` - React landing page (waitlist only)
- `/apps/ios` - Swift/iOS main app (not implemented yet)
- `/packages/types` - Shared TypeScript types and Zod schemas  
- `/packages/core` - Pure business logic (planning, savings calculations)
- `/packages/config` - Shared configs (ESLint, TypeScript, Prettier)

**Data Storage**: In-memory with organized interfaces
- Easy to swap for PostgreSQL/SQLite later
- Stores: users, watchlists, waitlist entries
- All database operations isolated in `/apps/api/src/storage/`

**Testing**: Vitest for unit tests, supertest for API tests

## Development Commands

```bash
# Install dependencies
npm install

# Run everything in development  
npm run dev

# Run individual services
npm run dev:api    # API server on :3001
npm run dev:web    # Web frontend on :3000

# Build all packages
npm run build

# Lint and typecheck
npm run lint
npm run typecheck

# Run tests
npm run test

# Format code
npm run format
```

## API Endpoints (All Implemented)

**Health & Waitlist**:
- `GET /api/health` - Health check
- `POST /api/waitlist` - Add email to waitlist

**Authentication (Stubbed)**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  

**Watchlist (Requires auth token)**:
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add item to watchlist
- `DELETE /api/watchlist/:id` - Remove item

**Planning**:
- `POST /api/plan/generate` - Get mock activation windows and savings

## What's Mocked vs Real

**Real**:
- Full monorepo structure with proper TypeScript configs
- Working React landing page with waitlist form
- Complete Express API with all endpoints
- Runtime validation with Zod schemas
- Basic error handling and CORS setup

**Mocked/Stubbed**:
- Authentication (returns stub tokens, no JWT)
- Password hashing (stores plaintext for now)
- Streaming service data (hardcoded mock services)
- Savings calculations (simple placeholder math)
- Plan generation (returns hardcoded activation windows)

## Architecture Notes

- **Type Safety**: Shared types in `@tally/types` ensure consistency between frontend/backend
- **Validation**: All API endpoints validate inputs/outputs with Zod schemas
- **Error Handling**: Consistent error shapes with proper HTTP status codes
- **Storage Layer**: Organized to easily swap in-memory stores with real database
- **Future iOS**: API designed with mobile clients in mind (RESTful, JSON responses)

## Next Steps After This Scaffold

1. **Replace mocks with real data sources**:
   - Integrate with TMDB API for show/movie data
   - Add real streaming service APIs or web scraping
   - Implement actual savings calculations based on user data

2. **Add auth sessions + storage**:
   - Implement proper JWT authentication
   - Add password hashing with bcrypt
   - Switch to PostgreSQL or SQLite database
   - Add user session management

3. **Enhance savings math in `/packages/core`**:
   - Build sophisticated planning algorithms
   - Add historical usage analysis  
   - Account for bundle deals and promotions
   - Include more comprehensive test coverage

4. **Build the iOS app in `/apps/ios`**:
   - Create Xcode project with SwiftUI
   - Generate Swift models from TypeScript types (consider tools like quicktype)
   - Implement API client for all endpoints
   - Add proper API documentation (OpenAPI/Swagger)
   - Implement push notifications for subscription reminders