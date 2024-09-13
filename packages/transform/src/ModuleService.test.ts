import { describe, expect } from 'vitest';

import { createFileSystemServiceMock } from './FileSystemService.mock';
import { ModuleService } from './ModuleService';
import { performanceServiceMock } from './PerformanceService.mock';
import { createResolverServiceMock } from './ResolverService.mock';

const fileSystemServiceMock = createFileSystemServiceMock({
  './baz': `export const baz = 'baz';`,
});
const resolverServiceMock = createResolverServiceMock({
  './baz': { path: './baz' },
  '@baz/baz': { path: './baz' },
});

describe('ModuleService', () => {
  it('should evaluate root module', async () => {
    const moduleService = new ModuleService(
      fileSystemServiceMock,
      performanceServiceMock,
      resolverServiceMock
    );

    const result = await moduleService.evaluateRootModule(
      `
      export const foo = 'foo';
      export const bar = 'bar';
    `,
      'fixture.ts',
      ['foo']
    );

    expect(result).toEqual({ foo: 'foo' });
  });

  it('should evaluate root module 2', async () => {
    const moduleService = new ModuleService(
      fileSystemServiceMock,
      performanceServiceMock,
      resolverServiceMock
    );

    const result = await moduleService.evaluateRootModule(
      `
      import { baz } from './baz';
      
      export const foo = 'foo' + baz;
    `,
      './fixture.ts',
      ['foo']
    );

    expect(result).toEqual({ foo: 'foobaz' });
  });

  it('should evaluate root module 3', async () => {
    const moduleService = new ModuleService(
      fileSystemServiceMock,
      performanceServiceMock,
      resolverServiceMock
    );

    const result = await moduleService.evaluateRootModule(
      `
      import { baz } from '@baz/baz';
      
      export const foo = 'foo' + baz;
      export const bar = 'bar';
    `,
      './fixture.ts',
      ['foo']
    );

    expect(result).toEqual({ foo: 'foobaz' });
  });
});
