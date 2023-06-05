import { transform as esbuildTransform } from 'esbuild';
import type { Loader, Plugin } from 'esbuild';
import * as fs from 'node:fs';
import path from 'node:path';

import type {
  ModuleConfig,
  ModuleRunner,
  ModuleRunnerResolveId,
} from '@wd40/transform';
import {
  createModuleRunner,
  transform as wd40Transform,
} from '@wd40/transform';

export function createPlugin(params: {
  moduleConfig: ModuleConfig[];
  pluginName: string;
}): Plugin {
  let runner: ModuleRunner;
  let disposeRunner: () => Promise<void>;

  return {
    name: params.pluginName,
    setup(build) {
      build.onStart(async () => {
        const resolveId: ModuleRunnerResolveId = async (id, importer) => {
          const result = await build.resolve(id, {
            kind: 'import-statement',
            // TODO: handle normalization better
            resolveDir: importer
              ? path.dirname(importer.replace('/@fs', ''))
              : '',
          });

          if (result.errors.length > 0) {
            throw result.errors[0];
          }

          if (result.external) {
            // TODO
            return false;
          }

          return { id: result.path, external: true };
        };

        const result = await createModuleRunner({ resolveId });

        runner = result.runner;
        disposeRunner = result.disposeRunner;
      });

      build.onEnd(async () => {
        await disposeRunner();
      });

      build.onLoad(
        { filter: /\.(cjs|mjs|cts|mts|js|jsx|ts|tsx)$/ },
        async (args) => {
          const sourceCode = fs.readFileSync(args.path, 'utf8');

          const { ext } = path.parse(args.path);
          const loader = ext.replace(/^\./, '') as Loader;

          const esbuildResult = await esbuildTransform(sourceCode, {
            // ...options,
            sourcefile: args.path,
            // sourcemap: sourceMap,
            loader,
          });

          // TODO
          // if (sourceMap) {
          //     const esbuildMap = Buffer.from(transformed.map).toString('base64');
          //     code += `/*# sourceMappingURL=data:application/json;base64,${esbuildMap}*/`;
          // }

          const wd40Result = await wd40Transform({
            sourceCode: esbuildResult.code,
            filename: args.path,
            moduleConfig: params.moduleConfig,
            runner,
          });

          // TODO
          // if (sourceMap) {
          //   const esbuildMap = Buffer.from(transformed.map).toString('base64');
          //   code += `/*# sourceMappingURL=data:application/json;base64,${esbuildMap}*/`;
          // }

          return {
            contents: wd40Result.code,
            loader,
            resolveDir: path.dirname(args.path),
          };
        }
      );
    },
  };
}
