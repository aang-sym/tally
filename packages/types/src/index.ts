import { z } from 'zod';

// Auth schemas
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
  }).optional(),
});

// Waitlist schemas
export const WaitlistRequestSchema = z.object({
  email: z.string().email(),
  country: z.string().optional(),
});

export const WaitlistResponseSchema = z.object({
  success: z.boolean(),
});

// Streaming availability schemas
export const StreamingServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  homePage: z.string(),
  themeColorCode: z.string(),
});

export const StreamingOptionSchema = z.object({
  service: StreamingServiceSchema,
  type: z.enum(['subscription', 'rent', 'buy']),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
  }).optional(),
  expiresSoon: z.boolean(),
  expiresOn: z.number().optional(), // Unix timestamp
  availableSince: z.number().optional(), // Unix timestamp
  link: z.string(),
});

export const ContentAvailabilitySchema = z.object({
  available: z.boolean(),
  expiresOn: z.string().datetime().optional(),
  leavingSoon: z.boolean(),
  streamingOptions: z.array(StreamingOptionSchema).optional(),
});

// Release pattern schemas - defined early to avoid dependency issues
export const ReleasePatternSchema = z.enum(['weekly', 'binge', 'premiere_weekly', 'multi_weekly', 'multi_episodes_per_week', 'mixed', 'unknown']);

export const EpisodeMetadataSchema = z.object({
  id: z.string(),
  seasonNumber: z.number(),
  episodeNumber: z.number(),
  airDate: z.string().datetime(),
  title: z.string(),
});

export const StreamingAvailabilitySchema = z.object({
  id: z.string(),
  title: z.string(),
  year: z.number().optional(),
  type: z.enum(['movie', 'series']),
  imdbId: z.string().optional(),
  tmdbId: z.string().optional(),
  streamingOptions: z.record(z.array(StreamingOptionSchema)),
  episodes: z.array(EpisodeMetadataSchema).optional(),
});

export const SearchResultSchema = z.object({
  shows: z.array(StreamingAvailabilitySchema),
  hasMore: z.boolean(),
  nextCursor: z.string().optional(),
});

export const PatternDiagnosticSchema = z.object({
  intervals: z.array(z.number()),
  avgInterval: z.number(),
  stdDev: z.number(),
  maxInterval: z.number(),
  minInterval: z.number(),
  reasoning: z.string(),
  premiereEpisodes: z.number().optional(),
  hasPremierePattern: z.boolean().optional(),
  hasMultiWeeklyPattern: z.boolean().optional(),
});

export const ReleasePatternAnalysisSchema = z.object({
  pattern: ReleasePatternSchema,
  confidence: z.number(),
  episodeInterval: z.number().optional(),
  seasonStart: z.string().datetime().optional(),
  seasonEnd: z.string().datetime().optional(),
  totalEpisodes: z.number().optional(),
  diagnostics: PatternDiagnosticSchema.optional(),
});

// TMDB schemas
export const TMDBWatchProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string(),
  display_priority: z.number(),
});

// Watchlist schemas
export const WatchlistItemSchema = z.object({
  id: z.string(),
  titleId: z.string(),
  title: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  rule: z.string().optional(),
  createdAt: z.string().datetime(),
  // Availability data
  availability: ContentAvailabilitySchema.optional(),
  releasePattern: ReleasePatternAnalysisSchema.optional(),
  // Additional metadata from streaming API
  year: z.number().optional(),
  type: z.enum(['movie', 'series']).optional(),
  imdbId: z.string().optional(),
  tmdbId: z.string().optional(),
  // TMDB integration data
  tmdbShowId: z.number().optional(),
  detectedReleasePattern: ReleasePatternSchema.optional(),
  watchProviders: z.array(TMDBWatchProviderSchema).optional(),
});

export const CreateWatchlistItemSchema = z.object({
  titleId: z.string(),
  title: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  rule: z.string().optional(),
  // Optional fields for enhanced search
  year: z.number().optional(),
  type: z.enum(['movie', 'series']).optional(),
  // Note: TMDB fields (tmdbShowId, detectedReleasePattern, watchProviders) 
  // are populated by API, not provided by user input
});

export const WatchlistResponseSchema = z.array(WatchlistItemSchema);

// Plan schemas
export const ServiceWindowSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  reason: z.string(),
});

export const SavingsEstimateSchema = z.object({
  monthly: z.number(),
  yearToDate: z.number(),
});

export const PlanResponseSchema = z.object({
  windows: z.array(ServiceWindowSchema),
  savings: SavingsEstimateSchema,
});

// Health check
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  timestamp: z.string().datetime(),
});

// Error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

// Type exports
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export type WaitlistRequest = z.infer<typeof WaitlistRequestSchema>;
export type WaitlistResponse = z.infer<typeof WaitlistResponseSchema>;

export type ReleasePattern = z.infer<typeof ReleasePatternSchema>;
export type EpisodeMetadata = z.infer<typeof EpisodeMetadataSchema>;
export type PatternDiagnostic = z.infer<typeof PatternDiagnosticSchema>;
export type ReleasePatternAnalysis = z.infer<typeof ReleasePatternAnalysisSchema>;
export type TMDBWatchProvider = z.infer<typeof TMDBWatchProviderSchema>;

// TMDB Web Interface Types
export const TMDBShowResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  year: z.number().optional(),
  poster: z.string().optional(),
  overview: z.string(),
  firstAirDate: z.string().optional(),
  status: z.string().optional(),
});

export const SeasonAnalysisSchema = z.object({
  seasonNumber: z.number(),
  episodeCount: z.number(),
  airDate: z.string().optional(),
  pattern: ReleasePatternSchema.optional(),
  confidence: z.number().optional(),
});

export const EpisodeDiagnosticsSchema = z.object({
  intervals: z.array(z.number()),
  avgInterval: z.number(),
  stdDev: z.number(),
  reasoning: z.string(),
  episodeDetails: z.array(z.object({
    number: z.number(),
    airDate: z.string(),
    title: z.string(),
  })).optional(),
});

export const PatternAnalysisSchema = z.object({
  pattern: ReleasePatternSchema,
  confidence: z.number(),
  episodeCount: z.number(),
  seasonInfo: z.array(SeasonAnalysisSchema),
  reasoning: z.string(),
  diagnostics: EpisodeDiagnosticsSchema,
});

export const WatchProviderSchema = z.object({
  providerId: z.number(),
  name: z.string(),
  logo: z.string(),
  type: z.enum(['subscription', 'rent', 'buy']),
  price: z.string().optional(),
  deepLink: z.string().optional(),
});

export type TMDBShowResult = z.infer<typeof TMDBShowResultSchema>;
export type SeasonAnalysis = z.infer<typeof SeasonAnalysisSchema>;
export type EpisodeDiagnostics = z.infer<typeof EpisodeDiagnosticsSchema>;
export type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;
export type WatchProvider = z.infer<typeof WatchProviderSchema>;

export type StreamingService = z.infer<typeof StreamingServiceSchema>;
export type StreamingOption = z.infer<typeof StreamingOptionSchema>;
export type ContentAvailability = z.infer<typeof ContentAvailabilitySchema>;

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type CreateWatchlistItem = z.infer<typeof CreateWatchlistItemSchema>;
export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>;

export type ServiceWindow = z.infer<typeof ServiceWindowSchema>;
export type SavingsEstimate = z.infer<typeof SavingsEstimateSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Database Model Schemas for Supabase Integration
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  country_code: z.string().length(2).default('US'),
  timezone: z.string().default('UTC'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const ShowSchema = z.object({
  id: z.string().uuid(),
  tmdb_id: z.number(),
  title: z.string(),
  overview: z.string().optional(),
  poster_path: z.string().optional(),
  first_air_date: z.string().optional(),
  last_air_date: z.string().optional(),
  status: z.enum(['Airing', 'Ended', 'Cancelled', 'In Production', 'Planned', 'Pilot']),
  total_seasons: z.number().optional(),
  total_episodes: z.number().optional(),
  release_pattern: z.any().optional(),
  tmdb_last_updated: z.string().datetime(),
  is_popular: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const SeasonSchema = z.object({
  id: z.string().uuid(),
  show_id: z.string().uuid(),
  tmdb_season_id: z.number(),
  season_number: z.number(),
  name: z.string().optional(),
  overview: z.string().optional(),
  air_date: z.string().optional(),
  episode_count: z.number().optional(),
  poster_path: z.string().optional(),
});

export const EpisodeSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid(),
  tmdb_episode_id: z.number(),
  episode_number: z.number(),
  name: z.string().optional(),
  overview: z.string().optional(),
  air_date: z.string().optional(),
  runtime: z.number().optional(),
});

export const UserShowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  show_id: z.string().uuid(),
  status: z.enum(['watchlist', 'watching', 'completed', 'dropped']),
  added_at: z.string().datetime(),
  started_watching_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  last_episode_watched_id: z.string().uuid().optional(),
  show_rating: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

export const UserEpisodeProgressSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  episode_id: z.string().uuid(),
  status: z.enum(['unwatched', 'watching', 'watched']),
  started_watching_at: z.string().datetime().optional(),
  watched_at: z.string().datetime().optional(),
  episode_rating: z.number().min(0).max(10).optional(),
});

export const UserSeasonRatingSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  season_id: z.string().uuid(),
  rating: z.number().min(0).max(10),
  created_at: z.string().datetime(),
});

export const StreamingServiceDBSchema = z.object({
  id: z.string().uuid(),
  tmdb_provider_id: z.number(),
  name: z.string(),
  logo_path: z.string().optional(),
  homepage: z.string().optional(),
});

export const ShowAvailabilitySchema = z.object({
  id: z.string().uuid(),
  show_id: z.string().uuid(),
  service_id: z.string().uuid(),
  country_code: z.string().length(2),
  availability_type: z.enum(['subscription', 'rent', 'buy']),
  price_amount: z.number().optional(),
  price_currency: z.string().length(3).optional(),
  deep_link: z.string().optional(),
  updated_at: z.string().datetime(),
});

// API Response Schemas for the new endpoints
export const WatchlistV2ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    shows: z.array(z.object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
      show_id: z.string().uuid(),
      status: z.enum(['watchlist', 'watching', 'completed', 'dropped']),
      added_at: z.string().datetime(),
      show: ShowSchema,
      progress: z.object({
        totalEpisodes: z.number(),
        watchedEpisodes: z.number(),
        currentEpisode: z.object({
          season_number: z.number(),
          episode_number: z.number(),
          name: z.string().optional(),
        }).optional(),
      }).optional(),
    })),
    totalCount: z.number(),
    statusFilter: z.string(),
  }),
});

export const EpisodeWithProgressSchema = z.object({
  id: z.string().uuid(),
  season_id: z.string().uuid(),
  tmdb_episode_id: z.number(),
  episode_number: z.number(),
  name: z.string().optional(),
  overview: z.string().optional(),
  air_date: z.string().optional(),
  runtime: z.number().optional(),
  progress: UserEpisodeProgressSchema.optional(),
  liveStats: z.object({
    currentlyWatching: z.number(),
    totalWatched: z.number(),
    averageRating: z.number().optional(),
  }).optional(),
});

export const ProgressResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    show: ShowSchema,
    seasons: z.array(z.object({
      id: z.string().uuid(),
      show_id: z.string().uuid(),
      season_number: z.number(),
      name: z.string().optional(),
      episode_count: z.number().optional(),
      episodes: z.array(EpisodeWithProgressSchema),
    })),
    progress: z.object({
      totalEpisodes: z.number(),
      watchedEpisodes: z.number(),
      currentlyWatching: z.number(),
      completionPercentage: z.number(),
    }),
  }),
});

export const RecommendationSchema = z.object({
  type: z.enum(['cancel', 'subscribe', 'pause']),
  serviceId: z.string().optional(),
  serviceName: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  potentialSavings: z.object({
    monthly: z.number(),
    annual: z.number().optional(),
    shortTerm: z.number().optional(),
  }),
  timing: z.string().optional(),
  shows: z.array(z.string()).optional(),
});

export const RecommendationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    recommendations: z.array(RecommendationSchema),
    totalPotentialSavings: z.number(),
    servicesAnalyzed: z.number(),
    timestamp: z.string().datetime(),
  }),
});

// Database Health Response
export const DatabaseHealthSchema = z.object({
  success: z.boolean(),
  data: z.object({
    connected: z.boolean(),
    tables: z.record(z.string(), z.number()),
    timestamp: z.string().datetime(),
    error: z.string().optional(),
  }),
});

// Type exports for database models
export type User = z.infer<typeof UserSchema>;
export type Show = z.infer<typeof ShowSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
export type UserShow = z.infer<typeof UserShowSchema>;
export type UserEpisodeProgress = z.infer<typeof UserEpisodeProgressSchema>;
export type UserSeasonRating = z.infer<typeof UserSeasonRatingSchema>;
export type StreamingServiceDB = z.infer<typeof StreamingServiceDBSchema>;
export type ShowAvailability = z.infer<typeof ShowAvailabilitySchema>;

// Type exports for API responses
export type WatchlistV2Response = z.infer<typeof WatchlistV2ResponseSchema>;
export type EpisodeWithProgress = z.infer<typeof EpisodeWithProgressSchema>;
export type ProgressResponse = z.infer<typeof ProgressResponseSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type RecommendationsResponse = z.infer<typeof RecommendationsResponseSchema>;
export type DatabaseHealth = z.infer<typeof DatabaseHealthSchema>;