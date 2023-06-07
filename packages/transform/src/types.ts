import * as ESTree from 'estree';

export type TransformUtils = {
  appendCSSText: (text: string) => void;

  addDefaultImport: (specifier: string, moduleName: string) => string;
  addNamedImport: (specifier: string, moduleName: string) => string;

  replaceWith: (newNode: ESTree.Node) => void;
};

export type ModuleSpecifierHandler = (options: {
  context: { filename: string; projectRoot: string };
  node: ESTree.Identifier;
  parent: ESTree.Node;
  params: unknown[];
  utils: TransformUtils;
}) => Promise<void>;

export type ModuleConfig = {
  moduleName: string;
  specifiers: {
    [local: string]: ModuleSpecifierHandler;
  };
};

export type ModuleRunner = ViteNodeRunner;
export type ModuleRunnerResolveId = ViteNodeRunner['options']['resolveId'];
