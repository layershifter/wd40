import type { Plugin, ResolvedConfig } from 'vite';
import { cleanUrl } from 'vite-node/utils';

export const ASSET_PREFIX = '@wd40-asset:';
export const ASSET_SUFFIX = ':@wd40-asset';

export const assetExportPlugin = (): Plugin => {
  let assetsInclude: ResolvedConfig['assetsInclude'] = () => false;

  return {
    name: 'wd40:asset-export-plugin',
    configResolved(config) {
      assetsInclude = config.assetsInclude;
    },
    transform(code, id) {
      if (!assetsInclude(cleanUrl(id))) {
        return null;
      }

      return code.replace(
        /export default "(.+)"/,
        `export default "${ASSET_PREFIX}$1${ASSET_SUFFIX}"`
      );
    },
  };
};
