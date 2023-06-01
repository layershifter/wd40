import {
  resolveResetStyleRules,
  resolveStyleRulesForSlots,
} from '@griffel/core';
import { parse } from 'acorn';
import * as path from 'node:path';

import type { ModuleConfig } from '@wd40/transform';

import { normalizeStyleRules } from './assets/normalizeStyleRules';
import { replaceAssetsWithImports } from './assets/replaceAssetsWithImports';

export const moduleConfig: ModuleConfig[] = [
  {
    moduleName: '@griffel/core',
    specifiers: {
      makeStyles: async ({ context, node, parent, params, utils }) => {
        // console.log(params[0], resolveStyleRulesForSlots(params[0] as any));

        const importName = utils.addNamedImport('@griffel/core', '__styles');

        const stylesBySlots = params[0] as any;
        const [mapping, cssRulesByBucket] =
          resolveStyleRulesForSlots(stylesBySlots);

        const newNode = replaceAssetsWithImports(
          context.projectRoot,
          context.filename,
          parse(
            `${importName}(${JSON.stringify(mapping)}, ${JSON.stringify(
              cssRulesByBucket
            )})`,
            {
              ecmaVersion: 'latest',
              sourceType: 'module',
            }
          ),
          utils.addDefaultImport
        );

        utils.replaceWith(newNode);
      },
      makeResetStyles: async ({ context, node, parent, params, utils }) => {
        const importName = utils.addNamedImport(
          '@griffel/core',
          '__resetStyles'
        );

        const [ltr, rtl, cssRules] = resolveResetStyleRules(params[0] as any);
        const newNode = replaceAssetsWithImports(
          context.projectRoot,
          context.filename,
          parse(
            `${importName}(${JSON.stringify(ltr)}, ${JSON.stringify(
              rtl
            )}, ${JSON.stringify(cssRules)})`,
            {
              ecmaVersion: 'latest',
              sourceType: 'module',
            }
          ),
          utils.addDefaultImport
        );

        utils.replaceWith(newNode);
      },
    },
  },
];
