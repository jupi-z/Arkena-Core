import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('App smoke', () => {
  it('serves the health endpoint', async () => {
    const app = createApp();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        service: 'Arkena Core'
      }
    });
  });

  it('serves the OpenAPI docs page', async () => {
    const app = createApp();
    const response = await request(app).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger');
  });
});
