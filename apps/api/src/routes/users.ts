/**
 * User Management API Routes
 * 
 * Handles test user creation, management, and switching functionality.
 * Supports creating multiple test users for development and demo purposes.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /api/users
 * Get all test users for user switching
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, is_test_user, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        users: users || [],
        totalUsers: users?.length || 0
      }
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/users
 * Create a new test user
 * 
 * Body: {
 *   displayName: string,
 *   email: string,
 *   avatarUrl?: string,
 *   isTestUser?: boolean
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { displayName, email, avatarUrl, isTestUser = true } = req.body;

    if (!displayName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Display name and email are required'
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
        error: 'User with this email already exists'
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
      created_at: new Date().toISOString()
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
        message: 'User created successfully'
      }
    });
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/users/:id/profile
 * Get user profile with watchlist stats
 */
router.get('/:id/profile', async (req: Request, res: Response) => {
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
        error: 'User not found'
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
        dropped: 0
      }
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

    const activeSubscriptions = subsError ? 0 : (subscriptions?.length || 0);

    res.json({
      success: true,
      data: {
        user,
        stats,
        activeSubscriptions,
        joinedDate: user.created_at
      }
    });
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, email, avatarUrl } = req.body;

    const updateData: any = {};
    if (displayName) updateData.display_name = displayName;
    if (email) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No update data provided'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, display_name, avatar_url, is_test_user, created_at')
      .single();

    if (error) {
      throw error;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user,
        message: 'User updated successfully'
      }
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a test user (only test users can be deleted)
 */
router.delete('/:id', async (req: Request, res: Response) => {
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
        error: 'User not found'
      });
    }

    if (!user.is_test_user) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete non-test users'
      });
    }

    // Delete user (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      data: {
        message: `User "${user.display_name}" deleted successfully`,
        deletedUserId: id
      }
    });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/users/bulk-create
 * Create multiple test users at once
 * 
 * Body: {
 *   users: Array<{displayName: string, email: string, avatarUrl?: string}>
 * }
 */
router.post('/bulk-create', async (req: Request, res: Response) => {
  try {
    const { users: userList } = req.body;

    if (!Array.isArray(userList) || userList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required'
      });
    }

    const newUsers = userList.map(userData => ({
      id: uuidv4(),
      email: userData.email,
      display_name: userData.displayName,
      avatar_url: userData.avatarUrl || null,
      is_test_user: true,
      password_hash: 'test-password-hash',
      created_at: new Date().toISOString()
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
        message: `${createdUsers?.length || 0} test users created successfully`
      }
    });
  } catch (error) {
    console.error('Failed to bulk create users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk create users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/users/:id/subscriptions
 * Get user's streaming service subscriptions
 */
router.get('/:id/subscriptions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: subscriptions, error } = await supabase
      .from('user_streaming_subscriptions')
      .select(`
        id,
        service_id,
        monthly_cost,
        is_active,
        started_date,
        ended_date,
        created_at,
        updated_at,
        streaming_services:service_id (
          id,
          name,
          logo_url,
          base_url,
          country_code
        )
      `)
      .eq('user_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform the data to match the expected format
    const formattedSubscriptions = subscriptions?.map(sub => ({
      id: sub.id,
      service_id: sub.service_id,
      monthly_cost: sub.monthly_cost,
      is_active: sub.is_active,
      started_date: sub.started_date,
      ended_date: sub.ended_date,
      service: Array.isArray(sub.streaming_services) ? sub.streaming_services[0] : sub.streaming_services
    })) || [];

    res.json({
      success: true,
      data: {
        subscriptions: formattedSubscriptions,
        totalActive: formattedSubscriptions.filter(sub => sub.is_active).length
      }
    });
  } catch (error) {
    console.error('Failed to get user subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user subscriptions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/users/:id/subscriptions
 * Add a new subscription for user
 * 
 * Body: {
 *   service_id: string,
 *   monthly_cost: number,
 *   is_active?: boolean
 * }
 */
router.post('/:id/subscriptions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { service_id, monthly_cost, is_active = true } = req.body;

    if (!service_id || typeof monthly_cost !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'service_id and monthly_cost are required'
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
          updated_at: new Date().toISOString()
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
          message: 'Subscription updated successfully'
        }
      });
    }

    // Create new subscription
    const { data: subscription, error } = await supabase
      .from('user_streaming_subscriptions')
      .insert({
        user_id: id,
        service_id,
        monthly_cost,
        is_active,
        started_date: new Date().toISOString().split('T')[0]
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
        message: 'Subscription added successfully'
      }
    });
  } catch (error) {
    console.error('Failed to add subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/users/:id/subscriptions/:subscriptionId
 * Update a subscription
 * 
 * Body: {
 *   monthly_cost?: number,
 *   is_active?: boolean
 * }
 */
router.put('/:id/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { id, subscriptionId } = req.params;
    const { monthly_cost, is_active } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (typeof monthly_cost === 'number') updateData.monthly_cost = monthly_cost;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

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
        error: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: {
        subscription,
        message: 'Subscription updated successfully'
      }
    });
  } catch (error) {
    console.error('Failed to update subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/users/:id/subscriptions/:subscriptionId
 * Remove a subscription
 */
router.delete('/:id/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
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
        message: 'Subscription removed successfully'
      }
    });
  } catch (error) {
    console.error('Failed to remove subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;