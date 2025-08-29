import { Router } from 'express';
import {
  CreateWatchlistItemSchema,
  WatchlistResponseSchema,
  type WatchlistItem,
} from '@tally/types';
import { watchlistStore } from '../storage/index.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { streamingAvailabilityService } from '../services/streaming-availability.js';
import { tmdbService } from '../services/tmdb.js';
import { StreamingAvailabilityError, releasePatternService } from '@tally/core';
import { config } from '../config/index.js';

const router = Router();

// Mock auth middleware - extracts user from stubbed token
function extractUserId(req: any): string {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new ValidationError('Authorization token required');
  }
  
  const token = authHeader.substring(7);
  if (!token.startsWith('stub_token_')) {
    throw new ValidationError('Invalid token format');
  }
  
  return token.substring(11); // Extract user ID from stub_token_{userId}
}

router.get('/', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const watchlist = await watchlistStore.getByUserId(userId);
    
    const response = WatchlistResponseSchema.parse(watchlist);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const itemData = CreateWatchlistItemSchema.parse(req.body);

    // Create the basic watchlist item
    let enhancedItemData: Omit<WatchlistItem, 'id' | 'createdAt'> = {
      ...itemData,
      availability: undefined,
      releasePattern: undefined,
      year: itemData.year,
      type: itemData.type,
      imdbId: undefined,
      tmdbId: undefined,
      // Initialize TMDB fields
      tmdbShowId: undefined,
      detectedReleasePattern: undefined,
      watchProviders: undefined,
    };

    // Try to enhance with streaming availability data
    try {
      // Only enhance if not in dev mode and we have an API key
      if (!config.streamingApiDevMode && config.streamingAvailabilityApiKey !== 'dev-key-placeholder') {
        // Search for the content to get additional metadata
        const searchResults = await streamingAvailabilityService.searchShows(
          itemData.title,
          'us', // Default to US, could be user preference later
          itemData.type
        );

        if (searchResults?.length > 0) {
          const bestMatch = searchResults[0]!; // Take the first result for now
          
          // Only get availability if we found a match to avoid wasting API calls
          // Use IMDb ID as it's more reliable than internal ID
          const showId = bestMatch.imdbId || bestMatch.id;
          const availability = await streamingAvailabilityService.getContentAvailability(
            showId,
            itemData.serviceId
          );

          // Update the item with enriched data
          enhancedItemData = {
            ...enhancedItemData,
            titleId: bestMatch.id, // Use the API's ID
            availability: {
              available: availability.available,
              ...(availability.expiresOn && { expiresOn: availability.expiresOn }),
              leavingSoon: availability.leavingSoon,
            },
            year: bestMatch.year,
            type: bestMatch.type,
            imdbId: bestMatch.imdbId,
            tmdbId: bestMatch.tmdbId,
          };
        }
      }
    } catch (error) {
      // Log the error but don't fail the request
      if (error instanceof StreamingAvailabilityError) {
        console.warn(`Failed to fetch availability data for "${itemData.title}":`, error.message);
      } else {
        console.warn(`Unexpected error fetching availability data:`, error);
      }
      // Continue with basic data
    }

    // Try to enhance with TMDB data (release patterns and watch providers)
    try {
      if (tmdbService.isAvailable) {
        const tmdbEnhancement = await tmdbService.enhanceWatchlistItem(itemData.title);
        if (tmdbEnhancement) {
          enhancedItemData.tmdbShowId = tmdbEnhancement.tmdbShowId;
          enhancedItemData.detectedReleasePattern = tmdbEnhancement.detectedReleasePattern;
          enhancedItemData.watchProviders = tmdbEnhancement.watchProviders;
          
          // Add detailed logging in development mode
          if (config.nodeEnv === 'development' && tmdbEnhancement.tmdbShowId) {
            console.log(`🎯 Enhanced "${itemData.title}" with TMDB data:`);
            console.log(`   TMDB ID: ${tmdbEnhancement.tmdbShowId}`);
            console.log(`   Release Pattern: ${tmdbEnhancement.detectedReleasePattern}`);
            console.log(`   Watch Providers: ${tmdbEnhancement.watchProviders?.length || 0} found`);
            
            // Enhanced logging would require async TMDB calls
            // For now, just log basic TMDB enhancement info
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to enhance "${itemData.title}" with TMDB data:`, error);
      // Continue with basic data
    }

    const item = await watchlistStore.addItem(userId, enhancedItemData);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
});

// Refresh availability data for a specific watchlist item
router.put('/:id/refresh', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    // Get current item
    const watchlist = await watchlistStore.getByUserId(userId);
    const currentItem = watchlist.find(item => item.id === id);
    
    if (!currentItem) {
      throw new NotFoundError('Watchlist item not found');
    }

    let updatedItem = { ...currentItem };

    // Check quota status before attempting refresh
    const quotaStatus = await streamingAvailabilityService.getQuotaStatus();
    
    if (!quotaStatus.canMakeCall) {
      return res.status(429).json({
        error: 'QUOTA_EXHAUSTED',
        message: 'Monthly API quota exhausted. Cannot refresh availability data.',
        quotaStatus,
      });
    }

    // Warn if quota is low
    if (quotaStatus.isLowQuota) {
      console.warn(`⚠️  Refreshing item with low quota: ${quotaStatus.remaining} calls remaining`);
    }

    // Refresh availability data
    try {
      if (currentItem.titleId && currentItem.serviceId) {
        const availability = await streamingAvailabilityService.getContentAvailability(
          currentItem.titleId,
          currentItem.serviceId
        );
        updatedItem.availability = {
          available: availability.available,
          ...(availability.expiresOn && { expiresOn: availability.expiresOn }),
          leavingSoon: availability.leavingSoon,
        };
      }
    } catch (error) {
      if (error instanceof StreamingAvailabilityError) {
        console.warn(`Failed to refresh availability data for item ${id}:`, error.message);
      } else {
        console.warn(`Unexpected error refreshing availability data:`, error);
      }
    }

    // Update the item in storage
    await watchlistStore.updateItem(userId, id, updatedItem);
    res.json(updatedItem);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const { id } = req.params;

    const removed = await watchlistStore.removeItem(userId, id);
    if (!removed) {
      throw new NotFoundError('Watchlist item not found');
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Bulk add items to watchlist
router.post('/bulk', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Items array is required and must not be empty');
    }

    const addedItems = [];
    
    // Add each item individually to leverage existing enhancement logic
    for (const itemData of items) {
      try {
        const validatedData = CreateWatchlistItemSchema.parse(itemData);
        
        // Create the basic watchlist item
        let enhancedItemData: Omit<WatchlistItem, 'id' | 'createdAt'> = {
          ...validatedData,
          availability: undefined,
          releasePattern: undefined,
          year: validatedData.year,
          type: validatedData.type,
          imdbId: undefined,
          tmdbId: undefined,
          // Initialize TMDB fields
          tmdbShowId: undefined,
          detectedReleasePattern: undefined,
          watchProviders: undefined,
        };

        // Try to enhance with streaming availability data
        try {
          // Only enhance if not in dev mode and we have an API key
          if (!config.streamingApiDevMode && config.streamingAvailabilityApiKey !== 'dev-key-placeholder') {
            // Search for the content to get additional metadata
            const searchResults = await streamingAvailabilityService.searchShows(
              validatedData.title,
              'us',
              validatedData.type
            );

            if (searchResults?.length > 0) {
              const bestMatch = searchResults[0]!;
              
              const showId = bestMatch.imdbId || bestMatch.id;
              const availability = await streamingAvailabilityService.getContentAvailability(
                showId,
                validatedData.serviceId
              );

              enhancedItemData = {
                ...enhancedItemData,
                imdbId: bestMatch.imdbId,
                tmdbId: bestMatch.tmdbId,
                availability: {
                  available: availability.available,
                  ...(availability.expiresOn && { expiresOn: availability.expiresOn }),
                  leavingSoon: availability.leavingSoon,
                },
              };

              // Add release pattern analysis if available (from extended search results)
              if ('releasePattern' in bestMatch && bestMatch.releasePattern) {
                enhancedItemData.releasePattern = bestMatch.releasePattern as any;
              }
            }
          }
        } catch (enhancementError) {
          console.warn(`Failed to enhance item "${validatedData.title}":`, enhancementError);
          // Continue with basic item
        }

        // Try to enhance with TMDB data
        try {
          if (tmdbService.isAvailable) {
            const tmdbEnhancement = await tmdbService.enhanceWatchlistItem(validatedData.title);
            if (tmdbEnhancement) {
              enhancedItemData.tmdbShowId = tmdbEnhancement.tmdbShowId;
              enhancedItemData.detectedReleasePattern = tmdbEnhancement.detectedReleasePattern;
              enhancedItemData.watchProviders = tmdbEnhancement.watchProviders;
            }
          }
        } catch (tmdbError) {
          console.warn(`Failed to enhance "${validatedData.title}" with TMDB data:`, tmdbError);
          // Continue with basic item
        }

        const item = await watchlistStore.addItem(userId, enhancedItemData);
        addedItems.push(item);
      } catch (itemError) {
        console.warn(`Failed to add item:`, itemError);
        // Continue with other items
      }
    }

    res.status(201).json({
      success: true,
      added: addedItems.length,
      total: items.length,
      items: addedItems,
    });
  } catch (error) {
    next(error);
  }
});

// Get urgent watch recommendations 
router.get('/urgent', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const { maxDays = 30, excludeWatched = true } = req.query;
    
    const watchlist = await watchlistStore.getByUserId(userId);
    
    // Filter items that need urgent attention
    const urgentItems = watchlist.filter(item => {
      // Skip if excluding watched and item is marked as watched (placeholder logic)
      if (excludeWatched && item.rule === 'watched') return false;
      
      // Include if leaving soon
      if (item.availability?.leavingSoon) return true;
      
      // Include if expires within maxDays
      if (item.availability?.expiresOn) {
        const expiresDate = new Date(item.availability.expiresOn);
        const daysUntilExpiry = (expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= Number(maxDays) && daysUntilExpiry > 0;
      }
      
      return false;
    });
    
    // Sort by urgency (soonest expiration first)
    urgentItems.sort((a, b) => {
      const aExpires = a.availability?.expiresOn ? new Date(a.availability.expiresOn).getTime() : Infinity;
      const bExpires = b.availability?.expiresOn ? new Date(b.availability.expiresOn).getTime() : Infinity;
      return aExpires - bExpires;
    });
    
    res.json(urgentItems);
  } catch (error) {
    next(error);
  }
});

// Get items leaving soon
router.get('/leaving-soon', async (req, res, next) => {
  try {
    const userId = extractUserId(req);
    const watchlist = await watchlistStore.getByUserId(userId);
    
    // Filter items that are leaving soon
    const leavingSoon = watchlist.filter(item => 
      item.availability?.leavingSoon === true
    );
    
    res.json(leavingSoon);
  } catch (error) {
    next(error);
  }
});

export { router as watchlistRouter };