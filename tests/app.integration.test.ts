import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuthRateLimit } from '../src/modules/auth/routes.js';

describe('App integration', () => {
  it('rejects protected routes without a bearer token', async () => {
    const app = createApp();
    const response = await request(app).get('/users');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED'
      }
    });
  });

  it('validates login payloads before auth logic runs', async () => {
    const app = createApp();
    const response = await request(app).post('/auth/login').send({
      email: 'not-an-email',
      password: ''
    });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR'
      }
    });
  });

  it('returns 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'NOT_FOUND'
      }
    });
  });

  it('returns a standardized response when the authentication limiter is exceeded', async () => {
    const app = express();
    app.post('/auth-test', createAuthRateLimit({ windowMs: 60_000, limit: 1 }), (_req, res) => {
      res.json({ success: true });
    });

    const first = await request(app).post('/auth-test');
    const second = await request(app).post('/auth-test');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body).toMatchObject({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMITED'
      }
    });
  });
});
