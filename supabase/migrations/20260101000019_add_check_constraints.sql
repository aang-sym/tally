-- Add data validation constraints (TAL-32)
ALTER TABLE user_shows ADD CONSTRAINT chk_show_rating
  CHECK (show_rating IS NULL OR show_rating BETWEEN 0 AND 10);

ALTER TABLE user_episode_progress ADD CONSTRAINT chk_episode_rating
  CHECK (episode_rating IS NULL OR episode_rating BETWEEN 0 AND 10);
