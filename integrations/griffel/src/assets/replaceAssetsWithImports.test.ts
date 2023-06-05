import { parse } from 'acorn';
import { generate } from 'astring';
import fs from 'fs';
import url from 'node:url';
import path from 'path';
import * as prettier from 'prettier';

import { ASSET_PREFIX, ASSET_SUFFIX } from '@wd40/transform';

import { replaceAssetsWithImports } from './replaceAssetsWithImports';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const prettierConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../../.prettierrc'), {
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

const projectRoot = '/home/user/project';
const filename = '/home/user/project/src/index.js';

describe('replaceAssetsWithImports', () => {
  it('skips unrelated assets', () => {
    const code = `export default ['.foo { background-image: url(image.png) }']`;
    const node = parse(code, { ecmaVersion: 2020, sourceType: 'module' });

    replaceAssetsWithImports(
      projectRoot,
      filename,
      node,
      (specifier, importPath) => {}
    );

    expect(generate(node)).toMatchInlineSnapshot(
      "export default ['.foo { background-image: url(image.png) }'];"
    );
  });

  it('replaces assets with imports', () => {
    const pngAssetPath = '/assets/image.png';
    const svgAssetPath = '/assets/image.svg';

    const code = `
      export default [
        '.foo { background-image: url(${ASSET_PREFIX}${pngAssetPath}${ASSET_SUFFIX}) }',
        '.baz { background-image: url(${ASSET_PREFIX}${svgAssetPath}${ASSET_SUFFIX}#path) }',
      ]
    `;
    const node = parse(code, { ecmaVersion: 2020, sourceType: 'module' });

    let importCounter = 0;

    replaceAssetsWithImports(
      projectRoot,
      filename,
      node,
      (specifier, importPath) => {
        const importName = `asset${importCounter++}`;

        node.body.unshift(
          parse(`import ${importName} from '${importPath}'`, {
            ecmaVersion: 2020,
            sourceType: 'module',
          })
        );

        return importName;
      }
    );

    expect(generate(node)).toMatchInlineSnapshot(
      `
      import asset0 from '../assets/image.png';
      import asset1 from '../assets/image.svg';

      export default [
        \`.foo { background-image: url(\${asset0}) }\`,
        \`.baz { background-image: url(\${asset1}#path) }\`,
      ];
    `
    );
  });
});
