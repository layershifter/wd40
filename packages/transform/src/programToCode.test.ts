import { describe, it } from 'vitest';

import { parseProgram } from './parseProgram';
import { programToCode } from './programToCode';

describe('programToCode', () => {
  it('should generate code from program', async () => {
    const program = await parseProgram(
      'test.js',
      `
      function getGlobalVar(name) {
        return Symbol.for();
      }
    `
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "function getGlobalVar(name) {
        return Symbol.for();
      }
      "
    `);
  });

  it('should generate code from program2', async () => {
    const program = await parseProgram(
      'test.js',
      `
      Object.assign({}, borderWidth(values[0]));
    `
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "Object.assign({}, borderWidth(values[0]));
      "
    `);
  });

  it('should generate code from program3', async () => {
    const program = await parseProgram(
      'test.js',
      `if ((isAuto() || isWidth())) {}`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "if ((isAuto() || isWidth())) {}
      "
    `);
  });

  it('should generate code from program3', async () => {
    const program = await parseProgram('test.js', `!Number.isNaN(value);`);
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "!Number.isNaN(value);
      "
    `);
  });

  it('should generate code from program3', async () => {
    const program = await parseProgram(
      'test.js',
      `function padding(...values) { return generateStyles(...values); }`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "function padding(...values) {
        return generateStyles(...values);
      }
      "
    `);
  });

  it('should generate code from program3', async () => {
    const program = await parseProgram(
      'test.js',
      `const createMixin = (rule) => rule;`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "const createMixin = (rule) => rule;
      "
    `);
  });

  it('should generate code from program3', async () => {
    const program = await parseProgram(
      'test.js',
      `const createMixinA = (rule) => ({ 
        ...rule
      });
      const createMixinB = (rule) => {
        return {
          ...rule
        };
      };`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "const createMixinA = (rule) => ({
        ...rule
      });
      const createMixinB = (rule) => {
        return {
          ...rule
        };
      };
      "
    `);
  });

  it('should generate code from program5', async () => {
    const program = await parseProgram(
      'test.js',
      `const { [SLOT_ELEMENT_TYPE_SYMBOL]: elementType } = slotElement;`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "const {[SLOT_ELEMENT_TYPE_SYMBOL]: elementType} = slotElement;
      "
    `);
  });

  it('should generate code from program6', async () => {
    const program = await parseProgram(
      'test.js',
      `try {}
       catch (e) {}`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "try {} catch (e) {}
      "
    `);
  });

  it('should generate code from program7', async () => {
    const program = await parseProgram(
      'test.js',
      `const defaultSSRContextValue = { 
        current: 0
      };
      
      export function resetIdsForTests() {
        defaultSSRContextValue.current = 0;
      }`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "const defaultSSRContextValue = {
        current: 0
      };
      export function resetIdsForTests() {
        defaultSSRContextValue.current = 0;
      }
      "
    `);
  });

  it.only('should generate code from program8', async () => {
    const program = await parseProgram(
      'test.js',
      `class Foo { set bar(val) {} }`
    );
    const code = programToCode(program);

    expect(code).toMatchInlineSnapshot(`
      "class Foo {
        set bar(val) {}
      }
      "
    `);
  })
});
