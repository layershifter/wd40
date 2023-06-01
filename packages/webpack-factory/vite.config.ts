import { joinPathFragments } from '@nx/devkit';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import ViteTsConfigPathsPlugin from 'vite-tsconfig-paths';

export default defineConfig({
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  test: {
    globals: true,
    cache: {
      dir: '../../node_modules/.vitest',
    },
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  cacheDir: '../../node_modules/.vite/@wd40-webpack-factory',
  build: {
    target: 'node16',
    lib: {
      entry: 'src/index.ts',
      name: '@wd40-webpack-factory',
      fileName: 'index',
      formats: ['cjs'],
    },
    minify: false,
    rollupOptions: {
      // External packages that should not be bundled into your library.
      external: ['@wd40/transform', 'webpack'],
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
