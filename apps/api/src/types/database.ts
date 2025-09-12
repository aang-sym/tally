/**
 * Database Schema Types
 * Generated: 2025-09-08T09:36:42.616Z
 * DO NOT EDIT - This file is auto-generated
 */

export interface Episodes {
  id: string;
  season_id?: string | null;
  tmdb_episode_id: number;
  episode_number: number;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  runtime?: number | null;
}

export interface Seasons {
  id: string;
  show_id?: string | null;
  tmdb_season_id: number;
  season_number: number;
  name?: string | null;
  overview?: string | null;
  air_date?: string | null;
  episode_count?: number | null;
  poster_path?: string | null;
}

export interface ShowAvailability {
  id: string;
  show_id?: string | null;
  service_id?: string | null;
  country_code: string;
  availability_type: string;
  price_amount?: number | null;
  price_currency?: string | null;
  deep_link?: string | null;
  updated_at?: string | null;
}

export interface Shows {
  id: string;
  tmdb_id: number;
  title: string;
  overview?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
  last_air_date?: string | null;
  status?: string | null;
  total_seasons?: number | null;
  total_episodes?: number | null;
  release_pattern?: any | null;
  tmdb_last_updated?: string | null;
  is_popular?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StreamingServices {
  id: string;
  tmdb_provider_id: number;
  name: string;
  logo_path?: string | null;
  homepage?: string | null;
}

export interface UserEpisodeProgress {
  id: string;
  user_id?: string | null;
  episode_id?: string | null;
  state: string;
  started_watching_at?: string | null;
  watched_at?: string | null;
  episode_rating?: number | null;
  show_id?: string | null;
  progress?: number | null;
}

export interface UserSeasonRatings {
  id: string;
  user_id?: string | null;
  season_id?: string | null;
  rating?: number | null;
  created_at?: string | null;
}

export interface UserShows {
  id: string;
  user_id?: string | null;
  show_id?: string | null;
  status: string;
  added_at?: string | null;
  started_watching_at?: string | null;
  completed_at?: string | null;
  last_episode_watched_id?: string | null;
  show_rating?: number | null;
  notes?: string | null;
  buffer_days: number;
  selected_service_id?: string | null;
  country_code?: string | null;
}

export interface UserStreamingSubscriptions {
  id: string;
  user_id?: string | null;
  service_id?: string | null;
  monthly_cost: number;
  is_active?: boolean | null;
  started_date?: string | null;
  ended_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Users {
  instance_id?: string | null;
  id: string;
  id: string;
  email: string;
  aud?: string | null;
  password_hash: string;
  country_code?: string | null;
  role?: string | null;
  timezone?: string | null;
  email?: string | null;
  created_at?: string | null;
  encrypted_password?: string | null;
  updated_at?: string | null;
  email_confirmed_at?: string | null;
  display_name?: string | null;
  invited_at?: string | null;
  avatar_url?: string | null;
  confirmation_token?: string | null;
  confirmation_sent_at?: string | null;
  is_test_user?: boolean | null;
  created_by?: string | null;
  recovery_token?: string | null;
  recovery_sent_at?: string | null;
  email_change_token_new?: string | null;
  email_change?: string | null;
  email_change_sent_at?: string | null;
  last_sign_in_at?: string | null;
  raw_app_meta_data?: any | null;
  raw_user_meta_data?: any | null;
  is_super_admin?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  phone?: string | null;
  phone_confirmed_at?: string | null;
  phone_change?: string | null;
  phone_change_token?: string | null;
  phone_change_sent_at?: string | null;
  confirmed_at?: string | null;
  email_change_token_current?: string | null;
  email_change_confirm_status?: any | null;
  banned_until?: string | null;
  reauthentication_token?: string | null;
  reauthentication_sent_at?: string | null;
  is_sso_user: boolean;
  deleted_at?: string | null;
  is_anonymous: boolean;
}

export type TableName =
  | 'episodes'
  | 'seasons'
  | 'show_availability'
  | 'shows'
  | 'streaming_services'
  | 'user_episode_progress'
  | 'user_season_ratings'
  | 'user_shows'
  | 'user_streaming_subscriptions'
  | 'users';

export interface Database {
  episodes: Episodes;
  seasons: Seasons;
  show_availability: ShowAvailability;
  shows: Shows;
  streaming_services: StreamingServices;
  user_episode_progress: UserEpisodeProgress;
  user_season_ratings: UserSeasonRatings;
  user_shows: UserShows;
  user_streaming_subscriptions: UserStreamingSubscriptions;
  users: Users;
}
