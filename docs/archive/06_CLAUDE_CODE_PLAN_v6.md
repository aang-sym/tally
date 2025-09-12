# 06 COMPREHENSIVE DEVELOPMENT PLAN v6

**STATUS**: IN PROGRESS  
**CREATED**: 2025-08-31  
**LAST UPDATED**: 2025-08-31  
**ESTIMATED EFFORT**: ~40-50 development tasks across 2-3 weeks

## 🎯 EXECUTIVE SUMMARY

Transform Tally from a demo application with in-memory storage into a production-ready streaming optimization platform with:

- **Persistent Episode Progress Tracking** - Save and restore user watch progress
- **Complete User Authentication System** - Real user accounts and secure login
- **Clean, Optimized Codebase** - Remove duplicates, improve structure
- **Comprehensive Documentation** - Full API docs and implementation guides

---

## 📊 CURRENT STATE ANALYSIS

### ✅ RECENTLY COMPLETED (Previous Development Sessions)

- **TMDB Integration**: Full show search, analysis, and pattern detection
- **Expandable Show Interface**: Click-to-expand shows with season/episode lists
- **Episode UI**: Season dropdown, episode lists with click-to-watch functionality
- **Watchlist Bridge**: Connected TMDB search to My Shows page via shared storage
- **Simple User System**: Basic user switching with in-memory storage
- **API Consolidation**: Working watchlist-v2-simple.ts serving My Shows page

### ⚠️ CURRENT LIMITATIONS

- **Episode Progress**: Clicks work in UI but don't persist (resets on reload)
- **User Management**: Hardcoded test users, no authentication
- **Storage**: Everything in-memory, lost on server restart
- **Code Duplication**: Multiple unused route files and services
- **Database Dependencies**: Several unused services expecting Supabase

### 🎯 TARGET OUTCOME

Production-ready app where users can:

1. Create accounts and log in securely
2. Search for shows and add them to watchlist
3. Track episode progress that persists across sessions
4. View accurate progress in My Shows with season-by-season tracking
5. Get personalized recommendations based on real watch history

---

## 🚀 IMPLEMENTATION PHASES

## **PHASE 1: EPISODE PROGRESS PERSISTENCE** ⭐ HIGH PRIORITY

_Make episode tracking actually work and persist_

### 1.1 Extend Simple Storage System

**File**: `apps/api/src/storage/simple-watchlist.ts`

**Add Episode Progress Interface**:

```typescript
interface EpisodeProgress {
  showId: string;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  status: 'watched' | 'watching' | 'unwatched';
  watchedAt?: string;
  rating?: number;
}

interface UserProgress {
  userId: string;
  episodes: EpisodeProgress[];
}
```

**Extend Storage Service**:

- Add `episodeProgressStorage: Map<string, UserProgress>`
- Add `markEpisodeWatched(userId, showId, season, episode)`
- Add `getShowProgress(userId, showId)`
- Add `getUserProgress(userId)` for all shows

### 1.2 Update API Endpoints

**File**: `apps/api/src/routes/watchlist-v2-simple.ts`

**New Endpoints**:

```typescript
// Mark episode as watched (and all previous episodes)
PUT /api/watchlist-v2/:showId/progress
Body: { seasonNumber: number, episodeNumber: number, status: 'watched' }

// Get detailed progress for a show
GET /api/watchlist-v2/:showId/progress
Response: { seasons: [{ seasonNumber, episodes: [{ number, watched }] }] }

// Get user's overall progress statistics
GET /api/watchlist-v2/progress/stats
Response: { totalEpisodes, watchedEpisodes, showsInProgress, etc. }
```

**Update Existing Endpoints**:

- Modify `GET /api/watchlist-v2` to include real progress data
- Update progress.watchedEpisodes to count from stored data
- Calculate accurate progress percentages

### 1.3 Frontend Integration

**File**: `apps/web/src/pages/MyShows.tsx`

**Update Episode Handlers**:

```typescript
const markEpisodeWatched = async (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
  try {
    const response = await fetch(`${API_BASE}/api/watchlist-v2/${tmdbId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ seasonNumber, episodeNumber, status: 'watched' }),
    });

    if (response.ok) {
      // Update local state AND refresh from server
      await fetchShowProgress(tmdbId);
      updateShowProgress(tmdbId, seasonNumber, episodeNumber);
    }
  } catch (error) {
    console.error('Failed to save episode progress:', error);
  }
};
```

**Add Progress Loading**:

- Fetch real progress data when show expands
- Show loading states during episode updates
- Handle errors gracefully with user feedback

---

## **PHASE 2: USER MANAGEMENT & AUTHENTICATION** ⭐ HIGH PRIORITY

_Replace hardcoded users with real authentication system_

### 2.1 Database Schema Design

**File**: `apps/api/src/db/migrations/003_user_system.sql`

**Core User Tables**:

```sql
-- Enhanced user profiles
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- User streaming subscriptions
CREATE TABLE user_streaming_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL,
  monthly_cost DECIMAL(6,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  started_date DATE,
  ended_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User watchlist with progress
CREATE TABLE user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('watchlist', 'watching', 'completed', 'dropped')),
  added_at TIMESTAMP DEFAULT NOW(),
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  notes TEXT
);

-- Episode progress tracking
CREATE TABLE user_episode_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  watchlist_item_id UUID REFERENCES user_watchlist(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('watched', 'watching', 'unwatched')),
  watched_at TIMESTAMP,
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  UNIQUE(user_id, watchlist_item_id, season_number, episode_number)
);
```

### 2.2 Authentication System Implementation

**Files**:

- `apps/api/src/routes/auth.ts` (enhance existing)
- `apps/api/src/middleware/auth.ts` (new)
- `apps/api/src/services/AuthService.ts` (new)

**JWT Authentication**:

```typescript
// Registration endpoint
POST / api / auth / register;
Body: {
  (email, password, displayName);
}
Response: {
  (user, token, refreshToken);
}

// Login endpoint
POST / api / auth / login;
Body: {
  (email, password);
}
Response: {
  (user, token, refreshToken);
}

// Token refresh
POST / api / auth / refresh;
Body: {
  refreshToken;
}
Response: {
  (token, refreshToken);
}

// Profile management
GET / api / auth / profile(authenticated);
PUT / api / auth / profile(authenticated);
DELETE / api / auth / account(authenticated);
```

**Authentication Middleware**:

- JWT token validation
- User context injection
- Route protection
- Token refresh handling

### 2.3 Frontend Authentication System

**Files**:

- `apps/web/src/context/AuthContext.tsx` (new)
- `apps/web/src/components/LoginForm.tsx` (new)
- `apps/web/src/components/RegisterForm.tsx` (new)
- `apps/web/src/pages/Login.tsx` (new)

**Authentication Flow**:

- Login/Register pages
- Protected routes
- Automatic token refresh
- User profile management
- Logout functionality

---

## **PHASE 3: CODEBASE CLEANUP & REFACTORING** 🧹 MEDIUM PRIORITY

_Remove duplicates, unused code, and improve structure_

### 3.1 Route Consolidation

**Files to Remove/Consolidate**:

```
❌ DELETE: apps/api/src/routes/users.ts (duplicate of users-simple.ts)
❌ DELETE: apps/api/src/routes/watchlist-v2.ts (unused, depends on missing DB)
❌ DELETE: apps/api/src/routes/watchlist.ts (replaced by watchlist-v2-simple.ts)
❌ DELETE: apps/api/src/services/EpisodeProgressService.ts (unused, DB-dependent)
❌ DELETE: apps/api/src/services/RatingService.ts (unused, DB-dependent)
❌ DELETE: apps/api/src/services/ShowService.ts (unused, DB-dependent)
❌ DELETE: apps/api/src/services/StreamingService.ts (unused, DB-dependent)
❌ DELETE: apps/api/src/services/WatchlistService.ts (unused, DB-dependent)

✅ KEEP & ENHANCE: apps/api/src/routes/watchlist-v2-simple.ts
✅ KEEP & ENHANCE: apps/api/src/routes/users-simple.ts
✅ KEEP: All working routes (tmdb.ts, health.ts, etc.)
```

**Server.ts Cleanup**:

- Remove imports for deleted routes
- Clean up unused middleware
- Standardize error handling

### 3.2 Component & Service Optimization

**Frontend Cleanup**:

- Remove unused imports across all components
- Standardize error handling patterns
- Improve TypeScript type definitions
- Clean up console.log statements

**Backend Cleanup**:

- Remove TODOs and FIXME comments
- Standardize response formats
- Improve error messages
- Add consistent logging

### 3.3 Database Migration Strategy

**Migration Plan**:

1. Keep simple in-memory storage for development
2. Create database schemas for production
3. Build migration tools to transfer data
4. Implement environment-based storage selection

---

## **PHASE 4: DOCUMENTATION & PROGRESS TRACKING** 📚 MEDIUM PRIORITY

_Comprehensive documentation of all implemented features_

### 4.1 Implementation Progress Documentation

**File**: `docs/07_IMPLEMENTATION_LOG.md`

**Content**:

- Detailed log of every feature implemented
- API endpoint documentation with examples
- Database schema documentation
- Frontend component documentation
- Deployment instructions
- Troubleshooting guides

### 4.2 API Documentation

**File**: `docs/API_REFERENCE.md`

**Content**:

- Complete API endpoint reference
- Request/response examples
- Authentication flow documentation
- Error code reference
- Rate limiting information

### 4.3 Developer Documentation

**Files**:

- Update `README.md` with current feature set
- Add `CONTRIBUTING.md` for development setup
- Create `DEPLOYMENT.md` for production setup
- Add JSDoc comments throughout codebase

---

## **PHASE 5: FUTURE FEATURE PIPELINE** 🚀 FUTURE

_Roadmap for next development iteration_

### 5.1 Advanced User Features

- **Social Features**: Share watchlists, friend recommendations
- **Advanced Analytics**: Detailed viewing statistics and insights
- **Notification System**: Episode release alerts, reminder system
- **Import/Export**: Backup watchlists, import from other services

### 5.2 Performance & Scaling

- **Database Optimization**: Proper indexing, query optimization
- **Caching Layer**: Redis for frequently accessed data
- **API Rate Limiting**: Protect against abuse
- **Background Jobs**: Scheduled tasks for updates

### 5.3 Mobile & Integration

- **Mobile App**: React Native or native iOS/Android
- **Browser Extension**: Quick add to watchlist
- **Third-party Integrations**: Netflix, Hulu, etc. account linking
- **Widget/Embed**: Shareable watchlist widgets

---

## 📋 DETAILED TASK BREAKDOWN

### PHASE 1 TASKS (Episode Progress)

- [ ] 1.1.1 Add EpisodeProgress interface to simple-watchlist.ts
- [ ] 1.1.2 Implement episode progress storage methods
- [ ] 1.1.3 Add episode progress to watchlist stats
- [ ] 1.2.1 Create PUT /progress endpoint for marking episodes
- [ ] 1.2.2 Create GET /progress endpoint for retrieving progress
- [ ] 1.2.3 Update existing endpoints to use real progress data
- [ ] 1.3.1 Connect frontend episode handlers to API
- [ ] 1.3.2 Add progress loading states and error handling
- [ ] 1.3.3 Implement progress synchronization on show expand

### PHASE 2 TASKS (User Management)

- [ ] 2.1.1 Design and create database migration scripts
- [ ] 2.1.2 Set up database connection and ORM
- [ ] 2.1.3 Create user profile and watchlist tables
- [ ] 2.2.1 Implement JWT authentication service
- [ ] 2.2.2 Create registration and login endpoints
- [ ] 2.2.3 Add authentication middleware to all protected routes
- [ ] 2.3.1 Build authentication context and hooks
- [ ] 2.3.2 Create login/register UI components
- [ ] 2.3.3 Add protected route handling and redirects

### PHASE 3 TASKS (Cleanup)

- [ ] 3.1.1 Remove unused database-dependent service files
- [ ] 3.1.2 Consolidate duplicate route files
- [ ] 3.1.3 Clean up server.ts imports and middleware
- [ ] 3.2.1 Remove unused imports and TODOs across codebase
- [ ] 3.2.2 Standardize error handling patterns
- [ ] 3.2.3 Improve TypeScript type definitions
- [ ] 3.3.1 Create environment-based storage configuration
- [ ] 3.3.2 Build data migration utilities

### PHASE 4 TASKS (Documentation)

- [ ] 4.1.1 Create comprehensive implementation log
- [ ] 4.1.2 Document all API endpoints with examples
- [ ] 4.1.3 Write deployment and setup guides
- [ ] 4.2.1 Generate complete API reference documentation
- [ ] 4.2.2 Create authentication flow diagrams
- [ ] 4.2.3 Write error handling and troubleshooting guides
- [ ] 4.3.1 Update README with current feature set
- [ ] 4.3.2 Add JSDoc comments throughout codebase
- [ ] 4.3.3 Create developer onboarding documentation

---

## 🎯 SUCCESS METRICS

### Phase 1 Success Criteria

- [ ] User can mark episodes as watched and progress persists across browser sessions
- [ ] Progress bars show accurate percentages based on stored data
- [ ] Season progress displays correctly (e.g., "5/10 episodes watched in season 2")
- [ ] Episode states (watched/unwatched) load correctly when expanding shows

### Phase 2 Success Criteria

- [ ] Users can register new accounts with email/password
- [ ] Login system works with JWT tokens and proper session management
- [ ] All API endpoints require authentication and use real user IDs
- [ ] User profiles can be viewed and updated

### Phase 3 Success Criteria

- [ ] Codebase contains no duplicate or unused files
- [ ] All imports are used and no dead code remains
- [ ] Error handling is consistent across all components
- [ ] TypeScript compilation has no warnings

### Phase 4 Success Criteria

- [ ] Complete API documentation with working examples
- [ ] New developers can set up the project using documentation
- [ ] All major features are documented with screenshots
- [ ] Deployment process is fully documented

---

## ⚡ IMMEDIATE NEXT STEPS

1. **Start Phase 1.1**: Extend simple-watchlist.ts with episode progress
2. **Add episode progress API endpoints** to watchlist-v2-simple.ts
3. **Connect frontend episode clicks** to persistent API calls
4. **Test episode progress persistence** across browser sessions
5. **Move to Phase 2** once episode tracking works perfectly

---

## 📝 DEVELOPMENT NOTES

### Current Working Architecture

- **Frontend**: React + TypeScript + Vite (port 3000)
- **Backend**: Node.js + Express + TypeScript (port 4000)
- **Storage**: In-memory Maps (simple-watchlist.ts, users-simple.ts)
- **TMDB Integration**: Working with real API for show data
- **User System**: Simple hardcoded test users with switching

### Key Files Currently in Use

- `apps/api/src/routes/watchlist-v2-simple.ts` - Main watchlist API
- `apps/api/src/routes/users-simple.ts` - User management API
- `apps/api/src/routes/tmdb.ts` - TMDB integration and search
- `apps/api/src/storage/simple-watchlist.ts` - Shared storage
- `apps/web/src/pages/MyShows.tsx` - Main watchlist interface
- `apps/web/src/pages/SearchShows.tsx` - Show search and analysis

### Development Environment

- API running on `npm run dev:api`
- Frontend running on `npm run dev:web`
- TMDB API key configured and working
- All core functionality operational

---

**PRIORITY EXECUTION ORDER**:
Phase 1 (Episode Persistence) → Phase 2 (User Auth) → Phase 3 (Cleanup) → Phase 4 (Documentation) → Phase 5 (Future)
