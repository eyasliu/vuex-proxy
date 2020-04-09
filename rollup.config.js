import minify from "rollup-plugin-babel-minify";

export default {
  input: 'src/index.js',
  output: [{
    name: 'VuexProxy',
    file: 'dist/vuex-proxy.js',
    format: 'umd'
  }, {
    compact: true,
    plugins: [minify({ comments: false })],
    name: 'VuexProxy',
    file: 'dist/vuex-proxy.min.js',
    format: 'umd',
  }],
  // exports: 'named',
  // moduleName: 'VuexProxy',
  external: ['vuex', 'vue']
}
