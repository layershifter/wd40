import { fileURLToPath } from 'node:url';
import { describe } from 'vitest';

import { performanceServiceMock } from './PerformanceService.mock';
import { ResolverService } from './ResolverService';

describe('ResolverService', () => {
  it('should resolve module', async () => {
    const resolverService = new ResolverService(performanceServiceMock);
    const importerId = fileURLToPath(import.meta.url);

    const result = await resolverService.resolveModule(
      './ResolverService',
      importerId
    );

    expect(result).toEqual({
      path: fileURLToPath(new URL('./ResolverService.ts', import.meta.url)),
    });
  });
});
