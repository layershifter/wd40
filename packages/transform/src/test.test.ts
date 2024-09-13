import fs from 'fs';
import { transform as oxc } from 'oxc-transform';
import {moduleLexerAsync} from 'oxc-parser'

import { transform } from '@wd40/native-shaker';
import { PerformanceService } from './PerformanceService';

it('should transform', async () => {
  const tabster =
    '/Users/olfedias/WebstormProjects/wd40/node_modules/tabster/dist/tabster.esm.js';
  const content = fs.readFileSync(tabster, 'utf-8');

  const performanceService = new PerformanceService();

  await performanceService.measure(
    async () => {
      return oxc('test.js', content);
    },
    'oxc:transform',
    tabster
  );

  await performanceService.measure(
    async () => {
      return moduleLexerAsync(content);
    },
    'oxc:lexer',
    tabster
  );

  await performanceService.measure(
    async () => {
      return transform('test.js', content, ['mergeTabsterProps']);
    },
    'shift:shake',
    tabster
  );

  await performanceService.measure(
    async () => {
      return transform('test.js', content, ['*']);
    },
    'shift:noshake',
    tabster
  );


  performanceService.getMarks().forEach((mark) => {
    const time = mark.end - mark.time;
    console.log(`${mark.name} took ${time}ms`);
  });
});
