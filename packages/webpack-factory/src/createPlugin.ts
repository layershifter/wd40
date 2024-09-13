import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  Compiler,
  LoaderContext,
  LoaderDefinitionFunction,
} from 'webpack';

import { createModuleService, transform } from '@wd40/transform';
import type { ModuleConfig } from '@wd40/transform';

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

        const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

        function isAssetFile(moduleId: string) {
          return ASSET_EXTENSIONS.some((ext) => moduleId.endsWith(ext));
        }

        const resolveId = (id: string, importerId: string) => {
          return new Promise((resolve, reject) => {
            resolver.resolve(
              {},
              // TODO: handle normalization better
              // TODO: handle normalization better
              importerId ? path.dirname(importerId) : '',
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
                resolve(result);
              }
            );
          });
        };

        class WebpackResolver {
          async resolveModule(moduleId: string, importerId: string) {
            if (moduleId === 'react') {
              return {
                path: fileURLToPath(
                  new URL('./react-mock.ts', import.meta.url)
                ),
              };
            }

            // console.log('resolving', moduleId, importerId);
            const result = resolveId(moduleId, importerId);

            // console.log('result', result);
            if (!result) {
              throw new Error(`Module not found: ${moduleId}`);
            }

            if (isAssetFile(result)) {
              return {
                path: result,
                isAsset: true,
              };
            }

            return {
              path: result,
            };
          }
        }

        console.log(
          JSON.stringify(createModuleService().performance.getMarks())
        );

        (compiler as any).wd40 = createModuleService();
        // this.#disposeRunner = result.disposeRunner;
        (compiler as any).wd40Loader = loader;
      });
      // compiler.hooks.done.tap('PLUGIN_NAME', () => {
      // this.#disposeRunner?.();
      // });
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

    // performanceService
    //   .getMarks()
    //   .map((m) => ({
    //     ...m,
    //     actual: m.end - m.time,
    //   }))
    //   .sort((a, b) => a.filename.localeCompare(b.filename))
    //   .map((m) =>
    //     console.log(
    //       'MARK',
    //       `name: ${m.name}`,
    //       `filename: ${m.filename}`,
    //       Math.ceil(m.actual) + 'ms'
    //     )
    //   );

    const start = performance.now();

    transform({
      sourceCode,
      filename: this.resourcePath,
      // TODO
      // sourceMap,
      // TODO
      moduleConfig,
      // TODO
      moduleService: (this._compiler as any).wd40,
    })
      .then((result) => {
        const end = performance.now();

        console.log('TRANSFORM', this.resourcePath, end - start);

        this.callback(null, result.code, result.map ?? undefined);
      })
      .catch((err) => {
        this.callback(err as Error);
      });
  }

  return [Plugin, loader] as const;
}
