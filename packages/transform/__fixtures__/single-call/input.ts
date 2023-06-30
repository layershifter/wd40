import { makeStyles, shorthands } from '@griffel/core';

export const classes = makeStyles({
  root: {
    color: 'red',
    ...shorthands.padding('5px'),
  },
});
