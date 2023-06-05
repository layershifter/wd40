import * as path from 'node:path';
import type {
  Compiler,
  LoaderContext,
  LoaderDefinitionFunction,
} from 'webpack';

import { createModuleRunner, transform } from '@wd40/transform';
import type { ModuleConfig, ModuleRunnerResolveId } from '@wd40/transform';

export type WebpackLoaderOptions = Record<string, never>;

type WebpackLoaderParams = Parameters<
  LoaderDefinitionFunction<WebpackLoaderOptions>
>;

export function createPlugin(moduleConfig: ModuleConfig[]) {
  class Plugin {
    #disposeRunner: (() => Promise<void>) | undefined;

    apply(compiler: Compiler): void {
      compiler.hooks.compile.tap('PLUGIN_NAME', async () => {
        const resolver = compiler.resolverFactory.get('normal', {
          dependencyType: 'esm',
        });

        const resolveId: ModuleRunnerResolveId = (id, importer) => {
          return new Promise<
            Awaited<ReturnType<NonNullable<ModuleRunnerResolveId>>>
          >((resolve, reject) => {
            resolver.resolve(
              {},
              // TODO: handle normalization better
              // TODO: handle normalization better
              importer ? path.dirname(importer.replace('/@fs', '')) : '',
              id,
              {},
              (err, result) => {
                if (err) {
                  // console.log('id1', id);
                  // console.log('importer1', importer);
                  // console.log('--');
                  reject(err);
                  return;
                }

                // TODO: Handle null result
                // TODO: Other resolve params
                // console.log('result', result);
                resolve({ id: result as string });
              }
            );
          });
        };

        const result = await createModuleRunner({
          resolveId,
        });

        (compiler as any).runner = result.runner;
        this.#disposeRunner = result.disposeRunner;
      });
      compiler.hooks.done.tap('PLUGIN_NAME', () => {
        this.#disposeRunner?.();
      });
    }
  }

  function loader(
    this: LoaderContext<WebpackLoaderOptions>,
    sourceCode: WebpackLoaderParams[0],
    sourceMap: WebpackLoaderParams[1]
  ) {
    // console.log('sourceCode', sourceCode);
    this.async();
    // Loaders are cacheable by default, but in edge cases/bugs when caching does not work until it's specified:
    // https://github.com/webpack/webpack/issues/14946
    this.cacheable();
    // console.log('this.resourcePath', this.resourcePath);
    transform({
      sourceCode,
      filename: this.resourcePath,
      // TODO
      // sourceMap,
      // TODO
      moduleConfig,
      // TODO
      runner: (this._compiler as any).runner,
    })
      .then((result) => {
        this.callback(null, result.code, result.map ?? undefined);
      })
      .catch((err) => {
        this.callback(err as Error);
      });
  }

  return [Plugin, loader] as const;
}
