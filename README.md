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

# Run both API (port 3001) and web (port 3000)  
npm run dev
```

Visit:
- **Web app**: http://localhost:3000
- **API health**: http://localhost:3001/api/health

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

## API Testing

The API is fully functional. Here are curl examples:

```bash
# Health check
curl http://localhost:3001/api/health

# Join waitlist
curl -X POST http://localhost:3001/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "country": "US"}'

# Register user (stubbed auth)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Login (returns stub token)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Get watchlist (requires auth)
curl http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_USER_ID"

# Add to watchlist
curl -X POST http://localhost:3001/api/watchlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer stub_token_USER_ID" \
  -d '{"titleId": "1", "title": "Stranger Things", "serviceId": "netflix", "serviceName": "Netflix"}'

# Generate savings plan
curl -X POST http://localhost:3001/api/plan/generate \
  -H "Content-Type: application/json"
```

Replace `USER_ID` in the Bearer token with the actual user ID returned from login.

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