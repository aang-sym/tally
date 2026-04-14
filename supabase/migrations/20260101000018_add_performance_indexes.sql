-- Add missing performance indexes (TAL-32)
CREATE INDEX IF NOT EXISTS idx_uep_episode_id ON user_episode_progress(episode_id);
CREATE INDEX IF NOT EXISTS idx_uss_is_active ON user_streaming_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_sa_updated_at ON show_availability(updated_at);
