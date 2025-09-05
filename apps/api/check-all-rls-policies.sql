-- Check ALL RLS policies that might affect foreign key validation
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive, 
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('shows', 'user_shows', 'users', 'seasons', 'episodes')
ORDER BY tablename, policyname;

-- Check if RLS is enabled on these tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('shows', 'user_shows', 'users', 'seasons', 'episodes');

-- Check for any policies that might have ALL command
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd, 
    permissive, 
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND cmd = 'ALL'
ORDER BY tablename, policyname;