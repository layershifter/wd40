import { describe } from 'vitest';

import { parseImports } from './parseImports';
import { parseProgram } from './parseProgram';

describe('parseImports', () => {
  it('should return imports', async () => {
    const fixture = `
      import { bar } from 'bar';
      import { foo } from 'foo';
    `;

    const program = await parseProgram('fixture.ts', fixture);
    const imports = await parseImports(program);

    expect(imports).toEqual({
      bar: [{ importedName: 'bar', localName: 'bar' }],
      foo: [{ importedName: 'foo', localName: 'foo' }],
    });
  });

  it('should return imports2', async () => {
    const fixture = `
      import foo from 'foo';
    `;

    const program = await parseProgram('fixture.ts', fixture);
    const imports = await parseImports(program);

    expect(imports).toEqual({
      foo: [{ importedName: 'default', localName: 'foo' }],
    });
  });

  it('should return imports3', async () => {
    const fixture = `
      import { foo as Foo } from 'foo';
    `;

    const program = await parseProgram('fixture.ts', fixture);
    const imports = await parseImports(program);

    expect(imports).toEqual({
      foo: [{ importedName: 'foo', localName: 'Foo' }],
    });
  });
});
