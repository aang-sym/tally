import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { healthRouter } from './health.js';

const app = express();
app.use('/health', healthRouter);

describe('GET /health', () => {
  it('should return health check status', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      timestamp: expect.any(String),
    });

    // Verify timestamp is valid ISO string
    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });
});