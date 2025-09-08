-- TV Guide Enhancements
-- Adds per-show user buffer and selected provider; confirms users.country_code default usage

-- Per-show optional buffer days for bar extension (default 0)
ALTER TABLE user_shows 
  ADD COLUMN IF NOT EXISTS buffer_days INTEGER NOT NULL DEFAULT 0;

-- Per-show selected streaming provider (user choice) referencing streaming_services
ALTER TABLE user_shows 
  ADD COLUMN IF NOT EXISTS selected_service_id UUID REFERENCES streaming_services(id);

-- Optional per-show country override (falls back to users.country_code)
ALTER TABLE user_shows 
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_user_shows_selected_service ON user_shows(selected_service_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_country_code ON user_shows(country_code);

