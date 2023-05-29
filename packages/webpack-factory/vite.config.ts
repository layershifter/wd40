import dts from 'vite-plugin-dts';
import { joinPathFragments } from '@nx/devkit';
import { defineConfig } from 'vite';
import ViteTsConfigPathsPlugin from 'vite-tsconfig-paths';

export default defineConfig({
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
  cacheDir: '../../node_modules/.vite/@wd40-webpack-factory',
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: '@wd40-webpack-factory',
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forgot to update your package.json as well.
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: [],
    },
  },
  plugins: [
    ViteTsConfigPathsPlugin({
      root: '../../',
    }),
    dts({
      entryRoot: 'src',
      tsConfigFilePath: joinPathFragments(__dirname, 'tsconfig.lib.json'),
      skipDiagnostics: true,
    }),
  ],
});
