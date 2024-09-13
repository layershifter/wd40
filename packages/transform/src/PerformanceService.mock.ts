import { vi } from 'vitest';
import { type PerformanceService } from './PerformanceService';

export const performanceServiceMock = {
  mark: vi.fn(),
  finish: vi.fn(),
} satisfies Partial<PerformanceService> as unknown as PerformanceService;
