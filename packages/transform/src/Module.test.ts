import { describe, expect } from 'vitest';

import { Module } from './Module';
import { performanceServiceMock } from './PerformanceService.mock';
import { createResolverServiceMock } from './ResolverService.mock';

const resolverServiceMock = createResolverServiceMock({
  bar: { path: './mod-bar' },
});

describe('Module', () => {
  it('should tree shake', async () => {
    const fixture = `
      export const foo = 1;
      export const bar = 2;
    `;

    const module = new Module(
      performanceServiceMock,
      resolverServiceMock,
      fixture,
      'fixture.ts',
      ['foo']
    );
    const snapshot = await module.getSnapshot();

    expect(snapshot.code).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const foo = 1;
      exports.foo = foo;

      });
      "
    `);

    expect(snapshot.aliveImports).toEqual({});
    expect(snapshot.resolvedImports).toEqual({});
  });

  it('should replace imports', async () => {
    const fixture = `
      import { bar } from 'bar';
    
      const foo = "foo";
      export const foobar = foo + bar;
    `;

    const module = new Module(
      performanceServiceMock,
      resolverServiceMock,
      fixture,
      'fixture.ts',
      ['foobar']
    );
    const snapshot = await module.getSnapshot();

    expect(snapshot.code).toMatchInlineSnapshot(`
      "__wd40_module(\\"fixture.ts\\", function (module, exports, require, export_star) {
      const { bar } = require(\\"./mod-bar\\");
      const foo = \\"foo\\";
      const foobar = foo + bar;
      exports.foobar = foobar;

      });
      "
    `);

    expect(snapshot.aliveImports).toEqual({
      bar: [{ importedName: 'bar', localName: 'bar' }],
    });
    expect(snapshot.resolvedImports).toEqual({
      bar: { path: './mod-bar' },
    });
  });
});
