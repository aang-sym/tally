import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['**/integration/**', '**/node_modules/**', '**/dist/**'],
    setupFiles: [join(__dirname, 'test', 'setup.unit.ts')],
    globals: true,
  },
});
