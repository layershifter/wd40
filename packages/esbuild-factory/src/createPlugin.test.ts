import { build } from 'esbuild';
import type { BuildOptions } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as prettier from 'prettier';

import { createModuleConfig } from '@wd40/integrations-griffel';

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
  options?: BuildOptions;
}): Promise<void> {
  const { name, description } = params;

  it(`[${name}] ${description}`, async () => {
    const fixtureDirectory = path.join(__dirname, '..', '__fixtures__', name);
    const distDirectory = path.join(fixtureDirectory, 'dist');

    const plugin = createPlugin({
      moduleConfig: createModuleConfig({ mode: 'compile-only' }),
      pluginName: 'test',
    });

    await build({
      entryPoints: [path.resolve(fixtureDirectory, 'code.ts')],
      bundle: true,
      outdir: distDirectory,
      plugins: [plugin],
      format: 'esm',
      external: ['@griffel/core'],
      ...params.options,
    });

    const result = await fs.promises.readFile(
      path.resolve(distDirectory, 'code.js'),
      { encoding: 'utf-8' }
    );

    await expect(
      result.substring(result.indexOf('\n') + 1)
    ).toMatchFileSnapshot(path.join(fixtureDirectory, 'output.ts'));
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
  });
});
