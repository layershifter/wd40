import { createModuleConfig } from '@wd40/integrations-griffel';

import { createPlugin } from './createPlugin';

const [TestPlugin, loader] = createPlugin(
  createModuleConfig({ mode: 'compile-only' })
);

export { TestPlugin };
export default loader;
