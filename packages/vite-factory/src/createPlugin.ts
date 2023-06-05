import type { Plugin } from 'vite';

import { createModuleRunner, transform } from '@wd40/transform';
import type {
  ModuleConfig,
  ModuleRunner,
  ModuleRunnerResolveId,
} from '@wd40/transform';

export function createPlugin(params: {
  moduleConfig: ModuleConfig[];
  pluginName: string;
}): Plugin {
  let runner: ModuleRunner;
  let disposeRunner: () => Promise<void>;

  return {
    name: params.pluginName,

    async buildStart() {
      const resolveId: ModuleRunnerResolveId = async (source, importer) => {
        const result = await this.resolve(source, importer, { skipSelf: true });

        if (result) {
          // TODO something is wrong there
          if (result.external) {
            // return null;
            return false;
          }

          // console.log('external', { source, importer, result });

          return {
            id: result.id,
            external: result.external,
          };
        }

        return null;
      };

      const result = await createModuleRunner({
        resolveId,
      });

      runner = result.runner;
      disposeRunner = result.disposeRunner;
    },
    async buildEnd() {
      await disposeRunner();
    },

    async transform(sourceCode, filename) {
      const { code, map } = await transform({
        sourceCode,
        filename,

        moduleConfig: params.moduleConfig,
        runner,
      });

      return {
        code,
        map,
      };
    },
  };
}
