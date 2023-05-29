import acorn, { parse } from 'acorn';
import * as ESTree from 'estree';

declare module 'acorn' {
  export function parse(s: string, o: acorn.Options): ESTree.Program;
}

import { prepareModuleForEvaluation } from './prepareModuleForEvaluation';

describe('prepareModuleForEvaluation', () => {
  it('removes default exports', () => {
    const code = `
      const foo = 'foo';
    
      export default function bar() {};
    `;
    const program = parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
    });

    expect(prepareModuleForEvaluation(code, program, [])).toMatchInlineSnapshot(
      `
      "
            const foo = 'foo';
          
            ;
          
          export const __module = [
              
          ];
        "
    `
    );
  });
});
