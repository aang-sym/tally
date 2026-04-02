-- 009_fix_user_episode_progress_schema.sql

-- Add show_id to user_episode_progress
ALTER TABLE user_episode_progress
ADD COLUMN show_id uuid REFERENCES shows(id);

-- Add unique constraint on (user_id, show_id, episode_id)
ALTER TABLE user_episode_progress
ADD CONSTRAINT user_episode_progress_user_show_episode_key UNIQUE (user_id, show_id, episode_id);

-- Rename 'status' column to 'state'
ALTER TABLE user_episode_progress
RENAME COLUMN status TO state;

-- Add 'progress' column
ALTER TABLE user_episode_progress
ADD COLUMN progress int;

-- Update rpc_set_episode_progress to use 'state' and 'progress'
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