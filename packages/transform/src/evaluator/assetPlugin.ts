import { createFilter } from '@rollup/pluginutils';
import type { Plugin } from 'rollup';

export const ASSET_PREFIX = '@wd40-asset:';
export const ASSET_SUFFIX = ':@wd40-asset';

export const assetPlugin = (): Plugin => {
  const filter = createFilter('**/*.{png,jpg,jpeg,gif,svg}', null, {
    resolve: false,
  });

  return {
    name: 'wd40:asset-export-plugin',

    transform(code, id) {
      if (filter(id)) {
        return `export default "${ASSET_PREFIX}${id}${ASSET_SUFFIX}"`;
      }

      return null;
    },
  };
};
