import { makeStyles } from '@griffel/core';

import { runNearFramePaint } from './utils';

const element = document.createElement('div');

runNearFramePaint(() => {
  console.log('Hello world');
});

export const classes = makeStyles({
  root: { color: 'red' },
});
