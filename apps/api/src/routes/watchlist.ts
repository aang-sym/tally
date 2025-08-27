import { Router } from 'express';
import {
  CreateWatchlistItemSchema,
  WatchlistResponseSchema,
} from '@tally/types';
import { watchlistStore } from '../storage/index.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

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

    const item = await watchlistStore.addItem(userId, itemData);
    res.status(201).json(item);
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

export { router as watchlistRouter };