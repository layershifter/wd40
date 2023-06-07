import * as path from 'node:path';
import * as url from 'node:url';
import type { Plugin } from 'rollup';

import type { ModuleRunnerResolveId } from '../types';

const VIRTUAL_MODULES = new Map<string, string>();

const isWindows = process.platform === 'win32';

function slash(str: string) {
  return str.replace(/\\/g, '/');
}

const queryRE = /\?.*$/s;
const hashRE = /#.*$/s;

export function cleanUrl(url: string): string {
  return url.replace(hashRE, '').replace(queryRE, '');
}

function normalizeRequestId(id: string): string {
  return id
    .replace(/^\/@id\/__x00__/, '\0') // virtual modules start with `\0`
    .replace(/^\/@id\//, '')
    .replace(/^__vite-browser-external:/, '')
    .replace(/^file:/, '')
    .replace(/^\/+/, '/') // remove duplicate leading slashes
    .replace(/\?v=\w+/, '?') // remove ?v= query
    .replace(/&v=\w+/, '') // remove &v= query
    .replace(/\?t=\w+/, '?') // remove ?t= query
    .replace(/&t=\w+/, '') // remove &t= query
    .replace(/\?import/, '?') // remove ?import query
    .replace(/&import/, '') // remove &import query
    .replace(/\?&/, '?') // replace ?& with just ?
    .replace(/\?+$/, ''); // remove end query mark
}

function toFilePath(id: string, root: string): string {
  let absolute = (() => {
    if (id.startsWith('/@fs/')) {
      return id.slice(4);
    }

    // check if /src/module.js -> <root>/src/module.js
    if (!id.startsWith(root) && id.startsWith('/')) {
      return path.resolve(root, id.slice(1));
    }

    return id;
  })();

  if (absolute.startsWith('//')) {
    absolute = absolute.slice(1);
  }

  // disambiguate the `<UNIT>:/` on windows: see nodejs/node#31710
  return isWindows && absolute.startsWith('/')
    ? slash(url.fileURLToPath(url.pathToFileURL(absolute.slice(1)).href))
    : absolute;
}

export const resolvePlugin = (
  params: {
    resolveId?: ModuleRunnerResolveId;
  } = {}
): Plugin => ({
  name: 'wd40:resolve-plugin',
  resolveId(id, importer) {
    // console.log('resolvePlugin:id', id);
    // console.log('resolvePlugin:importer', importer);

    if (VIRTUAL_MODULES.has(id)) {
      // console.log('resolvePlugin:virtualId', virtualId);
      return id;
    }

    // console.log('resolvePlugin:id', id);
    // console.log('resolvePlugin:importer', importer);
    // console.log('---');

    if (params.resolveId && !id.includes('wd40.ts')) {
      // TODO: any
      // console.log('resolvePlugin:resolveId', id, importer);

      return params.resolveId?.(
        // TODO: WTF is happening here?
        toFilePath(normalizeRequestId(id), process.cwd()),
        importer
      ) as any;
    }

    return null;
  },
  load(id) {
    return VIRTUAL_MODULES.get(id.replace('\0', ''));
  },
});

export function addVirtualModule(filename: string, content: string) {
  const virtualModuleName = filename + '.wd40.ts';

  VIRTUAL_MODULES.set(virtualModuleName, content);

  return {
    virtualModuleName,
    disposeModule: () => {
      VIRTUAL_MODULES.delete(virtualModuleName);
    },
  };
}
