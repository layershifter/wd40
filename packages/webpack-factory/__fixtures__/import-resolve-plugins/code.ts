import { makeStyles } from '@griffel/core';
// @ts-expect-error This module will be resolved via a custom webpack plugin
import color from 'non-existing-color-module';

import { tokens } from './tokens';

export const styles = makeStyles({
  root: {
    backgroundColor: color,
    color: tokens.colorBrandStroke1,
  },
});
