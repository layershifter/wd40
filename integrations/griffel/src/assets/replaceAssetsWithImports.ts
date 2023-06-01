import type { CSSRulesByBucket } from '@griffel/core';
import * as ESTree from 'estree';
import { walk } from 'estree-walker';
import * as path from 'path';
import { tokenize } from 'stylis';

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
    const tokens = tokenize(value);

    const quasis: ESTree.TemplateElement[] = [];
    const expressions: ESTree.Identifier[] = [];

    let acc = '';

    for (let i = 0, l = tokens.length; i < l; i++) {
      acc += tokens[i];

      if (tokens[i] === 'url') {
        const url = tokens[i + 1].slice(1, -1);

        if (url.startsWith('@asset') || url.startsWith('"@asset:')) {
          // Handle `filter: url(./a.svg#id)`
          const [pathname, hash] = url.split('#');

          const relativePath = absolutePathToRelative(
            path,
            projectRoot,
            filename,
            pathname
          );
          const identifier = addDefaultImport('asset', relativePath);

          quasis.push({
            type: 'TemplateElement',
            value: { raw: acc + '(' },
            tail: false,
          });

          expressions.push({
            type: 'Identifier',
            name: identifier,
          });

          acc = `${hash ? `#${hash}` : ''})`;
          i++;
        }
      }
    }

    quasis.push({
      type: 'TemplateElement',
      value: { raw: acc },
      tail: true,
    });

    return {
      type: 'TemplateLiteral',
      expressions,
      quasis,
    };
  }

  walk(node, {
    enter(node, parent, prop, index) {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (node.value.indexOf('url(') === -1) {
          return;
        }

        this.replace(buildTemplateLiteralFromValue(node.value));
      }
    },
  });

  return node;
}
