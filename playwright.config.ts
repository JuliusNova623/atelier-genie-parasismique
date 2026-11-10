import { defineConfig } from '@playwright/test';

/**
 * Test e2e minimal : l'application construite (vite preview), en viewport téléphone,
 * avec « réduire les animations » pour que la roue et les tirages se terminent vite.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npm run build && npm run build:web && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
