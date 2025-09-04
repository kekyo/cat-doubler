import { defineConfig } from 'vite';
import { resolve } from 'path';
import { cp } from 'fs/promises';
import screwUp from 'screw-up';
import prettierMax from 'prettier-max';

// Copy templates to dist during build
const copyTemplates = () => ({
  name: 'copy-templates',
  async closeBundle() {
    await cp(
      resolve(__dirname, 'src/generator/templates'),
      resolve(__dirname, 'dist/templates'),
      { recursive: true }
    );
  },
});

export default defineConfig({
  plugins: [
    copyTemplates(),
    screwUp({
      outputMetadataFile: true,
    }),
    prettierMax(),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'cat-doubler',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'fs',
        'fs/promises',
        'path',
        'url',
        'util',
        'stream',
        'events',
        'buffer',
        'crypto',
        'os',
        'child_process',
        'commander',
        'change-case',
        'glob',
        'handlebars',
      ],
    },
    target: 'node18',
    sourcemap: true,
    minify: false,
  },
});
