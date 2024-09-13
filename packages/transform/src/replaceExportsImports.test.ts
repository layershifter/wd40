import { describe, expect } from 'vitest';

import { parseProgram } from './parseProgram';
import { programToCode } from './programToCode';
import { replaceExportsImports } from './replaceExportsImports';

describe('replaceExportsImports', () => {
  it('should replace exports and imports', async () => {
    const filename = 'fixture.ts';
    const fixture = `
      import { foo } from './foo';
      
      const foo = 1;
      const bar = 2;
      
      export { foo };
      export { bar };
    `;
    const program = await parseProgram(filename, fixture);

    const result = programToCode(
      replaceExportsImports(filename, program, {
        './foo': { path: './foo.js' },
      })
    );

    expect(result).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const { foo } = require(\\"./foo.js\\");
      const foo = 1;
      const bar = 2;
      exports.foo = foo;
      exports.bar = bar;

      });
      "
    `);
  });

  it('should replace exports and imports with default', async () => {
    const filename = 'fixture.ts';
    const fixture = `
      import foo from './foo';
      const obj = { color: foo.color };
      export { obj as default };
    `;
    const program = await parseProgram(filename, fixture);

    const result = programToCode(
      replaceExportsImports(filename, program, {
        './foo': { path: './foo.js' },
      })
    );

    expect(result).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const { default: foo } = require(\\"./foo.js\\");
      const obj = {
        color: foo.color
      };
      exports.default = obj;

      });
      "
    `);
  });

  it('should handle assets', async () => {
    const filename = 'fixture.ts';
    const fixture = `
      import bg from './foo.jpg';
      const obj = { background: bg };
      export { obj };
    `;
    const program = await parseProgram(filename, fixture);

    const result = programToCode(
      replaceExportsImports(filename, program, {
        './foo.jpg': {
          path: './foo.jpg',
          isAsset: true,
        },
      })
    );

    expect(result).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const bg = \\"@wd40:./foo.jpg:@wd40\\";
      const obj = {
        background: bg
      };
      exports.obj = obj;

      });
      "
    `);
  });

  it('should handle namespaces', async () => {
    const filename = 'fixture.ts';
    const fixture = `
      import * as Mod from "./mod";
    `;
    const program = await parseProgram(filename, fixture);

    const result = programToCode(
      replaceExportsImports(filename, program, {
        './mod': { path: './mod.js' },
      })
    );

    expect(result).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const Mod = require(\\"./mod.js\\");

      });
      "
    `);
  });

  it('should handle export stars', async () => {
    const filename = 'fixture.ts';
    const fixture = `
      export * from "./mod";
    `;
    const program = await parseProgram(filename, fixture);

    const result = programToCode(
      replaceExportsImports(filename, program, {
        './mod': { path: './mod.js' },
      })
    );

    expect(result).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      export_star(require(\\"./mod.js\\"), exports);

      });
      "
    `);
  });
});
