import * as path from 'node:path';

import { resolver } from './resolver';

export async function resolveModule(
  moduleId: string,
  importer: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    resolver(path.dirname(importer), moduleId, (err, res, req) => {
      // reject(null);
      if (err) {
        reject(err);
        return;
      }

      resolve(res);
    });
  });
}
