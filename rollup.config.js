import pkg from './package.json'
import minify from "rollup-plugin-babel-minify";

export default {
  input: 'src/index.js',
  output: [{
    name: 'movx',
    file: 'dist/movx.js',
    format: 'umd'
  }, {
    compact: true,
    plugins: [minify({ comments: false })],
    name: 'movx',
    file: 'dist/movx.min.js',
    format: 'umd',
  }],
  // exports: 'named',
  moduleName: pkg.name,
  external: ['mobx', 'vue']
}
