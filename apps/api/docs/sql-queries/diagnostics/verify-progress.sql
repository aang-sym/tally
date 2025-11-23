-- Verify User Progress in Database
-- Run this in Supabase SQL Editor to check if Emma Chen's Alien: Earth progress was saved

-- 1. Check Emma Chen's watchlist (should show Alien: Earth)
SELECT 
    u.display_name as user_name,
    u.email,
    s.title as show_title,
    s.tmdb_id,
    us.status,
    us.added_at,
    us.buffer_days,
    us.selected_service_id,
    us.country_code
FROM user_shows us
JOIN users u ON us.user_id = u.id
JOIN shows s ON us.show_id = s.id
WHERE u.display_name = 'Emma Chen'
ORDER BY us.added_at DESC;

-- 2. Check episode progress for Emma Chen (should show S1E5 progress if it was tracked)
SELECT 
    u.display_name as user_name,
    s.title as show_title,
    seas.season_number,
    e.episode_number,
    e.name as episode_title,
    e.air_date,
    uep.status as watch_status,
    uep.started_watching_at,
    uep.watched_at,
    uep.episode_rating
FROM user_episode_progress uep
JOIN users u ON uep.user_id = u.id
JOIN episodes e ON uep.episode_id = e.id
JOIN seasons seas ON e.season_id = seas.id
JOIN shows s ON seas.show_id = s.id
WHERE u.display_name = 'Emma Chen'
  AND s.title ILIKE '%alien%'
ORDER BY seas.season_number, e.episode_number;

-- 3. Check all shows in database (to see if Alien: Earth was created)
SELECT 
    title,
    tmdb_id,
    status,
    total_seasons,
    total_episodes,
    release_pattern->>'pattern' as pattern,
    release_pattern->>'confidence' as confidence,
    first_air_date,
    last_air_date,
    created_at
FROM shows 
WHERE title ILIKE '%alien%' 
   OR title ILIKE '%earth%'
ORDER BY created_at DESC;

-- 4. Check all seasons/episodes for Alien: Earth shows
SELECT 
    s.title as show_title,
    seas.season_number,
    seas.episode_count,
    seas.air_date as season_air_date,
    COUNT(e.id) as episodes_in_db
FROM shows s
JOIN seasons seas ON s.id = seas.show_id
LEFT JOIN episodes e ON seas.id = e.season_id
WHERE s.title ILIKE '%alien%' OR s.title ILIKE '%earth%'
GROUP BY s.title, seas.season_number, seas.episode_count, seas.air_date
ORDER BY s.title, seas.season_number;

-- 5. Summary: Emma Chen's activity
SELECT 
    'Emma Chen Activity Summary' as summary,
    COUNT(DISTINCT us.show_id) as shows_in_watchlist,
    COUNT(DISTINCT uep.episode_id) as episodes_with_progress,
    COUNT(DISTINCT CASE WHEN uep.status = 'watched' THEN uep.episode_id END) as episodes_watched
FROM users u
LEFT JOIN user_shows us ON u.id = us.user_id
LEFT JOIN user_episode_progress uep ON u.id = uep.user_id
WHERE u.display_name = 'Emma Chen';