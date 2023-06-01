import { createServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';

import type { ModuleRunnerResolveId } from '../types';
import { resolvePlugin } from './resolvePlugin';

export async function createModuleRunner(
  params: {
    resolveId?: ModuleRunnerResolveId;
  } = {}
) {
  const server = await createServer({
    optimizeDeps: {
      disabled: true,
    },
    plugins: [
      {
        name: 'sss',
        transform(code, id) {
          if (id.endsWith('.jpg')) {
            return code.replace(
              /export default "(.+).jpg"/,
              'export default "@asset:$1.jpg"'
            );
          }

          return null;
        },
      },
      resolvePlugin({ resolveId: params.resolveId }),
    ],
  });

  await server.pluginContainer.buildStart({});
  const node = new ViteNodeServer(server as any);

  const runner = new ViteNodeRunner({
    root: server.config.root,
    base: server.config.base,

    fetchModule(id) {
      return node.fetchModule(id);
    },

    resolveId(id, importer) {
      return node.resolveId(id, importer);
    },
  });

  return {
    runner,
    disposeRunner: async () => {
      await server.close();
    },
  };
}
