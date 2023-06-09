import acorn, { parse } from 'acorn';
import { generate } from 'astring';
import * as ESTree from 'estree';
import { asyncWalk } from 'estree-walker';
import MagicString from 'magic-string';

import { prepareModuleForEvaluation } from './evaluator/prepareModuleForEvaluation';
import { ModuleRunner } from './runner/ModuleRunner';
import type { ModuleConfig, ModuleSpecifierHandler } from './types';

declare module 'acorn' {
  export function parse(s: string, o: acorn.Options): ESTree.Program;
}

interface SourceMap {
  mappings: string;
  names: string[];
  sources: string[];
  version: number;
}

type TransformParams = {
  sourceCode: string;
  sourceMap?: string | SourceMap;

  filename: string;
  moduleConfig: ModuleConfig[];

  runner: ModuleRunner;
};

export async function transform(params: TransformParams): Promise<{
  code: string;
  map: null | SourceMap;
  cssText: string;
}> {
  const { filename, moduleConfig, runner, sourceCode } = params;

  // TODO: do early exit if there are no imports

  const program = parse(sourceCode, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowHashBang: true,
  });

  let idIndex = 0;
  let cssText = '';

  function generateIdentifier(value: string): string {
    return `_${value}${idIndex++}`;
  }

  const importDeclarations = program.body.reduce((acc, node) => {
    if (node.type !== 'ImportDeclaration') {
      return acc;
    }

    const module = moduleConfig.find(
      (module) => module.moduleName === (node.source.value as string)
    );

    if (module) {
      node.specifiers.forEach((specifier) => {
        if (specifier.type === 'ImportSpecifier') {
          const handler = module.specifiers[specifier.imported.name] as
            | ModuleSpecifierHandler
            | undefined;

          if (handler) {
            acc.set(specifier.local.name, {
              specifier,
              handler,
            });
          }
        }
      });
    }

    return acc;
  }, new Map<string, { specifier: ESTree.ImportSpecifier; handler: ModuleSpecifierHandler }>());

  if (importDeclarations.size > 0) {
    // const { scope, map } = analyze(ast);

    // TODO: improve identifier resolution between scopes

    // console.log(scope, importDeclarations);

    const code = new MagicString(sourceCode);
    const evaluations: {
      declaration: any;
      nodes: ESTree.Node[];
      nodesForRemoval: ESTree.Node[];
      handler: any;
    }[] = [];

    await asyncWalk(program, {
      async enter(node, parent, prop, index) {
        // const isRootScope = map.get(parent) === scope;
        // console.log(node, parent, prop, index);
        // if (isReference(node, node.parent)) {
        // console.log(node);
        // if (
        //   isRootScope &&
        //   node.type === "Identifier" &&
        //   isReference(node, parent)
        // ) {

        const declaration = importDeclarations.get(node.name);

        if (declaration) {
          if (parent && parent.type === 'CallExpression') {
            // console.log(node, parent);
            // console.log(declaration)

            const args = parent.arguments;

            evaluations.push({
              declaration,
              nodes: parent.arguments,
              nodesForRemoval: [parent],
              handler: (params) =>
                declaration.handler({
                  context: { filename, projectRoot: '' },
                  node: args[0] as ESTree.Identifier,
                  parent,
                  params,
                  utils: {
                    addDefaultImport: (name, module) => {
                      const specifier = generateIdentifier(name);

                      code.prepend(`import ${specifier} from "${module}";\n`);

                      return specifier;
                    },
                    addNamedImport: (module, name) => {
                      const specifier = generateIdentifier(name);

                      code.prepend(
                        `import { ${name} as ${specifier} } from "${module}";\n`
                      );

                      return specifier;
                    },
                    replaceWith: (newNode) => {
                      code.update(parent.start, parent.end, generate(newNode));
                    },
                    appendCSSText: (text) => {
                      cssText += text;
                    },
                  },
                }),
            });
            // console.log(map.get(parent))
          }
        }
      },
    });

    // console.log('WALK END');

    const codeToEvaluate = prepareModuleForEvaluation(
      sourceCode,
      program,
      evaluations.flatMap((evaluation) => evaluation.nodes),
      evaluations.flatMap((evaluation) => evaluation.nodesForRemoval)
    );
    // console.log(
    //   'codeToEvaluate',
    //   codeToEvaluate,
    //   evaluations.map((evaluation) => evaluation.nodes.length)
    // );
    // console.log('transform:filename', filename);
    const { __module: result } = await runner.evaluateModule<{
      __module: unknown[];
    }>(codeToEvaluate, filename, ['__module']);

    for (let i = 0, offset = 0; i < evaluations.length; i++) {
      const evaluation = evaluations[i];

      const { nodes, handler } = evaluation;
      const params = result.slice(offset, offset + nodes.length);

      handler(params);
      offset += nodes.length;
    }

    return {
      code: code.toString(),
      map: code.generateMap(),
      cssText,
    };
  }

  return {
    code: sourceCode,
    map: null,
    cssText,
  };
}
