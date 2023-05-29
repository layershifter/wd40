import type { ModuleRunner } from '../types';
import { evaluateModule } from './evaluateModule';
import { createModuleRunner } from './createModuleRunner';

describe('evaluateModule', () => {
  let runner: ModuleRunner;
  let disposeRunner: () => Promise<void>;

  beforeAll(async () => {
    const result = await createModuleRunner();

    runner = result.runner;
    disposeRunner = result.disposeRunner;
  });

  afterAll(async () => {
    await disposeRunner();
  });

  it('evaluates a module', async () => {
    const result = await evaluateModule(
      'test.js',
      'export const a = 1;',
      runner
    );

    expect(result).toMatchInlineSnapshot(`
      {
        "a": 1,
      }
    `);
  });
});
