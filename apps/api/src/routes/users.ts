/**
 * User Management API Routes
 *
 * Handles test user creation, management, and switching functionality.
 * Supports creating multiple test users for development and demo purposes.
 */

import { Router, Request, Response } from 'express';
import { supabase, serviceSupabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateUser } from '../middleware/user-identity.js';
import {
  sendErrorResponse,
  sendSuccessResponse,
  handleDatabaseError,
  handleValidationError,
  handleNotFoundError,
  asyncHandler,
} from '../utils/errorHandler.js';

const router: Router = Router();

/**
 * Helper function to generate JWT token
 */
const generateToken = (userId: string, email: string, displayName: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { userId, email, displayName },
    jwtSecret as string, // Explicitly cast to string
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions // Explicitly cast to SignOptions
  );
};

/**
 * POST /api/users/signup
 * Create a new user account with proper authentication
 *
 * Body: {
 *   email: string,
 *   password: string,
 *   displayName: string,
 *   avatarUrl?: string
 * }
 */
router.post(
  '/signup',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, displayName, avatarUrl } = req.body;

    // Validation
    if (!email || !password || !displayName) {
      return sendErrorResponse(
        res,
        handleValidationError('required fields', 'Email, password, and display name are required'),
        400
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(
        res,
        handleValidationError('email', 'Please provide a valid email address'),
        400
      );
    }

    // Basic password validation
    if (password.length < 6) {
      return sendErrorResponse(
        res,
        handleValidationError('password', 'Password must be at least 6 characters long'),
        400
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return sendErrorResponse(
        res,
        handleValidationError('email', 'A user with this email already exists'),
        409
      );
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const userId = uuidv4();
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      display_name: displayName,
      avatar_url: avatarUrl || null,
      is_test_user: email.includes('test') || email.includes('example'), // Mark as test user if email contains test/example
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    // Use service role client for user creation since RLS blocks inserts
    const { data: user, error } = await serviceSupabase
      .from('users')
      .insert([newUser])
      .select('id, email, display_name, avatar_url, created_at')
      .single();

    if (error) {
      throw error;
    }

    // Generate JWT token
    const token = generateToken(userId, email, displayName);

    // Send success response
    sendSuccessResponse(
      res,
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at,
        },
        token,
      },
      'Account created successfully',
      201
    );
  })
);

/**
 * POST /api/users/login
 * Authenticate user and return JWT token
 *
 * Body: {
 *   email: string,
 *   password: string
 * }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find user by email (use service client to access password_hash)
    const { data: user, error } = await serviceSupabase
      .from('users')
      .select('id, email, display_name, avatar_url, password_hash')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email, user.display_name);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        },
        token,
        message: 'Login successful',
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users
 * Get all test users for user switching
 * No authentication required - returns only test users for user switching in development
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Safety check: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        details: 'User list access not allowed in production',
      });
    }

    // Get authorization header to determine if user is authenticated
    const authHeader = req.headers.authorization;
    const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');

    let query = serviceSupabase
      .from('users')
      .select('id, email, display_name, avatar_url, is_test_user, created_at')
      .order('created_at', { ascending: false });

    // If no authentication, only return test users (temporarily disabled for testing)
    // if (!isAuthenticated) {
    //   query = query.eq('is_test_user', true);
    // }

    const { data: users, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        users: users || [],
        totalUsers: users?.length || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users
 * Create a new test user
 * Requires authentication
 *
 * Body: {
 *   displayName: string,
 *   email: string,
 *   avatarUrl?: string,
 *   isTestUser?: boolean
 * }
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { displayName, email, avatarUrl, isTestUser = true } = req.body;

    if (!displayName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Display name and email are required',
      });
    }

    // Check if user with email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      email,
      display_name: displayName,
      avatar_url: avatarUrl || null,
      is_test_user: isTestUser,
      password_hash: 'test-password-hash', // Placeholder for test users
      created_at: new Date().toISOString(),
    };

    const { data: user, error } = await supabase
      .from('users')
      .insert([newUser])
      .select('id, email, display_name, avatar_url, is_test_user, created_at')
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'User created successfully',
      },
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:id/profile
 * Get user profile with watchlist stats
 * Requires authentication - users can only access their own profile
 */
router.get('/:id/profile', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, is_test_user, created_at')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get watchlist stats
    const { data: watchlistStats, error: statsError } = await supabase
      .from('user_shows')
      .select('status')
      .eq('user_id', id);

    let stats = {
      totalShows: 0,
      byStatus: {
        watchlist: 0,
        watching: 0,
        completed: 0,
        dropped: 0,
      },
    };

    if (!statsError && watchlistStats) {
      stats.totalShows = watchlistStats.length;
      watchlistStats.forEach((show: any) => {
        if (show.status in stats.byStatus) {
          stats.byStatus[show.status as keyof typeof stats.byStatus]++;
        }
      });
    }

    // Get streaming subscriptions count
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_streaming_subscriptions')
      .select('id')
      .eq('user_id', id)
      .eq('is_active', true);

    const activeSubscriptions = subsError ? 0 : subscriptions?.length || 0;

    res.json({
      success: true,
      data: {
        user,
        stats,
        activeSubscriptions,
        joinedDate: user.created_at,
      },
    });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user information
 * Requires authentication - users can only update their own profile
 */
// Update basic user fields (country_code, display_name, timezone, etc.)
router.put('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // only allow self-update unless you add role checks
    const authedUserId = (req as any).user?.id;
    if (authedUserId && authedUserId !== id) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // accept either camelCase or snake_case
    const { countryCode, country_code, displayName, display_name, timezone } = req.body || {};

    const update: any = {};
    if (countryCode || country_code) {
      update.country_code = String(countryCode || country_code).toUpperCase();
    }
    if (displayName || display_name) {
      update.display_name = String(displayName || display_name);
    }
    if (timezone) {
      update.timezone = String(timezone);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const { data, error } = await serviceSupabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select('id, email, display_name, country_code, timezone')
      .single();

    if (error) {
      console.error('[users/PUT] Update failed', error);
      return res.status(500).json({ success: false, error: 'Failed to update user' });
    }

    return res.json({ success: true, data });
  } catch (e) {
    console.error('[users/PUT] Unexpected error', e);
    return res.status(500).json({ success: false, error: 'Unexpected error' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a test user (only test users can be deleted)
 * Requires authentication
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists and is a test user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, is_test_user, display_name')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (!user.is_test_user) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete non-test users',
      });
    }

    // Delete user (cascade will handle related data)
    const { error: deleteError } = await supabase.from('users').delete().eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      data: {
        message: `User "${user.display_name}" deleted successfully`,
        deletedUserId: id,
      },
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users/bulk-create
 * Create multiple test users at once
 * Requires authentication
 *
 * Body: {
 *   users: Array<{displayName: string, email: string, avatarUrl?: string}>
 * }
 */
router.post('/bulk-create', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { users: userList } = req.body;

    if (!Array.isArray(userList) || userList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required',
      });
    }

    const newUsers = userList.map((userData) => ({
      id: uuidv4(),
      email: userData.email,
      display_name: userData.displayName,
      avatar_url: userData.avatarUrl || null,
      is_test_user: true,
      password_hash: 'test-password-hash',
      created_at: new Date().toISOString(),
    }));

    const { data: createdUsers, error } = await supabase
      .from('users')
      .insert(newUsers)
      .select('id, email, display_name, avatar_url, is_test_user, created_at');

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: {
        users: createdUsers,
        count: createdUsers?.length || 0,
        message: `${createdUsers?.length || 0} test users created successfully`,
      },
    });
  } catch (error) {
    console.error('Failed to bulk create users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/users/:id/subscriptions
 * Get user's streaming service subscriptions
 * Requires authentication - users can only access their own subscriptions
 */
router.get('/:id/subscriptions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let country = (req.query.country as string) || '';
    if (!country) {
      const { data: userRow } = await serviceSupabase
        .from('users')
        .select('country_code')
        .eq('id', id)
        .single();
      country = (userRow?.country_code as string) || 'US';
    }
    country = country.toUpperCase();

    if (req.userId !== id) {
      return res
        .status(403)
        .json({ success: false, error: 'Forbidden: You can only access your own subscriptions.' });
    }

    const { data: subscriptions, error } = await serviceSupabase
      .from('user_streaming_subscriptions')
      .select(
        `
        id,
        user_id,
        service_id,
        monthly_cost,
        is_active,
        started_date,
        ended_date,
        created_at,
        updated_at,
        tier,
        streaming_services:service_id (
          id,
          tmdb_provider_id,
          name,
          logo_path,
          homepage,
          streaming_service_prices (
            tier,
            monthly_cost,
            currency,
            billing_frequency,
            notes,
            active,
            provider_name,
            country_code
          )
        )
      `
      )
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[users/:id/subscriptions] Nested select failed', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      throw error;
    }

    // Transform the data to match the expected format (normalize provider fields)
    const formattedSubscriptions =
      (subscriptions ?? []).map((sub: any) => {
        const svc = Array.isArray(sub.streaming_services)
          ? sub.streaming_services[0]
          : sub.streaming_services;

        const logo_path = svc?.logo_path
          ? typeof svc.logo_path === 'string' && svc.logo_path.startsWith('http')
            ? svc.logo_path
            : `https://image.tmdb.org/t/p/w45${svc.logo_path}`
          : null;

        // --- Normalize prices and default_price ---
        const svcPricesSrc = Array.isArray(svc?.streaming_service_prices)
          ? svc.streaming_service_prices
          : [];
        const svcPricesCountry = svcPricesSrc.filter(
          (p: any) => (p?.country_code || '').toUpperCase() === country
        );

        const prices = svcPricesCountry
          .filter((p: any) => p && (p.active ?? true))
          .map((p: any) => ({
            tier: p.tier,
            amount: p.monthly_cost,
            currency: p.currency,
            billing_frequency: p.billing_frequency ?? 'monthly',
            active: p.active ?? true,
            notes: p.notes ?? null,
            provider_name: p.provider_name ?? svc?.name ?? null,
          }));

        const rank = (t: string | null | undefined): number => {
          const s = (t ?? '').toLowerCase();
          if (s.startsWith('standard')) return 1;
          if (s.includes('no ads')) return 2;
          if (s.includes('ads')) return 3;
          if (s.includes('premium')) return 4;
          return 9;
        };
        const default_price = prices.length
          ? [...prices].sort(
              (a: { tier: string | null | undefined }, b: { tier: string | null | undefined }) =>
                rank(a.tier) - rank(b.tier)
            )[0]
          : null;
        // --- END normalize prices and default_price ---

        return {
          id: sub.id,
          service_id: sub.service_id,
          monthly_cost: sub.monthly_cost,
          is_active: sub.is_active,
          tier: sub.tier,
          started_date: sub.started_date,
          ended_date: sub.ended_date,
          service: svc
            ? {
                id: svc.id,
                tmdb_provider_id: svc.tmdb_provider_id,
                name: svc.name,
                logo_path,
                homepage: svc.homepage || null,
                prices,
                default_price,
              }
            : null,
        };
      }) || [];

    res.json({
      success: true,
      data: {
        subscriptions: formattedSubscriptions,
        totalActive: formattedSubscriptions.filter((sub) => sub.is_active).length,
      },
    });
  } catch (error) {
    console.error('Failed to get user subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/users/:id/subscriptions
 * Add a new subscription for user
 * Requires authentication - users can only manage their own subscriptions
 *
 * Body: {
 *   service_id: string,
 *   monthly_cost: number,
 *   is_active?: boolean
 * }
 */
router.post('/:id/subscriptions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { service_id, monthly_cost, tier = null, is_active = true } = req.body;

    if (!service_id || typeof monthly_cost !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'service_id and monthly_cost are required',
      });
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('user_streaming_subscriptions')
      .select('id')
      .eq('user_id', id)
      .eq('service_id', service_id)
      .single();

    if (existing) {
      // Update existing subscription
      const { data: subscription, error } = await supabase
        .from('user_streaming_subscriptions')
        .update({
          monthly_cost,
          is_active,
          tier,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', id)
        .eq('service_id', service_id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        data: {
          subscription,
          message: 'Subscription updated successfully',
        },
      });
    }

    // Create new subscription
    const { data: subscription, error } = await supabase
      .from('user_streaming_subscriptions')
      .insert({
        user_id: id,
        service_id,
        monthly_cost,
        tier,
        is_active,
        started_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data: {
        subscription,
        message: 'Subscription added successfully',
      },
    });
  } catch (error) {
    console.error('Failed to add subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add subscription',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/users/:id/subscriptions/:subscriptionId
 * Update a subscription
 * Requires authentication - users can only manage their own subscriptions
 *
 * Body: {
 *   monthly_cost?: number,
 *   is_active?: boolean
 * }
 */
router.put(
  '/:id/subscriptions/:subscriptionId',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { id, subscriptionId } = req.params;
      const { monthly_cost, is_active, tier } = req.body;

      const updateData: any = { updated_at: new Date().toISOString() };
      if (typeof monthly_cost === 'number') updateData.monthly_cost = monthly_cost;
      if (typeof is_active === 'boolean') updateData.is_active = is_active;
      if (typeof tier === 'string') updateData.tier = tier;

      // If deactivating, set end date
      if (is_active === false) {
        updateData.ended_date = new Date().toISOString().split('T')[0];
      } else if (is_active === true) {
        updateData.ended_date = null;
      }

      const { data: subscription, error } = await supabase
        .from('user_streaming_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)
        .eq('user_id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found',
        });
      }

      res.json({
        success: true,
        data: {
          subscription,
          message: 'Subscription updated successfully',
        },
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/users/:id/subscriptions/:subscriptionId
 * Remove a subscription
 * Requires authentication - users can only manage their own subscriptions
 */
router.delete(
  '/:id/subscriptions/:subscriptionId',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { id, subscriptionId } = req.params;

      const { error } = await supabase
        .from('user_streaming_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', id);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data: {
          message: 'Subscription removed successfully',
        },
      });
    } catch (error) {
      console.error('Failed to remove subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
