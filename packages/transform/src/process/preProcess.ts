import { transformAsync } from '@babel/core';
import { shakerPlugin } from '@linaria/shaker';

import { preevalPlugin } from './preevalPlugin';

export async function preProcess(
  code: string,
  specifiers: string[]
): Promise<string> {
  const result = await transformAsync(code, {
    babelrc: false,
    configFile: false,

    plugins: [[shakerPlugin, { onlyExports: specifiers }], preevalPlugin],
  });

  return (result?.code as string) ?? '';
}
