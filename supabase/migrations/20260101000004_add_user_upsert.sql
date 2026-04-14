-- Migration: Add user upsert function and last_seen column

-- 1. Add last_seen column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create index for last_seen_at
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);

-- 3. Create the upsert_user function
CREATE OR REPLACE FUNCTION upsert_user(p_user_id UUID, p_display_name TEXT DEFAULT NULL, p_email TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, display_name, email, last_seen_at)
  VALUES (p_user_id, p_display_name, p_email, NOW())
  ON CONFLICT (id) DO UPDATE
    SET last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. Update existing users with a last_seen_at value
UPDATE users SET last_seen_at = NOW() WHERE last_seen_at IS NULL;
