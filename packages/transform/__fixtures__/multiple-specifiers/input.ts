import { makeResetStyles, makeStyles } from '@griffel/core';

export const classesA = makeStyles({
  root: { color: 'green' },
});

export const classesB = makeResetStyles({
  color: 'blue',
});
