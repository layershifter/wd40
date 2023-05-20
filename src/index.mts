import { resolveStyleRulesForSlots } from "@griffel/core";
import { parse } from "acorn";
import { generate } from "astring";
import { asyncWalk } from "estree-walker";
import isReference from "is-reference";
import { analyze } from "periscopic";
import MagicString from "magic-string";
import { createServer } from "vite";
import { ViteNodeServer } from "vite-node/server";
import { ViteNodeRunner } from "vite-node/client";

import fs from "fs";
import path from "path";
import * as url from "url";

import * as ESTree from "estree";

declare module "acorn" {
  export function parse(s: string, o: Options): ESTree.Program;

  // fix type of Comment property 'type'
  export type AcornComment = Omit<Comment, "type"> & {
    type: "Line" | "Block";
  };
}

declare module "estree" {
  interface BaseNodeWithoutComments {
    start: number;
    end: number;
  }
}

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

// ---

type ModuleSpecifierHandler = (
  node: ESTree.Identifier,
  parent: ESTree.Node,
  params: unknown[],
  utils: {
    addNamedImport: (specifier: string, moduleName: string) => void;
    replaceWith: (newNode: ESTree.Node) => void;
  }
) => Promise<void>;
type ModuleConfig = {
  moduleName: string;
  specifiers: {
    [local: string]: ModuleSpecifierHandler;
  };
};

const MODULES: ModuleConfig[] = [
  {
    moduleName: "@griffel/core",
    specifiers: {
      makeStyles: async (node, parent, params, utils) => {
        console.log("makeStyles", node, parent, params);
        console.log("makeStyles", resolveStyleRulesForSlots(params[0] as any));

        const ast = parse(
          `__styles(${JSON.stringify(
            resolveStyleRulesForSlots(params[0] as any)
          )})`,
          {
            ecmaVersion: "latest",
            sourceType: "module",
          }
        );

        utils.replaceWith(ast);
      },
    },
  },
];

// ---

const VIRTUAL_MODULES = new Map<string, string>();

function resolvePlugin() {
  return {
    name: "resolve-plugin",
    resolveId(id) {
      const virtualId = id.split("/").pop();

      if (VIRTUAL_MODULES.has(virtualId)) {
        return "\0virtual:" + virtualId;
      }
    },
    load(id) {
      return VIRTUAL_MODULES.get(id.replace("\0virtual:", ""));
    },
  };
}

const server = await createServer({
  optimizeDeps: {
    disabled: true,
  },
  plugins: [resolvePlugin()],
});

await server.pluginContainer.buildStart({});
const node = new ViteNodeServer(server);

const runner = new ViteNodeRunner({
  root: server.config.root,
  base: server.config.base,

  fetchModule(id) {
    return node.fetchModule(id);
  },

  resolveId(id, importer) {
    // console.log("resolveId", id, importer);
    return node.resolveId(id, importer);
  },
});

// ---

async function evaluate(
  sourceCode: string,
  sourcePath: string,
  program: ESTree.Program,
  nodes: ESTree.Node[]
) {
  const magicString = new MagicString(sourceCode);

  // Remove default export
  const defaultExport = program.body.find(
    (node) => node.type === "ExportDefaultDeclaration"
  ) as ESTree.ExportDefaultDeclaration | undefined;

  if (defaultExport) {
    magicString.remove(defaultExport.start, defaultExport.declaration.start);
  }

  // Remove export keywords
  program.body.forEach((node) => {
    if (node.type === "ExportNamedDeclaration") {
      magicString.remove(node.start, node.declaration?.start || node.end);
    }
  });

  const moduleHash = sourcePath + "/" + "FOO-FOO-FOO.ts";
  const moduleContent = magicString.toString();

  const evaluationContent = `
    export const __module = [
        ${nodes.map((node) => {
          return magicString.slice(node.start, node.end) + ",";
        })}
    ];
  `;

  VIRTUAL_MODULES.set(moduleHash, moduleContent + evaluationContent);

  const result = await runner.executeFile(moduleHash);
  VIRTUAL_MODULES.delete(moduleHash);

  return result.__module;

  // for (const identifier of identifiers) {
  //   const { name } = identifier;
  //
  //   const { node } = scope.getBinding(name);
  //
  //   if (node.type === "VariableDeclarator") {
  //     if (node.init) {
  //       const { code, map } = await evaluate(
  //         sourceCode,
  //         program,
  //         [node.init],
  //         scope
  //       );
  //
  //       magicString.overwrite(node.init.start, node.init.end, code);
  //
  //       return { code: magicString.toString(), map };
  //     }
  //   }
  // }

  // return { code: magicString.toString(), map: magicString.generateMap() };
}

// ---

const contentFile = path.resolve(__dirname, "../__fixtures__/a/input.ts");
const content = fs.readFileSync(contentFile, "utf8");

const ast = parse(content, {
  ecmaVersion: "latest",
  sourceType: "module",
  allowHashBang: true,
  // onComment: null,
});

const importDeclarations = ast.body.reduce((acc, node) => {
  if (node.type !== "ImportDeclaration") {
    return acc;
  }

  const module = MODULES.find(
    (module) => module.moduleName === (node.source.value as string)
  );

  if (module) {
    node.specifiers.forEach((specifier) => {
      if (specifier.type === "ImportSpecifier") {
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
  const { scope, map } = analyze(ast);

  // console.log(scope, importDeclarations);

  const code = new MagicString(content);

  await asyncWalk(ast, {
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
        if (parent && parent.type === "CallExpression") {
          // console.log(node, parent);
          // console.log(declaration)

          const params = await evaluate(
            content,
            path.dirname(contentFile),
            ast,
            parent.arguments
          );

          declaration.handler(node as ESTree.Identifier, parent, params, {
            addNamedImport: (module, name) => {
              code.append(`import { ${name} } from "${module}";\n`);
            },
            replaceWith: (newNode) => {
              code.update(parent.start, parent.end, generate(newNode));
            },
          });
          // console.log(map.get(parent))
        }
      }
      // }
      // }
    },
  });

  console.log("");
  console.log("-----");
  console.log("OUTPUT");
  console.log(code.toString());
}

// close the vite server
await server.close();

// console.log(importDeclarations);
