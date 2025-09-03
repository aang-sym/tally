-- Combined Migration File for Supabase Dashboard
-- This file combines migrations 001, 002, and 003 for easy execution in Supabase SQL Editor
-- Run this ONCE in the Supabase SQL Editor to create the complete schema

-- =============================================================================
-- MIGRATION 001: Initial Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends existing)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) DEFAULT 'US',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shows table (TMDB data cache with TTL)
CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  overview TEXT,
  poster_path VARCHAR(500),
  first_air_date DATE,
  last_air_date DATE,
  status VARCHAR(50), -- 'Airing', 'Ended', 'Cancelled'
  total_seasons INTEGER,
  total_episodes INTEGER,
  release_pattern JSONB, -- Pattern analysis results
  tmdb_last_updated TIMESTAMP DEFAULT NOW(), -- For cache TTL
  is_popular BOOLEAN DEFAULT FALSE, -- For background refresh priority
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seasons table
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  tmdb_season_id INTEGER NOT NULL,
  season_number INTEGER NOT NULL,
  name VARCHAR(500),
  overview TEXT,
  air_date DATE,
  episode_count INTEGER,
  poster_path VARCHAR(500),
  UNIQUE(show_id, season_number)
);

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  tmdb_episode_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  name VARCHAR(500),
  overview TEXT,
  air_date DATE,
  runtime INTEGER, -- minutes from TMDB
  UNIQUE(season_id, episode_number)
);

-- User Show Tracking table
CREATE TABLE IF NOT EXISTS user_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'watchlist', 'watching', 'completed', 'dropped'
  added_at TIMESTAMP DEFAULT NOW(),
  started_watching_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_episode_watched_id UUID REFERENCES episodes(id),
  show_rating DECIMAL(3,1) CHECK (show_rating >= 0 AND show_rating <= 10), -- 0.0-10.0
  notes TEXT,
  UNIQUE(user_id, show_id)
);

-- Episode Watch Progress table
CREATE TABLE IF NOT EXISTS user_episode_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES episodes(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'unwatched', -- 'unwatched', 'watching', 'watched'
  started_watching_at TIMESTAMP, -- When marked as 'watching'
  watched_at TIMESTAMP, -- When marked as 'watched'
  episode_rating DECIMAL(3,1) CHECK (episode_rating >= 0 AND episode_rating <= 10),
  UNIQUE(user_id, episode_id)
);

-- Season Ratings table
CREATE TABLE IF NOT EXISTS user_season_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, season_id)
);

-- Streaming Services & Providers table
CREATE TABLE IF NOT EXISTS streaming_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_provider_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  logo_path VARCHAR(500),
  homepage VARCHAR(500)
);

-- Show Availability table
CREATE TABLE IF NOT EXISTS show_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id) ON DELETE CASCADE,
  country_code VARCHAR(2) NOT NULL,
  availability_type VARCHAR(20) NOT NULL, -- 'subscription', 'rent', 'buy'
  price_amount DECIMAL(10,2),
  price_currency VARCHAR(3),
  deep_link TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(show_id, service_id, country_code, availability_type)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_status ON user_shows(status);
CREATE INDEX IF NOT EXISTS idx_user_episode_progress_user_id ON user_episode_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_progress_status ON user_episode_progress(status);
CREATE INDEX IF NOT EXISTS idx_shows_tmdb_id ON shows(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_shows_status ON shows(status);
CREATE INDEX IF NOT EXISTS idx_shows_tmdb_last_updated ON shows(tmdb_last_updated);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);
CREATE INDEX IF NOT EXISTS idx_show_availability_country ON show_availability(country_code);

-- Insert some initial streaming services
INSERT INTO streaming_services (tmdb_provider_id, name, logo_path, homepage) VALUES
(8, 'Netflix', '/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg', 'https://www.netflix.com'),
(15, 'Hulu', '/giwM8XX4V2AQb9vsoN7yti82tKK.jpg', 'https://www.hulu.com'),
(384, 'HBO Max', '/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg', 'https://play.hbomax.com'),
(337, 'Disney Plus', '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg', 'https://www.disneyplus.com'),
(2, 'Apple TV Plus', '/peURlLlr8jggOwK53fJ5wdQl05y.jpg', 'https://tv.apple.com'),
(531, 'Paramount Plus', '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg', 'https://www.paramountplus.com')
ON CONFLICT (tmdb_provider_id) DO NOTHING;

-- Insert a test user for development
INSERT INTO users (id, email, password_hash) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'test-password-hash')
ON CONFLICT (email) DO NOTHING;

-- Row Level Security (RLS) Policies
-- Enable RLS on user data tables
ALTER TABLE user_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_episode_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_season_ratings ENABLE ROW LEVEL SECURITY;

-- Policy for user_shows: users can only access their own data
CREATE POLICY "Users can access their own shows" ON user_shows
  FOR ALL USING (user_id::text = auth.uid()::text OR user_id::text = current_user);

-- Policy for user_episode_progress: users can only access their own data
CREATE POLICY "Users can access their own episode progress" ON user_episode_progress
  FOR ALL USING (user_id::text = auth.uid()::text OR user_id::text = current_user);

-- Policy for user_season_ratings: users can only access their own data
CREATE POLICY "Users can access their own season ratings" ON user_season_ratings
  FOR ALL USING (user_id::text = auth.uid()::text OR user_id::text = current_user);

-- Allow public read access to shows, streaming_services, etc.
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shows are publicly readable" ON shows FOR SELECT USING (true);

ALTER TABLE streaming_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streaming services are publicly readable" ON streaming_services FOR SELECT USING (true);

ALTER TABLE show_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Show availability is publicly readable" ON show_availability FOR SELECT USING (true);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons are publicly readable" ON seasons FOR SELECT USING (true);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Episodes are publicly readable" ON episodes FOR SELECT USING (true);

-- =============================================================================
-- MIGRATION 002: User Enhancements
-- =============================================================================

-- Add user profile enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_user BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'system';

-- Create user streaming subscriptions table
CREATE TABLE IF NOT EXISTS user_streaming_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES streaming_services(id) ON DELETE CASCADE,
  monthly_cost DECIMAL(6,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  started_date DATE DEFAULT CURRENT_DATE,
  ended_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_streaming_subscriptions_user_id ON user_streaming_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaming_subscriptions_active ON user_streaming_subscriptions(is_active);

-- Update existing test user with display name
UPDATE users SET 
  display_name = 'Test User',
  is_test_user = true 
WHERE id = '550e8400-e29b-41d4-a716-446655440000' AND display_name IS NULL;

-- Insert some sample test users for different scenarios
INSERT INTO users (id, email, password_hash, display_name, is_test_user, country_code, timezone, created_by) VALUES 
('11111111-1111-1111-1111-111111111111', 'emma.chen@example.com', 'test-password-hash', 'Emma Chen', true, 'US', 'America/Los_Angeles', 'system'),
('22222222-2222-2222-2222-222222222222', 'alex.rodriguez@example.com', 'test-password-hash', 'Alex Rodriguez', true, 'US', 'America/New_York', 'system'),
('33333333-3333-3333-3333-333333333333', 'sarah.johnson@example.com', 'test-password-hash', 'Sarah Johnson', true, 'US', 'America/Chicago', 'system'),
('44444444-4444-4444-4444-444444444444', 'mike.thompson@example.com', 'test-password-hash', 'Mike Thompson', true, 'US', 'America/Denver', 'system')
ON CONFLICT (email) DO NOTHING;

-- Set up sample streaming subscriptions for test users
-- Emma Chen (New user) - No subscriptions yet
-- Alex Rodriguez (Power user) - Multiple services
INSERT INTO user_streaming_subscriptions (user_id, service_id, monthly_cost, is_active) 
SELECT '22222222-2222-2222-2222-222222222222', id, 
  CASE 
    WHEN name = 'Netflix' THEN 15.99
    WHEN name = 'Hulu' THEN 12.99
    WHEN name = 'HBO Max' THEN 14.99
    WHEN name = 'Disney Plus' THEN 12.99
    ELSE 9.99
  END,
  true
FROM streaming_services 
WHERE name IN ('Netflix', 'Hulu', 'HBO Max', 'Disney Plus')
ON CONFLICT (user_id, service_id) DO NOTHING;

-- Sarah Johnson (Optimizer) - Netflix and HBO Max only
INSERT INTO user_streaming_subscriptions (user_id, service_id, monthly_cost, is_active) 
SELECT '33333333-3333-3333-3333-333333333333', id,
  CASE 
    WHEN name = 'Netflix' THEN 15.99
    WHEN name = 'HBO Max' THEN 14.99
    ELSE 9.99
  END,
  true
FROM streaming_services 
WHERE name IN ('Netflix', 'HBO Max')
ON CONFLICT (user_id, service_id) DO NOTHING;

-- Mike Thompson (Light user) - Netflix only
INSERT INTO user_streaming_subscriptions (user_id, service_id, monthly_cost, is_active) 
SELECT '44444444-4444-4444-4444-444444444444', id, 15.99, true
FROM streaming_services 
WHERE name = 'Netflix'
ON CONFLICT (user_id, service_id) DO NOTHING;

-- Create some sample watchlist data for Alex Rodriguez (power user)
INSERT INTO user_shows (user_id, show_id, status, added_at) 
SELECT '22222222-2222-2222-2222-222222222222', id, 'watching', NOW() - INTERVAL '10 days'
FROM shows 
LIMIT 3
ON CONFLICT (user_id, show_id) DO NOTHING;

INSERT INTO user_shows (user_id, show_id, status, added_at) 
SELECT '22222222-2222-2222-2222-222222222222', id, 'watchlist', NOW() - INTERVAL '5 days'
FROM shows 
WHERE id NOT IN (
  SELECT show_id FROM user_shows WHERE user_id = '22222222-2222-2222-2222-222222222222'
)
LIMIT 8
ON CONFLICT (user_id, show_id) DO NOTHING;

-- Add some completed shows for Sarah Johnson (optimizer)
INSERT INTO user_shows (user_id, show_id, status, added_at, completed_at, show_rating) 
SELECT '33333333-3333-3333-3333-333333333333', id, 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '3 days', 8.5
FROM shows 
LIMIT 5
ON CONFLICT (user_id, show_id) DO NOTHING;

INSERT INTO user_shows (user_id, show_id, status, added_at) 
SELECT '33333333-3333-3333-3333-333333333333', id, 'watchlist', NOW() - INTERVAL '2 days'
FROM shows 
WHERE id NOT IN (
  SELECT show_id FROM user_shows WHERE user_id = '33333333-3333-3333-3333-333333333333'
)
LIMIT 3
ON CONFLICT (user_id, show_id) DO NOTHING;

-- =============================================================================
-- MIGRATION 003: TV Guide Enhancements
-- =============================================================================

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