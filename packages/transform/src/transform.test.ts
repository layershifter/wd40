import {
  resolveStyleRulesForSlots,
  resolveResetStyleRules,
} from '@griffel/core';
import { parse } from 'acorn';

import { transform } from './transform';
import type { ModuleConfig, ModuleRunner } from './types';
import { createModuleRunner } from './evaluator/createModuleRunner';

import * as url from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as prettier from 'prettier';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', '__fixtures__');

const prettierConfig = JSON.parse(
  await fs.readFile(path.resolve(__dirname, '../../../.prettierrc'), {
    encoding: 'utf-8',
  })
);

expect.addSnapshotSerializer({
  serialize(val) {
    return prettier.format(val, { ...prettierConfig, parser: 'typescript' });
  },
  test(val) {
    return typeof val === 'string';
  },
});

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

  it.only('transforms a module', async () => {
    const result = await transform({
      moduleConfig,
      filename: 'test.js',
      sourceCode: await fs.readFile(
        path.join(FIXTURES_DIR, 'single-call', 'input.ts'),
        'utf8'
      ),
      runner,
    });

    await expect(result.code).toMatchFileSnapshot(
      path.join(FIXTURES_DIR, 'single-call', 'output.ts')
    );
  });

  it('transforms multiple calls in a module', async () => {
    const result = await transform({
      moduleConfig,
      filename: 'test.js',
      sourceCode: await fs.readFile(
        path.join(FIXTURES_DIR, 'multiple-calls', 'input.ts'),
        'utf8'
      ),
      runner,
    });

    await expect(result.code).toMatchFileSnapshot(
      path.join(FIXTURES_DIR, 'multiple-calls', 'output.ts')
    );
  });

  it('transforms multiple specifiers in a module', async () => {
    const result = await transform({
      moduleConfig,
      filename: 'test.js',
      sourceCode: await fs.readFile(
        path.join(FIXTURES_DIR, 'multiple-specifiers', 'input.ts'),
        'utf8'
      ),
      runner,
    });

    await expect(result.code).toMatchFileSnapshot(
      path.join(FIXTURES_DIR, 'multiple-specifiers', 'output.ts')
    );
  });
});
