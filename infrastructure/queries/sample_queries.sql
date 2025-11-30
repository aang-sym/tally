-- Tally Data Pipeline - Sample Athena Queries
-- Run these in the AWS Athena console

-- 1. Check total shows by partition date
SELECT
    dt as partition_date,
    data_type,
    COUNT(*) as show_count,
    AVG(popularity) as avg_popularity,
    AVG(vote_average) as avg_rating
FROM silver_shows
GROUP BY dt, data_type
ORDER BY dt DESC, data_type;

-- 2. Top 20 most popular shows (latest partition)
SELECT
    title,
    popularity,
    vote_average,
    vote_count,
    first_air_date,
    COALESCE(ARRAY_JOIN(origin_country, ', '), 'Unknown') as countries
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
ORDER BY popularity DESC
LIMIT 20;

-- 3. Shows by genre (requires genre lookup - placeholder)
SELECT
    title,
    popularity,
    vote_average,
    CAST(genre_ids AS VARCHAR) as genres
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    AND CARDINALITY(genre_ids) > 0
ORDER BY popularity DESC
LIMIT 50;

-- 4. Data quality metrics by date
SELECT
    dt,
    data_type,
    COUNT(*) as total_records,
    SUM(CASE WHEN show_id IS NULL THEN 1 ELSE 0 END) as missing_id,
    SUM(CASE WHEN title IS NULL OR title = '' THEN 1 ELSE 0 END) as missing_title,
    SUM(CASE WHEN popularity < 0 THEN 1 ELSE 0 END) as invalid_popularity,
    SUM(CASE WHEN vote_average < 0 OR vote_average > 10 THEN 1 ELSE 0 END) as invalid_rating
FROM silver_shows
GROUP BY dt, data_type
ORDER BY dt DESC;

-- 5. Shows with high engagement (high votes AND high rating)
SELECT
    title,
    vote_average,
    vote_count,
    popularity,
    first_air_date,
    overview
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    AND vote_count > 100
    AND vote_average > 7.5
ORDER BY vote_count DESC
LIMIT 30;

-- 6. Distribution of ratings
SELECT
    FLOOR(vote_average) as rating_bucket,
    COUNT(*) as show_count
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    AND vote_count > 50  -- Only shows with significant votes
GROUP BY FLOOR(vote_average)
ORDER BY rating_bucket DESC;

-- 7. Shows by language
SELECT
    original_language,
    COUNT(*) as show_count,
    AVG(popularity) as avg_popularity,
    AVG(vote_average) as avg_rating
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
GROUP BY original_language
ORDER BY show_count DESC
LIMIT 15;

-- 8. Trending shows (from trending_shows data type)
SELECT
    title,
    popularity,
    vote_average,
    first_air_date,
    overview
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    AND data_type = 'trending_shows'
ORDER BY popularity DESC
LIMIT 20;

-- 9. Recently aired shows (from airing_today data type)
SELECT
    title,
    first_air_date,
    vote_average,
    popularity,
    overview
FROM silver_shows
WHERE dt = (SELECT MAX(dt) FROM silver_shows)
    AND data_type = 'airing_today'
ORDER BY popularity DESC;

-- 10. Cross-partition analysis (trend over time)
SELECT
    dt as date,
    AVG(popularity) as avg_popularity,
    AVG(vote_average) as avg_rating,
    COUNT(*) as show_count
FROM silver_shows
WHERE dt >= DATE_FORMAT(DATE_ADD('day', -7, CURRENT_DATE), '%Y-%m-%d')
GROUP BY dt
ORDER BY dt DESC;
