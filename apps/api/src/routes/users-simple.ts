/**
 * Simple User Management API Routes
 * 
 * In-memory user management for development and demo purposes.
 * Doesn't require database connectivity.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  is_test_user: boolean;
  created_at: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  started_date: string;
  ended_date?: string | undefined;
  created_at: string;
  updated_at: string;
}

interface StreamingService {
  id: string;
  name: string;
  logo_url?: string;
  base_url?: string;
  country_code: string;
}

// Simple in-memory user storage
const usersStorage = new Map<string, User>();
const subscriptionsStorage = new Map<string, UserSubscription>();
const streamingServicesStorage = new Map<string, StreamingService>();

// Create default test users for testing
const testUsers: User[] = [
  {
    id: 'user-1',
    email: 'emma.chen@example.com',
    display_name: 'Emma Chen',
    avatar_url: 'https://i.pravatar.cc/100?img=1',
    is_test_user: true,
    created_at: new Date('2024-01-15').toISOString()
  },
  {
    id: 'user-2',
    email: 'alex.rodriguez@example.com',
    display_name: 'Alex Rodriguez',
    avatar_url: 'https://i.pravatar.cc/100?img=3',
    is_test_user: true,
    created_at: new Date('2024-02-20').toISOString()
  },
  {
    id: 'user-3',
    email: 'sarah.johnson@example.com',
    display_name: 'Sarah Johnson',
    avatar_url: 'https://i.pravatar.cc/100?img=5',
    is_test_user: true,
    created_at: new Date('2024-03-10').toISOString()
  },
  {
    id: 'user-4',
    email: 'mike.thompson@example.com',
    display_name: 'Mike Thompson',
    avatar_url: 'https://i.pravatar.cc/100?img=7',
    is_test_user: true,
    created_at: new Date('2024-04-05').toISOString()
  }
];

// Add all test users to storage
testUsers.forEach(user => {
  usersStorage.set(user.id, user);
});

// Create default streaming services
const streamingServices: StreamingService[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo_url: 'https://images.justwatch.com/icon/207360008/s100/netflix.webp',
    base_url: 'https://netflix.com',
    country_code: 'US'
  },
  {
    id: 'hbo-max',
    name: 'HBO Max',
    logo_url: 'https://images.justwatch.com/icon/246983906/s100/max.webp',
    base_url: 'https://hbomax.com',
    country_code: 'US'
  },
  {
    id: 'disney-plus',
    name: 'Disney+',
    logo_url: 'https://images.justwatch.com/icon/246983071/s100/disney-plus.webp',
    base_url: 'https://disneyplus.com',
    country_code: 'US'
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logo_url: 'https://images.justwatch.com/icon/2361441/s100/hulu.webp',
    base_url: 'https://hulu.com',
    country_code: 'US'
  },
  {
    id: 'amazon-prime',
    name: 'Prime Video',
    logo_url: 'https://images.justwatch.com/icon/52449861/s100/amazon-prime-video.webp',
    base_url: 'https://primevideo.com',
    country_code: 'US'
  },
  {
    id: 'apple-tv-plus',
    name: 'Apple TV+',
    logo_url: 'https://images.justwatch.com/icon/190848813/s100/apple-tv-plus.webp',
    base_url: 'https://tv.apple.com',
    country_code: 'US'
  }
];

// Add streaming services to storage
streamingServices.forEach(service => {
  streamingServicesStorage.set(service.id, service);
});

// Create some default subscriptions for test users
const testSubscriptions: UserSubscription[] = [
  {
    id: 'sub-1',
    user_id: 'user-1',
    service_id: 'netflix',
    monthly_cost: 15.99,
    is_active: true,
    started_date: '2024-01-01',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: 'sub-2',
    user_id: 'user-1',
    service_id: 'hbo-max',
    monthly_cost: 14.99,
    is_active: true,
    started_date: '2024-02-01',
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date('2024-02-01').toISOString()
  },
  {
    id: 'sub-3',
    user_id: 'user-2',
    service_id: 'disney-plus',
    monthly_cost: 12.99,
    is_active: true,
    started_date: '2024-01-15',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date('2024-01-15').toISOString()
  },
  {
    id: 'sub-4',
    user_id: 'user-4',
    service_id: 'netflix',
    monthly_cost: 15.99,
    is_active: true,
    started_date: '2024-03-01',
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date('2024-03-01').toISOString()
  },
  {
    id: 'sub-5',
    user_id: 'user-4',
    service_id: 'amazon-prime',
    monthly_cost: 8.99,
    is_active: false,
    started_date: '2024-01-01',
    ended_date: '2024-08-01',
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-08-01').toISOString()
  }
];

// Add subscriptions to storage
testSubscriptions.forEach(sub => {
  subscriptionsStorage.set(sub.id, sub);
});

/**
 * GET /api/users
 * Get all test users for user switching
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = Array.from(usersStorage.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      success: true,
      data: {
        users,
        totalUsers: users.length
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
 *   displayName: string;
 *   email: string;
 *   avatarUrl?: string;
 * }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { displayName, email, avatarUrl } = req.body;

    if (!displayName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Display name and email are required'
      });
    }

    // Check if email already exists
    const existingUser = Array.from(usersStorage.values()).find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser: User = {
      id: `user-${uuidv4().slice(0, 8)}`,
      email,
      display_name: displayName,
      avatar_url: avatarUrl || null,
      is_test_user: true,
      created_at: new Date().toISOString()
    };

    usersStorage.set(newUser.id, newUser);

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        message: `Created test user: ${displayName}`
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
 * GET /api/users/:id
 * Get a specific user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = usersStorage.get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a test user (except the default one)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Don't allow deletion of the default user
    if (id === 'user-1') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete the default test user'
      });
    }

    const user = usersStorage.get(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    usersStorage.delete(id);

    res.json({
      success: true,
      data: {
        message: `Deleted user: ${user.display_name}`
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
 * GET /api/users/:id/subscriptions
 * Get user's streaming service subscriptions
 */
router.get('/:id/subscriptions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = usersStorage.get(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's subscriptions
    const userSubscriptions = Array.from(subscriptionsStorage.values())
      .filter(sub => sub.user_id === id);

    // Format subscriptions with service info
    const formattedSubscriptions = userSubscriptions.map(sub => {
      const service = streamingServicesStorage.get(sub.service_id);
      return {
        id: sub.id,
        service_id: sub.service_id,
        monthly_cost: sub.monthly_cost,
        is_active: sub.is_active,
        started_date: sub.started_date,
        ended_date: sub.ended_date,
        service: service ? {
          id: service.id,
          name: service.name,
          logo_url: service.logo_url
        } : null
      };
    });

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

    const user = usersStorage.get(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const service = streamingServicesStorage.get(service_id);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Streaming service not found'
      });
    }

    // Check if subscription already exists
    const existingSubscription = Array.from(subscriptionsStorage.values())
      .find(sub => sub.user_id === id && sub.service_id === service_id);

    if (existingSubscription) {
      // Update existing subscription
      existingSubscription.monthly_cost = monthly_cost;
      existingSubscription.is_active = is_active;
      existingSubscription.updated_at = new Date().toISOString();
      
      if (is_active && existingSubscription.ended_date) {
        delete (existingSubscription as any).ended_date;
      } else if (!is_active && !existingSubscription.ended_date) {
        existingSubscription.ended_date = new Date().toISOString().split('T')[0];
      }

      subscriptionsStorage.set(existingSubscription.id, existingSubscription);

      return res.json({
        success: true,
        data: {
          subscription: existingSubscription,
          message: 'Subscription updated successfully'
        }
      });
    }

    // Create new subscription
    const newSubscription: UserSubscription = {
      id: `sub-${uuidv4().slice(0, 8)}`,
      user_id: id,
      service_id,
      monthly_cost,
      is_active,
      started_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!is_active) {
      newSubscription.ended_date = new Date().toISOString().split('T')[0];
    }

    subscriptionsStorage.set(newSubscription.id, newSubscription);

    res.status(201).json({
      success: true,
      data: {
        subscription: newSubscription,
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

export default router;