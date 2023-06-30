export function isJSONRequest(url: string) {
  return url.endsWith('.json');
}

export function isAssetRequest(url: string) {
  return /\.jpg$|\.png$|\.gif$|\.svg$|\.ico$|\.webp$|\.avif$/.test(url);
}
