import pkg from './package.json'
import minify from "rollup-plugin-babel-minify";

export default {
  input: 'src/index.js',
  output: [{
    name: 'vuex-p',
    file: 'dist/vuex-p.js',
    format: 'umd'
  }, {
    compact: true,
    plugins: [minify({ comments: false })],
    name: 'vuex-p',
    file: 'dist/vuex-p.min.js',
    format: 'umd',
  }],
  // exports: 'named',
  moduleName: pkg.name,
  external: ['mobx', 'vue']
}
