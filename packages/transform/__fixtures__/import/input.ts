import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    width: 'fit-content',
  },
});
