import { makeStyles } from '@griffel/core'

const classesA = makeStyles({ root: { color: 'green' } });
const classesB = makeStyles({ root: { color: 'blue' } });

export function App() {
  return React.createElement('div', { className: classes.root });
}
