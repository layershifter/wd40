import { Mutex } from 'async-mutex';

import { transform as shake } from '@wd40/native-shaker';

import { type PerformanceService } from './PerformanceService';
import { ModuleResolveResult, ResolverService } from './ResolverService';
import { type ParsedImports, parseImports } from './parseImports';
import { parseProgram } from './parseProgram';
import { programToCode } from './programToCode';
import { replaceExportsImports } from './replaceExportsImports';


async function resolveParsedImports(
  imports: ParsedImports,
  importerId: string,
  resolveCache: Map<string, ModuleResolveResult>,
  resolverService: ResolverService
): Promise<Record<string, ModuleResolveResult>> {
  const result = await Promise.all(
    Object.keys(imports).map(async (moduleName) => {
      const cachedResolveResult = resolveCache.get(moduleName);

      if (cachedResolveResult) {
        return [moduleName, cachedResolveResult];
      }

      const resolveResult = await resolverService.resolveModule(
        moduleName,
        importerId
      );

      resolveCache.set(moduleName, resolveResult);

      return [moduleName, resolveResult];
    })
  );

  return Object.fromEntries(result);
}

type ModuleSnapshot = {
  code: string;
  aliveImports: ParsedImports;
  resolvedImports: Record<string, ModuleResolveResult>;
};

export class Module {
  readonly #code: string;
  #onlyExports: string[];

  #invalidateMutex = new Mutex();
  #snapshotMutex = new Mutex();

  #resolveCache = new Map<string, ModuleResolveResult>();
  #snapshot: ModuleSnapshot | null = null;

  readonly filename: string;

  #performanceService: PerformanceService;
  #resolverService: ResolverService;

  constructor(
    pefromanceService: PerformanceService,
    resolverService: ResolverService,

    code: string,
    filename: string,
    onlyExports: string[]
  ) {
    this.#performanceService = pefromanceService;
    this.#resolverService = resolverService;

    this.#code = code;
    this.filename = filename;
    this.#onlyExports = onlyExports.sort();
  }

  async getSnapshot(): Promise<ModuleSnapshot> {
    // await this.#snapshotMutex.waitForUnlock();
    await this.#makeSnapshot();

    if (!this.#snapshot) {
      throw new Error('Snapshot was not created');
    }

    return this.#snapshot;
  }

  async #makeSnapshot() {
    // await this.#snapshotMutex.runExclusive(async () => {
    if (this.#snapshot === null) {
      // await this.#performanceService.measure(
      //   async () => {
      //     if (this.filename.endsWith('react-mock.ts')) {
      console.log('------------');
      console.log('------------');
      console.log('------------');
      console.log('SHAKER:INPUT (onlyExports)', this.#onlyExports);
      console.log('SHAKER:INPUT (filename)', this.filename);
      console.log('SHAKER:INPUT', this.#code);
      console.log('------------');
      console.log('------------');
      console.log('------------');
      // }

      const shakenResult = shake(this.filename, this.#code, this.#onlyExports);

      console.log('------------');
      console.log('------------');
      console.log('------------');
      console.log(
        'SHAKER:OUTPUT',
        programToCode(JSON.parse(shakenResult.output))
      );
      console.log('------------');
      console.log('------------');
      console.log('------------');

      const shakenProgram = JSON.parse(shakenResult.output);

      const aliveImports = await parseImports(shakenProgram);

      Object.values(aliveImports).forEach((imports) => {
        if (imports.some((i) => i.importedName === '*')) {
          console.log('EXPORT * in ', this.filename);

          throw new Error('Wildcard imports are not supported');
        }
      });

      const resolvedImports = await resolveParsedImports(
        aliveImports,
        this.filename,
        this.#resolveCache,
        this.#resolverService
      );

      // console.log('------------');
      // console.log('------------');
      // console.log('------------');
      // console.log('SHAKER:OUTPUT:ALIVE_IMPORTS', aliveImports);
      // console.log('SHAKER:OUTPUT:RESOLVED_IMPORTS', resolvedImports);
      // console.log('------------');

      const codeToEvaluate = programToCode(
        replaceExportsImports(this.filename, shakenProgram, resolvedImports)
      );

      this.#snapshot = {
        code: codeToEvaluate,
        aliveImports,
        resolvedImports,
      };
      // },
      // 'Module.makeSnapshot',
      // this.filename
      // );
    }
    // });
  }

  async invalidateOnDifferentExports(onlyExports: string[]) {
    // await this.#invalidateMutex.waitForUnlock();
    // await this.#invalidateMutex.runExclusive(async () => {
    const newOnlyExports = onlyExports.sort();
    const newIncludesAllKeys = newOnlyExports.every((key) =>
      this.#onlyExports.includes(key)
    );

    if (!newIncludesAllKeys) {
      const mergedExports = [...this.#onlyExports, ...newOnlyExports].filter(
        (value, index, self) => self.indexOf(value) === index
      );

      this.#onlyExports = mergedExports;
      this.#snapshot = null;
    }
    // });
  }
}
