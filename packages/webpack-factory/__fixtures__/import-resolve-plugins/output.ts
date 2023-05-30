import { __styles as ___styles0 } from '@griffel/core';
import { makeStyles } from '@griffel/core';
// @ts-expect-error This module will be resolved via a custom webpack plugin
import color from 'non-existing-color-module';

import { tokens } from './tokens';

export const styles = ___styles0(
  {
    root: {
      De3pzq: 'f1bh81bl',
      sj55zd: 'fl9q5hc',
    },
  },
  {
    d: [
      '.f1bh81bl{background-color:blue;}',
      '.fl9q5hc{color:var(--colorBrandStroke1);}',
    ],
  }
);
