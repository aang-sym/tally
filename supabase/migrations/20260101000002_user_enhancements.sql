-- User Management Enhancements
-- Migration to add user profile fields and streaming subscriptions

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