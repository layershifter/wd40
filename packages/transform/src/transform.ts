import acorn, { parse } from 'acorn';
import * as ESTree from 'estree';
import { generate } from 'astring';
import { asyncWalk } from 'estree-walker';
import MagicString from 'magic-string';

import { evaluateModule } from './evaluator/evaluateModule';
import { prepareModuleForEvaluation } from './evaluator/prepareModuleForEvaluation';

import type {
  ModuleConfig,
  ModuleRunner,
  ModuleSpecifierHandler,
} from './types';

declare module 'acorn' {
  export function parse(s: string, o: acorn.Options): ESTree.Program;
}

type TransformParams = {
  sourceCode: string;
  filename: string;
  moduleConfig: ModuleConfig[];

  runner: ModuleRunner;
};

export async function transform(params: TransformParams) {
  const { filename, moduleConfig, runner, sourceCode } = params;

  // TODO: do early exit if there are no imports

  const program = parse(sourceCode, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    allowHashBang: true,
  });

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

    // console.log(scope, importDeclarations);

    const code = new MagicString(sourceCode);
    const evaluations: {
      declaration: any;
      nodes: ESTree.Node[];
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
              handler: (params) =>
                declaration.handler(
                  args[0] as ESTree.Identifier,
                  parent,
                  params,
                  {
                    addNamedImport: (module, name) => {
                      code.append(`import { ${name} } from "${module}";\n`);
                    },
                    replaceWith: (newNode) => {
                      code.update(parent.start, parent.end, generate(newNode));
                    },
                  }
                ),
            });
            // console.log(map.get(parent))
          }
        }
      },
    });

    const codeToEvaluate = prepareModuleForEvaluation(
      sourceCode,
      program,
      evaluations.flatMap((evaluation) => evaluation.nodes)
    );
    // console.log(
    //   'codeToEvaluate',
    //   codeToEvaluate,
    //   evaluations.map((evaluation) => evaluation.nodes.length)
    // );
    const { __module: result } = await evaluateModule<{ __module: unknown[] }>(
      filename,
      codeToEvaluate,
      runner
    );

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
    };
  }

  return {
    code: sourceCode,
  };
}
