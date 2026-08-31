import fs from 'node:fs';

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_RESET_SECRET',
  'DEFAULT_SUPER_ADMIN_EMAIL',
  'DEFAULT_SUPER_ADMIN_PASSWORD'
];

const demoValues = new Set([
  'postgresql://postgres:postgres@db:5432/arkena_core?schema=public',
  'dev-access-secret-arkena-core-0123456789',
  'dev-refresh-secret-arkena-core-0123456789',
  'dev-reset-secret-arkena-core-0123456789',
  'ChangeMe123!'
]);

const failures = [];

function readEnvOrFile(key) {
  if (process.env[key]) {
    return process.env[key];
  }

  const file = process.env[`${key}_FILE`];
  if (!file) {
    return undefined;
  }

  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch (error) {
    failures.push(`${key}_FILE cannot be read: ${error.message}`);
    return undefined;
  }
}

for (const key of required) {
  const value = readEnvOrFile(key);

  if (!value) {
    failures.push(`${key} or ${key}_FILE is required`);
    continue;
  }

  if (value && demoValues.has(value)) {
    failures.push(`${key} uses a demo value`);
  }
}

if (process.env.METRICS_ENABLED !== 'false' && !readEnvOrFile('METRICS_BEARER_TOKEN')) {
  failures.push('METRICS_BEARER_TOKEN or METRICS_BEARER_TOKEN_FILE is required when metrics are enabled');
}

if (failures.length > 0) {
  console.error('Production environment validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Production environment validation passed');
