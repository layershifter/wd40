import * as ESTree from 'estree';
import { walk } from 'estree-walker';
import * as path from 'node:path';

import { ASSET_PREFIX, ASSET_SUFFIX } from '@wd40/transform';

import { absolutePathToRelative } from './absolutePathToRelative';

/**
 * Replaces assets used in styles with imports and template literals.
 *
 * @example
 * "['.foo { background-image: url(image.png) }"
 * // to
 * import _asset from 'image.png'
 * `['.foo { background-image: url(${_asset}) }`
 */
export function replaceAssetsWithImports(
  projectRoot: string,
  filename: string,
  node: ESTree.Node,
  addDefaultImport: (specifier: string, importPath: string) => string
) {
  function buildTemplateLiteralFromValue(
    value: string
  ): ESTree.TemplateLiteral {
    const quasis: ESTree.TemplateElement[] = [];
    const expressions: ESTree.Identifier[] = [];

    let offset = 0;
    let index = 0;

    while (value.indexOf(ASSET_PREFIX, offset) !== -1) {
      index = value.indexOf(ASSET_PREFIX, offset);

      quasis.push({
        type: 'TemplateElement',
        value: { raw: value.slice(offset, index) },
        tail: false,
      });

      offset = value.indexOf(ASSET_SUFFIX, index) + ASSET_SUFFIX.length;

      const pathname = value.slice(
        index + ASSET_PREFIX.length,
        offset - ASSET_SUFFIX.length
      );
      const relativePath = absolutePathToRelative(
        path,
        projectRoot,
        filename,
        pathname
      );

      const identifier = addDefaultImport('asset', relativePath);

      expressions.push({
        type: 'Identifier',
        name: identifier,
      });
    }

    quasis.push({
      type: 'TemplateElement',
      value: { raw: value.slice(offset) },
      tail: false,
    });

    return {
      type: 'TemplateLiteral',
      expressions,
      quasis,
    };
  }

  walk(node, {
    enter(node) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (node.value.indexOf(ASSET_PREFIX) === -1) {
          return;
        }

        this.replace(buildTemplateLiteralFromValue(node.value));
      }
    },
  });

  return node;
}
