import type { Program } from 'estree';

import { ModuleResolveResult } from './ResolverService';
import {
  ASSET_PREFIX,
  ASSET_SUFFIX,
  WD_MODULE_EXPRESSION,
  WD_RAW_EXPRESSION,
} from './constants';

function createModuleImport(
  localName: string,
  importedName: string,
  sourcePath: string
) {
  if (localName === importedName) {
    return {
      type: WD_RAW_EXPRESSION,
      value: `const { ${localName} } = require("${sourcePath}");`,
    };
  }

  if (importedName === '*') {
    return {
      type: WD_RAW_EXPRESSION,
      value: `const ${localName} = require("${sourcePath}");`,
    };
  }

  return {
    type: WD_RAW_EXPRESSION,
    value: `const { ${importedName}: ${localName} } = require("${sourcePath}");`,
  };
}

function createAssetImport(localName: string, sourcePath: string) {
  return {
    type: WD_RAW_EXPRESSION,
    value: `const ${localName} = "${ASSET_PREFIX}${sourcePath}${ASSET_SUFFIX}";`,
  };
}

function createModuleExport(localName: string, exportedName: string) {
  return {
    type: WD_RAW_EXPRESSION,
    value: `exports.${exportedName} = ${localName};`,
  };
}

function createModuleWrapper(filename: string, body: Program['body']) {
  return {
    type: WD_MODULE_EXPRESSION,
    filename,
    body,
  };
}

export function replaceExportsImports(
  filename: string,
  program: Program,
  resolvedImports: Record<string, ModuleResolveResult>
) {
  function getResolvedImportPath(sourcePath: string): ModuleResolveResult {
    const resolvedPath = resolvedImports[sourcePath];

    if (!resolvedPath) {
      throw new Error(`Could not resolve import path: ${sourcePath}`);
    }

    return resolvedPath;
  }

  const programBody = program.body.flatMap((node) => {
    if (node.type === 'ImportDeclaration') {
      const resolvedPath = getResolvedImportPath(node.source.value as string);

      if (resolvedPath.isAsset) {
        return createAssetImport(
          node.specifiers[0].local.name,
          resolvedPath.path
        );
      }

      if (node.specifiers.length > 1) {
        throw new Error('Multiple specifiers not supported');
      }

      const specifier = node.specifiers[0];

      if (specifier.type === 'ImportSpecifier') {
        return createModuleImport(
          specifier.local.name,
          specifier.imported.name,
          resolvedPath.path
        );
      }

      if (specifier.type === 'ImportDefaultSpecifier') {
        return createModuleImport(
          specifier.local.name,
          'default',
          resolvedPath.path
        );
      }

      if (specifier.type === 'ImportNamespaceSpecifier') {
        return createModuleImport(specifier.local.name, '*', resolvedPath.path);
      }

      throw new Error('Unknown specifier type');
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration === null) {
        return node.specifiers.map((specifier) => {
          if (specifier.type === 'ExportSpecifier') {
            return createModuleExport(
              specifier.local.name,
              specifier.exported.name
            );
          }

          throw new Error('Unknown declaration type');
        });
      }
    }

    if (node.type === 'ExportAllDeclaration') {
      const importPath = getResolvedImportPath(
        node.source.value as string
      ).path;

      return {
        type: WD_RAW_EXPRESSION,
        value: `export_star(require("${importPath}"), exports);`,
      };
    }

    return node;
  });
  const wrappedNode = createModuleWrapper(filename, programBody);

  program.body = [wrappedNode];

  return program;
}
