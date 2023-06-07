/// <reference types="vitest" />
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/integrations-griffel',

  plugins: [
    viteTsConfigPaths({
      root: '../../',
    }),
  ],

  build: {
    minify: false,
    target: 'node16',
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: 'integrations-griffel',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forgot to update your package.json as well.
      formats: ['cjs'],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ['node:path', '@wd40/transform', '@griffel/core'],
    },
  },

  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
