/* eslint-disable */
import alias from '@rollup/plugin-alias';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import path from 'path';
import analyze from 'rollup-plugin-analyzer';
import postcss from 'rollup-plugin-postcss';

const is_production = process.env.NODE_ENV === 'production';

export default [
  {
    input: ['src/js/mirlo.mjs'],
    output: {
      sourcemap: (!is_production && 'inline') || false,
      format: 'esm',
      dir: 'dist',
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      alias({
        entries: [
          {
            find: '@css',
            replacement: path.resolve('src/css'),
          },
        ],
      }),
      nodeResolve({
        preferBuiltins: false,
      }),
      commonjs(),

      postcss({
        plugins: [autoprefixer(), is_production && cssnano()],
      }),

      is_production && terser(),
      is_production && analyze(),
    ],
    watch: {
      clearScreen: false,
      include: ['src/**'],
    },
  },
];
