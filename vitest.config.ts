import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['scripts/__tests__/**/*.test.ts'],
  },
});
