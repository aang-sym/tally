import { Router } from 'express';
import { ValidationError } from '../middleware/errorHandler.js';
import { tmdbService } from '../services/tmdb.js';
import { releasePatternService } from '@tally/core';
// Types are inferred from the API responses, no imports needed from @tally/types for this router

const router = Router();

// Search TV shows
router.get('/search', async (req, res, next) => {
  try {
    const { query, country = 'US' } = req.query;

    if (!query || typeof query !== 'string') {
      throw new ValidationError('Query parameter is required');
    }

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode'
      });
    }

    console.log(`🔍 Searching TMDB for "${query}" in ${country}`);
    
    const searchResults = await tmdbService.searchTVShows(query, country as string);

    res.json({
      success: true,
      query,
      country,
      results: searchResults
    });
  } catch (error) {
    console.error('Error in TMDB search:', error);
    next(error);
  }
});

// Analyze specific show
router.get('/show/:id/analyze', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { country = 'US', season } = req.query;

    const showId = parseInt(id);
    if (isNaN(showId)) {
      throw new ValidationError('Invalid show ID');
    }

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode'
      });
    }

    console.log(`📊 Analyzing TMDB show ${showId} for ${country}${season ? ` (season ${season})` : ''}`);
    
    const analysis = await tmdbService.analyzeShow(
      showId, 
      country as string, 
      season ? parseInt(season as string) : undefined
    );

    if (!analysis) {
      return res.status(404).json({
        error: 'SHOW_NOT_FOUND',
        message: `Could not analyze show with ID ${showId}`
      });
    }

    res.json({
      success: true,
      showId,
      country,
      analysis
    });
  } catch (error) {
    console.error(`Error analyzing show ${req.params.id}:`, error);
    next(error);
  }
});

// Get watch providers for show
router.get('/show/:id/providers', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { country = 'US' } = req.query;

    const showId = parseInt(id);
    if (isNaN(showId)) {
      throw new ValidationError('Invalid show ID');
    }

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode'
      });
    }

    console.log(`🎬 Getting providers for TMDB show ${showId} in ${country}`);
    
    const providers = await tmdbService.getWatchProviders(showId, country as string);

    res.json({
      success: true,
      showId,
      country,
      providers
    });
  } catch (error) {
    console.error(`Error getting providers for show ${req.params.id}:`, error);
    next(error);
  }
});

// Batch analyze multiple shows
router.post('/batch-analyze', async (req, res, next) => {
  try {
    const { showIds, country = 'US' } = req.body;

    if (!Array.isArray(showIds) || showIds.length === 0) {
      throw new ValidationError('showIds must be a non-empty array');
    }

    if (showIds.length > 20) {
      throw new ValidationError('Maximum 20 shows can be analyzed at once');
    }

    if (!tmdbService.isAvailable) {
      return res.status(503).json({
        error: 'TMDB_UNAVAILABLE',
        message: 'TMDB service is not configured or in dev mode'
      });
    }

    console.log(`📊 Batch analyzing ${showIds.length} shows for ${country}`);
    
    const results = await tmdbService.batchAnalyze(showIds, country);

    res.json({
      success: true,
      country,
      totalRequested: showIds.length,
      totalAnalyzed: results.filter(r => r.success).length,
      results
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    next(error);
  }
});

export { router as tmdbRouter };