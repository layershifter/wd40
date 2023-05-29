import { makeStyles } from '@griffel/core';

const classes = makeStyles({ root: { color: 'red' } });

export function App() {
  return React.createElement('div', { className: classes.root });
}
