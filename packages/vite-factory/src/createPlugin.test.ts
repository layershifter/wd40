import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as prettier from 'prettier';
import { build } from 'vite';
import type { InlineConfig } from 'vite';

import { moduleConfig } from '@wd40/integrations-griffel';

import { createPlugin } from './createPlugin';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const prettierConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../.prettierrc'), {
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

async function assertFixture(params: {
  name: string;
  description: string;
  options?: InlineConfig;
}): Promise<void> {
  const { name, description } = params;

  it(`[${name}] ${description}`, async () => {
    const fixtureDirectory = path.join(__dirname, '..', '__fixtures__', name);

    const plugin = createPlugin({ moduleConfig, pluginName: 'test' });
    const result = await build({
      root: fixtureDirectory,
      logLevel: 'error',
      plugins: [plugin],
      build: {
        minify: false,
        rollupOptions: {
          external: ['@griffel/core'],
        },
        lib: {
          entry: path.resolve(fixtureDirectory, 'code.ts'),
          formats: ['es'],
        },
        write: false,
      },
      ...params.options,
    });

    if (!Array.isArray(result)) {
      throw new Error(/* TODO */);
    }

    // expect(result[0]).toHaveLength(1);
    // expect(result[0].output).toHaveLength(1);

    await expect(result[0].output[0].code).toMatchFileSnapshot(
      path.join(fixtureDirectory, 'output.ts')
    );
  });
}

describe('createPlugin', () => {
  assertFixture({
    // TODO
    description: '---',
    name: 'single-identifier',
  });

  assertFixture({
    // TODO
    description: '---',
    name: 'import-aliases',
    options: {
      resolve: {
        alias: {
          'non-existing-color-module': path.resolve(
            __dirname,
            '..',
            '__fixtures__',
            'import-aliases',
            'color.ts'
          ),
        },
      },
    },
  });
});
