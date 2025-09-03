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
export const ReleasePatternSchema = z.enum(['weekly', 'binge', 'unknown', 'premiere_weekly']);

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

export const ReleasePatternAnalysisSchema = z.object({
  pattern: ReleasePatternSchema,
  confidence: z.number(),
  episodeInterval: z.number().optional(),
  seasonStart: z.string().datetime().optional(),
  seasonEnd: z.string().datetime().optional(),
  totalEpisodes: z.number().optional(),
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
export type ReleasePatternAnalysis = z.infer<typeof ReleasePatternAnalysisSchema>;
export type TMDBWatchProvider = z.infer<typeof TMDBWatchProviderSchema>;

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