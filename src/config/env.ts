import 'dotenv/config';
import fs from 'node:fs';
import { z } from 'zod';

const booleanString = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(['true', 'false']));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SERVICE_NAME: z.string().min(1).default('Arkena Core'),
  SERVICE_VERSION: z.string().min(1).default('1.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_RESET_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  RESET_TOKEN_TTL: z.string().default('30m'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  TRUST_PROXY: z.string().default('1'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(300),
  BODY_SIZE_LIMIT: z.string().default('2mb'),
  ENABLE_OPENAPI_DOCS: booleanString.default('true'),
  METRICS_ENABLED: booleanString.default('true'),
  METRICS_BEARER_TOKEN: z.string().optional().default(''),
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  READINESS_DB_TIMEOUT_MS: z.coerce.number().int().positive().default(2_000),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  DEFAULT_SUPER_ADMIN_EMAIL: z.string().email().default('admin@arkena.local'),
  DEFAULT_SUPER_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe123!'),
  DEFAULT_SUPER_ADMIN_FIRST_NAME: z.string().default('Super'),
  DEFAULT_SUPER_ADMIN_LAST_NAME: z.string().default('Admin'),
  DEFAULT_SUPER_ADMIN_PHONE: z.string().default('+0000000000')
});

function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) {
    return process.env[name];
  }

  return fs.readFileSync(filePath, 'utf8').trim();
}

const parsedEnv = envSchema.parse({
  ...process.env,
  DATABASE_URL: readSecret('DATABASE_URL'),
  JWT_ACCESS_SECRET: readSecret('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: readSecret('JWT_REFRESH_SECRET'),
  JWT_RESET_SECRET: readSecret('JWT_RESET_SECRET'),
  METRICS_BEARER_TOKEN: readSecret('METRICS_BEARER_TOKEN'),
  DEFAULT_SUPER_ADMIN_PASSWORD: readSecret('DEFAULT_SUPER_ADMIN_PASSWORD')
});

const demoValues = new Set([
  'postgresql://postgres:postgres@db:5432/arkena_core?schema=public',
  'dev-access-secret-arkena-core-0123456789',
  'dev-refresh-secret-arkena-core-0123456789',
  'dev-reset-secret-arkena-core-0123456789',
  'ChangeMe123!'
]);

if (parsedEnv.NODE_ENV === 'production') {
  const insecureKeys = [
    ['DATABASE_URL', parsedEnv.DATABASE_URL],
    ['JWT_ACCESS_SECRET', parsedEnv.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', parsedEnv.JWT_REFRESH_SECRET],
    ['JWT_RESET_SECRET', parsedEnv.JWT_RESET_SECRET],
    ['DEFAULT_SUPER_ADMIN_PASSWORD', parsedEnv.DEFAULT_SUPER_ADMIN_PASSWORD]
  ].filter(([, value]) => demoValues.has(value));

  if (insecureKeys.length > 0) {
    throw new Error(`Production environment uses demo values: ${insecureKeys.map(([key]) => key).join(', ')}`);
  }

  if (parsedEnv.METRICS_ENABLED === 'true' && !parsedEnv.METRICS_BEARER_TOKEN) {
    throw new Error('Production metrics must be protected with METRICS_BEARER_TOKEN or disabled with METRICS_ENABLED=false');
  }
}

export const env = parsedEnv;

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const docsEnabled = env.ENABLE_OPENAPI_DOCS === 'true';
export const metricsEnabled = env.METRICS_ENABLED === 'true';
