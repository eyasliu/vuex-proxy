import pkg from './package.json'
import minify from "rollup-plugin-babel-minify";

export default {
  input: 'src/index.js',
  output: [{
    name: 'vuex-proxy',
    file: 'dist/vuex-proxy.js',
    format: 'umd'
  }, {
    compact: true,
    plugins: [minify({ comments: false })],
    name: 'vuex-proxy',
    file: 'dist/vuex-proxy.min.js',
    format: 'umd',
  }],
  // exports: 'named',
  moduleName: pkg.name,
  external: ['mobx', 'vue']
}
