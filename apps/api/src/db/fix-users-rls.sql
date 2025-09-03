-- Fix Row Level Security for Users Table
-- Run this in Supabase SQL Editor to allow API access to users

-- Enable RLS on users table (should already be enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow public read access to users table
-- This allows the API to fetch users without authentication
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT 
  USING (true);

-- Optional: If you want to allow public insert (for user creation)
CREATE POLICY "Allow public insert to users" ON users
  FOR INSERT 
  WITH CHECK (true);