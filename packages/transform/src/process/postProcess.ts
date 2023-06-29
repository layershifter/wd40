import { transformAsync } from '@babel/core';

import { preevalPlugin } from './preevalPlugin';

export async function postProcess(code: string): Promise<string> {
  const result = await transformAsync(code, {
    babelrc: false,
    configFile: false,

    plugins: [preevalPlugin],
  });

  return (result?.code as string) ?? '';
}
