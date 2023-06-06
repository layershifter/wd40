import {
  normalizeCSSBucketEntry,
  resolveResetStyleRules,
  resolveStyleRulesForSlots,
} from '@griffel/core';
import type { GriffelStyle } from '@griffel/core';
import * as ESTree from 'estree';

import type { ModuleConfig } from '@wd40/transform';

import { replaceAssetsWithImports } from './assets/replaceAssetsWithImports';

export function createModuleConfig(options: {
  mode: 'compile-only' | 'extract-css';
}): ModuleConfig[] {
  return [
    {
      moduleName: '@griffel/core',
      specifiers: {
        makeStyles: async ({ context, node, parent, params, utils }) => {
          const specifier =
            options.mode === 'compile-only' ? '__styles' : '__css';
          const importName = utils.addNamedImport('@griffel/core', specifier);

          const stylesBySlots = params[0] as Record<string, GriffelStyle>;
          const [mapping, cssRulesByBucket] =
            resolveStyleRulesForSlots(stylesBySlots);

          const newNode = replaceAssetsWithImports(
            context.projectRoot,
            context.filename,

            {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: importName },
              arguments: [
                {
                  type: 'ObjectExpression',
                  properties: Object.entries(mapping).map(
                    ([slot, mappingForSlot]) =>
                      ({
                        type: 'Property',
                        computed: false,
                        method: false,
                        shorthand: false,
                        kind: 'init',
                        key: { type: 'Identifier', name: slot },
                        value: {
                          type: 'ObjectExpression',
                          properties: Object.entries(mappingForSlot).map(
                            ([key, value]) =>
                              ({
                                type: 'Property',
                                computed: false,
                                method: false,
                                shorthand: false,
                                kind: 'init',
                                key: { type: 'Identifier', name: key },
                                value: Array.isArray(value)
                                  ? {
                                      type: 'ArrayExpression',
                                      elements: value.map((v) => ({
                                        type: 'Literal',
                                        value: v,
                                      })),
                                    }
                                  : { type: 'Literal', value },
                              } satisfies ESTree.Property)
                          ),
                        },
                      } satisfies ESTree.Property)
                  ),
                },
                options.mode === 'compile-only' && {
                  type: 'ObjectExpression',
                  properties: Object.entries(cssRulesByBucket).map(
                    ([bucketName, cssBucketEntries]) =>
                      ({
                        type: 'Property',
                        computed: false,
                        method: false,
                        shorthand: false,
                        kind: 'init',
                        key: { type: 'Identifier', name: bucketName },
                        value: {
                          type: 'ArrayExpression',
                          elements: cssBucketEntries.map((cssBucketEntry) => {
                            if (typeof cssBucketEntry === 'string') {
                              return {
                                type: 'Literal',
                                value: cssBucketEntry,
                              } satisfies ESTree.Literal;
                            }

                            return {
                              type: 'ArrayExpression',
                              elements: [
                                { type: 'Literal', value: cssBucketEntry[0] },
                                {
                                  type: 'ObjectExpression',
                                  properties: Object.entries(
                                    cssBucketEntry[1]
                                  ).map(
                                    ([key, value]) =>
                                      ({
                                        type: 'Property',
                                        computed: false,
                                        method: false,
                                        shorthand: false,
                                        kind: 'init',
                                        key: { type: 'Identifier', name: key },
                                        value: {
                                          type: 'Literal',
                                          value: value as string,
                                        },
                                      } satisfies ESTree.Property)
                                  ),
                                },
                              ],
                            } satisfies ESTree.ArrayExpression;
                          }),
                        },
                      } satisfies ESTree.Property)
                  ),
                },
              ].filter(Boolean) as ESTree.Expression[],
              optional: false,
            },

            utils.addDefaultImport
          );

          if (options.mode === 'extract-css') {
            utils.appendCSSText(
              Object.entries(cssRulesByBucket).reduce(
                (acc, [cssBucketName, cssBucketRules]) => {
                  if (cssBucketName === 'm') {
                    return (
                      acc +
                      cssBucketRules
                        .map((entry) => {
                          return [
                            `/** @griffel:css-start [${cssBucketName}] [${JSON.stringify(
                              entry[1]
                            )}] **/`,
                            normalizeCSSBucketEntry(entry)[0],
                            `/** @griffel:css-end **/`,
                            '',
                          ]
                            .join('\n')
                            .replace(/@wd40-asset:/g, '')
                            .replace(/:@wd40-asset/g, '');
                        })
                        .join('')
                    );
                  }

                  return (
                    acc +
                    [
                      `/** @griffel:css-start [${cssBucketName}] **/`,
                      cssBucketRules
                        .flatMap((entry) => normalizeCSSBucketEntry(entry))
                        .join('')
                        .replace(/@wd40-asset:/g, '')
                        .replace(/:@wd40-asset/g, ''),
                      `/** @griffel:css-end **/`,
                      '',
                    ].join('\n')
                  );
                },
                ''
              )
            );
          }

          utils.replaceWith(newNode);
        },
        makeResetStyles: async ({ context, node, parent, params, utils }) => {
          const specifier =
            options.mode === 'compile-only' ? '__resetStyles' : '__resetCSS';
          const importName = utils.addNamedImport('@griffel/core', specifier);

          const [ltr, rtl, cssRules] = resolveResetStyleRules(params[0] as any);
          const newNode = replaceAssetsWithImports(
            context.projectRoot,
            context.filename,
            {
              type: 'CallExpression',
              callee: { type: 'Identifier', name: importName },
              arguments: [
                { type: 'Literal', value: ltr },
                { type: 'Literal', value: rtl },
                options.mode === 'compile-only' && {
                  type: 'ArrayExpression',
                  elements: cssRules.map((cssRule) => ({
                    type: 'Literal',
                    value: cssRule,
                  })),
                },
              ].filter(Boolean) as ESTree.Expression[],
              optional: false,
            },
            utils.addDefaultImport
          );

          utils.replaceWith(newNode);
        },
      },
    },
  ];
}
