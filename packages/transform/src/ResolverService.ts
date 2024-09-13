import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ResolverFactory } from 'oxc-resolver';

import { PerformanceService } from './PerformanceService';

const EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
];
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

function isAssetFile(moduleId: string) {
  return ASSET_EXTENSIONS.some((ext) => moduleId.endsWith(ext));
}

export type ModuleResolveResult = {
  path: string;
  isAsset?: boolean;
};

export class ResolverService {
  #performance: PerformanceService;
  #resolver: ResolverFactory;

  constructor(performance: PerformanceService) {
    this.#performance = performance;
    this.#resolver = new ResolverFactory({
      extensions: EXTENSIONS,
      exportsFields: ['import'],
      mainFields: ['module', 'main'],
    });
  }

  async resolveModule(
    moduleId: string,
    importerId: string
  ): Promise<ModuleResolveResult> {
    if (moduleId === 'react') {
      return {
        path: fileURLToPath(new URL('./react-mock.ts', import.meta.url)),
      };
    }

    // console.log('resolving', moduleId, importerId);
    const result = this.#resolver.sync(
      path.dirname(importerId),
      moduleId
    );

    // console.log('result', result);
    if (!result || !result.path) {
      throw new Error(`Module not found: ${moduleId}`);
    }

    if (isAssetFile(result.path)) {
      return {
        path: result.path,
        isAsset: true,
      };
    }

    return {
      path: result.path,
    };
  }
}
