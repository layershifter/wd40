import { createServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';

import type { ModuleRunnerResolveId } from '../types';
import { virtualModulePlugin } from './virtualModulePlugin';

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
      virtualModulePlugin,
      {
        name: 'resolve-plugin',
        resolveId: (id, importer) => {
          // TODO: Why this is required?
          if (id.endsWith('.wd40.js')) {
            return null;
          }

          if (params.resolveId) {
            // TODO: any
            return params.resolveId?.(id, importer) as any;
          }

          return null;
        },
      },
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
