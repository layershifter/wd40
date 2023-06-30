import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import vm from 'node:vm';

import { ASSET_PREFIX, ASSET_SUFFIX } from '../constants';
import { preProcess } from '../process/preProcess';
import { prepareModule } from './prepareModule';
import { resolveModule } from './resolveModule';
import { isAssetRequest, isJSONRequest } from './utils';

export class ModuleRunner {
  #cache = new Map<string, string>();

  constructor() {}

  async evaluateModule<T>(
    code: string,
    url: string,
    onlyExports: string[] = ['*']
  ): Promise<T> {
    if (isJSONRequest(url)) {
      // TODO: handle JSON
      return {};
    }

    if (isAssetRequest(url)) {
      // TODO: path should be relative to the project root
      return {
        default: ASSET_PREFIX + url + ASSET_SUFFIX,
      };
    }

    const cacheKey = url + JSON.stringify(onlyExports.sort());
    let resultCode;

    if (this.#cache.has(cacheKey)) {
      // console.log('cache hit', cacheKey);
      resultCode = this.#cache.get(cacheKey);
    } else {
      // console.log('cache miss', cacheKey);
      // console.log('evaluateModule:url', url);
      // console.log('code', code);

      // console.log('result1', result1);

      const preResult = await preProcess(code, onlyExports);
      const result = await prepareModule(preResult, url);

      // console.log('eee', result, await preProcess(code, onlyExports));

      resultCode = result.code;
      this.#cache.set(cacheKey, resultCode);

      // console.log('result2', result2.code);
    }

    const result3 = await this.#runInVM(resultCode, url);

    // console.log(r2);
    return result3;
  }

  async #requestModule(
    moduleId: string,
    importer: string,
    specifiers: string[]
  ): Promise<any> {
    const modulePath = await resolveModule(moduleId, importer);
    const moduleCode = await fs.promises.readFile(modulePath, {
      encoding: 'utf-8',
    });

    return this.evaluateModule(moduleCode, modulePath, specifiers);
  }

  async #runInVM(transformed: string, modulePath: string) {
    const href = url.pathToFileURL(modulePath).href;
    const meta = { url: href };

    const __filename = url.fileURLToPath(href);

    const cjsExports = {};
    const moduleProxy = {
      set exports(value) {
        // exportAll(cjsExports, value);
        // exports.default = value;
      },
      get exports() {
        // return cjsExports;
      },
    };

    const request = async (moduleId: string, specifiers: string[]) => {
      return this.#requestModule(moduleId, __filename, specifiers);
    };

    // Be careful when changing this
    // changing context will change amount of code added on line :114 (vm.runInThisContext)
    // this messes up sourcemaps for coverage
    // adjust `offset` variable in packages/coverage-c8/src/provider.ts#86 if you do change this
    const context = {
      // esm transformed by Vite
      __vite_ssr_import__: request,
      __vite_ssr_dynamic_import__: request,
      __vite_ssr_exports__: exports,
      // TODO
      // __vite_ssr_exportAll__: (obj: any) => exportAll(exports, obj),
      __vite_ssr_import_meta__: meta,

      // cjs compact
      require: createRequire(href),
      exports: cjsExports,
      module: moduleProxy,
      __filename,
      __dirname: path.dirname(__filename),
    };

    // add 'use strict' since ESM enables it by default
    const codeDefinition = `'use strict';async (${Object.keys(context).join(
      ','
    )})=>{{`;
    const code = `${codeDefinition}${transformed}\n}}`;
    const fn = vm.runInThisContext(code, {
      filename: __filename,
      lineOffset: 0,
      columnOffset: -codeDefinition.length,
    });

    await fn(...Object.values(context));

    return exports;
  }
}
