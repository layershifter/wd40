import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';
import * as prettier from 'prettier';

import { createModuleConfig } from '@wd40/integrations-griffel';

import { createModuleRunner } from './evaluator/createModuleRunner';
import { transform } from './transform';
import type { ModuleRunner } from './types';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const prettierConfig = JSON.parse(
  await fs.readFile(path.resolve(__dirname, '../../../.prettierrc'), {
    encoding: 'utf-8',
  })
);

expect.addSnapshotSerializer({
  serialize(val) {
    return prettier.format(val, {
      ...prettierConfig,
      parser: val.includes('import ') ? 'typescript' : 'css',
    });
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
  mode?: 'compile-only' | 'extract-css';
  only?: boolean;
}): Promise<void> {
  const { name, description, mode = 'compile-only', only } = params;
  const assert = only ? it.only : it;

  assert(`[${name}] ${description}`, async () => {
    const fixtureDirectory = path.join(__dirname, '..', '__fixtures__', name);
    const result = await transform({
      moduleConfig: createModuleConfig({ mode }),
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

    if (mode === 'extract-css') {
      await expect(result.cssText).toMatchFileSnapshot(
        path.join(fixtureDirectory, 'output.css')
      );
    }
  });
}

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

  assertFixture({
    // TODO
    description: '',
    name: 'rules-with-metadata',
  });

  assertFixture({
    // TODO
    description: '',
    name: 'import-alias',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'import-mixins',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'import-duplicates',
  });

  // Assets handling

  assertFixture({
    // TODO
    description: '',
    name: 'assets',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'assets-multiple-declarations',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'assets-reset-styles',
  });

  assertFixture({
    // TODO
    description: '',
    name: 'assets-urls',
  });

  // Mode CSS
  assertFixture({
    // TODO
    description: '',
    name: 'mode-css-simple',
    mode: 'extract-css',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'mode-css-assets',
    mode: 'extract-css',
  });
  assertFixture({
    // TODO
    description: '',
    name: 'mode-css-rules-with-metadata',
    mode: 'extract-css',
  });

  // DOM
  assertFixture({
    // TODO
    description: '',
    name: 'side-effects-dom',
    only: true,
  });
});
