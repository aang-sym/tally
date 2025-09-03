/**
 * Streaming Services API Routes
 * 
 * Provides endpoints for managing streaming services and their availability data.
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase.js';
import { streamingService } from '../services/StreamingService.js';

const router = Router();

/**
 * GET /api/streaming-services
 * Get all available streaming services
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase
      .from('streaming_services')
      .select('id, name, logo_path, homepage')
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
      .select('id, name, logo_path, homepage')
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
        logo_path,
        homepage,
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
      logo_path: service.logo_path,
      homepage: service.homepage,
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

/**
 * POST /api/streaming-services/backfill
 * Backfill streaming services from TMDB provider list
 * 
 * Body: { regions?: string[] } (optional, defaults to ['US'])
 */
router.post('/backfill', async (req: Request, res: Response) => {
  try {
    const { regions = ['US'] } = req.body as { regions?: string[] };

    // Validate regions array
    if (!Array.isArray(regions) || regions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Regions must be a non-empty array of country codes'
      });
    }

    // Validate region codes (basic check for 2-letter codes)
    for (const region of regions) {
      if (typeof region !== 'string' || region.length !== 2) {
        return res.status(400).json({
          success: false,
          error: `Invalid region code: ${region}. Must be 2-letter country codes (e.g., 'US', 'GB')`
        });
      }
    }

    console.log(`🚀 Starting streaming services backfill for regions: ${regions.join(', ')}`);

    const result = await streamingService.backfillStreamingServices(regions);

    if (result.errors.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'Backfill completed with errors',
        details: result.errors,
        data: {
          totalFetched: result.totalFetched,
          newProviders: result.newProviders,
          updatedProviders: result.updatedProviders,
          processedCount: result.providers.length
        }
      });
    }

    res.json({
      success: true,
      message: 'Streaming services backfilled successfully',
      data: {
        totalFetched: result.totalFetched,
        newProviders: result.newProviders,
        updatedProviders: result.updatedProviders,
        regions,
        providers: result.providers.map(p => ({
          id: p.id,
          tmdb_provider_id: p.tmdb_provider_id,
          name: p.name,
          logo_path: p.logo_path
        }))
      }
    });
  } catch (error) {
    console.error('Backfill streaming services failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backfill streaming services',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/streaming-services/regions
 * Get available regions for streaming providers from TMDB
 */
router.get('/regions', async (req: Request, res: Response) => {
  try {
    // This would use the TMDB client to get regions, but for now return common ones
    const commonRegions = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'JP', name: 'Japan' },
      { code: 'BR', name: 'Brazil' },
      { code: 'IN', name: 'India' },
      { code: 'MX', name: 'Mexico' }
    ];

    res.json({
      success: true,
      data: {
        regions: commonRegions,
        count: commonRegions.length
      }
    });
  } catch (error) {
    console.error('Failed to get streaming regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve streaming regions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;