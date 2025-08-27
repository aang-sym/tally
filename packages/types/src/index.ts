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

// Watchlist schemas
export const WatchlistItemSchema = z.object({
  id: z.string(),
  titleId: z.string(),
  title: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  rule: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const CreateWatchlistItemSchema = z.object({
  titleId: z.string(),
  title: z.string(),
  serviceId: z.string(),
  serviceName: z.string(),
  rule: z.string().optional(),
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

export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;
export type CreateWatchlistItem = z.infer<typeof CreateWatchlistItemSchema>;
export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>;

export type ServiceWindow = z.infer<typeof ServiceWindowSchema>;
export type SavingsEstimate = z.infer<typeof SavingsEstimateSchema>;
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;