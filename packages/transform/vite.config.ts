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
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
  cacheDir: '../../node_modules/.vite/@wd40-transform',
  build: {
    minify: false,
    target: 'node16',
    lib: {
      entry: 'src/index.ts',
      name: '@wd40-transform',
      fileName: 'index',
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'acorn',
        // 'fsevents',
        // 'node:assert',
        // 'node:events',
        // 'node:fs',
        // 'node:module',
        // 'node:os',
        'node:path',
        // 'node:perf_hooks',
        // 'node:process',
        // 'node:url',
        // 'node:util',
        // 'node:v8',
        'node:vm',
        // 'path',
        // 'os',
        'rollup',
        'rollup-plugin-swc3',
        '@rollup/plugin-node-resolve',
        '@rollup/pluginutils',
        'esbuild',
        '@swc/core',
      ],
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
