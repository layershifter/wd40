import { createServer } from 'vite';
import { virtualModulePlugin } from './virtualModulePlugin';
import { ViteNodeServer } from 'vite-node/server';
import { ViteNodeRunner } from 'vite-node/client';

export async function createModuleRunner() {
  const server = await createServer({
    optimizeDeps: {
      disabled: true,
    },
    plugins: [virtualModulePlugin],
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
