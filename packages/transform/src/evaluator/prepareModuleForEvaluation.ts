import * as ESTree from 'estree';
import MagicString from 'magic-string';

export function prepareModuleForEvaluation(
  sourceCode: string,
  program: ESTree.Program,
  nodes: ESTree.Node[]
): string {
  const magicString = new MagicString(sourceCode);

  // Remove default export
  // TODO: do not remove default export if it is a makeStyles call
  const defaultExport = program.body.find(
    (node) => node.type === 'ExportDefaultDeclaration'
  ) as ESTree.ExportDefaultDeclaration | undefined;

  if (defaultExport) {
    // magicString.remove(defaultExport.start, defaultExport.end);
  }

  // Remove export keywords
  program.body.forEach((node) => {
    if (node.type === 'ExportNamedDeclaration') {
      // magicString.remove(node.start, node.declaration?.start || node.end);
    }
  });

  const footer = `
    export const __module = [
        ${nodes
          .map((node) => magicString.slice(node.start, node.end))
          .join(',')}
    ];
  `;

  const moduleContent = magicString.toString();

  return moduleContent + footer;
}
