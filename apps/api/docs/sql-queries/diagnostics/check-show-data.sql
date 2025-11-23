-- Check the actual data being returned by the watchlist query for Emma Chen
-- This query mimics the WatchlistService.getUserWatchlist() method

SELECT 
    us.id,
    us.user_id,
    us.show_id,
    us.status,
    us.added_at,
    -- Shows table data (what should be included)
    s.id as show_db_id,
    s.tmdb_id as show_tmdb_id,
    s.title as show_title,
    s.overview as show_overview,
    s.poster_path as show_poster,
    s.status as show_status,
    s.total_episodes as show_total_episodes
FROM user_shows us
JOIN users u ON us.user_id = u.id
LEFT JOIN shows s ON us.show_id = s.id
WHERE u.display_name = 'Emma Chen'
ORDER BY us.added_at DESC;

-- Also check if there are any orphaned user_shows entries (show_id doesn't exist in shows table)
SELECT 
    us.id,
    us.user_id,
    us.show_id,
    us.status,
    CASE 
        WHEN s.id IS NULL THEN 'ORPHANED - Show does not exist'
        ELSE 'OK'
    END as show_status
FROM user_shows us
JOIN users u ON us.user_id = u.id
LEFT JOIN shows s ON us.show_id = s.id
WHERE u.display_name = 'Emma Chen';