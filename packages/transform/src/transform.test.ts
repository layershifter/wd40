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

let runner: ModuleRunner;
let disposeRunner: () => Promise<void>;

async function assertFixture(params: {
  name: string;
  description: string;
}): Promise<void> {
  const { name, description } = params;

  it(`[${name}] ${description}`, async () => {
    const fixtureDirectory = path.join(__dirname, '..', '__fixtures__', name);
    const result = await transform({
      moduleConfig,
      filename: path.join(fixtureDirectory, 'input.ts'),
      sourceCode: await fs.readFile(
        path.join(fixtureDirectory, 'input.ts'),
        'utf8'
      ),
      runner,
    });

    await expect(result.code).toMatchFileSnapshot(
      path.join(fixtureDirectory, 'output.ts')
    );
  });
}

const moduleConfig: ModuleConfig[] = [
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

describe('transform', () => {
  beforeAll(async () => {
    const result = await createModuleRunner();

    runner = result.runner;
    disposeRunner = result.disposeRunner;
  });

  afterAll(async () => {
    await disposeRunner();
  });

  assertFixture({
    description: 'transforms a module',
    name: 'single-call',
  });
  assertFixture({
    description: 'transforms multiple calls in a module',
    name: 'multiple-calls',
  });

  assertFixture({
    description: 'transforms multiple specifiers in a module',
    name: 'multiple-specifiers',
  });
});
