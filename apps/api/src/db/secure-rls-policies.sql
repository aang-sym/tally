-- Drop old/redundant policies
DROP POLICY IF EXISTS "Anyone can view episodes" ON public.episodes;
DROP POLICY IF EXISTS "Episodes are publicly readable" ON public.episodes;
DROP POLICY IF EXISTS "Anyone can view seasons" ON public.seasons;
DROP POLICY IF EXISTS "Seasons are publicly readable" ON public.seasons;
DROP POLICY IF EXISTS "Anyone can view show_availability" ON public.show_availability;
DROP POLICY IF EXISTS "Show availability is publicly readable" ON public.show_availability;
DROP POLICY IF EXISTS "Anyone can view shows" ON public.shows;
DROP POLICY IF EXISTS "Shows are publicly readable" ON public.shows;
DROP POLICY IF EXISTS "Anyone can view streaming_services" ON public.streaming_services;
DROP POLICY IF EXISTS "Streaming services are publicly readable" ON public.streaming_services;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_episode_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_episode_progress;
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.user_season_ratings;
DROP POLICY IF EXISTS "Users can view own ratings" ON public.user_season_ratings;
DROP POLICY IF EXISTS "Users can manage own shows" ON public.user_shows;
DROP POLICY IF EXISTS "Users can view own shows" ON public.user_shows;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- SECURE ROW LEVEL SECURITY POLICIES
-- This file replaces the insecure USING (true) policies with proper user-specific RLS
-- Run this in Supabase SQL Editor to implement proper security

-- =================
-- USERS TABLE
-- =================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow public read access to users" ON users;
DROP POLICY IF EXISTS "Allow public insert to users" ON users;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Allow user signup" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow signup (public insert for new users)
CREATE POLICY "Allow user signup" ON users
  FOR INSERT 
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =================
-- USER_SHOWS TABLE (Watchlist)
-- =================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow public access to user_shows" ON user_shows;
DROP POLICY IF EXISTS "Allow public insert to user_shows" ON user_shows;
DROP POLICY IF EXISTS "Allow public update to user_shows" ON user_shows;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Users can access own shows" ON user_shows;
DROP POLICY IF EXISTS "Users can add own shows" ON user_shows;
DROP POLICY IF EXISTS "Users can update own shows" ON user_shows;
DROP POLICY IF EXISTS "Users can delete own shows" ON user_shows;

-- Users can only access their own shows
CREATE POLICY "Users can access own shows" ON user_shows
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can add shows to their own watchlist
CREATE POLICY "Users can add own shows" ON user_shows
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own show status
CREATE POLICY "Users can update own shows" ON user_shows
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shows
CREATE POLICY "Users can delete own shows" ON user_shows
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =================
-- USER_EPISODE_PROGRESS TABLE
-- =================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow public access to user_episode_progress" ON user_episode_progress;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Users can access own episode progress" ON user_episode_progress;
DROP POLICY IF EXISTS "Users can create own episode progress" ON user_episode_progress;
DROP POLICY IF EXISTS "Users can update own episode progress" ON user_episode_progress;
DROP POLICY IF EXISTS "Users can delete own episode progress" ON user_episode_progress;

-- Users can only access their own episode progress
CREATE POLICY "Users can access own episode progress" ON user_episode_progress
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own episode progress
CREATE POLICY "Users can create own episode progress" ON user_episode_progress
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own episode progress
CREATE POLICY "Users can update own episode progress" ON user_episode_progress
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own episode progress
CREATE POLICY "Users can delete own episode progress" ON user_episode_progress
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =================
-- USER_SEASON_RATINGS TABLE
-- =================

-- Drop existing insecure policies (if table exists)
DROP POLICY IF EXISTS "Allow public access to user_season_ratings" ON user_season_ratings;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Users can access own season ratings" ON user_season_ratings;
DROP POLICY IF EXISTS "Users can create own season ratings" ON user_season_ratings;
DROP POLICY IF EXISTS "Users can update own season ratings" ON user_season_ratings;
DROP POLICY IF EXISTS "Users can delete own season ratings" ON user_season_ratings;

-- Users can only access their own season ratings
CREATE POLICY "Users can access own season ratings" ON user_season_ratings
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own season ratings
CREATE POLICY "Users can create own season ratings" ON user_season_ratings
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own season ratings
CREATE POLICY "Users can update own season ratings" ON user_season_ratings
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own season ratings
CREATE POLICY "Users can delete own season ratings" ON user_season_ratings
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =================
-- USER_STREAMING_SUBSCRIPTIONS TABLE
-- =================

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Users can access own subscriptions" ON user_streaming_subscriptions;
DROP POLICY IF EXISTS "Users can create own subscriptions" ON user_streaming_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON user_streaming_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON user_streaming_subscriptions;

-- Users can only access their own subscriptions
CREATE POLICY "Users can access own subscriptions" ON user_streaming_subscriptions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions" ON user_streaming_subscriptions
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON user_streaming_subscriptions
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions" ON user_streaming_subscriptions
  FOR DELETE 
  USING (auth.uid() = user_id);

-- =================
-- PUBLIC READ-ONLY TABLES (Shows, Episodes, etc.)
-- =================

-- Shows table - allow read-only public access, authenticated insert/update
DROP POLICY IF EXISTS "Allow public insert to shows" ON shows;
DROP POLICY IF EXISTS "Allow public update to shows" ON shows;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Public can read shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can update shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can delete shows" ON shows;

CREATE POLICY "Public can read shows" ON shows
  FOR SELECT 
  USING (true);

-- Only authenticated users can add/update show data (separate from SELECT)
CREATE POLICY "Authenticated can manage shows" ON shows
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update shows" ON shows
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete shows" ON shows
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Seasons table - allow read-only public access, authenticated insert
DROP POLICY IF EXISTS "Allow public insert to seasons" ON seasons;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Public can read seasons" ON seasons;
DROP POLICY IF EXISTS "Authenticated can manage seasons" ON seasons;

CREATE POLICY "Public can read seasons" ON seasons
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated can manage seasons" ON seasons
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Episodes table - allow read-only public access, authenticated insert
DROP POLICY IF EXISTS "Allow public insert to episodes" ON episodes;

-- Drop policies to be created to ensure idempotency
DROP POLICY IF EXISTS "Public can read episodes" ON episodes;
DROP POLICY IF EXISTS "Authenticated can manage episodes" ON episodes;

CREATE POLICY "Public can read episodes" ON episodes
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated can manage episodes" ON episodes
  FOR ALL 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Streaming services - allow public read access
DROP POLICY IF EXISTS "Public can read streaming services" ON streaming_services;
CREATE POLICY "Public can read streaming services" ON streaming_services
  FOR SELECT 
  USING (true);

-- Show availability - allow public read access
DROP POLICY IF EXISTS "Public can read show availability" ON show_availability;
CREATE POLICY "Public can read show availability" ON show_availability
  FOR SELECT 
  USING (true);

-- =================
-- CLEANUP
-- =================

-- Remove the insecure upsert_user function since we're using proper auth now
DROP FUNCTION IF EXISTS public.upsert_user(TEXT);

-- Verify all policies are in place
SELECT schemaname, tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;