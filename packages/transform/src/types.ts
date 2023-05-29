import * as ESTree from 'estree';
import type { ViteNodeRunner } from 'vite-node/client';

export type TransformUtils = {
  addNamedImport: (specifier: string, moduleName: string) => string;
  replaceWith: (newNode: ESTree.Node) => void;
};

export type ModuleSpecifierHandler = (
  node: ESTree.Identifier,
  parent: ESTree.Node,
  params: unknown[],
  utils: TransformUtils
) => Promise<void>;

export type ModuleConfig = {
  moduleName: string;
  specifiers: {
    [local: string]: ModuleSpecifierHandler;
  };
};

export type ModuleRunner = ViteNodeRunner;
