import { parse } from 'acorn';
import {
  resolveResetStyleRules,
  resolveStyleRulesForSlots,
} from '@griffel/core';
import type { ModuleConfig } from '@wd40/transform';

export const moduleConfig: ModuleConfig[] = [
  {
    moduleName: '@griffel/core',
    specifiers: {
      makeStyles: async (node, parent, params, utils) => {
        // console.log(params[0], resolveStyleRulesForSlots(params[0] as any));

        const importName = utils.addNamedImport('@griffel/core', '__styles');
        const [mapping, cssRules] = resolveStyleRulesForSlots(params[0] as any);

        const ast = parse(
          `${importName}(${JSON.stringify(mapping)}, ${JSON.stringify(
            cssRules
          )})`,
          {
            ecmaVersion: 'latest',
            sourceType: 'module',
          }
        );

        utils.replaceWith(ast);
      },
      makeResetStyles: async (node, parent, params, utils) => {
        const importName = utils.addNamedImport(
          '@griffel/core',
          '__resetStyles'
        );
        const ast = parse(
          `${importName}(${JSON.stringify(
            resolveResetStyleRules(params[0] as any)
          )})`,
          {
            ecmaVersion: 'latest',
            sourceType: 'module',
          }
        );

        utils.replaceWith(ast);
      },
    },
  },
];
