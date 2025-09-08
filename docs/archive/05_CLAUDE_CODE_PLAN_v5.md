# COMPLETE USER SYSTEM IMPLEMENTATION PLAN
**STATUS**: IN PROGRESS  
**CREATED**: 2025-08-29  
**ESTIMATED TOKENS**: ~80k for all features

## Overview
Transform Tally from a demo app with mock data into a fully functional personal streaming optimizer with real user data, manual content management, and comprehensive user profiles.

## Current State Analysis
- ✅ Basic watchlist API endpoints exist
- ✅ Calendar components built but using mock data
- ✅ Recommendations engine implemented
- ❌ No user management (hardcoded `USER_ID = 'user-1'`)
- ❌ Search has no "Add to Watchlist" functionality  
- ❌ Calendar uses only dummy data
- ❌ No streaming provider selection
- ❌ No way to manually add custom shows/episodes

## Implementation Phases

### **PHASE 1: USER MANAGEMENT FOUNDATION** 
*Priority: HIGH - Required for all other features*

#### Task 1.1: Test User System
- **Database**: Add `user_profiles` table extension
  ```sql
  ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
  ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
  ALTER TABLE users ADD COLUMN is_test_user BOOLEAN DEFAULT false;
  ALTER TABLE users ADD COLUMN created_by VARCHAR(50) DEFAULT 'system';
  ```

- **API Routes**: 
  - `GET /api/users` - List all test users
  - `POST /api/users` - Create new test user
  - `PUT /api/users/:id` - Update test user
  - `DELETE /api/users/:id` - Delete test user
  - `GET /api/users/:id/profile` - Get user profile with stats

- **Frontend**: User switcher component in header
  - Dropdown showing available test users
  - "Create New User" option
  - Store current user in localStorage
  - Update all existing API calls to use selected user

#### Task 1.2: Pre-populate Test Users
Create diverse test users for different scenarios:
- **"Emma Chen"** - New user (empty watchlist, exploring)
- **"Alex Rodriguez"** - Power user (15+ shows, 4 streaming services)
- **"Sarah Johnson"** - Optimizer (completed shows, savings-focused)
- **"Mike Thompson"** - Casual viewer (2-3 shows, Netflix only)

### **PHASE 2: MANUAL CONTENT MANAGEMENT**
*Priority: HIGH - Enables custom data testing*

#### Task 2.1: Manual Show Entry System
- **Database Extensions**:
  ```sql
  ALTER TABLE shows ADD COLUMN is_custom BOOLEAN DEFAULT false;
  ALTER TABLE shows ADD COLUMN created_by_user_id UUID REFERENCES users(id);
  ALTER TABLE shows ADD COLUMN custom_streaming_info JSONB;
  ```

- **API Routes**:
  - `POST /api/shows/custom` - Create custom show
  - `PUT /api/shows/:id/custom` - Edit custom show
  - `DELETE /api/shows/:id/custom` - Delete custom show
  - `POST /api/shows/:id/seasons/custom` - Add custom seasons
  - `POST /api/shows/:id/episodes/custom` - Add custom episodes

- **Frontend**: Manual Show Creation Interface
  - Form for basic show info (title, description, poster URL)
  - Streaming service assignment (which platforms have it)
  - Season/episode bulk creation tools
  - Air date scheduling for episodes
  - Integration with existing show management

#### Task 2.2: Episode Management Tools
- **Bulk Episode Creation**: "Generate 10 episodes for Season 1"
- **Individual Episode Editing**: Title, air date, duration, notes
- **Progress Management**: Set watched/unwatched status
- **Custom Air Dates**: Schedule future episodes for calendar

### **PHASE 3: SEARCH TO WATCHLIST INTEGRATION**
*Priority: HIGH - Core user functionality*

#### Task 3.1: Transform TMDB Testing → Search Shows
- **Route Change**: `/tmdb-testing` → `/search`
- **Navigation Update**: "TMDB Testing" → "Search Shows" (move to main nav)
- **Remove Development UI**: Hide JSON debug, API usage widgets
- **Focus on Search**: Clean, user-friendly search interface

#### Task 3.2: Add to Watchlist Functionality
- **Search Result Cards**: Add action buttons to each result
  - "Add to Watchlist" button
  - "Start Watching" button  
  - Quick preview on hover

- **Add Show Modal**:
  - Choose status: "Watchlist" or "Currently Watching"
  - Season selection for multi-season shows
  - Streaming service selection (where user has access)
  - Personal rating/notes input
  - Connect to existing `/api/watchlist-v2` endpoints

- **Show Availability Display**:
  - Show which streaming services have each show
  - Highlight services the user subscribes to
  - Grayed out services user doesn't have

### **PHASE 4: USER SETTINGS & STREAMING PROVIDERS**
*Priority: MEDIUM - Required for accurate recommendations*

#### Task 4.1: User Settings Page (`/settings`)
- **Navigation Addition**: Add Settings to main navigation
- **Tabbed Interface**:
  - **Profile**: Name, email, timezone, avatar
  - **Streaming Services**: Service selection and costs
  - **Preferences**: Viewing habits, notifications
  - **Data**: Export, delete account, usage stats

#### Task 4.2: Streaming Service Management
- **Database**: 
  ```sql
  CREATE TABLE user_streaming_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES streaming_services(id),
    monthly_cost DECIMAL(6,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    started_date DATE,
    ended_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- **API Routes**:
  - `GET /api/users/:id/subscriptions` - Get user's active subscriptions
  - `POST /api/users/:id/subscriptions` - Add subscription
  - `PUT /api/subscriptions/:id` - Update subscription
  - `DELETE /api/subscriptions/:id` - Remove subscription

- **Frontend Interface**:
  - Checkbox grid of available streaming services
  - Monthly cost input for each service
  - Start/end date tracking
  - Visual cost summary

### **PHASE 5: REAL CALENDAR DATA INTEGRATION**
*Priority: MEDIUM - Makes calendar actually useful*

#### Task 5.1: Calendar Data Source Tabs
- **Add Tab Interface** to Calendar page:
  - "Demo Data" tab (current mock data for showcasing)
  - "My Data" tab (based on user's actual watchlist)
  
#### Task 5.2: Real Data Calendar Implementation  
- **API Enhancement**: 
  ```typescript
  GET /api/calendar/:userId?mode=demo|real&month=2025-01
  ```

- **Real Data Logic**:
  - Pull shows from user's actual watchlist/watching
  - Use TMDB air dates for upcoming episodes
  - Calculate real streaming costs based on user's subscriptions
  - Show optimization opportunities based on actual usage

- **Calendar Display**:
  - Service bars only for subscriptions user has
  - Real show names from user's lists
  - Accurate cost/savings calculations
  - Recommendations based on user's actual patterns

### **PHASE 6: ADMIN/DEV TOOLS INTERFACE**
*Priority: LOW - Nice to have for development*

#### Task 6.1: Dev Tools Page (`/dev-tools`)
- **User Management Section**:
  - Create/edit/delete test users
  - Bulk user creation with sample data
  - User switching (same as header dropdown)

- **Content Management Section**:
  - Manual show/episode creation
  - Bulk import tools
  - Data reset/cleanup utilities

- **Development Utilities**:
  - API testing interface
  - Database inspection tools
  - Performance monitoring

### **PHASE 7: INTEGRATION & TESTING**
*Priority: HIGH - Ensure everything works together*

#### Task 7.1: Cross-Component Integration
- **User Context**: Ensure all components use selected user
- **Data Consistency**: Watchlist ↔ Calendar ↔ Recommendations
- **Navigation Flow**: Smooth transitions between features
- **Error Handling**: Graceful fallbacks when data missing

#### Task 7.2: User Experience Polish
- **Loading States**: Proper loading indicators
- **Empty States**: Helpful messages when no data
- **Success Feedback**: Confirmation messages for actions
- **Mobile Responsiveness**: All new components work on mobile

## Technical Specifications

### Database Schema Changes
```sql
-- User profiles enhancement
ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN is_test_user BOOLEAN DEFAULT false;

-- Custom content support
ALTER TABLE shows ADD COLUMN is_custom BOOLEAN DEFAULT false;
ALTER TABLE shows ADD COLUMN created_by_user_id UUID REFERENCES users(id);

-- User streaming subscriptions
CREATE TABLE user_streaming_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id),
  monthly_cost DECIMAL(6,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints to Add
- User management: `/api/users/*`
- Custom content: `/api/shows/custom`, `/api/episodes/custom`
- Subscriptions: `/api/subscriptions/*`
- Calendar data: `/api/calendar/:userId?mode=demo|real`

### New Frontend Components
- `UserSwitcher` - Header dropdown for user selection
- `UserSettings` - Settings page with tabs
- `ManualShowForm` - Custom show creation
- `AddToWatchlistModal` - Show adding interface
- `SubscriptionManager` - Streaming service selection
- `DevTools` - Development utilities

### Updated Components  
- `SearchShows` (renamed from TMDBTesting)
- `CalendarView` - Add data source tabs
- `Layout` - Add user switcher and settings link
- All API calls - Use dynamic user ID

## Success Metrics
- ✅ Can create and switch between test users
- ✅ Can manually add custom shows/episodes
- ✅ Search results have functional "Add to Watchlist" buttons
- ✅ User can set streaming subscriptions in settings
- ✅ Calendar shows real data based on user's actual watchlist
- ✅ All recommendations are based on user's real subscriptions
- ✅ Smooth user experience across all features

## Future Enhancements (Post-Implementation)
- Real user authentication system
- Social features (sharing watchlists)
- Advanced analytics and insights
- Mobile app integration
- Import from existing streaming accounts

---

**Implementation Priority Order:**
1. User Management Foundation (Phase 1) - Required for everything else
2. Manual Content Management (Phase 2) - Enables realistic testing
3. Search Integration (Phase 3) - Core user functionality  
4. Settings & Providers (Phase 4) - Required for accurate data
5. Real Calendar Data (Phase 5) - Makes calendar useful
6. Dev Tools (Phase 6) - Nice to have
7. Integration & Polish (Phase 7) - Final touches