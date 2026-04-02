-- Add password_hash column to users table for secure authentication
-- Migration: Add password hashing support
-- Date: 2025-09-08

-- Add password_hash column to users table
ALTER TABLE users 
ADD COLUMN password_hash TEXT;

-- Add index on email for faster lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update existing test users to have a default hashed password
-- This uses bcrypt hash for 'password123' - only for development/testing
-- In production, users should reset their passwords
UPDATE users 
SET password_hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE password_hash IS NULL;

-- Make password_hash NOT NULL after setting defaults
ALTER TABLE users 
ALTER COLUMN password_hash SET NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN users.password_hash IS 'bcrypt hashed password for user authentication';