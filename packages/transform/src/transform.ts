import { generate } from 'astring';
import { Identifier } from 'estree';
import { is, traverse } from 'estree-toolkit';
import MagicString from 'magic-string';

import { FileSystemService } from './FileSystemService';
import { ModuleService } from './ModuleService';
import { PerformanceService } from './PerformanceService';
import { ResolverService } from './ResolverService';
import { prepareModuleForEvaluation } from './evaluator/prepareModuleForEvaluation';
import { parseImports } from './parseImports';
import { parseProgram } from './parseProgram';
import type { ModuleConfig, ModuleSpecifierHandler } from './types';

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

  moduleService: ModuleService;
};

export async function transform(params: TransformParams): Promise<{
  code: string;
  map: null | SourceMap;
  cssText: string;
}> {
  const { filename, moduleConfig, moduleService, sourceCode } = params;



  // const perfMark = performanceService.mark('transform');

  const modules = moduleConfig.map((module) => module.moduleName);

  if (modules.every((module) => sourceCode.indexOf(module) === -1)) {
    return {
      code: sourceCode,
      map: null,
      cssText: '',
    };
  }

  const program = await parseProgram(filename, sourceCode);

  //
  // console.log('filename', filename);
  // console.log('code', sourceCode);
  //
  const imports = await parseImports(program);
  const importsByHandler = Object.entries(imports).reduce<
    {
      importName: string;
      localName: string;
      handler: ModuleSpecifierHandler;
    }[]
  >((acc, [moduleName, specifiers]) => {
    const module = moduleConfig.find(
      (module) => module.moduleName === moduleName
    );

    for (const specifier of specifiers) {
      const handler = module?.specifiers[specifier.importedName] as
        | ModuleSpecifierHandler
        | undefined;

      if (handler) {
        acc.push({
          importName: specifier.importedName,
          localName: specifier.localName,
          handler,
        });
      }
    }

    return acc;
  }, []);
  //

  const code = new MagicString(sourceCode);
  const evaluations: {
    declaration: any;
    nodes: Node[];
    nodesForRemoval: Node[];
    handler: any;
  }[] = [];

  let idIndex = 0;
  let cssText = '';

  function generateIdentifier(value: string): string {
    return `_${value}${idIndex++}`;
  }

  traverse(program, {
    $: { scope: true },

    ImportDeclaration(nodePath) {
      const specifierPaths = nodePath.get('specifiers');

      specifierPaths.forEach((specifierPath) => {
        // console.log('specifierPath', specifierPath.node);
        if (is.importSpecifier(specifierPath)) {
          const localName = specifierPath.node!.local.name;
          const declaration = importsByHandler.find(
            (importHandler) => importHandler.localName === localName
          );

          if (declaration) {
            const referencePaths = specifierPath.scope.getBinding(
              declaration.localName
            ).references;

            referencePaths.forEach((referencePath) => {
              if (
                referencePath.parentPath &&
                is.callExpression(referencePath.parentPath)
              ) {
                // console.log(node, parent);
                // console.log(declaration)

                const args = referencePath.parentPath.get('arguments');
                const parent = referencePath.parentPath.node;

                evaluations.push({
                  declaration,
                  nodes: args.map((arg) => arg.node),
                  nodesForRemoval: [parent],
                  handler: (params) =>
                    declaration.handler({
                      context: { filename, projectRoot: '' },
                      node: args[0] as Identifier,
                      parent: parent,
                      params,
                      utils: {
                        addDefaultImport: (name, module) => {
                          const specifier = generateIdentifier(name);

                          code.prepend(
                            `import ${specifier} from "${module}";\n`
                          );

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
                          code.update(
                            parent.start,
                            parent.end,
                            generate(newNode)
                          );
                        },
                        appendCSSText: (text) => {
                          cssText += text;
                        },
                      },
                    }),
                });
              }
            });

            return;
          }

          // console.log('importSpecifier', specifierPath.node);
          return;
        }

        if (is.importDefaultSpecifier(specifierPath)) {
          // console.log('importDefaultSpecifier', specifierPath.node);
          return;
        }

        throw new Error('Unknown specifier type');
      });
    },
  });

  // let idIndex = 0;
  // let cssText = '';
  //
  // function generateIdentifier(value: string): string {
  //   return `_${value}${idIndex++}`;
  // }
  //
  // const importDeclarations = program.body.reduce((acc, node) => {
  //   if (node.type !== 'ImportDeclaration') {
  //     return acc;
  //   }
  //
  //   const module = moduleConfig.find(
  //     (module) => module.moduleName === (node.source.value as string)
  //   );
  //
  //   if (module) {
  //     node.specifiers.forEach((specifier) => {
  //       if (specifier.type === 'ImportSpecifier') {
  //         const handler = module.specifiers[specifier.imported.name] as
  //           | ModuleSpecifierHandler
  //           | undefined;
  //
  //         if (handler) {
  //           acc.set(specifier.local.name, {
  //             specifier,
  //             handler,
  //           });
  //         }
  //       }
  //     });
  //   }
  //
  //   return acc;
  // }, new Map<string, { specifier: ESTree.ImportSpecifier; handler: ModuleSpecifierHandler }>());

  if (importsByHandler.length === 0) {
    return {
      code: sourceCode,
      map: null,
      cssText: ""
    };
    throw new Error('No imports found');
  }

  // if (importDeclarations.size > 0) {
  //   // const { scope, map } = analyze(ast);
  //
  //   // TODO: improve identifier resolution between scopes
  //
  //   // console.log(scope, importDeclarations);
  //
  //   const code = new MagicString(sourceCode);
  //   const evaluations: {
  //     declaration: any;
  //     nodes: ESTree.Node[];
  //     nodesForRemoval: ESTree.Node[];
  //     handler: any;
  //   }[] = [];
  //
  //   await asyncWalk(program, {
  //     async enter(node, parent, prop, index) {
  //       // const isRootScope = map.get(parent) === scope;
  //       // console.log(node, parent, prop, index);
  //       // if (isReference(node, node.parent)) {
  //       // console.log(node);
  //       // if (
  //       //   isRootScope &&
  //       //   node.type === "Identifier" &&
  //       //   isReference(node, parent)
  //       // ) {
  //
  //       const declaration = importDeclarations.get(node.name);
  //
  //       if (declaration) {
  //         if (parent && parent.type === 'CallExpression') {
  //           // console.log(node, parent);
  //           // console.log(declaration)
  //
  //           const args = parent.arguments;
  //
  //           evaluations.push({
  //             declaration,
  //             nodes: parent.arguments,
  //             nodesForRemoval: [parent],
  //             handler: (params) =>
  //               declaration.handler({
  //                 context: { filename, projectRoot: '' },
  //                 node: args[0] as ESTree.Identifier,
  //                 parent,
  //                 params,
  //                 utils: {
  //                   addDefaultImport: (name, module) => {
  //                     const specifier = generateIdentifier(name);
  //
  //                     code.prepend(`import ${specifier} from "${module}";\n`);
  //
  //                     return specifier;
  //                   },
  //                   addNamedImport: (module, name) => {
  //                     const specifier = generateIdentifier(name);
  //
  //                     code.prepend(
  //                       `import { ${name} as ${specifier} } from "${module}";\n`
  //                     );
  //
  //                     return specifier;
  //                   },
  //                   replaceWith: (newNode) => {
  //                     code.update(parent.start, parent.end, generate(newNode));
  //                   },
  //                   appendCSSText: (text) => {
  //                     cssText += text;
  //                   },
  //                 },
  //               }),
  //           });
  //           // console.log(map.get(parent))
  //         }
  //       }
  //     },
  //   });
  //
  //   // console.log('WALK END');
  //
  const codeToEvaluate = prepareModuleForEvaluation(
    sourceCode,
    program,
    evaluations.flatMap((evaluation) => evaluation.nodes)
  );

  // console.log('codeToEvaluate', codeToEvaluate);

  // try {
  const evaluationResult = await moduleService.evaluateRootModule(
    codeToEvaluate,
    filename,
    ['__module']
  );
  const result = evaluationResult.__module;

  // console.log('result', evaluationResult);

  //   // console.log(
  //   //   'codeToEvaluate',
  //   //   codeToEvaluate,
  //   //   evaluations.map((evaluation) => evaluation.nodes.length)
  //   // );
  //   // console.log('transform:filename', filename);
  //   const { __module: result } = await runner.evaluateModule<{
  //     __module: unknown[];
  //   }>(codeToEvaluate, filename, ['__module']);
  //

  // console.dir(result, {depth: null});

  // console.log('sourceCode', sourceCode);

  for (let i = 0, offset = 0; i < evaluations.length; i++) {
    const evaluation = evaluations[i];

    const { nodes, handler } = evaluation;
    const params = result.slice(offset, offset + nodes.length);

    handler(params);
    offset += nodes.length;
  }

  // console.log('output', code.toString());

  const output = {
    code: code.toString(),
    map: code.generateMap(),
    cssText,
  };

  // return output;
  // } catch (error) {}

  // performanceService.finish(perfMark);
  //
  // performanceService
  //   .getMarks()
  //   .map((m) => ({
  //     ...m,
  //     actual: m.end - m.time,
  //   }))
  //   .sort((a, b) => a.filename.localeCompare(b.filename))
  //   .map((m) =>
  //     console.log(
  //       'MARK',
  //       `name: ${m.name}`,
  //       `filename: ${m.filename}`,
  //       Math.ceil(m.actual) + 'ms'
  //     )
  //   );

  return output;
  // return {};
  // }
  //
  // return {
  //   code: sourceCode,
  //   map: null,
  //   cssText,
  // };
}
