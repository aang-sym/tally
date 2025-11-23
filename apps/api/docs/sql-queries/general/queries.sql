-- Tally Database Analysis Queries
-- Collection of useful SQL queries for analyzing user data in Supabase
-- Run these in the Supabase SQL Editor or your preferred SQL client

-- =============================================================================
-- USER QUERIES
-- =============================================================================

-- 1. Find all users with basic stats
SELECT 
    u.id,
    u.display_name,
    u.email,
    u.country_code,
    u.is_test_user,
    u.created_at,
    COUNT(DISTINCT us.show_id) as total_shows,
    COUNT(DISTINCT CASE WHEN us.status = 'watching' THEN us.show_id END) as currently_watching,
    COUNT(DISTINCT CASE WHEN us.status = 'watchlist' THEN us.show_id END) as in_watchlist,
    COUNT(DISTINCT CASE WHEN us.status = 'completed' THEN us.show_id END) as completed_shows
FROM users u
LEFT JOIN user_shows us ON u.id = us.user_id
GROUP BY u.id, u.display_name, u.email, u.country_code, u.is_test_user, u.created_at
ORDER BY u.created_at DESC;

-- 2. Find specific user by email
SELECT * FROM users WHERE email = 'your-email@example.com';

-- =============================================================================
-- USER SHOW TRACKING QUERIES
-- =============================================================================

-- 3. Get all shows for a specific user with details
SELECT 
    us.id as user_show_id,
    us.status,
    us.added_at,
    us.show_rating,
    us.notes,
    s.title,
    s.tmdb_id,
    s.poster_path,
    s.status as show_status,
    s.total_seasons,
    s.total_episodes,
    s.first_air_date,
    s.last_air_date
FROM user_shows us
JOIN shows s ON us.show_id = s.id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com'  -- Replace with actual email
ORDER BY us.added_at DESC;

-- 4. Get shows by status for a user
SELECT 
    s.title,
    s.tmdb_id,
    us.added_at,
    us.show_rating
FROM user_shows us
JOIN shows s ON us.show_id = s.id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com'
  AND us.status = 'watching'  -- Change to 'watchlist', 'completed', 'dropped'
ORDER BY us.added_at DESC;

-- =============================================================================
-- EPISODE PROGRESS QUERIES
-- =============================================================================

-- 5. Get detailed episode watch progress for a user
SELECT 
    s.title as show_title,
    s.tmdb_id,
    seas.season_number,
    e.episode_number,
    e.name as episode_title,
    e.air_date,
    uep.status as watch_status,
    uep.started_watching_at,
    uep.watched_at,
    uep.episode_rating
FROM user_episode_progress uep
JOIN episodes e ON uep.episode_id = e.id
JOIN seasons seas ON e.season_id = seas.id
JOIN shows s ON seas.show_id = s.id
JOIN users u ON uep.user_id = u.id
WHERE u.email = 'your-email@example.com'
ORDER BY s.title, seas.season_number, e.episode_number;

-- 6. Get only watched episodes for a user
SELECT 
    s.title as show_title,
    seas.season_number,
    e.episode_number,
    e.name as episode_title,
    uep.watched_at,
    uep.episode_rating
FROM user_episode_progress uep
JOIN episodes e ON uep.episode_id = e.id
JOIN seasons seas ON e.season_id = seas.id
JOIN shows s ON seas.show_id = s.id
JOIN users u ON uep.user_id = u.id
WHERE u.email = 'your-email@example.com'
  AND uep.status = 'watched'
  AND uep.watched_at IS NOT NULL
ORDER BY uep.watched_at DESC;

-- 7. Get show progress with completion percentages
SELECT 
    s.title,
    s.tmdb_id,
    us.status as show_status,
    COUNT(DISTINCT e.id) as total_episodes,
    COUNT(DISTINCT CASE WHEN uep.status = 'watched' THEN uep.episode_id END) as watched_episodes,
    ROUND(
        (COUNT(DISTINCT CASE WHEN uep.status = 'watched' THEN uep.episode_id END)::decimal / 
         NULLIF(COUNT(DISTINCT e.id), 0)) * 100, 
        2
    ) as completion_percentage,
    AVG(uep.episode_rating) as avg_episode_rating
FROM user_shows us
JOIN shows s ON us.show_id = s.id
JOIN seasons seas ON s.id = seas.show_id
JOIN episodes e ON seas.id = e.season_id
LEFT JOIN user_episode_progress uep ON e.id = uep.episode_id 
    AND uep.user_id = us.user_id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com'
GROUP BY s.id, s.title, s.tmdb_id, us.status
HAVING COUNT(DISTINCT e.id) > 0
ORDER BY completion_percentage DESC, s.title;

-- =============================================================================
-- RECENT ACTIVITY QUERIES
-- =============================================================================

-- 8. Recent watching activity (last 20 episodes)
SELECT 
    s.title as show_title,
    seas.season_number,
    e.episode_number,
    e.name as episode_title,
    e.air_date,
    uep.watched_at,
    uep.episode_rating,
    EXTRACT(DAY FROM NOW() - uep.watched_at) as days_ago
FROM user_episode_progress uep
JOIN episodes e ON uep.episode_id = e.id
JOIN seasons seas ON e.season_id = seas.id
JOIN shows s ON seas.show_id = s.id
JOIN users u ON uep.user_id = u.id
WHERE u.email = 'your-email@example.com'
  AND uep.status = 'watched'
  AND uep.watched_at IS NOT NULL
ORDER BY uep.watched_at DESC
LIMIT 20;

-- 9. Recently added shows
SELECT 
    s.title,
    us.status,
    us.added_at,
    EXTRACT(DAY FROM NOW() - us.added_at) as days_ago
FROM user_shows us
JOIN shows s ON us.show_id = s.id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com'
ORDER BY us.added_at DESC
LIMIT 10;

-- =============================================================================
-- USER STATISTICS QUERIES
-- =============================================================================

-- 10. Comprehensive user viewing statistics
SELECT 
    u.display_name,
    u.email,
    u.created_at as user_since,
    COUNT(DISTINCT us.show_id) as total_shows,
    COUNT(CASE WHEN us.status = 'watching' THEN 1 END) as currently_watching,
    COUNT(CASE WHEN us.status = 'watchlist' THEN 1 END) as in_watchlist,
    COUNT(CASE WHEN us.status = 'completed' THEN 1 END) as completed_shows,
    COUNT(CASE WHEN us.status = 'dropped' THEN 1 END) as dropped_shows,
    COUNT(DISTINCT uep.episode_id) FILTER (WHERE uep.status = 'watched') as total_episodes_watched,
    AVG(us.show_rating) FILTER (WHERE us.show_rating IS NOT NULL) as avg_show_rating,
    AVG(uep.episode_rating) FILTER (WHERE uep.episode_rating IS NOT NULL) as avg_episode_rating,
    MAX(uep.watched_at) as last_watched_episode
FROM users u
LEFT JOIN user_shows us ON u.id = us.user_id
LEFT JOIN user_episode_progress uep ON u.id = uep.user_id
WHERE u.email = 'your-email@example.com'
GROUP BY u.id, u.display_name, u.email, u.created_at;

-- 11. User's top rated shows
SELECT 
    s.title,
    us.show_rating,
    us.status,
    s.total_episodes,
    COUNT(DISTINCT uep.episode_id) FILTER (WHERE uep.status = 'watched') as watched_episodes
FROM user_shows us
JOIN shows s ON us.show_id = s.id
LEFT JOIN seasons seas ON s.id = seas.show_id
LEFT JOIN episodes e ON seas.id = e.season_id
LEFT JOIN user_episode_progress uep ON e.id = uep.episode_id AND uep.user_id = us.user_id
JOIN users u ON us.user_id = u.id
WHERE u.email = 'your-email@example.com'
  AND us.show_rating IS NOT NULL
GROUP BY s.id, s.title, us.show_rating, us.status, s.total_episodes
ORDER BY us.show_rating DESC, s.title;

-- =============================================================================
-- SHOW & CONTENT ANALYSIS QUERIES
-- =============================================================================

-- 12. Most popular shows across all users
SELECT 
    s.title,
    s.tmdb_id,
    COUNT(DISTINCT us.user_id) as user_count,
    COUNT(CASE WHEN us.status = 'watching' THEN 1 END) as currently_watching_count,
    COUNT(CASE WHEN us.status = 'completed' THEN 1 END) as completed_count,
    AVG(us.show_rating) FILTER (WHERE us.show_rating IS NOT NULL) as avg_rating
FROM shows s
LEFT JOIN user_shows us ON s.id = us.show_id
GROUP BY s.id, s.title, s.tmdb_id
HAVING COUNT(DISTINCT us.user_id) > 0
ORDER BY user_count DESC, avg_rating DESC
LIMIT 20;

-- 13. Shows with release pattern analysis
SELECT 
    s.title,
    s.tmdb_id,
    s.first_air_date,
    s.last_air_date,
    s.total_seasons,
    s.total_episodes,
    s.release_pattern->>'pattern' as release_pattern,
    s.release_pattern->>'confidence' as pattern_confidence
FROM shows s
WHERE s.release_pattern IS NOT NULL
ORDER BY s.title;

-- =============================================================================
-- STREAMING SERVICE QUERIES
-- =============================================================================

-- 14. User's streaming subscriptions
SELECT 
    u.display_name,
    ss.name as service_name,
    uss.monthly_cost,
    uss.is_active,
    uss.started_date,
    uss.ended_date
FROM user_streaming_subscriptions uss
JOIN streaming_services ss ON uss.service_id = ss.id
JOIN users u ON uss.user_id = u.id
WHERE u.email = 'your-email@example.com'
ORDER BY uss.is_active DESC, ss.name;

-- 15. Show availability by streaming service
SELECT 
    s.title,
    ss.name as streaming_service,
    sa.availability_type,
    sa.country_code,
    sa.price_amount,
    sa.price_currency,
    sa.updated_at
FROM show_availability sa
JOIN shows s ON sa.show_id = s.id
JOIN streaming_services ss ON sa.service_id = ss.id
WHERE sa.country_code = 'AU'  -- Change to your country
  AND s.title ILIKE '%alien%'  -- Change to show you're interested in
ORDER BY s.title, ss.name;

-- =============================================================================
-- TROUBLESHOOTING QUERIES
-- =============================================================================

-- 16. Find shows without episodes
SELECT 
    s.title,
    s.tmdb_id,
    s.total_seasons,
    COUNT(DISTINCT seas.id) as seasons_in_db,
    COUNT(DISTINCT e.id) as episodes_in_db
FROM shows s
LEFT JOIN seasons seas ON s.id = seas.show_id
LEFT JOIN episodes e ON seas.id = e.season_id
GROUP BY s.id, s.title, s.tmdb_id, s.total_seasons
HAVING COUNT(DISTINCT e.id) = 0
ORDER BY s.title;

-- 17. Find users with no shows
SELECT 
    u.display_name,
    u.email,
    u.created_at,
    COUNT(us.id) as show_count
FROM users u
LEFT JOIN user_shows us ON u.id = us.user_id
GROUP BY u.id, u.display_name, u.email, u.created_at
HAVING COUNT(us.id) = 0
ORDER BY u.created_at DESC;

-- 18. Database health check - table counts
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'shows', COUNT(*) FROM shows
UNION ALL  
SELECT 'seasons', COUNT(*) FROM seasons
UNION ALL
SELECT 'episodes', COUNT(*) FROM episodes  
UNION ALL
SELECT 'user_shows', COUNT(*) FROM user_shows
UNION ALL
SELECT 'user_episode_progress', COUNT(*) FROM user_episode_progress
UNION ALL
SELECT 'streaming_services', COUNT(*) FROM streaming_services
UNION ALL
SELECT 'show_availability', COUNT(*) FROM show_availability;

-- =============================================================================
-- NOTES
-- =============================================================================

-- To use these queries:
-- 1. Replace 'your-email@example.com' with the actual user email you want to query
-- 2. Adjust country codes (e.g., 'AU', 'US') to match your region
-- 3. Modify show titles in ILIKE clauses to search for specific shows
-- 4. Run in Supabase SQL Editor or your preferred PostgreSQL client

-- Query Performance Tips:
-- - Add LIMIT clauses to large result sets
-- - Use indexes on frequently queried columns (user_id, show_id, tmdb_id)
-- - Filter by date ranges for better performance on time-based queries