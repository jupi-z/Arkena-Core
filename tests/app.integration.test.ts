import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

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
});
