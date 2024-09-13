import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { WD_MODULE_NAME } from './constants';

export async function runModule(
  sourceFilename: string,
  sourceCode: string
): Promise<Record<string, unknown>> {
  // add 'use strict' since ESM enables it by default
  const code = `
  ()=>{{
    const installedModules = {};
    const registeredModules = {};
    
    function export_star(from, to) {
      Object.keys(from).forEach(function(k) {
        if (k !== "default" && !Object.prototype.hasOwnProperty.call(to, k)) {
          Object.defineProperty(to, k, {
            enumerable: true,
            get: function() { return from[k]; }
          });
        }
      });
      return from;
    }

    function require(moduleId) {
      if (installedModules[moduleId]) {
        return installedModules[moduleId].exports;
      }

      const module = { exports: {}, id: moduleId, loaded: false };

      installedModules[moduleId] = module;
      registeredModules[moduleId].call(null, module, module.exports, require, export_star);

      module.loaded = true;

      return module.exports;
    }
  
    function ${WD_MODULE_NAME}(filename, fn) {
      registeredModules[filename] = fn;
    }  
  
    ${sourceCode}
    
    return require("${sourceFilename}");
  }};
  `;

  // console.log('++++++++++++');
  // console.log('++++++++++++');
  // console.log('runModule:sourceFilename', sourceFilename);
  // console.log('runModule:sourceCode');
  // console.log(code);

  // const path = fileURLToPath(new URL('../test.js', import.meta.url));
  // await fs.writeFile(path, `'use strict'; const fn = ${code}\nfn();`);

  // console.log('++++++++++++');
  // console.log('++++++++++++');

  const fn = vm.runInThisContext("'use strict'; " + code, {
    filename: __filename,
    lineOffset: 0,
    // columnOffset: -codeDefinition.length,
  });

  return fn();
}
