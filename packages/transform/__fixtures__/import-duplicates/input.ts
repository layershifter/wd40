import { makeStyles as createStylesA } from '@griffel/core';
import { makeStyles as createStylesB } from '@griffel/core';

export const useClassesA = createStylesA({
  root: { color: 'red' },
});

export const useClassesB = createStylesB({
  root: { color: 'yellow' },
});
