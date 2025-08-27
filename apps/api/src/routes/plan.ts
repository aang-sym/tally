import { Router } from 'express';
import { PlanResponseSchema } from '@tally/types';
import { generateActivationWindows, calculateSavingsEstimate } from '@tally/core';

const router = Router();

router.post('/generate', async (req, res, next) => {
  try {
    // In a real implementation, this would:
    // 1. Extract user ID from auth token
    // 2. Load user's watchlist
    // 3. Analyze release dates and viewing patterns
    // 4. Generate optimal subscription windows
    // 5. Calculate accurate savings based on current vs optimal spending

    const windows = generateActivationWindows();
    const savings = calculateSavingsEstimate();

    const response = PlanResponseSchema.parse({
      windows,
      savings,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export { router as planRouter };