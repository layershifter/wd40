import enhancedResolve from 'enhanced-resolve';

export const resolver = enhancedResolve.create({
  extensions: [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.mjs',
    '.cjs',
    '.mts',
    '.cts',
  ],
  exportsFields: ['import'],
  mainFields: ['module', 'main'],
});
