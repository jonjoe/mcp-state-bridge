import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { 'server/index': 'src/server/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: { 'client/index': 'src/client/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    clean: false,
  },
]);
