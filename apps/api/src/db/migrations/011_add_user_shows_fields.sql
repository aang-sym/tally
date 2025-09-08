-- 011_add_user_shows_fields.sql

ALTER TABLE user_shows
ADD COLUMN buffer_days INTEGER DEFAULT 0,
ADD COLUMN country_code TEXT,
ADD COLUMN streaming_provider_id INTEGER;

-- Add RLS policy for update on user_shows
DROP POLICY IF EXISTS user_shows_update_own ON user_shows;
CREATE POLICY user_shows_update_own
ON user_shows FOR UPDATE
USING (user_id = auth.uid());