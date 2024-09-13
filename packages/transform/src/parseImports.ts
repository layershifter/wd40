import type { Program } from 'estree';

type ParsedImport = {
  importedName: string;
  localName: string;
};

export type ParsedImports = Record<string, ParsedImport[]>;

export async function parseImports(program: Program): Promise<ParsedImports> {
  return program.body.reduce<ParsedImports>((acc, node) => {
    if (node.type === 'ExportAllDeclaration') {
      if (typeof node.source.value !== 'string') {
        throw new Error('Export source is not a string');
      }

      const sourceName = node.source.value;

      acc[sourceName] = acc[sourceName] || [];
      acc[sourceName].push({
        importedName: '*',
        localName: '*',
      });
    }

    if (node.type === 'ImportDeclaration') {
      if (typeof node.source.value !== 'string') {
        throw new Error('Import source is not a string');
      }

      const sourceName = node.source.value;

      acc[sourceName] = acc[sourceName] || [];
      acc[sourceName].push(
        ...node.specifiers.map((specifier) => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            return {
              importedName: 'default',
              localName: specifier.local.name,
            } satisfies ParsedImport;
          }

          if (specifier.type === 'ImportSpecifier') {
            return {
              importedName: specifier.imported.name,
              localName: specifier.local.name,
            } satisfies ParsedImport;
          }

          if (specifier.type === 'ImportNamespaceSpecifier') {
            return {
              importedName: '*',
              localName: specifier.local.name,
            } satisfies ParsedImport;
          }

          throw new Error(`Unknown specifier type: ${specifier.type}`);
        })
      );
    }

    return acc;
  }, {});
}
