import { makeResetStyles, makeStyles } from '@griffel/core';

const classesA = makeStyles({ root: { color: 'green' } });
const classesB = makeResetStyles({ color: 'blue' });

export function App() {
  return React.createElement('div', { className: classes.root });
}
