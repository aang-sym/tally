import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/integration/**', '**/node_modules/**', '**/dist/**'],
    setupFiles: ['./test/setup.unit.ts'],
  },
});
