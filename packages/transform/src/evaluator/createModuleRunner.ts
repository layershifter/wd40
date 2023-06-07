import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from '@swc/core';
import { transform } from 'esbuild';
import path from 'node:path';
import vm from 'node:vm';
import * as process from 'process';
import { rollup } from 'rollup';
import type { RollupCache } from 'rollup';
import { swc } from 'rollup-plugin-swc3';

import type { ModuleRunnerResolveId } from '../types';
import { assetPlugin } from './assetPlugin';
import { resolvePlugin } from './resolvePlugin';

export async function createModuleRunner(
  params: {
    resolveId?: ModuleRunnerResolveId;
  } = {}
) {
  // let bundle;
  // let buildFailed = false;

  let cache: RollupCache | undefined;

  const runner = {
    root: process.cwd(),
    executeFile: async (filename: string): Promise<unknown> => {
      const bundle = await rollup({
        cache,
        input: filename,
        treeshake: 'smallest',
        plugins: [
          assetPlugin(),
          resolvePlugin({ resolveId: params.resolveId }),
          swc({
            include: /\.[mc]?[jt]sx?$/,
            exclude: /node_modules/,
            jsc: {},
          }),
          nodeResolve({ extensions: ['.js', '.ts', '.tsx', '.jsx'] }),
        ],
      });

      cache = bundle.cache;

      const output = await bundle.generate({
        generatedCode: 'es2015',
        minifyInternalExports: true,
        esModule: true,
        sourcemap: false,
      });
      const rollupCode = output.output[0].code;

      await bundle.close();

      // const { code: minifiedCode } = await minify(rollupCode, {
      //   module: true,
      //   // format: { beautify: true },
      //   mangle: false,
      //   compress: true,
      //   // compress: false,
      // });

      function NOOP() {}

      const module = { exports: {} };
      const exports = {};

      const context = vm.createContext({
        clearImmediate: NOOP,
        clearInterval: NOOP,
        clearTimeout: NOOP,
        setImmediate: NOOP,
        setInterval: NOOP,
        setTimeout: NOOP,
        global,
        process,
        module,
        exports,
        require,
        __filename: filename,
        __dirname: path.dirname(filename),
      });

      const { code: transformedCode } = await transform(rollupCode, {
        minify: true,
        target: 'node16',
        sourcemap: false,
        platform: 'node',
        format: 'cjs',
      });

      // console.log(rollupCode, transformedCode);

      // const moduleProxy = {
      //   set exports(value) {
      //     exportAll(cjsExports, value);
      //     exports.default = value;
      //   },
      //   get exports() {
      //     return cjsExports;
      //   },
      // };

      const codeDefinition = `'use strict';async (${Object.keys(context).join(
        ','
      )})=>{{`;
      const code = `${codeDefinition}${transformedCode}\n}}`;
      const fn = vm.runInThisContext(code, {
        filename: __filename,
        lineOffset: 0,
        columnOffset: -codeDefinition.length,
      });

      await fn(...Object.values(context));

      // console.log('exports', exports, module);
      return module.exports;
      // const fn = vm.runInThisContext(minifiedCode, {
      //   filename: __filename,
      //   lineOffset: 0,
      //   // columnOffset: -codeDefinition.length,
      // });

      // return {};
    },
  };

  return {
    runner,
    disposeRunner: async () => {
      // await server.close();
    },
  };
}
