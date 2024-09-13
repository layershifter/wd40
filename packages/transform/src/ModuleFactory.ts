import { Module } from './Module';
import { PerformanceService } from './PerformanceService';
import { ResolverService } from './ResolverService';

export class ModuleFactory {
  #performanceService: PerformanceService;
  #resolverService: ResolverService;

  constructor(
    performanceService: PerformanceService,
    resolverService: ResolverService
  ) {
    this.#performanceService = performanceService;
    this.#resolverService = resolverService;
  }

  createModule(code: string, filename: string, onlyExports: string[]) {
    return new Module(
      this.#performanceService,
      this.#resolverService,
      code,
      filename,
      onlyExports
    );
  }
}
