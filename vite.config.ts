/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json' with { type: 'json' };

/**
 * Deux builds :
 *  - par défaut : `dist/` pour Capacitor (APK) ;
 *  - `--mode web` : UN SEUL fichier HTML autonome (JS, CSS et polices embarqués) dans `dist-web/`,
 *    à ouvrir d'un double-clic dans le navigateur d'un ordinateur relié à la TV / au projecteur.
 */
export default defineConfig(({ mode }) => {
  const web = mode === 'web';
  return {
    plugins: [react(), ...(web ? [viteSingleFile()] : [])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    base: './',
    build: web
      ? {
          target: 'es2020',
          outDir: 'dist-web',
          assetsInlineLimit: 100_000_000,
          cssCodeSplit: false,
          chunkSizeWarningLimit: 4000,
        }
      : { target: 'es2020', outDir: 'dist' },
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
