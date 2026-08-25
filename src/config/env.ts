import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_RESET_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  RESET_TOKEN_TTL: z.string().default('30m'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  DEFAULT_SUPER_ADMIN_EMAIL: z.string().email().default('admin@arkena.local'),
  DEFAULT_SUPER_ADMIN_PASSWORD: z.string().min(12).default('ChangeMe123!'),
  DEFAULT_SUPER_ADMIN_FIRST_NAME: z.string().default('Super'),
  DEFAULT_SUPER_ADMIN_LAST_NAME: z.string().default('Admin'),
  DEFAULT_SUPER_ADMIN_PHONE: z.string().default('+0000000000')
});

export const env = envSchema.parse(process.env);

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
