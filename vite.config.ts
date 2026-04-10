import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./setupTests.ts'],
    include: [
      'app/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
      'middleware.test.{ts,tsx}',
      'shared/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules/**',
      '.claude/**',
      '.next/**',
    ],
  },
});
