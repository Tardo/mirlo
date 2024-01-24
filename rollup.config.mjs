/* eslint-disable */
import path from 'path';
import alias from '@rollup/plugin-alias';
import analyze from 'rollup-plugin-analyzer';
import cleanup from 'rollup-plugin-cleanup';

export default [
  {
    input: ['src/js/mirlo.mjs'],
    output: {
      sourcemap: false,
      format: 'esm',
      dir: 'dist',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      alias({
        entries: [
          {
            find: '@mirlo',
            replacement: path.resolve('src/js'),
          },
        ],
      }),
      cleanup(),
      analyze(),
    ],
    watch: {
      clearScreen: false,
      include: ['src/**'],
    },
  },
];
