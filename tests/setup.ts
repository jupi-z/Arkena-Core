import fs from 'node:fs';
import path from 'node:path';

function fallback(value: string | undefined, next: string): string {
  return value && value.trim().length > 0 ? value : next;
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = fallback(process.env.DATABASE_URL, 'postgresql://postgres:postgres@localhost:5432/arkena_core?schema=public');
process.env.JWT_ACCESS_SECRET = fallback(process.env.JWT_ACCESS_SECRET, 'a'.repeat(32));
process.env.JWT_REFRESH_SECRET = fallback(process.env.JWT_REFRESH_SECRET, 'b'.repeat(32));
process.env.JWT_RESET_SECRET = fallback(process.env.JWT_RESET_SECRET, 'c'.repeat(32));
process.env.ACCESS_TOKEN_TTL = fallback(process.env.ACCESS_TOKEN_TTL, '15m');
process.env.REFRESH_TOKEN_TTL = fallback(process.env.REFRESH_TOKEN_TTL, '30d');
process.env.RESET_TOKEN_TTL = fallback(process.env.RESET_TOKEN_TTL, '30m');
process.env.UPLOAD_DIR = fallback(process.env.UPLOAD_DIR, path.resolve(process.cwd(), 'uploads-test'));
process.env.CORS_ORIGINS = fallback(process.env.CORS_ORIGINS, 'http://localhost:3000');

fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
