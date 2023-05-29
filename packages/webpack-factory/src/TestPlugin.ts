import {
  resolveResetStyleRules,
  resolveStyleRulesForSlots,
} from '@griffel/core';
import type { ModuleConfig } from '@wd40/transform';
import { parse } from 'acorn';

import { createPlugin } from './createPlugin';

const moduleConfig: ModuleConfig[] = [
  {
    moduleName: '@griffel/core',
    specifiers: {
      makeStyles: async (node, parent, params, utils) => {
        const ast = parse(
          `__styles(${JSON.stringify(
            resolveStyleRulesForSlots(params[0] as any)
          )})`,
          {
            ecmaVersion: 'latest',
            sourceType: 'module',
          }
        );

        utils.replaceWith(ast);
      },
      makeResetStyles: async (node, parent, params, utils) => {
        const ast = parse(
          `__resetStyles(${JSON.stringify(
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

const [TestPlugin, loader] = createPlugin(moduleConfig);

export { TestPlugin };
export default loader;
