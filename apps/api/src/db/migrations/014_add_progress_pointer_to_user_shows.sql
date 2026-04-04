-- TAL-9: Add current_season / current_episode progress pointer to user_shows
-- Denormalized pointer so clients can see "where am I up to?" without fetching all episode progress

ALTER TABLE user_shows
  ADD COLUMN IF NOT EXISTS current_season  integer,
  ADD COLUMN IF NOT EXISTS current_episode integer,
  ADD COLUMN IF NOT EXISTS last_progress_at timestamptz;

-- Backfill from existing user_episode_progress rows
-- Takes the most recent watched episode per user+show
UPDATE user_shows us
SET
  current_season    = sub.season_number,
  current_episode   = sub.episode_number,
  last_progress_at  = sub.updated_at
FROM (
  SELECT DISTINCT ON (uep.user_id, uep.show_id)
    uep.user_id,
    uep.show_id,
    e.season_number,
    e.episode_number,
    uep.updated_at
  FROM user_episode_progress uep
  JOIN episodes e ON e.id = uep.episode_id
  WHERE uep.state IN ('watched', 'watching')
  ORDER BY uep.user_id, uep.show_id, e.season_number DESC, e.episode_number DESC, uep.updated_at DESC
) sub
WHERE us.user_id = sub.user_id
  AND us.show_id = sub.show_id;

-- Index for efficient "recently watched" queries
CREATE INDEX IF NOT EXISTS idx_user_shows_last_progress_at
  ON user_shows (user_id, last_progress_at DESC);
