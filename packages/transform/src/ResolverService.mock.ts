import { ModuleResolveResult, type ResolverService } from './ResolverService';

export function createResolverServiceMock(
  entries: Record<string, ModuleResolveResult>
): ResolverService {
  return {
    resolveModule: async (moduleId): Promise<ModuleResolveResult> => {
      const path = entries[moduleId];

      if (!path) {
        throw new Error(`Cannot resolve module '${moduleId}'`);
      }

      return path;
    },
  } as Partial<ResolverService> as ResolverService;
}
