import { Router } from 'express';
import { HealthResponseSchema } from '@tally/types';

const router = Router();

router.get('/', (req, res) => {
  const response = HealthResponseSchema.parse({
    ok: true,
    timestamp: new Date().toISOString(),
  });

  res.json(response);
});

export { router as healthRouter };