import { makeStyles } from '@griffel/core';

import { tokenA } from './tokenA';
import { tokenB } from './tokenB';
import { tokenC } from './tokens';

export const classes = makeStyles({
  a: { color: tokenA },
  b: { color: tokenB },
  c: { color: tokenC },
});
