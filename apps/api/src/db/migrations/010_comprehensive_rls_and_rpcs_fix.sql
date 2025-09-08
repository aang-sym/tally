-- 010_comprehensive_rls_and_rpcs_fix.sql
-- Comprehensive fix that handles existing objects

-- Add unique constraint for user_shows if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_shows_user_show_unique' 
        AND table_name = 'user_shows'
    ) THEN
        ALTER TABLE user_shows 
        ADD CONSTRAINT user_shows_user_show_unique 
        UNIQUE (user_id, show_id);
    END IF;
END $$;

-- Enable RLS on user_shows if not already enabled
ALTER TABLE user_shows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS user_shows_select_own ON user_shows;
DROP POLICY IF EXISTS user_shows_insert_own ON user_shows;
DROP POLICY IF EXISTS user_shows_delete_own ON user_shows;

CREATE POLICY user_shows_select_own
ON user_shows FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY user_shows_insert_own
ON user_shows FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_shows_delete_own
ON user_shows FOR DELETE
USING (user_id = auth.uid());

-- Enable RLS on shows if not already enabled
ALTER TABLE shows ENABLE ROW LEVEL SECURITY;

-- Drop and recreate shows policy
DROP POLICY IF EXISTS shows_fk_select ON shows;
CREATE POLICY shows_fk_select
ON shows FOR SELECT
USING (true);

-- Add show_id to user_episode_progress if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_episode_progress' 
        AND column_name = 'show_id'
    ) THEN
        ALTER TABLE user_episode_progress
        ADD COLUMN show_id uuid REFERENCES shows(id);
    END IF;
END $$;

-- Add progress column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_episode_progress' 
        AND column_name = 'progress'
    ) THEN
        ALTER TABLE user_episode_progress
        ADD COLUMN progress integer;
    END IF;
END $$;

-- Add unique constraint on user_episode_progress if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_episode_progress_user_show_episode_key' 
        AND table_name = 'user_episode_progress'
    ) THEN
        ALTER TABLE user_episode_progress
        ADD CONSTRAINT user_episode_progress_user_show_episode_key 
        UNIQUE (user_id, show_id, episode_id);
    END IF;
END $$;

-- Drop and recreate RPC functions
DROP FUNCTION IF EXISTS rpc_add_to_watchlist(uuid, text);
CREATE OR REPLACE FUNCTION rpc_add_to_watchlist(p_show_id uuid, p_status text DEFAULT 'watchlist')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_result json;
BEGIN
  -- Check if user is authenticated
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not authenticated: auth.uid() returned null';
  END IF;
  
  -- Check if show exists
  IF NOT EXISTS (SELECT 1 FROM shows WHERE id = p_show_id) THEN
    RAISE EXCEPTION 'Show not found: %', p_show_id;
  END IF;
  
  -- Insert or update user show
  INSERT INTO user_shows(user_id, show_id, status)
  VALUES (v_user, p_show_id, COALESCE(p_status, 'watchlist'))
  ON CONFLICT (user_id, show_id) DO UPDATE
    SET status = EXCLUDED.status
  RETURNING json_build_object('id', id, 'user_id', user_id, 'show_id', show_id, 'status', status) INTO v_result;
  
  RETURN v_result;
END $$;

REVOKE ALL ON FUNCTION rpc_add_to_watchlist(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION rpc_add_to_watchlist(uuid, text) TO authenticated;

-- Drop and recreate remove function
DROP FUNCTION IF EXISTS rpc_remove_from_watchlist(uuid);
CREATE OR REPLACE FUNCTION rpc_remove_from_watchlist(p_show_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM user_shows
  WHERE user_id = auth.uid() AND show_id = p_show_id;
$$;

REVOKE ALL ON FUNCTION rpc_remove_from_watchlist(uuid) FROM public;
GRANT EXECUTE ON FUNCTION rpc_remove_from_watchlist(uuid) TO authenticated;

-- Drop and recreate episode progress function
DROP FUNCTION IF EXISTS rpc_set_episode_progress(uuid, uuid, text, int);
CREATE OR REPLACE FUNCTION rpc_set_episode_progress(
  p_show_id uuid,
  p_episode_id uuid,
  p_state text,
  p_progress int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_episode_progress(user_id, show_id, episode_id, state, progress)
  VALUES (auth.uid(), p_show_id, p_episode_id, p_state, p_progress)
  ON CONFLICT (user_id, show_id, episode_id)
  DO UPDATE SET state = EXCLUDED.state, progress = EXCLUDED.progress;
END;
$$;

REVOKE ALL ON FUNCTION rpc_set_episode_progress(uuid, uuid, text, int) FROM public;
GRANT EXECUTE ON FUNCTION rpc_set_episode_progress(uuid, uuid, text, int) TO authenticated;