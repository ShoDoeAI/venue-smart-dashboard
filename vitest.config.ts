import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.vercel/'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './packages/shared/src'),
      '@backend': path.resolve(__dirname, './packages/backend/src'),
      '@frontend': path.resolve(__dirname, './packages/frontend/src'),
    },
  },
});