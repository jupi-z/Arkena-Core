import { describe, expect, it } from 'vitest';
import { publicUserSelect } from '../src/common/security/public-user-select.js';
import { openApiSpec } from '../src/docs/openapi.js';

const forbiddenKeys = new Set([
  'passwordHash',
  'tokenHash',
  'refreshTokens',
  'resetTokens',
  'requestedIp',
  'requestedUserAgent'
]);

function assertNoSensitiveFields(value: unknown, path = '$'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertNoSensitiveFields(item, `${path}[${index}]`);
    });
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    expect(forbiddenKeys.has(key), `${path}.${key} must not be exposed`).toBe(false);
    assertNoSensitiveFields(nestedValue, `${path}.${key}`);
  }
}

describe('sensitive field projections', () => {
  it('keeps the OpenAPI contract and public user projection free of security internals', () => {
    assertNoSensitiveFields(openApiSpec);
    assertNoSensitiveFields(publicUserSelect);
  });

  it('detects a forbidden field when one is accidentally added to a response', () => {
    expect(() => assertNoSensitiveFields({ user: { passwordHash: 'must-not-ship' } })).toThrow();
  });
});
