import { FileSystemService } from './FileSystemService';
import { ModuleService } from './ModuleService';
import { PerformanceService } from './PerformanceService';
import { ResolverService } from './ResolverService';

export function createModuleService() {
  const performanceService = new PerformanceService();
  const fileSystemService = new FileSystemService();
  const resolverService = new ResolverService(performanceService);

  return new ModuleService(
    fileSystemService,
    performanceService,
    resolverService
  );
}
