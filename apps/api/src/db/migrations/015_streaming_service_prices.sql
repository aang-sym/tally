-- Migration 015: Add streaming service price tiers (TAL-26)
-- Canonical monthly prices for all major streaming services and their tiers.
-- Used by the savings math (TAL-40) to calculate pause recommendations.

BEGIN;

CREATE TABLE IF NOT EXISTS streaming_service_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES streaming_services(id) ON DELETE CASCADE,
  tier_name VARCHAR(50) NOT NULL,          -- e.g. 'with_ads', 'standard', 'premium'
  tier_label VARCHAR(100) NOT NULL,        -- human-readable, e.g. 'Standard with Ads'
  monthly_price_usd DECIMAL(6,2) NOT NULL,
  annual_price_usd DECIMAL(8,2),           -- full annual cost (null if no annual plan)
  max_streams INTEGER,
  max_resolution VARCHAR(10),              -- '1080p', '4K'
  has_downloads BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,        -- the tier shown when user picks this service
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(service_id, tier_name)
);

ALTER TABLE streaming_service_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service tiers are publicly readable" ON streaming_service_tiers FOR SELECT USING (true);

-- Also add Amazon Prime Video and Max (HBO Max renamed) if not already present
INSERT INTO streaming_services (tmdb_provider_id, name, logo_path, homepage) VALUES
(9,   'Amazon Prime Video', '/emthp39XA2YScoYL1p0sdbBSFUK.jpg', 'https://www.amazon.com/prime-video'),
(1899,'Max',                '/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg', 'https://www.max.com'),
(386, 'Peacock',            '/xTVM8uXT9QocigQ07YGlEFzCFib.jpg', 'https://www.peacocktv.com'),
(10,  'Amazon Video',       '/emthp39XA2YScoYL1p0sdbBSFUK.jpg', 'https://www.amazon.com/video'),
(350, 'Apple TV',           '/peURlLlr8jggOwK53fJ5wdQl05y.jpg', 'https://tv.apple.com'),
(283, 'Crunchyroll',        '/8Gt1iClBlzTeQs8WQm8UrCoIxnQ.jpg', 'https://www.crunchyroll.com')
ON CONFLICT (tmdb_provider_id) DO UPDATE SET name = EXCLUDED.name;

-- Netflix
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'standard_ads',  'Standard with Ads',  6.99,  null,   2, '1080p', false, false FROM streaming_services WHERE tmdb_provider_id = 8
UNION ALL
SELECT id, 'standard',      'Standard',           15.49, null,   2, '1080p', true,  true  FROM streaming_services WHERE tmdb_provider_id = 8
UNION ALL
SELECT id, 'premium',       'Premium',            22.99, null,   4, '4K',    true,  false FROM streaming_services WHERE tmdb_provider_id = 8
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Disney+
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'basic_ads', 'Basic (With Ads)',  7.99, null,   4, '1080p', false, false FROM streaming_services WHERE tmdb_provider_id = 337
UNION ALL
SELECT id, 'standard',  'Standard',         13.99, 139.99, 4, '1080p', true,  true  FROM streaming_services WHERE tmdb_provider_id = 337
UNION ALL
SELECT id, 'premium',   'Premium',          13.99, 139.99, 4, '4K',    true,  false FROM streaming_services WHERE tmdb_provider_id = 337
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Max (HBO Max)
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'with_ads',  'With Ads',   9.99, null,   2, '1080p', false, false FROM streaming_services WHERE tmdb_provider_id = 1899
UNION ALL
SELECT id, 'ad_free',   'Ad Free',   15.99, 149.99, 2, '1080p', true,  true  FROM streaming_services WHERE tmdb_provider_id = 1899
UNION ALL
SELECT id, 'ultimate',  'Ultimate',  19.99, 199.99, 4, '4K',    true,  false FROM streaming_services WHERE tmdb_provider_id = 1899
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Hulu
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'with_ads',    'With Ads',         7.99, 79.99,  2, '1080p', false, true  FROM streaming_services WHERE tmdb_provider_id = 15
UNION ALL
SELECT id, 'no_ads',      'No Ads',          17.99, null,   2, '1080p', true,  false FROM streaming_services WHERE tmdb_provider_id = 15
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Apple TV+
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'standard', 'Apple TV+', 9.99, 99.00, 6, '4K', true, true FROM streaming_services WHERE tmdb_provider_id = 2
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Paramount+
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'essential', 'Essential (With Ads)', 7.99,  59.99, 3, '1080p', false, true  FROM streaming_services WHERE tmdb_provider_id = 531
UNION ALL
SELECT id, 'with_showtime', 'With SHOWTIME',    13.99, 119.99, 3, '1080p', true,  false FROM streaming_services WHERE tmdb_provider_id = 531
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Amazon Prime Video
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'with_ads', 'With Ads', 8.99,  null,  3, '4K', false, false FROM streaming_services WHERE tmdb_provider_id = 9
UNION ALL
SELECT id, 'standard', 'Prime',    8.99, 139.00, 3, '4K', true,  true  FROM streaming_services WHERE tmdb_provider_id = 9
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

-- Peacock
INSERT INTO streaming_service_tiers (service_id, tier_name, tier_label, monthly_price_usd, annual_price_usd, max_streams, max_resolution, has_downloads, is_default)
SELECT id, 'with_ads', 'With Ads',   7.99, 79.99,  3, '1080p', false, true  FROM streaming_services WHERE tmdb_provider_id = 386
UNION ALL
SELECT id, 'premium',  'Premium',   13.99, 139.99, 3, '1080p', true,  false FROM streaming_services WHERE tmdb_provider_id = 386
ON CONFLICT (service_id, tier_name) DO UPDATE SET monthly_price_usd = EXCLUDED.monthly_price_usd;

COMMIT;
