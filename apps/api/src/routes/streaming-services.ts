/**
 * Streaming Services API Routes
 * 
 * Provides endpoints for managing streaming services and their availability data.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

/**
 * GET /api/streaming-services
 * Get all available streaming services
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('streaming_services')
      .select('id, name, logo_url, base_url, country_code')
      .order('name');

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: {
        services: services || [],
        count: services?.length || 0
      }
    });
  } catch (error) {
    console.error('Failed to get streaming services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve streaming services',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/streaming-services/:id
 * Get a specific streaming service by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: service, error } = await supabase
      .from('streaming_services')
      .select('id, name, logo_url, base_url, country_code')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Streaming service not found'
      });
    }

    res.json({
      success: true,
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Failed to get streaming service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve streaming service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/streaming-services/popular
 * Get most popular streaming services based on user subscriptions
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('streaming_services')
      .select(`
        id,
        name,
        logo_url,
        base_url,
        country_code,
        user_streaming_subscriptions!inner(
          id,
          is_active
        )
      `)
      .eq('user_streaming_subscriptions.is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    // Group by service and count active subscriptions
    const popularServices = services?.map(service => ({
      id: service.id,
      name: service.name,
      logo_url: service.logo_url,
      base_url: service.base_url,
      country_code: service.country_code,
      subscriber_count: Array.isArray(service.user_streaming_subscriptions) 
        ? service.user_streaming_subscriptions.length 
        : 1
    })).sort((a, b) => b.subscriber_count - a.subscriber_count) || [];

    res.json({
      success: true,
      data: {
        services: popularServices,
        count: popularServices.length
      }
    });
  } catch (error) {
    console.error('Failed to get popular streaming services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve popular streaming services',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;