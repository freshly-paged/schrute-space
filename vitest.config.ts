import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // happy-dom provides localStorage — required because useGameStore
    // calls localStorage during module initialization (avatarConfig IIFE)
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx', 'server.ts'],
      exclude: ['src/__tests__/**', 'src/main.tsx', 'node_modules/**'],
    },
    // Inline three.js through Vite's transform pipeline so vi.mock('three') works
    // reliably — three ships a CJS/ESM hybrid that can confuse Node's module resolver
    server: {
      deps: {
        inline: ['three'],
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
