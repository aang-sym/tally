-- Migration 016: Fix Amazon provider duplicates and add missing providers
-- Problem: tmdb_provider_id=119 duplicates id=9 (both "Amazon Prime Video")
--          tmdb_provider_id=10 ("Amazon Video") is an alias for the same service
--          tmdb_provider_id=2100 ("Amazon Prime Video with Ads") is not in the table
-- Fix: migrate all references to 119/10 → 9, then remove the duplicates, add 2100

BEGIN;

-- 1. Add Amazon Prime Video with Ads (2100) if not present
INSERT INTO streaming_services (tmdb_provider_id, name, logo_path, homepage)
VALUES (2100, 'Amazon Prime Video with Ads', '/pvske1MyAoymrs5bguRfVqYiM9a.jpg', 'https://www.amazon.com/prime-video')
ON CONFLICT (tmdb_provider_id) DO NOTHING;

-- 2. Update user_shows: reassign selected_service_id from duplicate rows → canonical id=9
UPDATE user_shows
SET selected_service_id = 'ce1300ea-2414-4cb3-b0c9-6b564e6266dc'
WHERE selected_service_id IN (
  '33be4721-e6f1-4813-a475-57a81bcd10bb',  -- tmdb 119
  '18583a51-627a-4475-b790-6cf42ad917f6'   -- tmdb 10
);

-- 3. Update user_streaming_subscriptions similarly
UPDATE user_streaming_subscriptions
SET service_id = 'ce1300ea-2414-4cb3-b0c9-6b564e6266dc'
WHERE service_id IN (
  '33be4721-e6f1-4813-a475-57a81bcd10bb',
  '18583a51-627a-4475-b790-6cf42ad917f6'
);

-- 4. Delete streaming_service_tiers for duplicates (FK on service_id CASCADE would handle this,
--    but being explicit is safer)
DELETE FROM streaming_service_tiers
WHERE service_id IN (
  '33be4721-e6f1-4813-a475-57a81bcd10bb',
  '18583a51-627a-4475-b790-6cf42ad917f6'
);

-- 5. Delete the duplicate service rows
DELETE FROM streaming_services WHERE tmdb_provider_id = 119;
DELETE FROM streaming_services WHERE tmdb_provider_id = 10;

COMMIT;
