import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/app.ts', 'src/docs/openapi.ts'],
      thresholds: {
        lines: 60,
        functions: 50,
        statements: 60,
        branches: 60
      }
    }
  }
});
