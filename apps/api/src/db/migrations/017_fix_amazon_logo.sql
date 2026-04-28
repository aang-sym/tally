-- Migration 017: Fix Amazon Prime Video logo path
-- The old path /emthp39XA2YScoYL1p0sdbBSFUK.jpg returns 404 from TMDB.
-- Use the correct path /pvske1MyAoymrs5bguRfVqYiM9a.jpg (confirmed 200 at w45).

BEGIN;

UPDATE streaming_services
SET logo_path = '/pvske1MyAoymrs5bguRfVqYiM9a.jpg'
WHERE tmdb_provider_id = 9
  AND logo_path = '/emthp39XA2YScoYL1p0sdbBSFUK.jpg';

COMMIT;
