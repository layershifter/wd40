import {
  resolveStyleRulesForSlots,
  resolveResetStyleRules,
} from '@griffel/core';
import { parse } from 'acorn';

import { transform } from './transform';
import type { ModuleConfig, ModuleRunner } from './types';
import { createModuleRunner } from './evaluator/createModuleRunner';

const moduleConfig: ModuleConfig[] = [
  {
    moduleName: '@griffel/core',
    specifiers: {
      makeStyles: async (node, parent, params, utils) => {
        // console.log(params[0], resolveStyleRulesForSlots(params[0] as any));

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

describe('transform', () => {
  let runner: ModuleRunner;
  let disposeRunner: () => Promise<void>;

  beforeAll(async () => {
    const result = await createModuleRunner();

    runner = result.runner;
    disposeRunner = result.disposeRunner;
  });

  afterAll(async () => {
    await disposeRunner();
  });

  it('transforms a module', async () => {
    const sourceCode = `
      import { makeStyles } from '@griffel/core'

      const classes = makeStyles({ root: { color: 'red' } });

      export function App() {
        return React.createElement('div', { className: classes.root });
      }
    `;

    const result = await transform({
      moduleConfig,
      filename: 'test.js',
      sourceCode,
      runner,
    });

    expect(result.code).toMatchInlineSnapshot(`
      "
            import { makeStyles } from '@griffel/core'

            const classes = __styles([{
        \\"root\\": {
          \\"sj55zd\\": \\"fe3e8s9\\"
        }
      }, {
        \\"d\\": [\\".fe3e8s9{color:red;}\\"]
      }]);
      ;

            export function App() {
              return React.createElement('div', { className: classes.root });
            }
          "
    `);
  });

  it('transforms multiple calls in a module', async () => {
    const sourceCode = `
      import { makeStyles } from '@griffel/core'

      const classesA = makeStyles({ root: { color: 'green' } });
      const classesB = makeStyles({ root: { color: 'blue' } });

      export function App() {
        return React.createElement('div', { className: classes.root });
      }
    `;

    const result = await transform({
      moduleConfig,
      filename: 'test2.js',
      sourceCode,
      runner,
    });

    expect(result.code).toMatchInlineSnapshot(`
      "
            import { makeStyles } from '@griffel/core'

            const classesA = __styles([{
        \\"root\\": {
          \\"sj55zd\\": \\"fka9v86\\"
        }
      }, {
        \\"d\\": [\\".fka9v86{color:green;}\\"]
      }]);
      ;
            const classesB = __styles([{
        \\"root\\": {
          \\"sj55zd\\": \\"f163i14w\\"
        }
      }, {
        \\"d\\": [\\".f163i14w{color:blue;}\\"]
      }]);
      ;

            export function App() {
              return React.createElement('div', { className: classes.root });
            }
          "
    `);
  });

  it('transforms multiple specifiers in a module', async () => {
    const sourceCode = `
      import { makeStyles, makeResetStyles } from '@griffel/core'

      const classesA = makeStyles({ root: { color: 'green' } });
      const classesB = makeResetStyles({ color: 'blue' });

      export function App() {
        return React.createElement('div', { className: classes.root });
      }
    `;

    const result = await transform({
      moduleConfig,
      filename: 'test3.js',
      sourceCode,
      runner,
    });

    expect(result.code).toMatchInlineSnapshot(`
      "
            import { makeStyles, makeResetStyles } from '@griffel/core'

            const classesA = __styles([{
        \\"root\\": {
          \\"sj55zd\\": \\"fka9v86\\"
        }
      }, {
        \\"d\\": [\\".fka9v86{color:green;}\\"]
      }]);
      ;
            const classesB = __resetStyles([\\"r14ksm7b\\", null, [\\".r14ksm7b{color:blue;}\\"]]);
      ;

            export function App() {
              return React.createElement('div', { className: classes.root });
            }
          "
    `);
  });
});
