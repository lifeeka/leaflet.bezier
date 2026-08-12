import { defineConfig } from 'tsup';

const banner = {
  js: '/* leaflet.bezier v2 | MIT | https://github.com/lifeeka/leaflet.bezier */',
};

export default defineConfig([
  {
    entry: { 'leaflet.bezier': 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: { entry: { index: 'src/index.ts' } },
    outExtension: ({ format }) => ({ js: format === 'esm' ? '.mjs' : '.cjs' }),
    external: ['leaflet'],
    banner,
  },
  {
    // script-tag build: "leaflet" resolves to the global L via the shim
    entry: { 'leaflet.bezier.global': 'src/global.ts' },
    format: ['iife'],
    outExtension: () => ({ js: '.js' }),
    globalName: 'LeafletBezier',
    banner,
    esbuildOptions(options) {
      options.alias = { leaflet: './src/leaflet-shim.ts' };
    },
  },
]);
