import { __styles as ___styles0 } from '@griffel/core';
import { makeStyles } from '@griffel/core';

import { runNearFramePaint } from './utils';

const element = document.createElement('div');

runNearFramePaint(() => {
  console.log('Hello world');
});

export const classes = ___styles0(
  {
    root: {
      sj55zd: 'fe3e8s9',
    },
  },
  {
    d: ['.fe3e8s9{color:red;}'],
  }
);
