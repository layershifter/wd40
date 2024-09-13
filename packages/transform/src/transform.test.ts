import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';
import * as prettier from 'prettier';

import { createModuleConfig } from '@wd40/integrations-griffel';

import { FileSystemService } from './FileSystemService';
import { ModuleService } from './ModuleService';
import { PerformanceService } from './PerformanceService';
import { ResolverService } from './ResolverService';
import { createModuleService } from './createModuleService';
import { transform } from './transform';

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

let moduleService: ModuleService;

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
      moduleService,
      // runner,
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
  beforeAll(() => {
    moduleService = createModuleService();
  });

  afterAll(() => {
    // runner.dispose();
  });

  assertFixture({
    description: 'transforms a module',
    name: 'single-call',
    // only: true,
  });
  assertFixture({
    description: 'transforms multiple calls in a module',
    name: 'multiple-calls',
    // only: true,
  });
  assertFixture({
    description: 'transforms multiple specifiers in a module',
    name: 'multiple-specifiers',
    // only: true,
  });
  assertFixture({
    // TODO
    description: '',
    name: 'rules-with-metadata',
    // only: true,
  });

  assertFixture({
    // TODO
    description: '',
    name: 'import',
    only: true,
  });
  assertFixture({
    // TODO
    description: '',
    name: 'import-default',
    // only: true,
  });
  assertFixture({
    // TODO
    description: '',
    name: 'import-shared-module',
    // only: true,
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
    // only: true,
  });

  // Assets handling

  assertFixture({
    // TODO
    description: '',
    name: 'assets',
    // only: true,
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
    // only: true,
  });
  assertFixture({
    // TODO
    description: '',
    name: 'mode-css-assets',
    mode: 'extract-css',
    // only: true,
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
    // only: true,
  });
  assertFixture({
    // TODO
    description: '',
    name: 'side-effects-dom-functions',
    // only: true,
  });
});
