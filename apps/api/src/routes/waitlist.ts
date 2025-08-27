import { Router } from 'express';
import { WaitlistRequestSchema, WaitlistResponseSchema } from '@tally/types';
import { waitlistStore } from '../storage/index.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { email, country } = WaitlistRequestSchema.parse(req.body);

    // Check if email is already on waitlist
    const existing = await waitlistStore.findByEmail(email);
    if (existing) {
      // Don't error, just return success (idempotent)
      const response = WaitlistResponseSchema.parse({ success: true });
      return res.json(response);
    }

    // Add to waitlist
    await waitlistStore.add(email, country);

    const response = WaitlistResponseSchema.parse({ success: true });
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

export { router as waitlistRouter };