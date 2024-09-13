import { type FileSystemService } from './FileSystemService';
import { Module } from './Module';
import { ModuleFactory } from './ModuleFactory';
import { type PerformanceService } from './PerformanceService';
import { ResolverService } from './ResolverService';
import { runModule } from './runModule';

// function createModuleHash(code: string, onlyExports: string[]) {
//   return `${code}-${onlyExports.join(',')}`;
// }

export class ModuleService {
  #modules = new Map<string, Module>();

  #fileSystemService: FileSystemService;
  #performanceService: PerformanceService;
  #resolverService: ResolverService;

  #moduleFactory: ModuleFactory;

  constructor(
    fileSystemService: FileSystemService,
    performanceService: PerformanceService,
    resolverService: ResolverService
  ) {
    this.#fileSystemService = fileSystemService;
    this.#performanceService = performanceService;
    this.#resolverService = resolverService;

    this.#moduleFactory = new ModuleFactory(
      performanceService,
      resolverService
    );
  }

  get performance() {
    return this.#performanceService;
  }

  async #loadModuleByPath(filename: string, onlyExports: string[]) {
    const existingModule = this.#modules.get(filename);

    if (existingModule) {
      await existingModule.invalidateOnDifferentExports(onlyExports);

      return existingModule;
    }

    const sourceCode = await this.#fileSystemService.readFile(filename);
    const module = this.#moduleFactory.createModule(
      sourceCode,
      filename,
      onlyExports
    );

    this.#modules.set(filename, module);

    return module;
  }

  async #prepareModule(modulesScope: Set<Module>, module: Module) {
    const { aliveImports, resolvedImports } = await module.getSnapshot();

    modulesScope.add(module);

    // console.log('====================');
    // console.log('====================');
    // console.log('#prepareModule', module.filename);
    // console.log('#prepareModule:aliveImports', aliveImports);
    // console.log('#prepareModule:resolvedImports', resolvedImports);
    // console.log('====================');
    // console.log('====================');

    await Promise.all(
      Object.entries(resolvedImports).map(
        async ([moduleName, resolveResult]) => {
          const onlyExports = aliveImports[moduleName].map(
            (parsedImport) => parsedImport.importedName
          );

          if (resolveResult.isAsset) {
            return Promise.resolve();
          }

          const importedModule = await this.#loadModuleByPath(
            resolveResult.path,
            onlyExports
          );
          // console.log(
          //   'importedModule:snapshot',
          //   onlyExports,
          //   importPath,
          //   await importedModule.getSnapshot()
          // );

          await this.#prepareModule(modulesScope, importedModule);
        }
      )
    );
  }

  async evaluateRootModule(code: string, path: string, onlyExports: string[]) {
    const entrypointPath = path + '?entrypoint';

    const module = this.#moduleFactory.createModule(
      code,
      entrypointPath,
      onlyExports
    );
    const modulesScope = new Set<Module>();

    await this.#prepareModule(modulesScope, module);

    const sources = await Promise.all(
      Array.from(modulesScope).map(
        async (module) => (await module.getSnapshot()).code
      )
    );

    return runModule(entrypointPath, sources.join(''));
  }
}
