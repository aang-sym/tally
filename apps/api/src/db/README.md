# Tally Database Documentation

This directory contains database-related files for the Tally application, including migrations, utilities, and reference queries.

## 🗃️ Database Structure

### Core Tables

#### `users`
Stores user account information and preferences.
- `id` (UUID) - Primary key
- `email` (VARCHAR) - Unique user email 
- `display_name` (VARCHAR) - User's display name
- `country_code` (VARCHAR) - User's country preference
- `timezone` (VARCHAR) - User's timezone
- `is_test_user` (BOOLEAN) - Flag for development/test users

#### `shows`
Cached show information from TMDB with release pattern analysis.
- `id` (UUID) - Primary key
- `tmdb_id` (INTEGER) - TMDB show identifier
- `title` (VARCHAR) - Show title
- `overview` (TEXT) - Show description
- `poster_path` (VARCHAR) - TMDB poster URL
- `status` (VARCHAR) - 'Airing', 'Ended', 'Cancelled'
- `total_seasons` (INTEGER) - Number of seasons
- `total_episodes` (INTEGER) - Total episode count
- `release_pattern` (JSONB) - Pattern analysis results
- `tmdb_last_updated` (TIMESTAMP) - Cache TTL

#### `seasons`
Season-level information for shows.
- `id` (UUID) - Primary key  
- `show_id` (UUID) - References shows(id)
- `tmdb_season_id` (INTEGER) - TMDB season identifier
- `season_number` (INTEGER) - Season number
- `episode_count` (INTEGER) - Episodes in this season
- `air_date` (DATE) - Season premiere date

#### `episodes`
Individual episode information.
- `id` (UUID) - Primary key
- `season_id` (UUID) - References seasons(id) 
- `tmdb_episode_id` (INTEGER) - TMDB episode identifier
- `episode_number` (INTEGER) - Episode number within season
- `name` (VARCHAR) - Episode title
- `air_date` (DATE) - Episode air date
- `runtime` (INTEGER) - Episode runtime in minutes

### User Tracking Tables

#### `user_shows`
Tracks which shows users have added and their status.
- `id` (UUID) - Primary key
- `user_id` (UUID) - References users(id)
- `show_id` (UUID) - References shows(id)
- `status` (VARCHAR) - 'watchlist', 'watching', 'completed', 'dropped'
- `added_at` (TIMESTAMP) - When added to list
- `show_rating` (DECIMAL) - User's rating (0.0-10.0)
- `notes` (TEXT) - User notes

#### `user_episode_progress`
Detailed episode-by-episode watch tracking.
- `id` (UUID) - Primary key
- `user_id` (UUID) - References users(id)
- `episode_id` (UUID) - References episodes(id)
- `status` (VARCHAR) - 'unwatched', 'watching', 'watched'
- `started_watching_at` (TIMESTAMP) - When started watching
- `watched_at` (TIMESTAMP) - When marked as watched
- `episode_rating` (DECIMAL) - Episode rating (0.0-10.0)

### Streaming Service Tables

#### `streaming_services`
Available streaming services and providers.
- `id` (UUID) - Primary key
- `tmdb_provider_id` (INTEGER) - TMDB provider ID
- `name` (VARCHAR) - Service name
- `logo_path` (VARCHAR) - Service logo URL
- `homepage` (VARCHAR) - Service website

#### `user_streaming_subscriptions`
User's active streaming service subscriptions.
- `id` (UUID) - Primary key
- `user_id` (UUID) - References users(id)
- `service_id` (UUID) - References streaming_services(id)
- `monthly_cost` (DECIMAL) - Subscription cost
- `is_active` (BOOLEAN) - Current subscription status

#### `show_availability`
Where shows can be watched by country and service.
- `id` (UUID) - Primary key
- `show_id` (UUID) - References shows(id)
- `service_id` (UUID) - References streaming_services(id) 
- `country_code` (VARCHAR) - Country availability
- `availability_type` (VARCHAR) - 'subscription', 'rent', 'buy'
- `price_amount` (DECIMAL) - Cost if applicable
- `deep_link` (TEXT) - Direct link to content

## 🔧 Database Operations

### Migrations

Migrations are located in `/apps/api/src/db/migrations/` and should be run in order:

1. **001_initial_schema.sql** - Core database structure
2. **002_user_enhancements.sql** - User profile and subscription features  
3. **003_tv_guide_enhancements.sql** - TV Guide specific fields

### Running Migrations

```bash
# In Supabase SQL Editor, run each migration file in order
# Or use the Supabase CLI:
supabase db reset
```

### Connection

The database connection is managed through `/apps/api/src/db/supabase.ts`:

```typescript
import { supabase } from '../db/supabase.js';

// Example usage
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('email', 'user@example.com');
```

## 📊 Useful Queries

Common analysis queries are available in `/apps/api/src/db/queries.sql`:

### Quick User Lookup
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

### User's Show Summary
```sql
SELECT 
    s.title, 
    us.status, 
    us.added_at
FROM user_shows us
JOIN shows s ON us.show_id = s.id
JOIN users u ON us.user_id = u.id  
WHERE u.email = 'user@example.com'
ORDER BY us.added_at DESC;
```

### Episode Progress
```sql
SELECT 
    s.title,
    COUNT(*) FILTER (WHERE uep.status = 'watched') as watched,
    COUNT(*) as total
FROM user_episode_progress uep
JOIN episodes e ON uep.episode_id = e.id
JOIN seasons seas ON e.season_id = seas.id  
JOIN shows s ON seas.show_id = s.id
JOIN users u ON uep.user_id = u.id
WHERE u.email = 'user@example.com'
GROUP BY s.title;
```

## 🔐 Row Level Security (RLS)

RLS policies ensure users can only access their own data:

- **user_shows**: Users can only see their own show lists
- **user_episode_progress**: Users can only see their own watch progress  
- **user_streaming_subscriptions**: Users can only see their own subscriptions

Public tables (shows, episodes, streaming_services) are readable by all authenticated users.

## 🏗️ Data Flow

### Adding a Show
1. User adds show via `/api/watchlist-v2`
2. System fetches show data from TMDB API
3. Show/season/episode data cached in database
4. User-show relationship created in `user_shows`

### Episode Progress
1. User marks episode as watched
2. Progress recorded in `user_episode_progress` 
3. Show status auto-updated if season/show completed

### Release Pattern Analysis
1. Episode air dates analyzed for patterns
2. Results stored in `shows.release_pattern` JSONB field
3. Patterns: 'weekly', 'binge', 'premiere_weekly', 'unknown'

## 🛠️ Maintenance

### Cache Management
- Show data from TMDB has TTL via `tmdb_last_updated`
- Refresh stale data through API endpoints
- Popular shows refreshed more frequently

### Performance
- Indexes on user_id, show_id, tmdb_id for fast lookups
- JSONB indexes on release_pattern for pattern queries
- Cascade deletes to maintain referential integrity

### Backup
- Supabase handles automated backups
- Export user data via API endpoints for user data portability

## 📈 Analytics

Use the queries in `queries.sql` to analyze:
- User engagement and watching patterns  
- Popular shows and completion rates
- Streaming service usage and costs
- Release pattern effectiveness

## 🐛 Troubleshooting

### Common Issues

**Missing Episodes**: Shows without episode data
```sql
SELECT s.title, COUNT(e.id) as episode_count
FROM shows s 
LEFT JOIN seasons seas ON s.id = seas.show_id
LEFT JOIN episodes e ON seas.id = e.season_id
GROUP BY s.title
HAVING COUNT(e.id) = 0;
```

**Orphaned Records**: User progress without shows
```sql
SELECT uep.* 
FROM user_episode_progress uep
LEFT JOIN episodes e ON uep.episode_id = e.id
WHERE e.id IS NULL;
```

**Duplicate Shows**: Multiple entries for same TMDB ID
```sql
SELECT tmdb_id, COUNT(*) 
FROM shows 
GROUP BY tmdb_id 
HAVING COUNT(*) > 1;
```

## 📝 Development Notes

- Use UUID v4 for all primary keys
- Store all timestamps in UTC
- TMDB IDs are integers, internal IDs are UUIDs
- Country codes follow ISO 3166-1 alpha-2 standard
- Monetary amounts stored as DECIMAL for precision