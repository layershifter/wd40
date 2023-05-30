import { moduleConfig } from '@wd40/integrations-griffel';

import { createPlugin } from './createPlugin';

const [TestPlugin, loader] = createPlugin(moduleConfig);

export { TestPlugin };
export default loader;
