import type { Plugin } from 'vite';

const VIRTUAL_MODULES = new Map<string, string>();

export const virtualModulePlugin: Plugin = {
  name: 'resolve-plugin',
  resolveId(id) {
    const virtualId = id.split('/').pop();

    if (typeof virtualId === undefined) {
      throw new Error('virtualId is undefined');
    }

    if (VIRTUAL_MODULES.has(virtualId as string)) {
      return '\0virtual:' + virtualId;
    }

    return null;
  },
  load(id) {
    return VIRTUAL_MODULES.get(id.replace('\0virtual:', ''));
  },
};

export function addVirtualModule(filename: string, content: string) {
  const virtualModuleName = filename + '.wd40.js';

  VIRTUAL_MODULES.set(virtualModuleName, content);

  return {
    virtualModuleName,
    disposeModule: () => {
      VIRTUAL_MODULES.delete(virtualModuleName);
    },
  };
}
