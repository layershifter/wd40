import { tokens } from './tokens';

export const createMixin = (rule) => ({
  color: tokens.colorBrandBackground,
  ...rule,
});
