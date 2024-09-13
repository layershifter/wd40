import { runModule } from './runModule';
import { describe } from 'vitest';
import { WD_MODULE_NAME } from './constants';

describe('runModule', () => {
  it('should run module', async () => {
    const sourceFilename = 'fixture.ts';
    const fixture = `
      ${WD_MODULE_NAME}("${sourceFilename}", function (module, exports, require) {
         exports.foo = 1 + 1;
      })
    `;

    const result = await runModule(sourceFilename, fixture);

    expect(result).toEqual({ foo: 2 });
  });

  it('should run module', async () => {
    const sourceFilename = 'fixture.ts';
    const fixture = `
      ${WD_MODULE_NAME}("${sourceFilename}", function (module, exports, require) {
        function foo(a, b) {
         return a + b;
        }
      
        exports.foo = foo(1, 2);
        exports.baz = foo(2, 3);
      })
    `;

    const result = await runModule(sourceFilename, fixture);

    expect(result).toEqual({
      baz: 5,
      foo: 3,
    });
  });
});
