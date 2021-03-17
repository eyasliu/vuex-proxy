import buble from '@rollup/plugin-buble';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import minify from 'rollup-plugin-babel-minify';
import pkg from './package.json';

const banner = `/*!
 * vuex-proxy v${pkg.version}
 * (c) ${new Date().getFullYear()} Eyas Liu
 * @license MIT
 */`;

export default {
  input: 'src/index.js',
  output: [
    {
      banner,
      name: 'VuexProxy',
      file: 'dist/vuex-proxy.js',
      format: 'umd',
    },
    {
      compact: true,
      banner,
      plugins: [minify({ comments: false })],
      name: 'VuexProxy',
      file: 'dist/vuex-proxy.min.js',
      format: 'umd',
    },
  ],
  external: ['vuex', 'vue'],
  plugins: [
    buble({ transforms: { dangerousForOf: true } }),
    resolve(),
    commonjs(),
  ],
  onwarn: (msg, warn) => {
    if (!/Circular/.test(msg)) {
      warn(msg);
    }
  },
};
