-- Fix Row Level Security for Shows and User Shows Tables
-- Run this in Supabase SQL Editor

-- 1. Allow public insert access to shows table (for API to create shows from TMDB)
CREATE POLICY "Allow public insert to shows" ON shows
  FOR INSERT 
  WITH CHECK (true);

-- 2. Allow public update access to shows table (for updating show data)
CREATE POLICY "Allow public update to shows" ON shows
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 3. Allow public insert to user_shows table (for adding shows to watchlist)
CREATE POLICY "Allow public insert to user_shows" ON user_shows
  FOR INSERT 
  WITH CHECK (true);

-- 4. Allow public update to user_shows table (for updating watchlist status)
CREATE POLICY "Allow public update to user_shows" ON user_shows
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 5. Allow public insert to seasons table (for creating show seasons)
CREATE POLICY "Allow public insert to seasons" ON seasons
  FOR INSERT 
  WITH CHECK (true);

-- 6. Allow public insert to episodes table (for creating show episodes)
CREATE POLICY "Allow public insert to episodes" ON episodes
  FOR INSERT 
  WITH CHECK (true);

-- 7. Create the missing upsert_user function for user identity middleware
CREATE OR REPLACE FUNCTION public.upsert_user(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO users (id, email, password_hash, display_name, is_test_user, created_at)
  VALUES (p_user_id::uuid, p_user_id || '@temp.com', 'temp-hash', 'User ' || p_user_id, true, NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$;